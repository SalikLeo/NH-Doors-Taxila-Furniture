const app = {
  currentPage: null,
  modalTimeout: null,
  isStockUnlocked: false,
  unlockedTabs: {},
  saleMode: 'retail',

  async init() {
    // Rehydrate localStorage from SQLite app_kv_store on startup
    try {
      if (window.api && window.api.getAllKv) {
        const kvList = await window.api.getAllKv();
        if (kvList && kvList.length > 0) {
          for (const item of kvList) {
            localStorage.setItem(item.key, item.value);
          }
        }
      }
    } catch (e) {
      console.error("Failed to rehydrate storage from DB:", e);
    }

    this.saleMode = window.storage.get('sale_mode') || 'retail';
    this.bindEvents();
    this.initCalculator();
    await this.loadSettings();
    this.updateSaleModeUI();
    if (window.lucide) lucide.createIcons();
    this.navigate('proposal-form');
  },

  setSaleMode(mode) {
    this.saleMode = mode;
    window.storage.set('sale_mode', mode);
    this.updateSaleModeUI();
    
    // Refresh active tab to reflect price mode change
    if (this.currentPage === 'proposal-form' && window.SalesForm) {
        SalesForm.loadAllItems();
    } else if (this.currentPage === 'master-db' && window.MasterDB) {
        MasterDB.applySearch();
    }
  },

  updateSaleModeUI() {
    const retailBtn = document.getElementById('sale-mode-retail');
    const wholesaleBtn = document.getElementById('sale-mode-wholesale');
    const badge = document.getElementById('topbar-mode-badge');

    if (!retailBtn || !wholesaleBtn) return;

    if (this.saleMode === 'wholesale') {
        wholesaleBtn.className = 'px-3 py-1 text-xs font-black rounded-lg transition-all bg-slate-900 text-white shadow-sm flex items-center gap-1.5 cursor-pointer';
        retailBtn.className = 'px-3 py-1 text-xs font-black rounded-lg transition-all text-slate-500 hover:text-slate-800 flex items-center gap-1.5 cursor-pointer';
        if (badge) {
          badge.className = 'px-3 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-extrabold flex items-center gap-1.5';
          badge.innerHTML = '<span class="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span> Active: Wholesale Selling Prices';
        }
    } else {
        retailBtn.className = 'px-3 py-1 text-xs font-black rounded-lg transition-all bg-slate-900 text-white shadow-sm flex items-center gap-1.5 cursor-pointer';
        wholesaleBtn.className = 'px-3 py-1 text-xs font-black rounded-lg transition-all text-slate-500 hover:text-slate-800 flex items-center gap-1.5 cursor-pointer';
        if (badge) {
          badge.className = 'px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-xs font-extrabold flex items-center gap-1.5';
          badge.innerHTML = '<span class="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span> Active: Retail Selling Prices';
        }
    }
    if (window.lucide) lucide.createIcons();
  },

  bindEvents() {
    document.getElementById('confirm-cancel-btn').addEventListener('click', () => this.hideConfirm());
    document.getElementById('confirm-alt-btn')?.addEventListener('click', () => {
      const cb = this.confirmAltCallback;
      this.hideConfirm();
      if (cb) cb();
    });
    document.getElementById('confirm-ok-btn').addEventListener('click', () => {
      const input = document.getElementById('prompt-input').value;
      const cb = this.confirmCallback;
      this.hideConfirm();
      if (cb) cb(input);
    });

    // Global Key Listener: Enter = Confirm/Save/Complete, Escape = Cancel/Back/Close
    window.addEventListener('keydown', (e) => {
      // 1. Confirm Modal (#confirm-modal) - Includes Confirm Invoice, Prompts, Alerts
      const confirmModal = document.getElementById('confirm-modal');
      if (confirmModal && !confirmModal.classList.contains('hidden') && confirmModal.classList.contains('flex')) {
        if (e.key === 'Enter') {
          if (document.activeElement && document.activeElement.tagName === 'TEXTAREA' && !e.ctrlKey) {
            return;
          }
          e.preventDefault();
          e.stopPropagation();
          const okBtn = document.getElementById('confirm-ok-btn');
          if (okBtn && !okBtn.classList.contains('hidden')) {
            okBtn.click();
          }
          return;
        } else if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          const cancelBtn = document.getElementById('confirm-cancel-btn');
          if (cancelBtn && !cancelBtn.classList.contains('hidden')) {
            cancelBtn.click();
          } else {
            this.hideConfirm();
          }
          return;
        }
      }

      // 2. Payment Modal (#payment-modal)
      const paymentModal = document.getElementById('payment-modal');
      if (paymentModal && !paymentModal.classList.contains('hidden') && paymentModal.classList.contains('flex')) {
        if (e.key === 'Enter') {
          e.preventDefault();
          e.stopPropagation();
          const confirmBtn = document.getElementById('payment-confirm-btn');
          if (confirmBtn) confirmBtn.click();
          return;
        } else if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          this.hidePaymentModal();
          return;
        }
      }

      // 3. Print Preview Modal (#preview-modal)
      const previewModal = document.getElementById('preview-modal');
      if (previewModal && !previewModal.classList.contains('hidden') && previewModal.classList.contains('flex')) {
        if (e.key === 'Enter') {
          e.preventDefault();
          e.stopPropagation();
          const printBtn = document.getElementById('preview-print-btn');
          if (printBtn) printBtn.click();
          return;
        } else if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          this.closePreview();
          return;
        }
      }

      // 4. Any other open modal across pages
      const visibleModals = Array.from(document.querySelectorAll('.fixed.inset-0:not(.hidden):not(#loading-overlay)'))
        .filter(m => {
          const style = window.getComputedStyle(m);
          return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
        });

      if (visibleModals.length > 0) {
        const topModal = visibleModals[visibleModals.length - 1];
        if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          const closeBtn = topModal.querySelector('button[title*="Close" i], button:has([data-lucide="x"]), button[onclick*="close" i], button[onclick*="hide" i], button.cancel-btn');
          if (closeBtn) {
            closeBtn.click();
          } else {
            topModal.click();
          }
          return;
        } else if (e.key === 'Enter') {
          if (document.activeElement && document.activeElement.tagName === 'TEXTAREA' && !e.ctrlKey) {
            return;
          }
          // Do not hijack Enter if inside New Purchase modal or dynamic item grids
          if (topModal.id === 'new-purchase-modal' || (document.activeElement && document.activeElement.closest('#new-purchase-modal'))) {
            return;
          }
          const submitBtn = topModal.querySelector('button[type="submit"], button.submit-btn, button.btn-primary, button[onclick*="save" i], button[onclick*="submit" i], button[onclick*="confirm" i]');
          if (submitBtn && submitBtn !== document.activeElement) {
            e.preventDefault();
            e.stopPropagation();
            submitBtn.click();
            return;
          }
        }
      }
    }, true);

    window.addEventListener('afterprint', () => {
      this.clearAllPrintContainers();
    });
  },

  async loadSettings() {
    const settings = await window.api.getSettings();
    const logoImg = document.getElementById('sidebar-logo');
    const logoPlaceholder = document.getElementById('sidebar-logo-placeholder');
    const title = document.getElementById('sidebar-title');

    if (settings.logo_path) {
      logoImg.src = 'file://' + settings.logo_path;
      logoImg.classList.remove('hidden');
      if (logoPlaceholder) logoPlaceholder.classList.add('hidden');
    } else {
      logoImg.classList.add('hidden');
      if (logoPlaceholder) logoPlaceholder.classList.remove('hidden');
    }

    if (settings.company_name) {
      title.textContent = settings.company_name;
    }
  },

  navigate(page, args) {
    // Support legacy stock_password configuration
    const stockPassword = window.storage.get('stock_password');
    const lockedTabs = window.storage.get('locked_tabs');
    if (stockPassword && (lockedTabs === null || lockedTabs === undefined)) {
        window.storage.set('locked_tabs', []);
    }

    const currentLockedTabs = window.storage.get('locked_tabs') || [];
    if (currentLockedTabs.includes(page) && stockPassword && (!this.unlockedTabs || !this.unlockedTabs[page])) {
        this.showTabPasswordPrompt(page, args);
        return;
    }

    this.currentPage = page;

    // Update active nav button
    document.querySelectorAll('.nav-btn').forEach(btn => {
      if (btn.id === `nav-${page}`) {
        btn.classList.add('bg-accent', 'text-slate-900', 'font-bold');
        btn.classList.remove('hover:bg-slate-800');
      } else {
        btn.classList.remove('bg-accent', 'text-slate-900', 'font-bold');
        btn.classList.add('hover:bg-slate-800');
      }
    });

    const content = document.getElementById('app-content');

    // Hide all existing tab panels
    const allPanels = content.querySelectorAll('.tab-page-panel');
    allPanels.forEach(p => p.classList.add('hidden'));

    let panel = document.getElementById(`tab-panel-${page}`);
    const isNew = !panel || panel.children.length === 0 || !panel.innerHTML.trim();
    const hasSpecificArgs = Boolean(args && (args.id || args.reset || Object.keys(args).length > 0));

    // If user was editing a sale in proposal-form and now clicks "New Sale" without an edit ID, reset to new sale
    const editingSaleToNewSale = (page === 'proposal-form' && window.SalesForm && SalesForm.editingSaleId && (!args || !args.id));

    if (!panel) {
      panel = document.createElement('div');
      panel.id = `tab-panel-${page}`;
      panel.className = 'tab-page-panel w-full h-full';
      content.appendChild(panel);
    }

    panel.classList.remove('hidden');

    if (page === 'proposal-form') {
      content.style.overflow = 'hidden';
      content.style.height = '100vh';
      content.classList.remove('p-8');
      content.classList.add('p-0');
    } else {
      content.style.overflow = '';
      content.style.height = '';
      content.classList.remove('p-0');
      content.classList.add('p-8');
    }

    if (isNew || hasSpecificArgs || editingSaleToNewSale) {
      // Route to corresponding module to render
      try {
        switch(page) {
          case 'dashboard': (window.Dashboard || Dashboard).render(panel); break;
          case 'proposals': (window.Proposals || Proposals).render(panel); break;
          case 'customers': (window.Customers || Customers).render(panel); break;
          case 'item-sales': (window.ItemSales || ItemSales).render(panel, args); break;
          case 'proposal-form': (window.SalesForm || SalesForm).render(panel, editingSaleToNewSale ? { reset: true } : args); break;
          case 'master-db': {
            const m = window.MasterDB || (typeof MasterDB !== 'undefined' ? MasterDB : null);
            if (m && typeof m.render === 'function') {
              Promise.resolve(m.render(panel)).catch(err => {
                console.error('[MasterDB render error]:', err);
              });
            }
            break;
          }
          case 'rate-list': (window.RateList || RateList).render(panel, args); break;
          case 'expenses': (window.Expenses || Expenses).render(panel); break;
          case 'companies': (window.Companies || Companies).render(panel); break;
          case 'reports': (window.Reports || Reports).render(panel); break;
          case 'settings': (window.Settings || Settings).render(panel); break;
        }
      } catch (renderErr) {
        console.error(`[navigate render error for ${page}]:`, renderErr);
      }
    } else {
      // Returning to an already-rendered tab without clearing state!
      if (page === 'proposals' && window.Proposals && typeof Proposals.loadData === 'function') {
        Proposals.loadData();
      } else if (page === 'dashboard' && window.Dashboard && typeof Dashboard.loadStats === 'function') {
        Dashboard.loadStats();
      } else if (page === 'customers' && window.Customers && typeof Customers.loadData === 'function') {
        Customers.loadData();
      } else if (page === 'item-sales' && window.ItemSales && typeof ItemSales.loadData === 'function') {
        ItemSales.loadData();
      } else if (page === 'expenses' && window.Expenses && typeof Expenses.loadData === 'function') {
        Expenses.loadData();
      } else if (page === 'companies' && window.Companies && typeof Companies.loadCompanies === 'function') {
        Companies.loadCompanies();
      } else if (page === 'proposal-form') {
        const sf = window.SalesForm || (typeof SalesForm !== 'undefined' ? SalesForm : null);
        if (sf) {
          if (typeof sf.refreshStockIndicators === 'function') sf.refreshStockIndicators();
          if (typeof sf.loadCustomers === 'function') sf.loadCustomers();
        }
      } else if (page === 'master-db') {
        const m = window.MasterDB || (typeof MasterDB !== 'undefined' ? MasterDB : null);
        if (m && typeof m.loadData === 'function') {
          m.loadData();
        }
      }
    }
    
    // Refresh Icons after rendering
    if (window.lucide) {
      lucide.createIcons();
    }
  },

  showTabPasswordPrompt(page, args) {
    this.pendingNavigation = { page, args };
    const content = document.getElementById('app-content');

    // Hide all existing tab panels
    const allPanels = content.querySelectorAll('.tab-page-panel');
    allPanels.forEach(p => p.classList.add('hidden'));

    let lockPanel = document.getElementById('tab-lock-prompt-panel');
    if (!lockPanel) {
      lockPanel = document.createElement('div');
      lockPanel.id = 'tab-lock-prompt-panel';
      lockPanel.className = 'tab-page-panel w-full h-full';
      content.appendChild(lockPanel);
    }
    lockPanel.classList.remove('hidden');

    content.style.overflow = '';
    content.style.height = '';
    content.classList.remove('p-0');
    content.classList.add('p-8');

    const tabNames = {
      'proposal-form': 'New Sale',
      'proposals': 'Sales History',
      'customers': 'Customers',
      'item-sales': 'Item Sales',
      'master-db': 'Stock',
      'rate-list': 'Rate List',
      'expenses': 'Expenses',
      'reports': 'Reports',
      'companies': 'Purchases',
      'dashboard': 'Dashboard',
      'settings': 'Settings'
    };
    const tabName = tabNames[page] || page;

    lockPanel.innerHTML = `
        <div class="flex flex-col items-center justify-center h-[60vh]">
            <div class="bg-white p-8 rounded-2xl shadow-xl border border-slate-100 max-w-md w-full text-center space-y-6">
                <div class="w-20 h-20 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto">
                    <i data-lucide="lock" class="w-10 h-10"></i>
                </div>
                <div>
                    <h2 class="text-2xl font-black text-slate-800">${tabName} Locked</h2>
                    <p class="text-slate-500 mt-2">Please enter the password to access locked tab.</p>
                </div>
                <form onsubmit="app.handleTabUnlock(event)" class="space-y-4 text-left">
                    <div>
                        <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Password</label>
                        <div class="relative">
                            <input type="password" id="tab-unlock-pass" class="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-4 pr-12 text-xl font-bold focus:bg-white focus:border-accent focus:ring-4 focus:ring-amber-50 outline-none" placeholder="••••••••" required autofocus>
                            <button type="button" onclick="app.toggleUnlockPasswordVisibility(this)" class="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1">
                                <i data-lucide="eye" class="w-6 h-6"></i>
                            </button>
                        </div>
                    </div>
                    <button type="submit" class="w-full bg-slate-900 text-white py-4 rounded-xl font-black uppercase text-sm tracking-widest hover:bg-slate-800 shadow-lg">
                        Unlock Access
                    </button>
                </form>
            </div>
        </div>
    `;
    if (window.lucide) lucide.createIcons();
    const unlockInput = document.getElementById('tab-unlock-pass');
    if (unlockInput) unlockInput.focus();
  },

  toggleUnlockPasswordVisibility(btn) {
    const input = document.getElementById('tab-unlock-pass');
    if (!input) return;
    if (input.type === 'password') {
      input.type = 'text';
      btn.innerHTML = '<i data-lucide="eye-off" class="w-6 h-6"></i>';
    } else {
      input.type = 'password';
      btn.innerHTML = '<i data-lucide="eye" class="w-6 h-6"></i>';
    }
    if (window.lucide) lucide.createIcons();
  },

  handleTabUnlock(e) {
    e.preventDefault();
    const pass = document.getElementById('tab-unlock-pass').value;
    const securityPassword = window.storage.get('stock_password');

    if (pass === securityPassword) {
        if (!this.unlockedTabs) this.unlockedTabs = {};
        const { page, args } = this.pendingNavigation;
        this.unlockedTabs[page] = true;
        const lockPanel = document.getElementById('tab-lock-prompt-panel');
        if (lockPanel) lockPanel.classList.add('hidden');
        this.navigate(page, args);
        this.pendingNavigation = null;
    } else {
        this.showAlert({
            title: 'Incorrect Password',
            message: 'The password you entered is incorrect. Please try again.',
            buttonText: 'Try Again'
        });
        document.getElementById('tab-unlock-pass').value = '';
        document.getElementById('tab-unlock-pass').focus();
    }
  },

  showLoading() {
    document.getElementById('loading-overlay').classList.remove('hidden');
    document.getElementById('loading-overlay').classList.add('flex');
  },

  hideLoading() {
    document.getElementById('loading-overlay').classList.add('hidden');
    document.getElementById('loading-overlay').classList.remove('flex');
  },

  showConfirm(config, legacyCallback) {
    if (typeof config === 'string') {
      config = { message: config, onConfirm: legacyCallback };
    }
    const { 
      title = 'Confirm', 
      message = 'Are you sure?', 
      confirmText = 'Confirm', 
      confirmColor = 'red', 
      altText = null, 
      onAlt = null, 
      previewHtml = null, 
      onConfirm 
    } = config || {};
    this.confirmCallback = onConfirm;
    this.confirmAltCallback = onAlt;
    
    document.getElementById('confirm-title').textContent = title;
    document.getElementById('confirm-message').innerHTML = message;
    
    const okBtn = document.getElementById('confirm-ok-btn');
    const cancelBtn = document.getElementById('confirm-cancel-btn');
    const altBtn = document.getElementById('confirm-alt-btn');
    const previewCol = document.getElementById('confirm-preview-col');
    const previewContent = document.getElementById('confirm-preview-content');
    const card = document.getElementById('confirm-card');
    
    cancelBtn.classList.remove('hidden');

    if (altBtn) {
      if (altText && onAlt) {
        altBtn.classList.remove('hidden');
        altBtn.innerHTML = `<i data-lucide="save" class="w-4 h-4 text-emerald-400"></i> <span>${altText}</span>`;
      } else {
        altBtn.classList.add('hidden');
      }
    }

    if (previewHtml && previewCol && previewContent && card) {
      previewCol.classList.remove('hidden');
      previewCol.classList.add('flex');
      previewContent.innerHTML = previewHtml;
      card.classList.remove('max-w-sm');
      card.classList.add('max-w-3xl', 'md:max-w-4xl', 'lg:max-w-5xl');
    } else {
      if (previewCol) {
        previewCol.classList.add('hidden');
        previewCol.classList.remove('flex');
      }
      if (previewContent) previewContent.innerHTML = '';
      if (card) {
        card.classList.remove('max-w-5xl', 'lg:max-w-5xl', 'max-w-4xl', 'md:max-w-4xl', 'max-w-3xl', 'max-w-2xl');
        card.classList.add('max-w-sm');
      }
    }
    
    const colorClasses = {
      red: 'bg-rose-600 hover:bg-rose-700',
      blue: 'bg-blue-600 hover:bg-blue-700',
      green: 'bg-emerald-600 hover:bg-emerald-700',
      orange: 'bg-amber-600 hover:bg-amber-700'
    };
    
    okBtn.className = `px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all shadow-sm flex items-center gap-2 ${colorClasses[confirmColor] || colorClasses.orange}`;
    
    if (confirmText.toLowerCase().includes('print')) {
      okBtn.innerHTML = `<i data-lucide="printer" class="w-4 h-4"></i> <span>${confirmText}</span>`;
    } else {
      okBtn.textContent = confirmText;
    }

    document.getElementById('confirm-icon-bg').className = `w-10 h-10 rounded-full flex items-center justify-center bg-${confirmColor === 'red' ? 'rose' : (confirmColor === 'blue' ? 'blue' : (confirmColor === 'green' ? 'emerald' : 'amber'))}-100 text-${confirmColor === 'red' ? 'rose' : (confirmColor === 'blue' ? 'blue' : (confirmColor === 'green' ? 'emerald' : 'amber'))}-600 shrink-0`;
    document.getElementById('confirm-icon').setAttribute('data-lucide', confirmColor === 'red' ? 'trash-2' : (confirmColor === 'green' ? 'check-circle' : 'info'));
    if (window.lucide) lucide.createIcons();

    const modal = document.getElementById('confirm-modal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    okBtn.focus();
  },

  hideConfirm() {
    const modal = document.getElementById('confirm-modal');
    const card = document.getElementById('confirm-card');
    const previewCol = document.getElementById('confirm-preview-col');
    const previewContent = document.getElementById('confirm-preview-content');
    const altBtn = document.getElementById('confirm-alt-btn');

    modal.classList.remove('flex');
    modal.classList.add('hidden');
    if (altBtn) altBtn.classList.add('hidden');
    this.confirmAltCallback = null;
    document.getElementById('prompt-container').classList.add('hidden');
    document.getElementById('prompt-input').value = '';
    document.getElementById('prompt-input').type = 'text';
    
    if (previewCol) {
      previewCol.classList.add('hidden');
      previewCol.classList.remove('flex');
    }
    if (previewContent) previewContent.innerHTML = '';
    if (card) {
      card.classList.remove('max-w-5xl', 'lg:max-w-5xl', 'max-w-4xl', 'md:max-w-4xl', 'max-w-3xl', 'max-w-2xl', 'md:max-w-3xl');
      card.classList.add('max-w-sm');
    }
    this.confirmCallback = null;
  },

  showAlert(config) {
    if (this.modalTimeout) clearTimeout(this.modalTimeout);
    if (typeof config === 'string') {
        config = { message: config };
    }
    const { title = 'Notice', message = '', buttonText = 'OK' } = config;
    document.getElementById('confirm-title').textContent = title;
    document.getElementById('confirm-message').innerHTML = message;
    
    const okBtn = document.getElementById('confirm-ok-btn');
    const cancelBtn = document.getElementById('confirm-cancel-btn');
    const previewCol = document.getElementById('confirm-preview-col');
    const previewContent = document.getElementById('confirm-preview-content');
    const card = document.getElementById('confirm-card');

    if (previewCol) {
      previewCol.classList.add('hidden');
      previewCol.classList.remove('flex');
    }
    if (previewContent) previewContent.innerHTML = '';
    if (card) {
      card.classList.remove('max-w-2xl', 'md:max-w-3xl');
      card.classList.add('max-w-sm');
    }
    
    okBtn.textContent = buttonText;
    cancelBtn.classList.add('hidden'); // Hide cancel for alerts
    
    this.confirmCallback = () => {
        cancelBtn.classList.remove('hidden'); // restore for next use
    };
    
    okBtn.className = `px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-accent hover:bg-amber-600`;
    document.getElementById('confirm-icon-bg').className = 'w-10 h-10 rounded-full flex items-center justify-center bg-amber-100 text-amber-600 shrink-0';
    document.getElementById('confirm-icon').setAttribute('data-lucide', 'info');
    if (window.lucide) lucide.createIcons();

    const modal = document.getElementById('confirm-modal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    okBtn.focus();
  },

  showToast(message, type = 'info') {
    let container = document.getElementById('app-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'app-toast-container';
      container.className = 'fixed top-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm pointer-events-none no-print';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    const bgColors = {
      success: 'bg-emerald-600 text-white border-emerald-500 shadow-emerald-900/20',
      error: 'bg-rose-600 text-white border-rose-500 shadow-rose-900/20',
      info: 'bg-slate-900 text-white border-slate-700 shadow-slate-900/30',
      warning: 'bg-amber-600 text-white border-amber-500 shadow-amber-900/20'
    };
    const icons = {
      success: 'check-circle',
      error: 'alert-circle',
      info: 'info',
      warning: 'alert-triangle'
    };

    const colorClass = bgColors[type] || bgColors.info;
    const iconName = icons[type] || icons.info;

    toast.className = `flex items-center gap-2.5 px-4 py-3 rounded-xl border shadow-xl text-xs font-bold pointer-events-auto ${colorClass}`;
    toast.innerHTML = `
      <i data-lucide="${iconName}" class="w-4 h-4 shrink-0"></i>
      <span class="flex-1">${message}</span>
    `;

    container.appendChild(toast);
    if (window.lucide) lucide.createIcons();

    setTimeout(() => {
      toast.remove();
    }, 2800);
  },

  showPrompt({ title = 'Input Required', message = '', value = '', type = 'text', confirmText = 'Submit', onConfirm }) {
    this.confirmCallback = onConfirm;
    
    document.getElementById('confirm-title').textContent = title;
    document.getElementById('confirm-message').textContent = message;
    
    const previewCol = document.getElementById('confirm-preview-col');
    const previewContent = document.getElementById('confirm-preview-content');
    const card = document.getElementById('confirm-card');

    if (previewCol) {
      previewCol.classList.add('hidden');
      previewCol.classList.remove('flex');
    }
    if (previewContent) previewContent.innerHTML = '';
    if (card) {
      card.classList.remove('max-w-2xl', 'md:max-w-3xl');
      card.classList.add('max-w-sm');
    }

    const inputContainer = document.getElementById('prompt-container');
    const input = document.getElementById('prompt-input');
    const toggleBtn = document.getElementById('prompt-toggle-btn');
    inputContainer.classList.remove('hidden');
    input.value = value;
    input.type = type;

    if (type === 'password') {
      if (toggleBtn) {
        toggleBtn.classList.remove('hidden');
        toggleBtn.innerHTML = '<i data-lucide="eye" class="w-4 h-4"></i>';
      }
    } else {
      if (toggleBtn) {
        toggleBtn.classList.add('hidden');
      }
    }
    
    const okBtn = document.getElementById('confirm-ok-btn');
    const cancelBtn = document.getElementById('confirm-cancel-btn');
    cancelBtn.classList.remove('hidden');
    okBtn.textContent = confirmText;
    okBtn.className = `px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-accent hover:bg-amber-600`;
    
    document.getElementById('confirm-icon-bg').className = 'w-10 h-10 rounded-full flex items-center justify-center bg-amber-100 text-amber-600 shrink-0';
    document.getElementById('confirm-icon').setAttribute('data-lucide', type === 'password' ? 'lock' : 'edit-3');
    if (window.lucide) lucide.createIcons();

    const modal = document.getElementById('confirm-modal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    input.focus();
  },

  verifyPassword({ title = 'Security Verification', message = 'Please enter your password to proceed:', onVerified, onCancel }) {
    const password = window.storage.get('stock_password');
    if (!password) {
      if (onVerified) onVerified();
      return;
    }
    this.showPrompt({
      title,
      message,
      type: 'password',
      confirmText: 'Verify',
      onConfirm: (input) => {
        if (input === password) {
          if (onVerified) onVerified();
        } else {
          this.showAlert({
            title: 'Incorrect Password',
            message: 'Authentication failed. Action cancelled.',
            buttonText: 'OK'
          });
          if (onCancel) onCancel();
        }
      }
    });
  },

  togglePromptPasswordVisibility() {
    const input = document.getElementById('prompt-input');
    const btn = document.getElementById('prompt-toggle-btn');
    if (!input || !btn) return;
    if (input.type === 'password') {
      input.type = 'text';
      btn.innerHTML = '<i data-lucide="eye-off" class="w-4 h-4"></i>';
    } else {
      input.type = 'password';
      btn.innerHTML = '<i data-lucide="eye" class="w-4 h-4"></i>';
    }
    if (window.lucide) lucide.createIcons();
  },

  formatCurrency(amount) {
    const num = Math.round((Number(amount || 0)) * 100) / 100;
    const hasDecimals = (num % 1) !== 0;
    return num.toLocaleString('en-IN', { 
      style: 'currency', 
      currency: 'PKR', 
      minimumFractionDigits: hasDecimals ? 2 : 0, 
      maximumFractionDigits: 2 
    }).replace('PKR', 'Rs.');
  },

  formatNumber(amount) {
    const num = Math.round((Number(amount || 0)) * 100) / 100;
    const hasDecimals = (num % 1) !== 0;
    return num.toLocaleString('en-IN', { 
      minimumFractionDigits: hasDecimals ? 2 : 0, 
      maximumFractionDigits: 2 
    });
  },

  formatAmount(amount) {
    const num = Math.round((Number(amount || 0)) * 100) / 100;
    const hasDecimals = (num % 1) !== 0;
    return num.toLocaleString('en-IN', { 
      minimumFractionDigits: hasDecimals ? 2 : 0, 
      maximumFractionDigits: 2 
    });
  },

  formatQty(val) {
    if (val === null || val === undefined || val === '') return '0';
    const num = Math.round((Number(val) || 0) * 100) / 100;
    return num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  },

  formatStock(totalBoxes) {
    const boxes = Math.round((Number(totalBoxes) || 0) * 100) / 100;
    return `${this.formatQty(boxes)} Bx`;
  },

  formatStockShort(totalBoxes) {
    const boxes = Math.round((Number(totalBoxes) || 0) * 100) / 100;
    return `${this.formatQty(boxes)}`;
  },

  parseStockBoxes(boxes) {
    return parseInt(boxes) || 0;
  },

  formatDate(dateStr) {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (isNaN(d)) return dateStr;
      return `${d.getDate()}-${d.getMonth() + 1}-${d.getFullYear()}`;
    } catch {
      return dateStr;
    }
  },

  formatDateTime(dateStr) {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (isNaN(d)) return dateStr;
      
      const date = `${d.getDate()}-${d.getMonth() + 1}-${d.getFullYear()}`;
      const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
      return `${time} ${date}`;
    } catch {
      return dateStr;
    }
  },

  showPaymentModal({ title, subtitle, total, alreadyReceived = 0, info = null, defaultMethod = 'Cash', buttonText = 'Complete Sale', onConfirm }) {
    this.paymentCallback = onConfirm;
    const modal = document.getElementById('payment-modal');
    const card = document.getElementById('payment-card');
    const input = document.getElementById('payment-input');
    const totalDisplay = document.getElementById('payment-total-display');
    const alreadyReceivedBox = document.getElementById('payment-already-received-box');
    const alreadyReceivedDisplay = document.getElementById('payment-already-received-display');
    const remainingDisplay = document.getElementById('payment-remaining-display');
    const infoBox = document.getElementById('payment-info-box');
    const btnText = document.getElementById('payment-btn-text');
    const okBtn = document.getElementById('payment-confirm-btn');

    document.getElementById('payment-title').textContent = title || 'Receive Payment';
    document.getElementById('payment-subtitle').textContent = subtitle || 'Transaction Settlement';
    totalDisplay.textContent = this.formatCurrency(total);
    btnText.textContent = buttonText;

    if (info) {
        infoBox.innerHTML = info;
        infoBox.classList.remove('hidden');
    } else {
        infoBox.classList.add('hidden');
    }

    if (alreadyReceived > 0) {
        alreadyReceivedBox.classList.remove('hidden');
        alreadyReceivedDisplay.textContent = this.formatCurrency(alreadyReceived);
    } else {
        alreadyReceivedBox.classList.add('hidden');
    }

    // Reset payment method
    this.setPaymentMethod(defaultMethod || 'Cash');

    // Reset input
    const maxVal = Math.round(total - alreadyReceived);
    input.value = maxVal;
    const updateRemaining = () => {
        let val = parseInt(input.value, 10) || 0;
        const maxAllowed = Math.round(total - alreadyReceived);
        
        if (val > maxAllowed) {
            val = maxAllowed;
            input.value = val;
        }

        const rem = maxAllowed - val;
        remainingDisplay.textContent = this.formatCurrency(rem);
        if (rem < 0) {
            remainingDisplay.classList.add('text-rose-600');
            remainingDisplay.classList.remove('text-emerald-600');
        } else if (rem === 0) {
            remainingDisplay.classList.add('text-emerald-600');
            remainingDisplay.classList.remove('text-rose-600');
        } else {
            remainingDisplay.classList.add('text-rose-600');
            remainingDisplay.classList.remove('text-emerald-600');
        }
    };

    input.oninput = () => {
        input.value = input.value.replace(/\D/g, '');
        updateRemaining();
    };
    updateRemaining();

    okBtn.onclick = () => {
        const val = parseInt(input.value, 10) || 0;
        const method = this.currentPaymentMethod || 'Cash';
        const cb = this.paymentCallback;
        this.hidePaymentModal();
        if (cb) cb(val, method);
    };

    modal.classList.remove('hidden');
    modal.classList.add('flex');
    input.focus();
    input.select();
  },

  setPaymentMethod(method) {
    this.currentPaymentMethod = method || 'Cash';
    const pmCash = document.getElementById('pm-cash');
    const pmOnline = document.getElementById('pm-online');
    if (this.currentPaymentMethod.toLowerCase() === 'cash') {
      if (pmCash) {
        pmCash.className = 'flex-1 py-1.5 text-[10px] font-black rounded-lg bg-slate-900 text-white shadow-sm cursor-pointer';
      }
      if (pmOnline) {
        pmOnline.className = 'flex-1 py-1.5 text-[10px] font-black rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer';
      }
    } else {
      if (pmOnline) {
        pmOnline.className = 'flex-1 py-1.5 text-[10px] font-black rounded-lg bg-indigo-600 text-white shadow-sm cursor-pointer';
      }
      if (pmCash) {
        pmCash.className = 'flex-1 py-1.5 text-[10px] font-black rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer';
      }
    }
  },

  hidePaymentModal() {
    const modal = document.getElementById('payment-modal');
    modal.classList.remove('flex');
    modal.classList.add('hidden');
    this.paymentCallback = null;
  },

  showPreview(html, title = 'Receipt Preview', subtitle = '80MM THERMAL RECEIPT', targetContainerId = 'receipt-print') {
    this.setPrintContent(targetContainerId, html);
    const previewEl = document.getElementById('preview-paper');
    if (previewEl) previewEl.innerHTML = html;

    const titleEl = document.getElementById('preview-title');
    const subtitleEl = document.getElementById('preview-subtitle');
    if (titleEl) titleEl.textContent = title;
    if (subtitleEl) subtitleEl.textContent = subtitle;

    const printBtn = document.getElementById('confirm-print-btn');
    if (printBtn) {
      printBtn.onclick = () => this.confirmPrint();
    }

    const modal = document.getElementById('preview-modal');
    if (modal) {
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    }
  },

  closePreview() {
    const modal = document.getElementById('preview-modal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    
    if (this.currentPage === 'proposal-form' && SalesForm.onClosePreview) {
        SalesForm.onClosePreview();
    }
  },

  setPrintContent(targetId, html) {
    const printContainerIds = [
      'receipt-print',
      'db-print-container',
      'voucher-print',
      'report-print-container'
    ];

    printContainerIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        if (id === targetId) {
          el.innerHTML = html;
          el.classList.add('active-print-target');
        } else {
          el.innerHTML = '';
          el.classList.remove('active-print-target');
        }
      }
    });
  },

  clearAllPrintContainers() {
    const printContainerIds = [
      'receipt-print',
      'db-print-container',
      'voucher-print',
      'report-print-container'
    ];

    printContainerIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.innerHTML = '';
        el.classList.remove('active-print-target');
      }
    });
  },

  async printReceipt(options = {}) {
    let result;
    if (window.api && window.api.printReceipt) {
      try {
        result = await window.api.printReceipt(options);
      } catch (err) {
        console.warn('API printReceipt failed, falling back to window.print', err);
        window.print();
        result = { success: true, fallback: true };
      }
    } else {
      window.print();
      result = { success: true, fallback: true };
    }
    this.clearAllPrintContainers();
    return result;
  },

  async confirmPrint() {
    const modal = document.getElementById('preview-modal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    
    await this.printReceipt();
    
    if (this.currentPage === 'proposal-form' && SalesForm.onAfterPrint) {
        SalesForm.onAfterPrint();
    }
  },

  // Calculator State & Logic
  calcState: {
    current: '0',
    previous: null,
    operator: null,
    isNewNumber: true,
    history: '',
    isOpen: false
  },

  initCalculator() {
    // Click outside listener to close calculator
    document.addEventListener('mousedown', (e) => {
      if (!this.calcState || !this.calcState.isOpen) return;
      const calcWidget = document.getElementById('quick-calculator-widget');
      const calcBtn = document.getElementById('sidebar-calc-btn');
      if (calcWidget && !calcWidget.contains(e.target) && (!calcBtn || !calcBtn.contains(e.target))) {
        this.closeCalculator();
      }
    });

    // Keyboard listener
    document.addEventListener('keydown', (e) => {
      if (!this.calcState || !this.calcState.isOpen) return;
      if (e.key === 'Escape') {
        this.closeCalculator();
        return;
      }
      // If user is actively typing in an input/textarea, allow normal typing
      const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
      if (activeTag === 'input' || activeTag === 'textarea' || (document.activeElement && document.activeElement.isContentEditable)) {
        return;
      }

      if (e.key >= '0' && e.key <= '9') {
        this.calcAction('num', e.key);
      } else if (e.key === '.') {
        this.calcAction('dot');
      } else if (e.key === '+' || e.key === '-' || e.key === '*' || e.key === '/') {
        this.calcAction('op', e.key);
      } else if (e.key === 'Enter' || e.key === '=') {
        e.preventDefault();
        this.calcAction('equals');
      } else if (e.key === 'Backspace') {
        this.calcAction('backspace');
      } else if (e.key.toLowerCase() === 'c' || e.key === 'Delete') {
        this.calcAction('clear');
      } else if (e.key === '%') {
        this.calcAction('percent');
      }
    });

    // Draggable header support
    const header = document.getElementById('calc-header');
    const widget = document.getElementById('quick-calculator-widget');
    if (header && widget) {
      let isDragging = false;
      let startX, startY, origLeft, origTop;

      header.addEventListener('mousedown', (e) => {
        if (e.target.closest('button')) return;
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        const rect = widget.getBoundingClientRect();
        origLeft = rect.left;
        origTop = rect.top;
        widget.style.bottom = 'auto';
        widget.style.left = `${origLeft}px`;
        widget.style.top = `${origTop}px`;
        e.preventDefault();
      });

      document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        const newLeft = Math.max(10, Math.min(window.innerWidth - widget.offsetWidth - 10, origLeft + dx));
        const newTop = Math.max(10, Math.min(window.innerHeight - widget.offsetHeight - 10, origTop + dy));
        widget.style.left = `${newLeft}px`;
        widget.style.top = `${newTop}px`;
      });

      document.addEventListener('mouseup', () => {
        isDragging = false;
      });
    }
  },

  toggleCalculator(e) {
    if (e) e.stopPropagation();
    if (this.calcState && this.calcState.isOpen) {
      this.closeCalculator();
    } else {
      this.openCalculator();
    }
  },

  openCalculator() {
    const widget = document.getElementById('quick-calculator-widget');
    if (!widget) return;
    if (!this.calcState) {
      this.calcState = { current: '0', previous: null, operator: null, isNewNumber: true, history: '', isOpen: false };
    }
    this.calcState.isOpen = true;
    widget.classList.remove('hidden');
    const btn = document.getElementById('sidebar-calc-btn');
    if (btn) {
      btn.classList.add('bg-slate-800', 'border-amber-500/50', 'text-amber-400');
    }
    this.updateCalcDisplay();
    if (window.lucide) lucide.createIcons();
  },

  closeCalculator() {
    const widget = document.getElementById('quick-calculator-widget');
    if (!widget) return;
    if (this.calcState) {
      this.calcState.isOpen = false;
    }
    widget.classList.add('hidden');
    const btn = document.getElementById('sidebar-calc-btn');
    if (btn) {
      btn.classList.remove('bg-slate-800', 'border-amber-500/50', 'text-amber-400');
    }
  },

  calcAction(action, value = null) {
    if (!this.calcState) return;
    let s = this.calcState;
    if (action === 'num') {
      if (s.isNewNumber || s.current === '0') {
        s.current = value;
        s.isNewNumber = false;
      } else {
        if (s.current.length < 14) {
          s.current += value;
        }
      }
    } else if (action === 'dot') {
      if (s.isNewNumber) {
        s.current = '0.';
        s.isNewNumber = false;
      } else if (!s.current.includes('.')) {
        s.current += '.';
      }
    } else if (action === 'op') {
      const curNum = parseFloat(s.current);
      if (s.previous !== null && !s.isNewNumber && s.operator) {
        const res = this._evalCalc(s.previous, curNum, s.operator);
        s.current = String(Number(res.toFixed(6)));
        s.previous = parseFloat(s.current);
      } else {
        s.previous = curNum;
      }
      s.operator = value;
      s.isNewNumber = true;
      const opSym = value === '*' ? '×' : (value === '/' ? '÷' : (value === '-' ? '−' : '+'));
      s.history = `${s.previous} ${opSym}`;
    } else if (action === 'equals') {
      if (s.operator && s.previous !== null) {
        const curNum = parseFloat(s.current);
        const opSym = s.operator === '*' ? '×' : (s.operator === '/' ? '÷' : (s.operator === '-' ? '−' : '+'));
        const res = this._evalCalc(s.previous, curNum, s.operator);
        const formattedRes = String(Number(res.toFixed(6)));
        s.history = `${s.previous} ${opSym} ${curNum} =`;
        s.current = formattedRes;
        s.previous = null;
        s.operator = null;
        s.isNewNumber = true;
      }
    } else if (action === 'clear') {
      s.current = '0';
      s.previous = null;
      s.operator = null;
      s.history = '';
      s.isNewNumber = true;
    } else if (action === 'backspace') {
      if (!s.isNewNumber && s.current.length > 0) {
        s.current = s.current.slice(0, -1);
        if (s.current === '' || s.current === '-') {
          s.current = '0';
          s.isNewNumber = true;
        }
      }
    } else if (action === 'percent') {
      const val = parseFloat(s.current) / 100;
      s.current = String(Number(val.toFixed(6)));
    } else if (action === 'plusminus') {
      if (s.current !== '0') {
        if (s.current.startsWith('-')) {
          s.current = s.current.slice(1);
        } else {
          s.current = '-' + s.current;
        }
      }
    }
    this.updateCalcDisplay();
  },

  _evalCalc(a, b, op) {
    switch (op) {
      case '+': return a + b;
      case '-': return a - b;
      case '*': return a * b;
      case '/': return b !== 0 ? (a / b) : 0;
      default: return b;
    }
  },

  updateCalcDisplay() {
    const disp = document.getElementById('calc-display');
    const hist = document.getElementById('calc-history');
    if (!this.calcState) return;
    if (disp) {
      let num = this.calcState.current;
      if (!num.includes('e') && !num.includes('E')) {
        const parts = num.split('.');
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        disp.textContent = parts.join('.');
      } else {
        disp.textContent = num;
      }
    }
    if (hist) {
      hist.textContent = this.calcState.history || '';
    }
  },

  copyCalculatorResult() {
    if (!this.calcState) return;
    const val = this.calcState.current;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(val);
    }
    const hist = document.getElementById('calc-history');
    if (hist) {
      const prev = hist.textContent;
      hist.textContent = 'Copied to clipboard!';
      hist.classList.add('text-emerald-400');
      setTimeout(() => {
        hist.textContent = prev;
        hist.classList.remove('text-emerald-400');
      }, 1200);
    }
  }
};

window.storage = {
  get: (key) => {
    try {
      const val = localStorage.getItem(key);
      return val ? JSON.parse(val) : null;
    } catch (e) { return null; }
  },
  set: (key, val) => {
    try {
      const jsonStr = JSON.stringify(val);
      localStorage.setItem(key, jsonStr);
      if (window.api && window.api.setKv) {
        window.api.setKv(key, jsonStr);
      }
    } catch (e) {
      console.error("Storage set error:", e);
    }
  }
};

document.addEventListener('DOMContentLoaded', () => {
  app.init();
});
