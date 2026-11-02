window.Proposals = {
  sales: [],
  selectedMethods: ['Cash', 'Online'],
  currentPeriodType: 'day',
  currentPage: 1,
  pageSize: 50,
  currentFilteredSales: [],

  async render(container) {
    const savedShowStats = window.storage.get('sales_show_stats');
    const isStatsVisible = savedShowStats !== null ? Boolean(savedShowStats) : true;

    container.innerHTML = `
      <div class="flex justify-between items-center mb-6">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 border border-amber-200/80 flex items-center justify-center shrink-0 shadow-2xs">
            <i data-lucide="history" class="w-5 h-5"></i>
          </div>
          <h2 class="text-3xl font-bold text-slate-800">Sales History</h2>
        </div>
        <div class="flex items-center gap-3">
          <button onclick="app.navigate('item-sales')" id="item-sales-btn" class="h-10 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm rounded-xl flex items-center gap-2 shadow-sm hover:shadow-md transition-all active:scale-95 cursor-pointer">
            <i data-lucide="package" class="w-4 h-4 text-amber-400"></i>
            <span>Item Sales</span>
          </button>
          <button onclick="Proposals.toggleStats()" id="stats-toggle-btn" class="h-10 px-3.5 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 text-slate-700 font-bold text-sm rounded-xl flex items-center gap-2 shadow-sm hover:shadow transition-all active:scale-95 cursor-pointer">
            <i data-lucide="${isStatsVisible ? 'eye-off' : 'eye'}" class="w-4 h-4 text-slate-400" id="stats-toggle-icon"></i>
            <span id="stats-toggle-text">${isStatsVisible ? 'Hide Stats' : 'Show Stats'}</span>
          </button>
        </div>
      </div>
      
      <!-- Proper Stats Cards: Total Purchase Cost, Total Sale, Total Profit, Orders, Discounts -->
      <div id="stats-container" class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6 ${isStatsVisible ? '' : 'hidden'}">
        <div class="bg-white p-3.5 rounded-xl shadow-sm border border-slate-200 flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
            <i data-lucide="shopping-bag" class="w-5 h-5"></i>
          </div>
          <div class="min-w-0">
            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">Total Orders</p>
            <h3 class="text-base font-black text-slate-800 font-outfit" id="stat-count">0</h3>
          </div>
        </div>

        <div class="bg-white p-3.5 rounded-xl shadow-sm border border-slate-200 flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center text-red-600 shrink-0">
            <i data-lucide="shopping-cart" class="w-5 h-5"></i>
          </div>
          <div class="min-w-0">
            <p class="text-[10px] font-bold text-red-500 uppercase tracking-widest truncate">Purchase Cost</p>
            <h3 class="text-base font-black text-red-700 font-outfit truncate" id="stat-cost">Rs. 0</h3>
          </div>
        </div>

        <div class="bg-white p-3.5 rounded-xl shadow-sm border border-slate-200 flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
            <i data-lucide="banknote" class="w-5 h-5"></i>
          </div>
          <div class="min-w-0">
            <p class="text-[10px] font-bold text-emerald-600 uppercase tracking-widest truncate">Total Sale</p>
            <h3 class="text-base font-black text-emerald-700 font-outfit truncate" id="stat-total">Rs. 0</h3>
          </div>
        </div>

        <div class="bg-white p-3.5 rounded-xl shadow-sm border border-slate-200 flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600 shrink-0">
            <i data-lucide="trending-up" class="w-5 h-5"></i>
          </div>
          <div class="min-w-0">
            <p class="text-[10px] font-bold text-amber-600 uppercase tracking-widest truncate">Total Profit</p>
            <h3 class="text-base font-black text-amber-700 font-outfit truncate" id="stat-profit">Rs. 0</h3>
          </div>
        </div>

        <div class="bg-white p-3.5 rounded-xl shadow-sm border border-slate-200 flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center text-orange-600 shrink-0">
            <i data-lucide="tag" class="w-5 h-5"></i>
          </div>
          <div class="min-w-0">
            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">Discounts</p>
            <h3 class="text-base font-black text-slate-800 font-outfit truncate" id="stat-discount">Rs. 0</h3>
          </div>
        </div>
      </div>

      <!-- Filter Controls Bar -->
      <div class="bg-white p-3.5 rounded-xl shadow-sm border border-slate-200 mb-6 flex gap-4 items-center flex-wrap">
        <div class="relative flex-1 min-w-[200px]">
          <i data-lucide="search" class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
          <input type="text" id="prop-search" oninput="Proposals.applyFilters()" placeholder="Search by customer, invoice #, or seller" class="w-full pl-9 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent focus:bg-white transition-all text-xs font-medium">
          <button type="button" id="prop-search-clear-btn" onclick="Proposals.clearSearch()" title="Clear search" class="absolute right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-md hover:bg-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-all cursor-pointer hidden"><i data-lucide="x" class="w-3.5 h-3.5"></i></button>
        </div>
        
        <div class="flex gap-4 items-center pl-4 border-l border-slate-200 flex-wrap">
          <!-- Method dropdown (Cash / Online / Retail / Wholesale) -->
          <div class="flex gap-2 items-center">
            <label class="text-xs font-bold text-slate-400 uppercase tracking-widest">Method</label>
            <div class="relative">
              <button onclick="Proposals.toggleMethodMenu(event)" id="method-multi-btn" class="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold hover:bg-white transition-all flex items-center gap-2 min-w-[130px] justify-between cursor-pointer">
                 <span id="method-multi-text">All Methods</span>
                 <i data-lucide="chevron-down" class="w-3.5 h-3.5 text-slate-400"></i>
              </button>
              <div id="method-multi-menu" class="absolute top-full left-0 mt-1 w-52 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 py-2 hidden">
                 <div class="px-3 py-1.5 mb-1 border-b border-slate-100 flex justify-between items-center">
                    <span class="text-[10px] font-black text-slate-400 uppercase tracking-wider">Filters</span>
                    <button onclick="Proposals.resetMethods(event)" class="text-[10px] font-bold text-accent hover:underline cursor-pointer">Reset</button>
                 </div>
                 <div id="method-options-list"></div>
              </div>
            </div>
          </div>

          <!-- Period controls -->
          <div class="flex gap-2 items-center flex-wrap">
            <label class="text-xs font-bold text-slate-400 uppercase tracking-widest">Period</label>
            <div class="flex bg-slate-100 p-1 rounded-lg">
               <button id="period-day-tab" onclick="Proposals.setPeriodType('day')" class="px-2.5 py-1 text-xs font-bold rounded-md transition-all bg-white shadow-sm text-slate-800 cursor-pointer">Daily</button>
               <button id="period-month-tab" onclick="Proposals.setPeriodType('month')" class="px-2.5 py-1 text-xs font-bold rounded-md transition-all text-slate-400 hover:text-slate-700 cursor-pointer">Monthly</button>
               <button id="period-year-tab" onclick="Proposals.setPeriodType('year')" class="px-2.5 py-1 text-xs font-bold rounded-md transition-all text-slate-400 hover:text-slate-700 cursor-pointer">Annual</button>
               <button id="period-all-tab" onclick="Proposals.setPeriodType('all')" class="px-2.5 py-1 text-xs font-bold rounded-md transition-all text-slate-400 hover:text-slate-700 cursor-pointer">All</button>
            </div>

            <!-- Daily navigation controls (Prev Day, Calendar Picker, Next Day, Today) -->
            <div id="daily-controls" class="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg p-0.5">
               <button onclick="Proposals.changeDateStep(-1)" class="p-1.5 hover:bg-white rounded text-slate-500 hover:text-slate-800 transition-all cursor-pointer" title="Previous Day">
                 <i data-lucide="chevron-left" class="w-3.5 h-3.5"></i>
               </button>
               <input type="date" id="stats-date-picker" onchange="Proposals.applyFilters()" oninput="Proposals.applyFilters()" class="bg-transparent border-0 px-1 py-1 text-xs font-bold text-slate-700 outline-none cursor-pointer">
               <button onclick="Proposals.changeDateStep(1)" class="p-1.5 hover:bg-white rounded text-slate-500 hover:text-slate-800 transition-all cursor-pointer" title="Next Day">
                 <i data-lucide="chevron-right" class="w-3.5 h-3.5"></i>
               </button>
               <button onclick="Proposals.setToday()" class="px-2 py-1 text-[10px] font-black uppercase bg-slate-200/80 hover:bg-slate-300 text-slate-700 rounded transition-all cursor-pointer ml-0.5">Today</button>
            </div>

            <!-- Monthly navigation controls (Prev Month, Month Dropdown, Year Dropdown, Next Month, This Month) -->
            <div id="monthly-controls" class="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg p-0.5 hidden">
               <button onclick="Proposals.changeMonthStep(-1)" class="p-1.5 hover:bg-white rounded text-slate-500 hover:text-slate-800 transition-all cursor-pointer" title="Previous Month">
                 <i data-lucide="chevron-left" class="w-3.5 h-3.5"></i>
               </button>
               <select id="stats-month-select" onchange="Proposals.applyFilters()" class="bg-transparent border-0 px-2 py-1 text-xs font-bold text-slate-700 outline-none cursor-pointer">
                 <option value="1">January</option>
                 <option value="2">February</option>
                 <option value="3">March</option>
                 <option value="4">April</option>
                 <option value="5">May</option>
                 <option value="6">June</option>
                 <option value="7">July</option>
                 <option value="8">August</option>
                 <option value="9">September</option>
                 <option value="10">October</option>
                 <option value="11">November</option>
                 <option value="12">December</option>
               </select>
               <select id="stats-month-year-select" onchange="Proposals.applyFilters()" class="bg-transparent border-0 px-2 py-1 text-xs font-bold text-slate-700 outline-none cursor-pointer">
               </select>
               <button onclick="Proposals.changeMonthStep(1)" class="p-1.5 hover:bg-white rounded text-slate-500 hover:text-slate-800 transition-all cursor-pointer" title="Next Month">
                 <i data-lucide="chevron-right" class="w-3.5 h-3.5"></i>
               </button>
               <button onclick="Proposals.setThisMonth()" class="px-2 py-1 text-[10px] font-black uppercase bg-slate-200/80 hover:bg-slate-300 text-slate-700 rounded transition-all cursor-pointer ml-0.5">This Month</button>
            </div>

            <!-- Annual controls -->
            <div id="annual-controls" class="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg p-0.5 hidden">
               <select id="stats-year-picker" onchange="Proposals.applyFilters()" class="bg-transparent border-0 px-2 py-1 text-xs font-bold text-slate-700 outline-none cursor-pointer">
               </select>
            </div>

            <button id="clear-period-btn" onclick="Proposals.resetPeriodToDefault()" class="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-500 rounded-md transition-all hidden cursor-pointer" title="Reset to Daily (Today)">
               <i data-lucide="x" class="w-4 h-4"></i>
            </button>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden h-[calc(100vh-220px)] flex flex-col">
        <div class="overflow-auto flex-1 relative">
          <table class="w-full text-sm text-left border-collapse border-b border-slate-200">
            <thead class="bg-slate-50 text-slate-500 uppercase text-[11px] font-black tracking-wider sticky top-0 z-10 shadow-sm border-b border-slate-200">
              <tr class="border-b border-slate-200">
                <th class="px-2 py-2 text-center w-10 border-r border-slate-200 text-slate-400 bg-slate-50 font-black text-[13px]">#</th>
                <th class="px-4 py-2 border-r border-slate-200 bg-slate-50 font-black text-[11px] uppercase tracking-wider">Invoice #</th>
                <th class="px-4 py-2 border-r border-slate-200 bg-slate-50 font-black text-[11px] uppercase tracking-wider">Customer</th>
                <th class="px-4 py-2 border-r border-slate-200 bg-slate-50 font-black text-[11px] uppercase tracking-wider">Date</th>
                <th class="px-4 py-2 border-r border-slate-200 text-right bg-slate-50 font-black text-[11px] uppercase tracking-wider">Total</th>
                <th class="px-4 py-2 border-r border-slate-200 text-right bg-slate-50 font-black text-[11px] uppercase tracking-wider text-emerald-700">Profit</th>
                <th class="px-4 py-2 border-r border-slate-200 bg-slate-50 font-black text-[11px] uppercase tracking-wider">Method</th>
                <th class="px-4 py-2 text-right text-slate-700 bg-slate-100 font-black text-[11px] uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody id="sales-list-body" class="divide-y divide-slate-200 bg-white"></tbody>
          </table>
        </div>
        <div id="sales-pagination-footer" class="shrink-0"></div>
      </div>
    `;

    try {
      const now = new Date();
      const datePicker = document.getElementById('stats-date-picker');
      const monthSelect = document.getElementById('stats-month-select');
      
      if (datePicker) {
        datePicker.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      }
      if (monthSelect) {
        monthSelect.value = now.getMonth() + 1;
      }

      this.renderMethodOptions();
      await this.loadData();
      this.setPeriodType('day');
    } catch (e) {
      console.error('[PROPOSALS] Render error:', e);
    }
    if (window.lucide) lucide.createIcons();
  },

  async loadData() {
    try {
      this.sales = await window.api.getProposals() || [];
      const tbody = document.getElementById('sales-list-body');
      if (!tbody) {
        return;
      }
      const now = new Date();
      const monthYearSelect = document.getElementById('stats-month-year-select');
      const yearPicker = document.getElementById('stats-year-picker');

      const yearSet = new Set([now.getFullYear()]);
      this.sales.forEach(s => {
        if (s.date) {
          const parsed = this.parseSaleDate(s.date);
          if (parsed && parsed.year) yearSet.add(parsed.year);
        }
      });
      const years = Array.from(yearSet).sort((a, b) => b - a);

      if (monthYearSelect) {
        const curMYear = monthYearSelect.value;
        monthYearSelect.innerHTML = years.map(y => `<option value="${y}">${y}</option>`).join('');
        if (curMYear && years.some(y => String(y) === String(curMYear))) {
          monthYearSelect.value = curMYear;
        } else {
          monthYearSelect.value = now.getFullYear();
        }
      }

      if (yearPicker) {
        const curY = yearPicker.value;
        yearPicker.innerHTML = years.map(y => `<option value="${y}">${y}</option>`).join('');
        if (curY && years.some(y => String(y) === String(curY))) {
          yearPicker.value = curY;
        } else {
          yearPicker.value = now.getFullYear();
        }
      }

      this.applyFilters();
    } catch (e) {
      console.error('[PROPOSALS] loadData error:', e);
    }
  },

  parseSaleDate(dateStr) {
    if (!dateStr) return null;
    try {
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) {
        return {
          year: d.getFullYear(),
          month: d.getMonth() + 1,
          day: d.getDate(),
          dateStr: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
        };
      }
    } catch (e) {}

    const m = String(dateStr).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) {
      return {
        year: parseInt(m[1]),
        month: parseInt(m[2]),
        day: parseInt(m[3]),
        dateStr: `${m[1]}-${m[2]}-${m[3]}`
      };
    }
    return null;
  },

  clearSearch() {
    const input = document.getElementById('prop-search');
    if (input) {
      input.value = '';
      input.focus();
    }
    this.applyFilters();
  },

  applyFilters() {
    const searchInput = document.getElementById('prop-search');
    const clearBtn = document.getElementById('prop-search-clear-btn');
    const term = (searchInput?.value || '').toLowerCase().trim();

    if (clearBtn) {
      if ((searchInput?.value || '').length > 0) clearBtn.classList.remove('hidden');
      else clearBtn.classList.add('hidden');
    }

    const selDate = document.getElementById('stats-date-picker')?.value;
    
    let filtered = this.sales.filter(s => {
        const matchesSearch = (s.customer_name || '').toLowerCase().includes(term) || 
                              (s.proposal_number || '').toLowerCase().includes(term);
        
        const method = (s.payment_method || 'Cash').trim();
        const matchesMethod = this.selectedMethods.some(m => m.toLowerCase() === method.toLowerCase());
        
        let matchesPeriod = true;
        if (s.date && this.currentPeriodType !== 'all') {
            const parsed = this.parseSaleDate(s.date);
            if (parsed) {
                if (this.currentPeriodType === 'day' && selDate) {
                    matchesPeriod = (parsed.dateStr === selDate);
                } else if (this.currentPeriodType === 'month') {
                    const targetM = parseInt(document.getElementById('stats-month-select')?.value);
                    const targetY = parseInt(document.getElementById('stats-month-year-select')?.value);
                    if (targetM && targetY) {
                        matchesPeriod = (parsed.year === targetY && parsed.month === targetM);
                    }
                } else if (this.currentPeriodType === 'year') {
                    const targetY = parseInt(document.getElementById('stats-year-picker')?.value);
                    if (targetY) {
                        matchesPeriod = (parsed.year === targetY);
                    }
                }
            }
        }
        return matchesSearch && matchesMethod && matchesPeriod;
    });

    if (term) {
      filtered.sort((a, b) => {
        const custA = (a.customer_name || '').toLowerCase();
        const custB = (b.customer_name || '').toLowerCase();
        const numA = (a.proposal_number || '').toLowerCase();
        const numB = (b.proposal_number || '').toLowerCase();

        const getScore = (cust, num) => {
          if (cust.startsWith(term) || num.startsWith(term)) return 1;
          const words = cust.split(/[\s\-&/]+/);
          if (words.some(w => w.startsWith(term))) return 2;
          if (num.includes(term)) return 3;
          return 4;
        };

        const scoreA = getScore(custA, numA);
        const scoreB = getScore(custB, numB);

        if (scoreA !== scoreB) {
          return scoreA - scoreB;
        }

        return (new Date(b.date || b.created_at) - new Date(a.date || a.created_at)) || (b.id - a.id);
      });
    }

    this.currentPage = 1;
    this.currentFilteredSales = filtered;
    this.updateStats(filtered);
    this.renderList(filtered);
    this.updateClearPeriodButton();
  },

  changePage(page) {
    this.currentPage = page;
    this.renderList(this.currentFilteredSales || []);
  },

  updateClearPeriodButton() {
    const btn = document.getElementById('clear-period-btn');
    if (!btn) return;
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const selDate = document.getElementById('stats-date-picker')?.value;

    const isDefaultDaily = (this.currentPeriodType === 'day' && selDate === todayStr);
    btn.classList.toggle('hidden', isDefaultDaily);
  },

  resetPeriodToDefault() {
    this.setToday();
    this.setPeriodType('day');
  },

  updateStats(list) {
    let cost = 0, totalBilled = 0, received = 0, profit = 0, discount = 0;
    list.forEach(s => {
        cost += (s.cost_total || 0);
        totalBilled += (s.retail_total || 0);
        const rec = (s.received_amount !== undefined && s.received_amount !== null) ? Number(s.received_amount) : Number(s.retail_total || 0);
        received += rec;
        profit += (s.profit || 0);
        discount += (s.discount || 0);
    });
    
    const countEl = document.getElementById('stat-count');
    const costEl = document.getElementById('stat-cost');
    const totalEl = document.getElementById('stat-total');
    const profitEl = document.getElementById('stat-profit');
    const discountEl = document.getElementById('stat-discount');
    const pendingEl = document.getElementById('stat-pending');

    if (countEl) countEl.textContent = list.length;
    if (costEl) costEl.textContent = app.formatCurrency(cost);
    if (totalEl) totalEl.textContent = app.formatCurrency(received);
    if (profitEl) profitEl.textContent = app.formatCurrency(profit);
    if (discountEl) discountEl.textContent = app.formatCurrency(discount);
    if (pendingEl) pendingEl.textContent = app.formatCurrency(totalBilled - received);
  },

  renderList(list) {
    this.currentFilteredSales = list || [];
    const tbody = document.getElementById('sales-list-body');
    const footer = document.getElementById('sales-pagination-footer');
    if (!tbody) return;

    if (!list || list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="px-6 py-12 text-center text-slate-400 font-medium">No sales found for this period.</td></tr>`;
        if (footer) footer.innerHTML = '';
        if (window.lucide) lucide.createIcons();
        return;
    }

    const total = list.length;
    const totalPages = Math.ceil(total / this.pageSize);
    if (this.currentPage > totalPages) this.currentPage = totalPages;
    if (this.currentPage < 1) this.currentPage = 1;

    const startIdx = (this.currentPage - 1) * this.pageSize;
    const endIdx = Math.min(startIdx + this.pageSize, total);
    const paginated = list.slice(startIdx, endIdx);

    tbody.innerHTML = paginated.map((s, idx) => {
        const rowNum = startIdx + idx + 1;
        const method = s.payment_method || 'Cash';
        const isOnline = method.toLowerCase() === 'online';
        const profit = s.profit !== undefined ? s.profit : ((s.retail_total || 0) - (s.cost_total || 0));
        const received = (s.received_amount !== undefined && s.received_amount !== null) ? Number(s.received_amount) : Number(s.retail_total || 0);
        const isPartial = received < (s.retail_total || 0);
        const dueAmount = (s.retail_total || 0) - received;
        
        return `
        <tr class="hover:bg-slate-50 transition-colors group border-b border-slate-200">
            <td class="px-2 py-1 text-center font-bold text-slate-400 tabular-nums border-r border-slate-200 text-xs">${rowNum}</td>
            <td class="px-4 py-1 border-r border-slate-200">
                <div class="font-bold text-slate-800 uppercase tracking-tight text-xs">${s.proposal_number}</div>
            </td>
            <td class="px-4 py-1 border-r border-slate-200">
                <div class="font-bold text-slate-800 truncate min-w-0 max-w-[180px] uppercase tracking-tight text-xs">${s.customer_name}</div>
                ${s.phone ? `<div class="text-[10px] text-slate-400 font-semibold">${s.phone}</div>` : ''}
            </td>
            <td class="px-4 py-1 border-r border-slate-200">
                <div class="font-bold text-slate-800 uppercase tracking-tight text-xs whitespace-nowrap">${app.formatDateTime(s.date)}</div>
            </td>
            <td class="px-4 py-1 border-r border-slate-200 text-right">
                <div class="font-bold text-slate-800 tracking-tight text-xs">
                    ${app.formatCurrency(s.retail_total)}
                </div>
                ${isPartial ? `<div class="text-[10px] font-black text-rose-500 tabular-nums">Due: ${app.formatCurrency(dueAmount)}</div>` : ''}
            </td>
            <td class="px-4 py-1 border-r border-slate-200 text-right">
                <div class="font-bold ${profit >= 0 ? 'text-emerald-600' : 'text-rose-600'} tracking-tight text-xs font-display">
                    ${app.formatCurrency(profit)}
                </div>
            </td>
            <td class="px-4 py-1 border-r border-slate-200">
                <div class="flex items-center gap-1.5 flex-wrap">
                    <span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-tight ${isOnline ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}">
                        ${method}
                    </span>
                    ${isPartial ? `<span class="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-amber-100 text-amber-800 border border-amber-300">Khata</span>` : ''}
                </div>
            </td>
            <td class="px-4 py-1 text-right font-medium">
                <div class="flex items-center justify-end gap-1.5 transition-opacity">
                    <button onclick="Proposals.viewOrderDetails(${s.id})" class="p-1.5 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-all cursor-pointer" title="View Order & Materials Used"><i data-lucide="layers" class="w-4 h-4"></i></button>
                    <button onclick="Proposals.viewReceipt(${s.id})" class="p-1.5 text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-all cursor-pointer" title="Print Customer Receipt"><i data-lucide="printer" class="w-4 h-4"></i></button>
                    <button onclick="Proposals.editSale(${s.id})" class="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-all cursor-pointer" title="Return or Edit Sale"><i data-lucide="edit-3" class="w-4 h-4"></i></button>
                    <button onclick="Proposals.deleteSale(${s.id})" class="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer" title="Delete Sale"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                </div>
            </td>
        </tr>
    `;}).join('');

    if (footer) {
      if (total <= this.pageSize) {
        footer.innerHTML = `
          <div class="flex items-center justify-between px-4 py-2 bg-slate-50 border-t border-slate-200 text-xs font-bold text-slate-500">
            <span>Showing all <span class="font-black text-slate-800">${total}</span> invoice${total === 1 ? '' : 's'}</span>
          </div>
        `;
      } else {
        footer.innerHTML = `
          <div class="flex items-center justify-between px-4 py-2 bg-slate-50 border-t border-slate-200 text-xs font-bold text-slate-600 flex-wrap gap-2 select-none">
            <div>
              Showing <span class="font-black text-slate-900">${startIdx + 1}</span> - <span class="font-black text-slate-900">${endIdx}</span> of <span class="font-black text-slate-900">${total}</span> invoices
            </div>
            <div class="flex items-center gap-1.5">
              <button type="button" ${this.currentPage <= 1 ? 'disabled class="opacity-40 cursor-not-allowed"' : 'onclick="Proposals.changePage(' + (this.currentPage - 1) + ')" class="cursor-pointer hover:bg-slate-200 active:scale-95"'} class="px-2.5 py-1 bg-white border border-slate-200 rounded-md text-slate-700 font-bold transition-all flex items-center gap-1">
                <i data-lucide="chevron-left" class="w-3.5 h-3.5"></i>
                <span>Prev</span>
              </button>
              <span class="px-2.5 py-1 bg-white border border-slate-200 rounded-md text-slate-800 font-black">
                Page ${this.currentPage} of ${totalPages}
              </span>
              <button type="button" ${this.currentPage >= totalPages ? 'disabled class="opacity-40 cursor-not-allowed"' : 'onclick="Proposals.changePage(' + (this.currentPage + 1) + ')" class="cursor-pointer hover:bg-slate-200 active:scale-95"'} class="px-2.5 py-1 bg-white border border-slate-200 rounded-md text-slate-700 font-bold transition-all flex items-center gap-1">
                <span>Next</span>
                <i data-lucide="chevron-right" class="w-3.5 h-3.5"></i>
              </button>
            </div>
          </div>
        `;
      }
    }

    if (window.lucide) lucide.createIcons();
  },

  toggleStats() {
    const container = document.getElementById('stats-container');
    if (!container) return;
    container.classList.toggle('hidden');
    const isHidden = container.classList.contains('hidden');
    window.storage.set('sales_show_stats', !isHidden);
    const textEl = document.getElementById('stats-toggle-text');
    const iconEl = document.getElementById('stats-toggle-icon');
    if (textEl) textEl.textContent = isHidden ? 'Show Stats' : 'Hide Stats';
    if (iconEl) iconEl.setAttribute('data-lucide', isHidden ? 'eye' : 'eye-off');
    if (window.lucide) lucide.createIcons();
  },

  changeDateStep(delta) {
    const input = document.getElementById('stats-date-picker');
    if (!input) return;
    let parts = input.value ? input.value.split('-').map(Number) : null;
    let d;
    if (parts && parts.length === 3 && !isNaN(parts[0])) {
      d = new Date(parts[0], parts[1] - 1, parts[2]);
    } else {
      d = new Date();
    }
    d.setDate(d.getDate() + delta);
    input.value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    this.applyFilters();
  },

  setToday() {
    const now = new Date();
    const input = document.getElementById('stats-date-picker');
    if (input) {
      input.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      this.applyFilters();
    }
  },

  changeMonthStep(delta) {
    const mSelect = document.getElementById('stats-month-select');
    const ySelect = document.getElementById('stats-month-year-select');
    if (!mSelect || !ySelect) return;
    let m = parseInt(mSelect.value) || (new Date().getMonth() + 1);
    let y = parseInt(ySelect.value) || new Date().getFullYear();
    m += delta;
    if (m > 12) {
      m = 1;
      y += 1;
    } else if (m < 1) {
      m = 12;
      y -= 1;
    }
    let yOpt = Array.from(ySelect.options).find(o => parseInt(o.value) === y);
    if (!yOpt) {
      const opt = document.createElement('option');
      opt.value = y;
      opt.textContent = y;
      ySelect.appendChild(opt);
    }
    ySelect.value = y;
    mSelect.value = m;
    this.applyFilters();
  },

  setThisMonth() {
    const now = new Date();
    const mSelect = document.getElementById('stats-month-select');
    const ySelect = document.getElementById('stats-month-year-select');
    if (mSelect) mSelect.value = now.getMonth() + 1;
    if (ySelect) ySelect.value = now.getFullYear();
    this.applyFilters();
  },

  setPeriodType(type) {
    this.currentPeriodType = type;
    document.getElementById('daily-controls')?.classList.toggle('hidden', type !== 'day');
    document.getElementById('monthly-controls')?.classList.toggle('hidden', type !== 'month');
    document.getElementById('annual-controls')?.classList.toggle('hidden', type !== 'year');
    
    ['day', 'month', 'year', 'all'].forEach(t => {
      const btn = document.getElementById(`period-${t}-tab`);
      if (btn) {
        if (t === type) {
          btn.className = 'px-2.5 py-1 text-xs font-bold rounded-md transition-all bg-white shadow-sm text-slate-800';
        } else {
          btn.className = 'px-2.5 py-1 text-xs font-bold rounded-md transition-all text-slate-400 hover:text-slate-700';
        }
      }
    });

    this.applyFilters();
    if (window.lucide) lucide.createIcons();
  },

  toggleMethodMenu(e) {
    e.stopPropagation();
    const menu = document.getElementById('method-multi-menu');
    if (!menu) return;
    menu.classList.toggle('hidden');
    if (!menu.classList.contains('hidden')) {
        this.renderMethodOptions();
        const close = () => { menu.classList.add('hidden'); document.removeEventListener('click', close); };
        setTimeout(() => document.addEventListener('click', close), 10);
    }
  },

  async viewOrderDetails(id) {
    app.showLoading();
    try {
      const sale = await window.api.getProposal(id);
      if (!sale) throw new Error("Order not found");
      
      const items = sale.items || [];
      const billedItems = items.filter(it => it.item_type === 'billed' || (!it.item_type && !it.item_id));
      const materialItems = items.filter(it => it.item_type === 'material' || (!it.item_type && it.item_id));

      const totalBilled = Number(sale.retail_total) || 0;
      const totalCost = Number(sale.cost_total) || materialItems.reduce((sum, m) => sum + (Number(m.line_cost) || 0), 0);
      const profit = totalBilled - totalCost;
      const received = Number(sale.received_amount !== undefined ? sale.received_amount : totalBilled);
      const due = Math.max(0, totalBilled - received);

      let modal = document.getElementById('order-details-modal');
      if (!modal) {
        modal = document.createElement('div');
        modal.id = 'order-details-modal';
        modal.className = 'fixed inset-0 bg-slate-900/60 hidden items-center justify-center z-[1000] p-4 no-print';
        document.body.appendChild(modal);
      }

      modal.innerHTML = `
        <div class="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden" onclick="event.stopPropagation()">
          
          <!-- Modal Header -->
          <div class="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
            <div class="flex items-center gap-3">
              <span class="w-3 h-3 rounded-full bg-amber-400"></span>
              <div>
                <h3 class="text-base font-black uppercase tracking-wide">Order #${sale.proposal_number}</h3>
                <div class="text-xs text-slate-400 font-medium">Customer: <span class="text-white font-bold">${sale.customer_name || 'Walk-in Customer'}</span> ${sale.phone ? `• ${sale.phone}` : ''}</div>
              </div>
            </div>
            <button onclick="document.getElementById('order-details-modal').classList.add('hidden')" class="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800">
              <i data-lucide="x" class="w-5 h-5"></i>
            </button>
          </div>

          <!-- Modal Body -->
          <div class="p-6 overflow-y-auto space-y-6">
            
            <!-- Section 1: Customer Billed Items -->
            <div>
              <div class="flex items-center justify-between mb-2">
                <h4 class="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <i data-lucide="receipt" class="w-4 h-4 text-emerald-600"></i>
                  Customer Bill (Shows on Receipt)
                </h4>
                <span class="text-xs font-black text-emerald-700">Total: Rs. ${totalBilled.toLocaleString()}</span>
              </div>
              <div class="border border-slate-200 rounded-xl overflow-hidden">
                <table class="w-full text-left text-xs border-collapse">
                  <thead class="bg-slate-50 border-b border-slate-200 text-slate-500 font-black uppercase text-[10px]">
                    <tr>
                      <th class="py-2 px-3 w-8 text-center">#</th>
                      <th class="py-2 px-3">Item Description</th>
                      <th class="py-2 px-3 text-center w-16">Qty</th>
                      <th class="py-2 px-3 text-right w-28">Amount</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100">
                    ${billedItems.length > 0 ? billedItems.map((it, idx) => `
                      <tr>
                        <td class="py-2 px-3 text-center text-slate-400 font-bold">${idx + 1}</td>
                        <td class="py-2 px-3 font-bold text-slate-800">${it.description}</td>
                        <td class="py-2 px-3 text-center font-bold text-slate-700">${it.qty || 1}</td>
                        <td class="py-2 px-3 text-right font-black text-slate-900 font-mono">Rs. ${Number(it.line_retail || it.unit_retail || 0).toLocaleString()}</td>
                      </tr>
                    `).join('') : `
                      <tr><td colspan="4" class="py-3 text-center text-slate-400">No billed items</td></tr>
                    `}
                  </tbody>
                </table>
              </div>
            </div>

            <!-- Section 2: Used Materials From Stock (The Workshop Secret Recipe) -->
            <div>
              <div class="flex items-center justify-between mb-2">
                <h4 class="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <i data-lucide="box" class="w-4 h-4 text-amber-600"></i>
                  Materials Used from Stock (Workshop Only - Hidden from Customer)
                </h4>
                <span class="text-xs font-black text-amber-700">Material Cost: Rs. ${totalCost.toLocaleString()}</span>
              </div>
              <div class="border border-slate-200 rounded-xl overflow-hidden">
                <table class="w-full text-left text-xs border-collapse">
                  <thead class="bg-slate-50 border-b border-slate-200 text-slate-500 font-black uppercase text-[10px]">
                    <tr>
                      <th class="py-2 px-3 w-8 text-center">#</th>
                      <th class="py-2 px-3">Stock Material</th>
                      <th class="py-2 px-3 text-center w-24">Qty Deducted</th>
                      <th class="py-2 px-3 text-right w-24">Unit Cost</th>
                      <th class="py-2 px-3 text-right w-28">Total Cost</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100">
                    ${materialItems.length > 0 ? materialItems.map((m, idx) => `
                      <tr>
                        <td class="py-2 px-3 text-center text-slate-400 font-bold">${idx + 1}</td>
                        <td class="py-2 px-3 font-bold text-slate-800">${m.description}</td>
                        <td class="py-2 px-3 text-center font-black text-amber-700 bg-amber-50/50">${m.qty} ${m.unit || 'pcs'}</td>
                        <td class="py-2 px-3 text-right text-slate-500 font-mono">Rs. ${Number(m.unit_cost || 0).toLocaleString()}</td>
                        <td class="py-2 px-3 text-right font-black text-slate-900 font-mono">Rs. ${Number(m.line_cost || 0).toLocaleString()}</td>
                      </tr>
                    `).join('') : `
                      <tr><td colspan="5" class="py-4 text-center text-slate-400">No raw stock materials were recorded for this order.</td></tr>
                    `}
                  </tbody>
                </table>
              </div>
            </div>

            <!-- Financial Summary Cards -->
            <div class="grid grid-cols-3 gap-3">
              <div class="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center">
                <div class="text-[10px] font-black uppercase text-slate-400">Customer Bill</div>
                <div class="text-sm font-black text-slate-800 font-mono mt-0.5">Rs. ${totalBilled.toLocaleString()}</div>
              </div>
              <div class="p-3 bg-amber-50 border border-amber-200 rounded-xl text-center">
                <div class="text-[10px] font-black uppercase text-amber-600">Material Cost</div>
                <div class="text-sm font-black text-amber-900 font-mono mt-0.5">Rs. ${totalCost.toLocaleString()}</div>
              </div>
              <div class="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
                <div class="text-[10px] font-black uppercase text-emerald-600">Net Profit</div>
                <div class="text-sm font-black text-emerald-700 font-mono mt-0.5">Rs. ${profit.toLocaleString()}</div>
              </div>
            </div>

          </div>

          <!-- Modal Footer -->
          <div class="bg-slate-50 border-t border-slate-200 px-6 py-3 flex items-center justify-between">
            <div class="text-xs text-slate-500 font-medium">
              Payment: <b class="text-slate-800">${(sale.payment_method || 'Cash').toUpperCase()}</b> 
              ${due > 0 ? `• <span class="text-rose-600 font-bold">Khata Due: Rs. ${due.toLocaleString()}</span>` : '• <span class="text-emerald-600 font-bold">Fully Paid</span>'}
            </div>
            <div class="flex items-center gap-2">
              <button onclick="document.getElementById('order-details-modal').classList.add('hidden')" class="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-xl font-bold text-xs hover:bg-slate-100">
                Close
              </button>
              <button onclick="document.getElementById('order-details-modal').classList.add('hidden'); Proposals.viewReceipt(${sale.id});" class="px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold text-xs hover:bg-emerald-700 flex items-center gap-1.5 shadow">
                <i data-lucide="printer" class="w-3.5 h-3.5"></i> Print Customer Receipt
              </button>
            </div>
          </div>

        </div>
      `;

      modal.onclick = (e) => {
        if (e.target === modal) modal.classList.add('hidden');
      };
      modal.classList.remove('hidden');
      modal.classList.add('flex');
      if (window.lucide) lucide.createIcons();
      app.hideLoading();
    } catch (e) {
      console.error(e);
      app.hideLoading();
      app.showAlert("Error loading order details: " + e.message);
    }
  },

  async viewReceipt(id) {
    app.showLoading();
    try {
        const sale = await window.api.getProposal(id);
        if (!sale) throw new Error("Sale not found");
        
        // Ensure SalesForm has settings to generate pretty receipt
        if (!SalesForm.settings || !SalesForm.settings.company_name) {
            SalesForm.settings = await window.api.getSettings();
        }
        
        await SalesForm.generateReceipt(sale);
        app.hideLoading();
        SalesForm.showPrintPreview();
        // Override close behavior to stay on proposals
        window.SalesForm.closePreview = function() {
            const modal = document.getElementById('preview-modal');
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        };
    } catch (e) {
        console.error(e);
        app.hideLoading();
        app.showAlert("Error loading receipt.");
    }
  },

  async directPrint(id) {
    app.showLoading();
    try {
        const sale = await window.api.getProposal(id);
        if (!sale) throw new Error("Sale not found");

        if (!SalesForm.settings || !SalesForm.settings.company_name) {
            SalesForm.settings = await window.api.getSettings();
        }

        await SalesForm.generateReceipt(sale);
        app.hideLoading();
        await app.printReceipt();
    } catch (e) {
        console.error(e);
        app.hideLoading();
        app.showAlert("Error printing receipt.");
    }
  },

  updateMethodButtonText() {
    const el = document.getElementById('method-multi-text');
    if (!el) return;
    const allMethodsSelected = this.selectedMethods.length === 2;
    
    if (allMethodsSelected) {
      el.textContent = 'All Methods';
      return;
    }
    
    if (this.selectedMethods.length === 0) {
      el.textContent = 'None';
    } else {
      el.textContent = this.selectedMethods.join(', ');
    }
  },

  renderMethodOptions() {
    this.updateMethodButtonText();
    const list = document.getElementById('method-options-list');
    if (!list) return;
    
    const paymentMethods = ['Cash', 'Online'];

    list.innerHTML = `
      <div class="px-3 py-1 text-[10px] font-black text-slate-400 uppercase tracking-wider bg-slate-50">Payment Method</div>
      ${paymentMethods.map(m => {
        const active = this.selectedMethods.includes(m);
        return `
          <div onclick="Proposals.toggleMethodOption(event, '${m}')" class="px-4 py-1.5 hover:bg-slate-50 flex items-center justify-between cursor-pointer">
            <span class="text-xs font-bold ${active ? 'text-slate-900' : 'text-slate-400'}">${m}</span>
            <div class="w-4 h-4 rounded border ${active ? 'bg-accent border-accent text-white' : 'border-slate-200'} flex items-center justify-center">
              ${active ? '<i data-lucide="check" class="w-3 h-3"></i>' : ''}
            </div>
          </div>
        `;
      }).join('')}
    `;
    if (window.lucide) lucide.createIcons();
  },

  toggleMethodOption(e, m) {
    e.stopPropagation();
    const idx = this.selectedMethods.indexOf(m);
    if (idx > -1) {
      if (this.selectedMethods.length > 1) {
        this.selectedMethods.splice(idx, 1);
      }
    } else {
      this.selectedMethods.push(m);
    }
    this.renderMethodOptions();
    this.applyFilters();
  },

  resetMethods(e) {
    if (e) e.stopPropagation();
    this.selectedMethods = ['Cash', 'Online'];
    this.renderMethodOptions();
    this.applyFilters();
  },

  editSale(id) {
    app.verifyPassword({
      title: 'Edit Sale Verification',
      message: 'Please enter password to edit/return this sale:',
      onVerified: () => {
        app.navigate('proposal-form', { id });
      }
    });
  },

  deleteSale(id) {
    app.verifyPassword({
      title: 'Delete Sale Verification',
      message: 'Please enter password to delete this sale record:',
      onVerified: () => {
        app.showConfirm({
          title: 'Delete Sale',
          message: 'Are you sure you want to delete this sale record? Items sold will be returned to stock.',
          confirmText: 'Delete',
          onConfirm: async () => {
            await window.api.deleteProposal(id);
            this.sales = this.sales.filter(s => s.id !== id);
            this.applyFilters();
            try {
              if (window.Dashboard && typeof Dashboard.loadStats === 'function') Dashboard.loadStats();
              if (window.SalesForm && typeof SalesForm.refreshStockIndicators === 'function') SalesForm.refreshStockIndicators();
              if (window.ItemSales && typeof ItemSales.loadData === 'function') ItemSales.loadData();
              if (window.Customers && typeof Customers.loadData === 'function') Customers.loadData();
              if (window.MasterDB && typeof MasterDB.loadData === 'function') MasterDB.loadData();
            } catch(e) {}
          }
        });
      }
    });
  },

  markAsPaid(id) {
    const sale = this.sales.find(s => s.id === id);
    if (!sale) return;

    app.showPaymentModal({
        title: 'Receive Payment',
        subtitle: `Invoice: ${sale.proposal_number}`,
        total: sale.retail_total || 0,
        alreadyReceived: sale.received_amount || 0,
        buttonText: 'Receive',
        onConfirm: async (addedAmount, method) => {
            if (addedAmount <= 0) return;

            app.showLoading();
            try {
                const result = await window.api.receivePayment(id, addedAmount, method);
                if (result) {
                    const finalName = (sale.customer_name || '').trim();
                    const phone = (sale.phone || '').trim();
                    if (finalName && finalName.toLowerCase() !== 'walk-in customer') {
                        const customers = await window.api.getCustomers();
                        const cust = customers.find(c => c.name.toLowerCase() === finalName.toLowerCase() && (phone === '' || c.phone === phone));
                        if (cust) {
                            const newBalance = (cust.amount || 0) - addedAmount;
                            const custId = await window.api.saveCustomer({
                                ...cust,
                                amount: newBalance
                            });
                            
                            if (custId) {
                                const txnKey = `customers-${custId}-transactions`;
                                const transactions = window.storage.get(txnKey) || [];
                                const newTxn = {
                                    id: Date.now(),
                                    type: 'payment',
                                    amount: addedAmount,
                                    method: method,
                                    description: `Payment of ${sale.proposal_number}`,
                                    date: new Date().toISOString(),
                                    balanceAfter: newBalance
                                };
                                transactions.unshift(newTxn);
                                window.storage.set(txnKey, transactions);
                            }
                        }
                    }

                    sale.received_amount = result.newReceived;
                    sale.status = result.status;
                    this.applyFilters();
                    if (window.SalesForm && typeof SalesForm.loadCustomers === 'function') {
                        SalesForm.loadCustomers();
                    }
                }
                app.hideLoading();
            } catch (e) {
                console.error(e);
                app.hideLoading();
                app.showAlert("Error updating invoice status.");
            }
        }
    });
  },

  async markSalePaid(saleId, proposalNumber) {
    const ref = proposalNumber || saleId;
    app.showConfirm({
      title: 'Mark Sale Paid',
      message: `Mark Invoice <b>#${ref}</b> as fully Paid?<br><span class="text-xs text-slate-500 mt-1 block">This removes the pending due amount from the Sales List.</span>`,
      confirmText: 'Mark as Paid',
      confirmColor: 'green',
      onConfirm: async () => {
        try {
          app.showLoading();
          await window.api.markProposalPaid(saleId);
          app.hideLoading();
          app.showToast(`Invoice #${ref} marked as paid!`, 'success');
          await this.loadData();
        } catch (err) {
          console.error("Failed to mark sale paid:", err);
          app.hideLoading();
          app.showToast("Error: " + err.message, "error");
        }
      }
    });
  }
};
