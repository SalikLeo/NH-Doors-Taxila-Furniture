const Customers = window.Customers = {
  customers: [],
  proposals: [],
  filteredCustomers: [],
  selectedCustomerId: null,
  editingCustomerId: null,
  filterType: 'all',
  ledgerPage: 1,
  ledgerPageSize: 50,
  currentLedgerHistory: [],

  async render(container) {
    container.innerHTML = `
      <div class="flex flex-col h-full max-h-full overflow-hidden">
        <!-- Top Title & Action Bar -->
        <div class="flex justify-between items-center mb-6 flex-wrap gap-4 shrink-0 no-print">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 border border-amber-200/80 flex items-center justify-center shrink-0 shadow-2xs">
              <i data-lucide="users" class="w-5 h-5"></i>
            </div>
            <h2 class="text-3xl font-bold text-slate-800">Customers Khata</h2>
          </div>
          <div class="flex items-center gap-2 shrink-0">
            <button type="button" onclick="Customers.printSummaryReport()" class="h-10 px-3.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm rounded-xl flex items-center gap-2 shadow-sm hover:shadow transition-all active:scale-95 border border-slate-900 cursor-pointer">
              <i data-lucide="printer" class="w-4 h-4 text-amber-400"></i>
              <span>Print Balances</span>
            </button>
            <button type="button" onclick="Customers.openCustomerModal()" class="h-10 px-4 bg-accent hover:bg-amber-500 text-slate-950 font-bold text-sm rounded-xl flex items-center gap-2 shadow-sm hover:shadow transition-all active:scale-95 border border-amber-400/50 cursor-pointer">
              <i data-lucide="user-plus" class="w-4 h-4 stroke-[2.5]"></i>
              <span>Add Customer</span>
            </button>
          </div>
        </div>

        <!-- Compact Stats Cards Row -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-3 shrink-0">
          <div class="bg-white p-2.5 px-3 rounded-xl shadow-sm border border-slate-200/80 flex items-center gap-3 border-l-4 border-l-amber-500">
            <div class="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <i data-lucide="users" class="w-4 h-4"></i>
            </div>
            <div class="min-w-0">
              <p class="text-[9px] font-black text-slate-400 uppercase tracking-wider truncate">Registered Customers</p>
              <h3 id="cust-stat-count" class="text-sm font-black text-slate-800 tabular-nums">0</h3>
            </div>
          </div>

          <div class="bg-white p-2.5 px-3 rounded-xl shadow-sm border border-slate-200/80 flex items-center gap-3 border-l-4 border-l-rose-500">
            <div class="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
              <i data-lucide="wallet" class="w-4 h-4"></i>
            </div>
            <div class="min-w-0">
              <p class="text-[9px] font-black text-slate-400 uppercase tracking-wider truncate">Total Credit Due (Khata)</p>
              <h3 id="cust-stat-due" class="text-sm font-black text-rose-600 tabular-nums font-display truncate">Rs. 0</h3>
            </div>
          </div>

          <div class="bg-white p-2.5 px-3 rounded-xl shadow-sm border border-slate-200/80 flex items-center gap-3 border-l-4 border-l-blue-500">
            <div class="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <i data-lucide="receipt" class="w-4 h-4"></i>
            </div>
            <div class="min-w-0">
              <p class="text-[9px] font-black text-slate-400 uppercase tracking-wider truncate">Total Invoiced Billed</p>
              <h3 id="cust-stat-billed" class="text-sm font-black text-slate-800 tabular-nums font-display truncate">Rs. 0</h3>
            </div>
          </div>

          <div class="bg-white p-2.5 px-3 rounded-xl shadow-sm border border-slate-200/80 flex items-center gap-3 border-l-4 border-l-emerald-500">
            <div class="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <i data-lucide="check-circle" class="w-4 h-4"></i>
            </div>
            <div class="min-w-0">
              <p class="text-[9px] font-black text-slate-400 uppercase tracking-wider truncate">Total Cash Received</p>
              <h3 id="cust-stat-received" class="text-sm font-black text-emerald-600 tabular-nums font-display truncate">Rs. 0</h3>
            </div>
          </div>
        </div>

        <!-- Master-Detail Side-by-Side Split View (Fixed Viewport Bound) -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-3.5 h-[calc(100vh-195px)] max-h-[calc(100vh-195px)] overflow-hidden">
          
          <!-- Left Column (4 cols): Customer List Table -->
          <div class="lg:col-span-5 bg-white rounded-2xl shadow-sm border border-slate-200/80 flex flex-col min-h-0 overflow-hidden">
            <!-- Search & Filters Header -->
            <div class="p-3 border-b border-slate-100 bg-slate-50 flex flex-col gap-2 shrink-0">
              <div class="relative w-full">
                <i data-lucide="search" class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
                <input type="text" 
                       id="cust-search-input" 
                       oninput="Customers.applyFilters()" 
                       placeholder="Search customer or phone..." 
                       class="w-full pl-9 pr-8 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100 transition-all">
                <button type="button" 
                        id="cust-search-clear-btn" 
                        onclick="Customers.clearSearch()" 
                        title="Clear search"
                        class="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-all cursor-pointer hidden">
                  <i data-lucide="x" class="w-3.5 h-3.5"></i>
                </button>
              </div>

              <div class="flex items-center justify-between gap-2">
                <span class="text-[10px] font-black uppercase tracking-wider text-slate-400" id="cust-list-count">0 Customers</span>
                <select id="cust-filter-balance" onchange="Customers.applyFilters()" class="bg-white border border-slate-200 rounded-lg px-2 py-1 text-[11px] font-bold text-slate-700 outline-none cursor-pointer">
                  <option value="all">All Customers</option>
                  <option value="due_only">With Balance Only</option>
                  <option value="cleared_only">Cleared (Rs. 0)</option>
                </select>
              </div>
            </div>

            <!-- Left Customers Table -->
            <div class="flex-1 overflow-y-auto custom-scrollbar">
              <table class="w-full text-left border-collapse">
                <thead class="bg-slate-50 sticky top-0 z-10 border-b border-slate-200 text-[10px] font-black text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th class="py-2.5 px-2.5 w-8 text-center border-r border-slate-200">#</th>
                    <th class="py-2.5 px-3 border-r border-slate-200">Customer Name (Phone)</th>
                    <th class="py-2.5 px-3 text-right border-r border-slate-200 w-28">Khata Due</th>
                    <th class="py-2.5 px-2 text-center w-16">Action</th>
                  </tr>
                </thead>
                <tbody id="customers-table-body" class="divide-y divide-slate-200 bg-white text-xs">
                  <!-- Injected via renderList() -->
                </tbody>
              </table>
            </div>
          </div>

          <!-- Right Column (7 cols): Selected Customer Full Ledger Table -->
          <div class="lg:col-span-7 bg-white rounded-2xl shadow-sm border border-slate-200/80 flex flex-col min-h-0 overflow-hidden">
            
            <!-- Ledger Header -->
            <div class="p-3.5 border-b border-slate-100 bg-slate-50 flex items-center justify-between gap-3 flex-wrap shrink-0">
              <div class="flex items-center gap-3 min-w-0">
                <div class="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 border border-amber-200/80 flex items-center justify-center shrink-0 shadow-2xs">
                  <i data-lucide="book-open" class="w-5 h-5"></i>
                </div>
                <div class="min-w-0">
                  <div class="flex items-center gap-2 flex-wrap">
                    <h3 id="right-ledger-cust-name" class="font-black text-base text-slate-900 truncate">Select Customer</h3>
                    <span id="right-ledger-cust-phone" class="text-xs font-mono font-bold text-slate-500"></span>
                  </div>
                  <p id="right-ledger-cust-address" class="text-[11px] font-medium text-slate-400 truncate">Click a customer from the left to view full transactions</p>
                </div>
              </div>

              <!-- Action buttons for selected customer -->
              <div id="right-ledger-actions" class="flex items-center gap-2 hidden">
                <button type="button" 
                        onclick="Customers.receivePaymentForSelected()" 
                        class="h-8 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl flex items-center gap-1.5 shadow-sm transition-all cursor-pointer">
                  <i data-lucide="wallet" class="w-3.5 h-3.5"></i>
                  <span>Receive Payment</span>
                </button>
                <button type="button" 
                        onclick="Customers.printSelectedCustomerLedger()" 
                        class="h-8 px-3 bg-slate-900 hover:bg-slate-800 text-amber-400 font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm transition-all cursor-pointer" 
                        title="Print 80mm Khata Statement">
                  <i data-lucide="printer" class="w-3.5 h-3.5"></i>
                  <span>Print Khata</span>
                </button>
              </div>
            </div>

            <!-- Customer Summary Metrics Strip -->
            <div id="right-ledger-metrics" class="px-4 py-2 bg-slate-100/70 border-b border-slate-200/80 flex items-center justify-between gap-4 text-xs font-bold text-slate-600 flex-wrap shrink-0 hidden">
              <div>Total Billed: <span class="text-slate-900 font-black" id="right-metric-billed">Rs. 0</span></div>
              <div>Total Paid: <span class="text-emerald-700 font-black" id="right-metric-received">Rs. 0</span></div>
              <div class="text-sm">Khata Balance: <span class="font-black text-rose-600" id="right-metric-balance">Rs. 0</span></div>
            </div>

            <!-- Right Transactions Table (Scrollable) -->
            <div class="flex-1 overflow-y-auto custom-scrollbar">
              <table class="w-full text-left border-collapse text-xs">
                <thead class="bg-slate-50 sticky top-0 z-10 border-b border-slate-200 text-[10px] font-black text-slate-500 uppercase tracking-wider shadow-sm">
                  <tr>
                    <th class="py-2.5 px-3 border-r border-slate-200 w-10 text-center">#</th>
                    <th class="py-2.5 px-3 border-r border-slate-200">Date & Time</th>
                    <th class="py-2.5 px-3 border-r border-slate-200">Type / Ref #</th>
                    <th class="py-2.5 px-2.5 text-center border-r border-slate-200">Method</th>
                    <th class="py-2.5 px-3 text-right border-r border-slate-200">Billed (Rs.)</th>
                    <th class="py-2.5 px-3 text-right border-r border-slate-200">Received (Rs.)</th>
                    <th class="py-2.5 px-3 text-right border-r border-slate-200">Due (Rs.)</th>
                    <th class="py-2.5 px-3 border-r border-slate-200">Description</th>
                    <th class="py-2.5 px-2 text-center w-24">Action</th>
                  </tr>
                </thead>
                <tbody id="right-ledger-tbody" class="divide-y divide-slate-200 bg-white">
                  <tr>
                    <td colspan="9" class="py-16 text-center text-slate-400 font-medium">
                      <i data-lucide="user-check" class="w-10 h-10 mx-auto mb-2 opacity-30 text-slate-400"></i>
                      <p class="font-bold text-sm text-slate-600">Select a customer from the left</p>
                      <p class="text-xs text-slate-400 mt-1">Their full ledger and transaction history will appear here.</p>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div id="right-ledger-pagination-footer" class="shrink-0"></div>
          </div>

        </div>
      </div>

      <!-- Add / Edit Customer Modal -->
      <div id="customer-modal" onclick="if(event.target === this) Customers.closeCustomerModal()" class="fixed inset-0 bg-slate-900/60 hidden items-center justify-center z-[500] backdrop-blur-md transition-opacity opacity-0 p-4">
        <div class="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden transform transition-all scale-95" id="customer-modal-card">
          <div class="px-6 py-4 bg-slate-900 text-white flex justify-between items-center">
            <div class="flex items-center gap-2.5">
              <div class="w-8 h-8 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-black">
                <i data-lucide="user-plus" class="w-4 h-4"></i>
              </div>
              <h3 id="customer-modal-title" class="font-black text-base">Add New Customer</h3>
            </div>
            <button type="button" onclick="Customers.closeCustomerModal()" class="text-slate-400 hover:text-white transition-colors cursor-pointer">
              <i data-lucide="x" class="w-5 h-5"></i>
            </button>
          </div>

          <form id="customer-form" onsubmit="Customers.saveCustomerForm(event)" class="p-6 space-y-4">
            <div>
              <label class="block text-xs font-black uppercase text-slate-500 mb-1">Customer Full Name <span class="text-rose-500">*</span></label>
              <input type="text" id="cust-name-input" required placeholder="e.g. Muhammad Ali" class="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:bg-white focus:border-amber-500 outline-none">
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-black uppercase text-slate-500 mb-1">11-Digit Phone Number <span class="text-rose-500">*</span></label>
                <input type="tel" 
                       id="cust-phone-input" 
                       required 
                       maxlength="11"
                       oninput="this.value = this.value.replace(/\D/g, '').slice(0, 11);"
                       placeholder="e.g. 03001234567" 
                       class="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:bg-white focus:border-amber-500 outline-none">
              </div>
              <div>
                <label class="block text-xs font-black uppercase text-slate-500 mb-1">Opening Due Balance (Rs.)</label>
                <input type="number" 
                       id="cust-amount-input" 
                       value="0" 
                       min="0"
                       step="1" 
                       oninput="this.value = this.value.replace(/\D/g, '');"
                       placeholder="0" 
                       class="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:bg-white focus:border-amber-500 outline-none">
              </div>
            </div>

            <div>
              <label class="block text-xs font-black uppercase text-slate-500 mb-1">Address / Street / Area</label>
              <input type="text" id="cust-address-input" placeholder="e.g. Street 4, Lala Rukh, Wah Cantt" class="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:bg-white focus:border-amber-500 outline-none">
            </div>

            <div>
              <label class="block text-xs font-black uppercase text-slate-500 mb-1">Notes / Description</label>
              <input type="text" id="cust-notes-input" placeholder="e.g. Local regular customer" class="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:bg-white focus:border-amber-500 outline-none">
            </div>

            <div class="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button type="button" onclick="Customers.closeCustomerModal()" class="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all cursor-pointer">Cancel</button>
              <button type="submit" class="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs transition-all cursor-pointer">Save Customer</button>
            </div>
          </form>
        </div>
      </div>
    `;

    await this.loadData();
  },

  async loadData() {
    try {
      this.customers = await window.api.getCustomers() || [];
      this.proposals = await window.api.getProposals() || [];

      this.updateStats();

      // Determine selected customer
      if (this.customers.length > 0) {
        if (!this.selectedCustomerId || !this.customers.some(c => c.id === this.selectedCustomerId)) {
          this.selectedCustomerId = this.customers[0]?.id || null;
        }
      } else {
        this.selectedCustomerId = null;
      }

      this.applyFilters();
      const customer = this.customers.find(c => c.id === this.selectedCustomerId);
      this.renderRightLedger(customer || null);

      // Keep SalesForm customer list in sync immediately
      if (window.SalesForm && typeof SalesForm.loadCustomers === 'function') {
        SalesForm.loadCustomers();
      }
    } catch (e) {
      console.error(e);
      app.showAlert("Error loading customers data.");
    }
  },

  updateStats() {
    let totalDue = 0;
    let totalBilled = 0;

    (this.customers || []).forEach(c => {
      totalDue += (c.amount || 0);
    });

    (this.proposals || []).forEach(s => {
      totalBilled += (s.retail_total || 0);
    });

    const totalReceived = Math.max(0, totalBilled - totalDue);

    const countEl = document.getElementById('cust-stat-count');
    const dueEl = document.getElementById('cust-stat-due');
    const billedEl = document.getElementById('cust-stat-billed');
    const receivedEl = document.getElementById('cust-stat-received');

    if (countEl) countEl.textContent = (this.customers || []).length;
    if (dueEl) dueEl.textContent = app.formatCurrency(totalDue);
    if (billedEl) billedEl.textContent = app.formatCurrency(totalBilled);
    if (receivedEl) receivedEl.textContent = app.formatCurrency(totalReceived);
  },

  clearSearch() {
    const input = document.getElementById('cust-search-input');
    if (input) {
      input.value = '';
      input.focus();
    }
    this.applyFilters();
  },

  applyFilters() {
    const searchInput = document.getElementById('cust-search-input');
    const clearBtn = document.getElementById('cust-search-clear-btn');
    const term = (searchInput?.value || '').toLowerCase().trim();

    if (clearBtn) {
      if ((searchInput?.value || '').length > 0) clearBtn.classList.remove('hidden');
      else clearBtn.classList.add('hidden');
    }

    const balanceFilter = document.getElementById('cust-filter-balance')?.value || 'all';

    this.filteredCustomers = this.customers.filter(c => {
      const matchesSearch = 
        (c.name || '').toLowerCase().includes(term) ||
        (c.phone || '').toLowerCase().includes(term) ||
        (c.address || '').toLowerCase().includes(term) ||
        (c.description || '').toLowerCase().includes(term);

      if (!matchesSearch) return false;

      const bal = Number(c.amount || 0);
      if (balanceFilter === 'due_only') return bal > 0.001;
      if (balanceFilter === 'cleared_only') return bal <= 0.001;
      return true;
    });

    this.filteredCustomers.sort((a, b) => {
      if (term) {
        const nameA = (a.name || '').toLowerCase();
        const nameB = (b.name || '').toLowerCase();
        const startsA = nameA.startsWith(term);
        const startsB = nameB.startsWith(term);
        if (startsA && !startsB) return -1;
        if (!startsA && startsB) return 1;

        const wordsA = nameA.split(/[\s\-&/]+/);
        const wordsB = nameB.split(/[\s\-&/]+/);
        const wordStartsA = wordsA.some(w => w.startsWith(term));
        const wordStartsB = wordsB.some(w => w.startsWith(term));
        if (wordStartsA && !wordStartsB) return -1;
        if (!wordStartsA && wordStartsB) return 1;
      }

      const aBal = Number(a.amount) || 0;
      const bBal = Number(b.amount) || 0;
      if (bBal !== aBal) {
        return bBal - aBal; // Highest due amount at the top
      }
      return (a.name || '').localeCompare(b.name || '');
    });

    const countLabel = document.getElementById('cust-list-count');
    if (countLabel) countLabel.textContent = `${this.filteredCustomers.length} Customer${this.filteredCustomers.length === 1 ? '' : 's'}`;

    this.renderList();
  },

  renderList() {
    const tbody = document.getElementById('customers-table-body');
    if (!tbody) return;

    if (this.filteredCustomers.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="4" class="py-12 text-center text-slate-400 font-medium">
            <i data-lucide="users" class="w-8 h-8 mx-auto mb-1.5 opacity-30 text-slate-400"></i>
            <p class="font-bold text-xs text-slate-600">No customers found</p>
            <p class="text-[10px] text-slate-400 mt-0.5">Try searching with a different term.</p>
          </td>
        </tr>
      `;
      if (window.lucide) lucide.createIcons();
      return;
    }

    tbody.innerHTML = this.filteredCustomers.map((c, idx) => {
      const isSelected = c.id === this.selectedCustomerId;
      const balance = c.amount || 0;
      const isDue = balance > 0.01;

      return `
        <tr onclick="Customers.selectCustomer(${c.id})" 
            class="transition-all cursor-pointer select-none border-b border-slate-200 ${isSelected ? 'bg-amber-100/90 border-l-[5px] border-l-amber-600 font-black text-slate-950 ring-1 ring-inset ring-amber-300/80 shadow-xs' : 'hover:bg-slate-50 border-l-[5px] border-l-transparent'}">
          <!-- Row # -->
          <td class="py-2.5 px-2.5 text-center font-bold text-slate-400 tabular-nums border-r border-slate-200 text-xs">
            ${idx + 1}
          </td>

          <!-- Customer Name (Phone in brackets) -->
          <td class="py-2.5 px-3 border-r border-slate-200">
            <div class="flex flex-col min-w-0">
              <div class="font-black ${isSelected ? 'text-slate-950' : 'text-slate-900'} uppercase text-xs truncate leading-snug">
                ${c.name} <span class="${isSelected ? 'text-slate-700 font-bold' : 'text-slate-500 font-bold'} text-xs">(${c.phone || 'No Phone'})</span>
              </div>
              ${c.address ? `<span class="text-[11px] ${isSelected ? 'text-slate-600 font-semibold' : 'text-slate-400 font-medium'} truncate">${c.address}</span>` : ''}
            </div>
          </td>

          <!-- Khata Due Amount -->
          <td class="py-2.5 px-3 text-right border-r border-slate-200 font-black font-display text-xs ${isDue ? 'text-rose-600' : (isSelected ? 'text-slate-900' : 'text-slate-700')} tabular-nums">
            ${app.formatCurrency(balance)}
          </td>

          <!-- Quick Action Buttons -->
          <td class="py-2 px-2 text-center" onclick="event.stopPropagation()">
            <div class="flex items-center justify-center gap-1">
              <button type="button" onclick="Customers.openCustomerModal(${c.id})" class="p-1 text-blue-600 hover:bg-blue-50 rounded-md transition-colors cursor-pointer" title="Edit Customer">
                <i data-lucide="edit-3" class="w-3.5 h-3.5"></i>
              </button>
              ${isDue ? `
                <button type="button" onclick="Customers.deleteCustomer(${c.id})" class="p-1 text-slate-300 hover:text-rose-500 rounded-md transition-colors cursor-pointer" title="Cannot delete: Outstanding Khata Balance of ${app.formatCurrency(balance)}">
                  <i data-lucide="trash-2" class="w-3.5 h-3.5 opacity-50"></i>
                </button>
              ` : `
                <button type="button" onclick="Customers.deleteCustomer(${c.id})" class="p-1 text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer" title="Delete Customer">
                  <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                </button>
              `}
            </div>
          </td>
        </tr>
      `;
    }).join('');

    if (window.lucide) lucide.createIcons();
  },

  selectCustomer(id) {
    this.selectedCustomerId = id;
    this.ledgerPage = 1;
    this.renderList();
    const customer = this.customers.find(c => c.id === id);
    this.renderRightLedger(customer);
  },

  renderRightLedger(customer) {
    const custNameEl = document.getElementById('right-ledger-cust-name');
    const custPhoneEl = document.getElementById('right-ledger-cust-phone');
    const custAddrEl = document.getElementById('right-ledger-cust-address');
    const actionsEl = document.getElementById('right-ledger-actions');
    const metricsEl = document.getElementById('right-ledger-metrics');
    const tbody = document.getElementById('right-ledger-tbody');
    const footer = document.getElementById('right-ledger-pagination-footer');

    if (!customer) {
      if (custNameEl) custNameEl.textContent = 'No Customer Selected';
      if (custPhoneEl) custPhoneEl.textContent = '';
      if (custAddrEl) custAddrEl.textContent = 'Add or select a customer to view their transactions';
      if (actionsEl) actionsEl.classList.add('hidden');
      if (metricsEl) metricsEl.classList.add('hidden');
      if (footer) footer.innerHTML = '';
      if (tbody) {
        tbody.innerHTML = `
          <tr>
            <td colspan="8" class="py-16 text-center text-slate-400 font-medium">
              <i data-lucide="user-x" class="w-10 h-10 mx-auto mb-2 opacity-30 text-slate-400"></i>
              <p class="font-bold text-sm text-slate-600">No customer selected</p>
              <p class="text-xs text-slate-400 mt-1">Please select or add a customer to see their transaction ledger.</p>
            </td>
          </tr>
        `;
        if (window.lucide) lucide.createIcons();
      }
      return;
    }

    if (custNameEl) custNameEl.textContent = customer.name;
    if (custPhoneEl) custPhoneEl.textContent = customer.phone ? `(${customer.phone})` : '';
    if (custAddrEl) custAddrEl.textContent = customer.address ? `Address: ${customer.address}` : (customer.description || 'Wah Cantt');
    if (actionsEl) actionsEl.classList.remove('hidden');
    if (metricsEl) metricsEl.classList.remove('hidden');

    // Customer Invoices & Ledger Computation
    const custSales = this.proposals.filter(p => 
      (p.customer_name && p.customer_name.toLowerCase() === (customer.name || '').toLowerCase()) ||
      (p.phone && customer.phone && p.phone.replace(/[^0-9]/g, '') === customer.phone.replace(/[^0-9]/g, ''))
    );

    const totalBilled = custSales.reduce((acc, p) => acc + (p.retail_total || 0), 0);
    const balance = Math.max(0, customer.amount || 0);
    const totalReceived = Math.max(0, totalBilled - balance);

    const billedMetric = document.getElementById('right-metric-billed');
    const rcvdMetric = document.getElementById('right-metric-received');
    const balMetric = document.getElementById('right-metric-balance');

    if (billedMetric) billedMetric.textContent = app.formatCurrency(totalBilled);
    if (rcvdMetric) rcvdMetric.textContent = app.formatCurrency(totalReceived);
    if (balMetric) balMetric.textContent = app.formatCurrency(balance);

    // Combine invoices & manual payments chronologically
    let history = [];

    custSales.forEach(s => {
      const billed = s.retail_total || 0;
      const received = s.received_amount !== undefined ? s.received_amount : billed;
      const due = Math.max(0, billed - received);
      history.push({
        proposalId: s.id,
        date: s.date,
        type: 'Invoice',
        rawRef: s.proposal_number,
        ref: `#${s.proposal_number}`,
        method: s.payment_method || 'Cash',
        billed: billed,
        received: received,
        due: due,
        balanceAfter: due,
        desc: `Sales Invoice #${s.proposal_number}${due > 0 ? ' (Partial Khata)' : ' (Paid)'}`
      });
    });

    const txns = window.storage ? (window.storage.get(`customers-${customer.id}-transactions`) || []) : [];
    txns.forEach(t => {
      const isPay = t.type === 'payment';
      const refCode = t.invoice_number ? `#${t.invoice_number}` : (t.invoice_no ? `#${t.invoice_no}` : (t.ref || 'Payment Repay'));
      history.push({
        txnId: t.id,
        date: t.date,
        type: isPay ? 'Payment' : 'Invoice',
        rawRef: t.invoice_number || t.invoice_no || '',
        ref: refCode,
        method: t.method || 'Cash',
        billed: isPay ? 0 : (t.amount || t.total || 0),
        received: isPay ? (t.amount || 0) : (t.received || 0),
        due: t.due !== undefined ? t.due : 0,
        balanceAfter: t.balance !== undefined ? t.balance : (t.balanceAfter || 0),
        desc: t.notes || t.description || (isPay ? 'Khata Repayment Received' : 'Sale Added to Khata')
      });
    });

    // Remove duplicates if same invoice was captured in both
    const seen = new Set();
    const uniqueHistory = [];
    history.forEach(item => {
      const key = `${item.ref}-${item.date ? item.date.slice(0, 16) : ''}-${item.billed}-${item.received}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueHistory.push(item);
      }
    });

    // Sort by date desc
    uniqueHistory.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    if (!tbody) return;

    this.currentLedgerHistory = uniqueHistory;

    if (uniqueHistory.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="9" class="py-12 text-center text-slate-400 font-medium">
            <i data-lucide="receipt" class="w-8 h-8 mx-auto mb-1 opacity-30 text-slate-400"></i>
            <p class="font-bold text-xs text-slate-600">No transactions recorded for ${customer.name} yet</p>
            <p class="text-[10px] text-slate-400 mt-0.5">Sales invoices or repayments will appear here in chronological order.</p>
          </td>
        </tr>
      `;
      if (footer) footer.innerHTML = '';
    } else {
      const total = uniqueHistory.length;
      const totalPages = Math.ceil(total / this.ledgerPageSize);
      if (this.ledgerPage > totalPages) this.ledgerPage = totalPages;
      if (this.ledgerPage < 1) this.ledgerPage = 1;

      const startIdx = (this.ledgerPage - 1) * this.ledgerPageSize;
      const endIdx = Math.min(startIdx + this.ledgerPageSize, total);
      const paginated = uniqueHistory.slice(startIdx, endIdx);

      tbody.innerHTML = paginated.map((item, idx) => {
        const rowNum = startIdx + idx + 1;
        const isInvoice = item.type === 'Invoice';
        const hasDue = item.due > 0.01;

        return `
        <tr class="hover:bg-slate-50/80 transition-colors border-b border-slate-200">
          <td class="py-2.5 px-3 font-bold text-slate-400 text-center border-r border-slate-200 tabular-nums">${rowNum}</td>
          <td class="py-2.5 px-3 font-semibold text-slate-700 whitespace-nowrap border-r border-slate-200">${app.formatDateTime(item.date)}</td>
          <td class="py-2.5 px-3 font-black text-slate-900 border-r border-slate-200 whitespace-nowrap">
            <span class="${item.type === 'Payment' ? 'text-emerald-700' : 'text-slate-900'}">${item.ref}</span>
          </td>
          <td class="py-2.5 px-2.5 text-center border-r border-slate-200">
            <span class="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-tight ${item.method?.toLowerCase() === 'online' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'bg-slate-100 text-slate-700 border border-slate-200'}">
              ${item.method || 'Cash'}
            </span>
          </td>
          <td class="py-2.5 px-3 text-right font-black text-slate-900 font-display border-r border-slate-200 tabular-nums">
            ${item.billed > 0 ? app.formatCurrency(item.billed) : '-'}
          </td>
          <td class="py-2.5 px-3 text-right font-black text-emerald-600 font-display border-r border-slate-200 tabular-nums">
            ${item.received > 0 ? app.formatCurrency(item.received) : '-'}
          </td>
          <td class="py-2.5 px-3 text-right font-black ${hasDue ? 'text-rose-600' : 'text-slate-700'} font-display border-r border-slate-200 tabular-nums">
            ${hasDue ? app.formatCurrency(item.due) : '-'}
          </td>
          <td class="py-2.5 px-3 text-slate-600 font-medium text-[11px] truncate max-w-[180px] border-r border-slate-200" title="${item.desc}">
            ${item.desc}
          </td>
          <td class="py-2 px-2 text-center whitespace-nowrap">
            ${isInvoice ? (
              hasDue ? `
                <button type="button" 
                        onclick="Customers.markSalePaid('${item.proposalId || ''}', '${item.rawRef || item.ref || ''}', ${item.txnId || 'null'}, ${item.billed || 0}, ${item.received || 0}, ${item.due || 0})" 
                        class="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] rounded-lg shadow-xs transition-all active:scale-95 cursor-pointer" 
                        title="Receive Payment for this Invoice">
                  <i data-lucide="check" class="w-3.5 h-3.5 stroke-[3]"></i>
                  <span>Mark Paid</span>
                </button>
              ` : `
                <span class="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-md">
                  <i data-lucide="check" class="w-3 h-3 stroke-[3]"></i> Paid
                </span>
              `
            ) : `
              <span class="text-slate-300 font-bold text-xs">-</span>
            `}
          </td>
        </tr>
      `;}).join('');

      if (footer) {
        if (total <= this.ledgerPageSize) {
          footer.innerHTML = `
            <div class="flex items-center justify-between px-4 py-2 bg-slate-50 border-t border-slate-100 text-xs font-bold text-slate-500">
              <span>Showing all <span class="font-black text-slate-800">${total}</span> transaction${total === 1 ? '' : 's'}</span>
            </div>
          `;
        } else {
          footer.innerHTML = `
            <div class="flex items-center justify-between px-4 py-2 bg-slate-50 border-t border-slate-100 text-xs font-bold text-slate-600 flex-wrap gap-2 select-none">
              <div>
                Showing <span class="font-black text-slate-900">${startIdx + 1}</span> - <span class="font-black text-slate-900">${endIdx}</span> of <span class="font-black text-slate-900">${total}</span>
              </div>
              <div class="flex items-center gap-1.5">
                <button type="button" ${this.ledgerPage <= 1 ? 'disabled class="opacity-40 cursor-not-allowed"' : 'onclick="Customers.changeLedgerPage(' + (this.ledgerPage - 1) + ')" class="cursor-pointer hover:bg-slate-200 active:scale-95"'} class="px-2.5 py-1 bg-white border border-slate-200 rounded-md text-slate-700 font-bold transition-all flex items-center gap-1">
                  <i data-lucide="chevron-left" class="w-3.5 h-3.5"></i>
                  <span>Prev</span>
                </button>
                <span class="px-2.5 py-1 bg-white border border-slate-200 rounded-md text-slate-800 font-black">
                  Page ${this.ledgerPage} of ${totalPages}
                </span>
                <button type="button" ${this.ledgerPage >= totalPages ? 'disabled class="opacity-40 cursor-not-allowed"' : 'onclick="Customers.changeLedgerPage(' + (this.ledgerPage + 1) + ')" class="cursor-pointer hover:bg-slate-200 active:scale-95"'} class="px-2.5 py-1 bg-white border border-slate-200 rounded-md text-slate-700 font-bold transition-all flex items-center gap-1">
                  <span>Next</span>
                  <i data-lucide="chevron-right" class="w-3.5 h-3.5"></i>
                </button>
              </div>
            </div>
          `;
        }
      }
    }

    if (window.lucide) lucide.createIcons();
  },

  changeLedgerPage(page) {
    this.ledgerPage = page;
    const customer = this.customers.find(c => c.id === this.selectedCustomerId);
    this.renderRightLedger(customer);
  },

  async markSalePaid(proposalId, refStr, txnId, billed = 0, alreadyReceived = 0, dueAmount = 0) {
    const cleanRef = String(refStr || '').replace(/^#/, '').trim();
    const customer = this.customers.find(c => c.id === this.selectedCustomerId);
    const custName = customer ? customer.name : '';

    let totalBilled = billed;
    let receivedSoFar = alreadyReceived;
    let due = dueAmount;

    if (!totalBilled && proposalId) {
      const p = this.proposals.find(x => String(x.id) === String(proposalId) || x.proposal_number === cleanRef);
      if (p) {
        totalBilled = p.retail_total || 0;
        receivedSoFar = p.received_amount !== undefined ? p.received_amount : 0;
        due = Math.max(0, totalBilled - receivedSoFar);
      }
    }

    if (!totalBilled && txnId && this.selectedCustomerId) {
      const txKey = `customers-${this.selectedCustomerId}-transactions`;
      const txList = window.storage ? (window.storage.get(txKey) || []) : [];
      const t = txList.find(x => x.id === txnId);
      if (t) {
        totalBilled = t.amount || t.total || 0;
        receivedSoFar = t.received || 0;
        due = t.due !== undefined ? t.due : Math.max(0, totalBilled - receivedSoFar);
      }
    }

    if (!totalBilled) {
      totalBilled = due || (customer ? customer.amount : 0);
      receivedSoFar = 0;
      due = totalBilled;
    }

    app.showPaymentModal({
      title: 'Receive Invoice Payment',
      subtitle: `Invoice #${cleanRef}${custName ? ' â€¢ ' + custName : ''}`,
      total: totalBilled,
      alreadyReceived: receivedSoFar,
      buttonText: 'Receive & Settle',
      onConfirm: async (amountReceived, method) => {
        if (amountReceived <= 0) return;

        try {
          app.showLoading();

          // 1. Update in SQLite database proposals table if linked
          if (proposalId || cleanRef) {
            try {
              await window.api.receivePayment(proposalId || cleanRef, amountReceived, method || 'Cash');
            } catch (err) {
              console.warn("Could not update proposal via SQLite:", err);
            }
          }

          // 2. Adjust Customer's Khata Balance in DB
          if (this.selectedCustomerId) {
            const currentCust = this.customers.find(c => c.id === this.selectedCustomerId);
            if (currentCust) {
              const oldBal = currentCust.amount || 0;
              const newBal = Math.max(0, oldBal - amountReceived);
              await window.api.saveCustomer({
                ...currentCust,
                amount: newBal
              });
            }

            // 3. Update customer's transaction storage & log payment
            const txKey = `customers-${this.selectedCustomerId}-transactions`;
            const txList = window.storage ? (window.storage.get(txKey) || []) : [];

            txList.forEach(t => {
              const tRef = String(t.invoice_number || t.invoice_no || '').replace(/^#/, '').trim();
              if ((txnId && t.id === txnId) || (cleanRef && tRef === cleanRef)) {
                t.received = (t.received || 0) + amountReceived;
                t.due = Math.max(0, (t.amount || t.total || 0) - t.received);
                t.notes = t.due === 0 ? `Invoice #${cleanRef} (Paid/Cleared)` : `Invoice #${cleanRef} (Partial Khata - Due: Rs. ${t.due})`;
              }
            });

            const newTxn = {
              id: Date.now(),
              type: 'payment',
              invoice_number: cleanRef,
              amount: amountReceived,
              method: method || 'Cash',
              notes: `Payment of ${app.formatCurrency(amountReceived)} received for Invoice #${cleanRef} via ${method || 'Cash'}`,
              description: `Payment received for Invoice #${cleanRef}`,
              date: new Date().toISOString(),
              balance: Math.max(0, (customer ? customer.amount : 0) - amountReceived),
              due: 0
            };
            txList.unshift(newTxn);
            window.storage.set(txKey, txList);
          }

          app.hideLoading();
          app.showToast(`Received ${app.formatCurrency(amountReceived)} for Invoice #${cleanRef}!`, 'success');
          await this.loadData();
          if (this.selectedCustomerId) {
            this.selectCustomer(this.selectedCustomerId);
          }
        } catch (err) {
          console.error("Failed to mark sale paid:", err);
          app.hideLoading();
          app.showToast("Error: " + err.message, "error");
        }
      }
    });
  },

  receivePaymentForSelected() {
    if (!this.selectedCustomerId) return;
    this.receivePaymentModal(this.selectedCustomerId);
  },

  printSelectedCustomerLedger() {
    if (!this.selectedCustomerId) return;
    this.printCustomerLedger(this.selectedCustomerId);
  },

  openCustomerModal(id = null) {
    this.editingCustomerId = id;
    const modal = document.getElementById('customer-modal');
    const card = document.getElementById('customer-modal-card');
    const title = document.getElementById('customer-modal-title');
    const form = document.getElementById('customer-form');

    form.reset();

    if (id) {
      const c = this.customers.find(x => x.id === id);
      if (c) {
        title.textContent = 'Edit Customer';
        document.getElementById('cust-name-input').value = c.name || '';
        document.getElementById('cust-phone-input').value = c.phone || '';
        document.getElementById('cust-amount-input').value = c.amount || 0;
        document.getElementById('cust-address-input').value = c.address || '';
        document.getElementById('cust-notes-input').value = c.description || '';
      }
    } else {
      title.textContent = 'Add New Customer';
      document.getElementById('cust-amount-input').value = 0;
    }

    modal.classList.remove('hidden');
    modal.classList.add('flex');
    setTimeout(() => {
      modal.classList.remove('opacity-0');
      card.classList.remove('scale-95');
      document.getElementById('cust-name-input').focus();
    }, 20);
    if (window.lucide) lucide.createIcons();
  },

  closeCustomerModal() {
    const modal = document.getElementById('customer-modal');
    const card = document.getElementById('customer-modal-card');
    if (!modal || !card) return;

    modal.classList.add('opacity-0');
    card.classList.add('scale-95');
    setTimeout(() => {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
      this.editingCustomerId = null;
    }, 150);
  },

  async saveCustomerForm(e) {
    e.preventDefault();
    const name = document.getElementById('cust-name-input')?.value.trim();
    const phoneRaw = document.getElementById('cust-phone-input')?.value.trim();
    const phone = (phoneRaw || '').replace(/\D/g, '').slice(0, 11);
    const amount = parseInt(document.getElementById('cust-amount-input')?.value, 10) || 0;
    const address = document.getElementById('cust-address-input')?.value.trim() || '';
    const notes = document.getElementById('cust-notes-input')?.value.trim() || '';

    if (!name) return app.showAlert('Please enter customer full name.');
    if (!phone || phone.length !== 11) return app.showAlert('Please enter a valid 11-digit phone number (e.g. 03001234567).');

    app.showLoading();
    try {
      const payload = {
        name,
        phone,
        address,
        amount,
        description: notes
      };

      if (this.editingCustomerId) {
        payload.id = this.editingCustomerId;
      }

      const savedId = await window.api.saveCustomer(payload);
      this.closeCustomerModal();
      this.selectedCustomerId = this.editingCustomerId || savedId;
      await this.loadData();
    } catch (err) {
      console.error(err);
      app.showAlert('Error saving customer details.');
    } finally {
      app.hideLoading();
    }
  },

  deleteCustomer(id) {
    const c = this.customers.find(x => x.id === id);
    if (!c) return;

    // Check if customer has any due amount
    const balance = Number(c.amount || 0);
    if (balance > 0.01) {
      return app.showAlert({
        title: 'Cannot Delete Customer',
        message: `Customer <b>${c.name}</b> has an outstanding Khata balance of <b>${app.formatCurrency(balance)}</b>.<br><br>Customers with an active balance or unpaid dues cannot be deleted. Please receive and settle the payment first.`,
        buttonText: 'OK'
      });
    }

    app.verifyPassword({
      title: 'Delete Customer Verification',
      message: 'Enter security password to delete this customer account:',
      onVerified: () => {
        app.showConfirm({
          title: 'Delete Customer',
          message: `Are you sure you want to permanently delete customer <b>${c.name}</b>? All khata records will be removed.`,
          confirmText: 'Delete',
          confirmColor: 'red',
          onConfirm: async () => {
            app.showLoading();
            try {
              await window.api.deleteCustomer(id);
              window.storage.set(`customers-${id}-transactions`, []);
              if (this.selectedCustomerId === id) {
                this.selectedCustomerId = null;
              }
              await this.loadData();
            } catch (err) {
              console.error(err);
              app.showAlert('Error deleting customer.');
            } finally {
              app.hideLoading();
            }
          }
        });
      }
    });
  },

  receivePaymentModal(customerId) {
    const c = this.customers.find(x => x.id === customerId);
    if (!c) return;

    app.showPaymentModal({
      title: 'Receive Khata Payment',
      subtitle: `Customer: ${c.name} (${c.phone || 'No Phone'})`,
      total: c.amount || 0,
      alreadyReceived: 0,
      buttonText: 'Receive & Settle',
      onConfirm: async (amountReceived, method) => {
        if (amountReceived <= 0) return;

        app.showLoading();
        try {
          // 1. Gather all customer sales/proposals
          const custSales = (this.proposals || []).filter(p => 
            (p.customer_name && p.customer_name.toLowerCase() === (c.name || '').toLowerCase()) ||
            (p.phone && c.phone && p.phone.replace(/[^0-9]/g, '') === c.phone.replace(/[^0-9]/g, ''))
          );

          // 2. Identify all unpaid proposals and sort in chronological order ASC (Oldest first / Bottom up)
          const unpaidProposals = custSales
            .map(p => {
              const billed = Number(p.retail_total || 0);
              const received = (p.received_amount !== undefined && p.received_amount !== null) ? Number(p.received_amount) : billed;
              const due = Math.max(0, billed - received);
              return {
                id: p.id,
                proposal_number: p.proposal_number,
                date: p.date,
                billed,
                received,
                due
              };
            })
            .filter(p => p.due > 0.01)
            .sort((a, b) => {
              const timeA = a.date ? new Date(a.date).getTime() : 0;
              const timeB = b.date ? new Date(b.date).getTime() : 0;
              return (timeA - timeB) || (a.id - b.id);
            });

          // 3. Load transactions storage
          const txnKey = `customers-${c.id}-transactions`;
          const transactions = window.storage ? (window.storage.get(txnKey) || []) : [];

          // 4. Settle unpaid invoices in FIFO order (Oldest / Bottom first)
          let remainingToApply = amountReceived;
          const settledInvoices = [];

          for (const inv of unpaidProposals) {
            if (remainingToApply <= 0) break;
            const payAmount = Math.min(remainingToApply, inv.due);
            if (payAmount <= 0) continue;

            // Update in SQLite proposals table
            try {
              await window.api.receivePayment(inv.id, payAmount, method || 'Cash');
            } catch (err) {
              console.warn("Could not update proposal in DB:", err);
            }

            // Update matching invoice in txList storage if present
            const cleanRef = String(inv.proposal_number || '').replace(/^#/, '').trim();
            transactions.forEach(t => {
              const tRef = String(t.invoice_number || t.invoice_no || '').replace(/^#/, '').trim();
              if (cleanRef && tRef === cleanRef) {
                t.received = (t.received || 0) + payAmount;
                t.due = Math.max(0, (t.amount || t.total || 0) - t.received);
                t.notes = t.due <= 0.01 
                  ? `Invoice #${cleanRef} (Paid/Cleared)` 
                  : `Invoice #${cleanRef} (Partial Khata - Due: Rs. ${Math.round(t.due)})`;
              }
            });

            settledInvoices.push({
              ref: `#${inv.proposal_number}`,
              applied: payAmount,
              remainingDue: Math.max(0, inv.due - payAmount)
            });

            remainingToApply -= payAmount;
          }

          // If there are standalone unpaid transactions in storage not in proposals
          if (remainingToApply > 0) {
            const unpaidTxns = transactions
              .filter(t => t.type !== 'payment' && (t.due || 0) > 0.01)
              .sort((a, b) => new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime());

            for (const t of unpaidTxns) {
              if (remainingToApply <= 0) break;
              const due = t.due || 0;
              const payAmount = Math.min(remainingToApply, due);
              if (payAmount <= 0) continue;

              t.received = (t.received || 0) + payAmount;
              t.due = Math.max(0, (t.amount || t.total || 0) - t.received);
              const refStr = t.invoice_number || t.invoice_no || 'Khata';
              t.notes = t.due <= 0.01 ? `Invoice #${refStr} (Paid/Cleared)` : `Invoice #${refStr} (Partial Khata - Due: Rs. ${Math.round(t.due)})`;

              remainingToApply -= payAmount;
            }
          }

          // 5. Update Customer Balance in SQLite DB
          const newBalance = Math.max(0, (c.amount || 0) - amountReceived);
          await window.api.saveCustomer({
            ...c,
            amount: newBalance
          });

          // 6. Record the Payment in transaction log
          const descText = settledInvoices.length > 0
            ? `Payment settled towards ${settledInvoices.map(s => `${s.ref} (Rs. ${Math.round(s.applied)})`).join(', ')}`
            : `Khata Payment received via ${method || 'Cash'}`;

          const newTxn = {
            id: Date.now(),
            type: 'payment',
            amount: amountReceived,
            method: method || 'Cash',
            notes: descText,
            description: `Payment received towards Khata balance`,
            date: new Date().toISOString(),
            balance: newBalance,
            due: 0
          };
          transactions.unshift(newTxn);
          if (window.storage) window.storage.set(txnKey, transactions);

          await this.loadData();
          this.selectCustomer(c.id);

          app.showToast(`Received ${app.formatCurrency(amountReceived)}! Oldest debts settled first.`, 'success');
          app.showAlert({
            title: 'Payment Received & Settled',
            message: `Successfully received <b>${app.formatCurrency(amountReceived)}</b> via ${method || 'Cash'}.<br><br>` +
                     `<b>Settlement Details (Oldest to Newest):</b><br>` +
                     (settledInvoices.length > 0 
                       ? settledInvoices.map(s => `â€¢ <b>${s.ref}</b>: Paid Rs. ${Math.round(s.applied)} ${s.remainingDue <= 0 ? '<span class="text-emerald-600 font-bold">(Fully Settled)</span>' : `<span class="text-rose-600 font-bold">(Remaining Due: Rs. ${Math.round(s.remainingDue)})</span>`}`).join('<br>')
                       : 'Applied to overall Khata balance.') +
                     `<br><br>Remaining Khata Balance: <b>${app.formatCurrency(newBalance)}</b>.`
          });
        } catch (err) {
          console.error("Error processing Khata payment:", err);
          app.showAlert('Error recording payment: ' + (err.message || err));
        } finally {
          app.hideLoading();
        }
      }
    });
  },

  async printCustomerLedger(customerId) {
    const c = this.customers.find(x => x.id === customerId);
    if (!c) return;

    const settings = await window.api.getSettings() || {};
    const balance = Math.max(0, c.amount || 0);

    const html = `
      <div class="receipt-80mm" style="width: 100%; max-width: 80mm; margin: 0 auto; padding: 4px 6px; background: #fff; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #000; font-size: 11px; line-height: 1.35; box-sizing: border-box;">
        <!-- Header -->
        <div style="text-align: center; margin-bottom: 4px;">
          <h1 style="font-size: 16px; font-weight: 900; margin: 0 0 2px 0; text-transform: uppercase; letter-spacing: 0.5px; line-height: 1.2;">${settings.company_name || 'NH DOORS'}</h1>
          <div style="font-size: 10.5px; font-weight: 600; line-height: 1.25;">${settings.address || 'Taxila'}</div>
          ${settings.phone ? `<div style="font-size: 10.5px; font-weight: 700; line-height: 1.3; margin-top: 2px;">${settings.phone.split(',').map(p => `<div>${p.trim()}</div>`).join('')}</div>` : ''}
          <div style="margin-top: 5px;">
            <span style="display: inline-block; border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 2px 12px; font-size: 12px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.5px;">CUSTOMER KHATA SLIP</span>
          </div>
        </div>

        <!-- Customer Meta -->
        <div style="font-size: 11px; line-height: 1.4; margin-bottom: 5px; padding-bottom: 4px; border-bottom: 1px dashed #000;">
          <div><b>CUSTOMER:</b> ${c.name}</div>
          ${c.phone ? `<div><b>PHONE:</b> ${c.phone}</div>` : ''}
          ${c.address ? `<div><b>ADDRESS:</b> ${c.address}</div>` : ''}
          <div style="margin-top: 1px;"><b>DATE:</b> ${app.formatDateTime(new Date().toISOString())}</div>
        </div>

        <!-- Highlighted Balance Box -->
        <div style="border-top: 1.5px solid #000; border-bottom: 1.5px solid #000; padding: 6px 0; font-size: 13.5px; font-weight: 900; display: flex; justify-content: space-between; align-items: center; margin-top: 4px;">
          <span>KHATA BALANCE (DUE):</span>
          <span style="font-size: 16px; font-weight: 900;">${app.formatCurrency(balance)}</span>
        </div>

        <!-- Footer Note -->
        <div style="margin-top: 8px; padding-top: 4px; text-align: center; font-size: 10px; font-weight: 900; border-top: 1px dashed #000;">
          *** Thank You For Shopping With Us! ***
        </div>
      </div>
    `;

    app.showPreview(html, `Khata Slip: ${c.name}`, `80MM THERMAL RECEIPT â€¢ ${c.name.toUpperCase()}`);
  },

  async printSummaryReport() {
    const settings = await window.api.getSettings() || {};
    const rawList = this.filteredCustomers.length > 0 ? this.filteredCustomers : this.customers;
    const list = rawList.filter(c => (Number(c.amount) || 0) > 0);

    let totalDue = 0;
    const rows = list.length === 0 ? `
      <tr>
        <td colspan="4" style="text-align: center; padding: 6px 0; font-style: italic; color: #444;">No customers with active dues</td>
      </tr>
    ` : list.map((c, idx, arr) => {
      totalDue += (Number(c.amount) || 0);
      return `
        <tr style="border-bottom: ${idx === arr.length - 1 ? 'none' : '1px solid #000'}; font-size: 9.5px;">
          <td style="padding: 2.5px 2px; text-align: center; font-weight: 700; border-right: 1px solid #000;">${idx + 1}</td>
          <td style="padding: 2.5px 4px; border-right: 1px solid #000; font-weight: 800; text-transform: uppercase; word-break: break-word; line-height: 1.2;">${c.name}</td>
          <td style="padding: 2.5px 3px; border-right: 1px solid #000; font-family: monospace; font-size: 9px;">${c.phone || '-'}</td>
          <td style="padding: 2.5px 4px; text-align: right; font-weight: 800; white-space: nowrap;">${app.formatCurrency(c.amount || 0)}</td>
        </tr>
      `;
    }).join('');

    const html = `
      <div class="receipt-80mm" style="width: 100%; max-width: 80mm; margin: 0 auto; padding: 4px 6px; background: #fff; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #000; font-size: 11px; line-height: 1.35; -webkit-font-smoothing: antialiased; text-rendering: geometricPrecision;">
        <div style="text-align: center; margin-bottom: 4px;">
          <h1 style="font-size: 16px; font-weight: 900; margin: 0 0 2px 0; text-transform: uppercase; letter-spacing: 0.5px; color: #000; line-height: 1.2;">${settings.company_name || 'NH DOORS'}</h1>
          <div style="font-size: 11px; font-weight: 600; color: #000; line-height: 1.25; margin-bottom: 2px;">${settings.address || 'Taxila'}</div>
          ${settings.phone ? `<div style="font-size: 11px; font-weight: 700; color: #000; line-height: 1.3;">${settings.phone.split(',').map(p => `<div>${p.trim()}</div>`).join('')}</div>` : ''}
          <div style="margin-top: 5px;">
            <span style="display: inline-block; border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 2px 10px; font-size: 12px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.8px;">CUSTOMERS KHATA BALANCES</span>
          </div>
          <div style="font-size: 9px; color: #444; margin-top: 2px;">Generated on ${app.formatDateTime(new Date().toISOString())}</div>
        </div>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 5px; font-size: 9.5px; border: 1.5px solid #000;">
          <thead>
            <tr style="border-bottom: 1.5px solid #000; font-size: 9px; font-weight: 900; text-transform: uppercase;">
              <th style="padding: 3px 2px; text-align: center; width: 7%; border-right: 1px solid #000;">#</th>
              <th style="padding: 3px 4px; text-align: left; width: 48%; border-right: 1px solid #000;">CUSTOMER</th>
              <th style="padding: 3px 3px; text-align: left; width: 25%; border-right: 1px solid #000;">PHONE</th>
              <th style="padding: 3px 4px; text-align: right; width: 20%;">DUE</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>

        <div style="border-top: 1.5px solid #000; border-bottom: 1.5px solid #000; padding: 4px 0; font-size: 13.5px; font-weight: 900; display: flex; justify-content: space-between; margin-top: 4px;">
          <span>TOTAL RECEIVABLES:</span>
          <span>${app.formatCurrency(totalDue)}</span>
        </div>

        <div style="text-align: center; margin-top: 6px; border-top: 1px dashed #000; padding-top: 4px; font-size: 9px;">
          <p style="margin: 0; font-weight: 700; text-transform: uppercase;">*** END OF KHATA REPORT ***</p>
        </div>
      </div>
    `;

    app.showPreview(html, 'Customers Khata Balances', `80MM THERMAL RECEIPT â€¢ ${list.length} CUSTOMERS`);
  }
};
