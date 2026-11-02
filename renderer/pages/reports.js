window.Reports = {
  reportType: 'daily', // daily, monthly, annual
  selectedDate: '',
  settings: {},

  getLocalDateStr(d = new Date()) {
    if (!d) return '';
    if (typeof d === 'string') return d.split('T')[0];
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  async render(container) {
    this.settings = await window.api.getSettings();
    
    container.innerHTML = `
      <div>
        <!-- Page Header -->
        <div class="flex justify-between items-center mb-6 no-print flex-wrap gap-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 border border-amber-200/80 flex items-center justify-center shrink-0 shadow-2xs">
              <i data-lucide="bar-chart-3" class="w-5 h-5"></i>
            </div>
            <h2 class="text-3xl font-bold text-slate-800">Financial Reports</h2>
          </div>
        </div>

        <!-- Main Layout Grid -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start pb-8">
          
          <!-- Left Column (8 cols): Report Configuration -->
          <div class="lg:col-span-8 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div class="p-4 px-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div class="flex items-center gap-2">
                <i data-lucide="sliders" class="w-4 h-4 text-amber-500"></i>
                <h3 class="font-bold text-base text-slate-800">Report Configuration</h3>
              </div>
              <span class="text-xs font-semibold text-slate-400">Select period & parameters</span>
            </div>

            <div class="p-6 space-y-6">
              <!-- Step 1: Report Type Selection -->
              <div>
                <label class="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">1. Select Report Period Type</label>
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button type="button" onclick="Reports.setType('daily')" id="type-daily" class="report-type-btn flex items-center sm:flex-col justify-center gap-3 p-4 rounded-xl border border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:bg-white transition-all group font-bold cursor-pointer text-left sm:text-center">
                    <div class="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 text-slate-500">
                      <i data-lucide="calendar-days" class="w-5 h-5"></i>
                    </div>
                    <div>
                      <div class="font-black text-sm">Daily Report</div>
                      <div class="text-[11px] opacity-75 font-medium mt-0.5">Day-by-day revenue & cost</div>
                    </div>
                  </button>

                  <button type="button" onclick="Reports.setType('monthly')" id="type-monthly" class="report-type-btn flex items-center sm:flex-col justify-center gap-3 p-4 rounded-xl border border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:bg-white transition-all group font-bold cursor-pointer text-left sm:text-center">
                    <div class="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 text-slate-500">
                      <i data-lucide="calendar-range" class="w-5 h-5"></i>
                    </div>
                    <div>
                      <div class="font-black text-sm">Monthly Report</div>
                      <div class="text-[11px] opacity-75 font-medium mt-0.5">Full calendar month summary</div>
                    </div>
                  </button>

                  <button type="button" onclick="Reports.setType('annual')" id="type-annual" class="report-type-btn flex items-center sm:flex-col justify-center gap-3 p-4 rounded-xl border border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:bg-white transition-all group font-bold cursor-pointer text-left sm:text-center">
                    <div class="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 text-slate-500">
                      <i data-lucide="calendar" class="w-5 h-5"></i>
                    </div>
                    <div>
                      <div class="font-black text-sm">Annual Report</div>
                      <div class="text-[11px] opacity-75 font-medium mt-0.5">Full fiscal year breakdown</div>
                    </div>
                  </button>
                </div>
              </div>

              <!-- Step 2: Date Picker Input -->
              <div id="date-picker-container" class="pt-2">
                <label class="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2" id="picker-label">2. Select Day</label>
                <div class="relative max-w-md">
                  <i data-lucide="calendar" class="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"></i>
                  <input type="date" id="report-date-input" 
                    value="${this.selectedDate}" 
                    onchange="Reports.updateSelectedDate(this.value)"
                    class="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-sm font-bold text-slate-800 focus:bg-white focus:border-accent focus:ring-4 focus:ring-amber-50/50 outline-none transition-all shadow-2xs cursor-pointer">
                </div>
              </div>

              <!-- Action button -->
              <div class="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button type="button" onclick="Reports.generate()" class="h-11 px-6 bg-slate-900 hover:bg-slate-800 text-white font-black text-sm rounded-xl flex items-center gap-2.5 shadow-sm hover:shadow-md transition-all active:scale-95 cursor-pointer">
                  <i data-lucide="printer" class="w-4 h-4 text-amber-400"></i>
                  <span>Generate & Print Report</span>
                </button>
              </div>
            </div>
          </div>

          <!-- Right Column (4 cols): Information Card -->
          <div class="lg:col-span-4 space-y-4">
            <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
              <h4 class="font-black text-sm text-slate-800 uppercase tracking-wider mb-3.5 flex items-center gap-2">
                <i data-lucide="info" class="w-4 h-4 text-amber-500"></i>
                What's Included in Report
              </h4>
              <div class="space-y-3 text-xs text-slate-600">
                <div class="flex items-start gap-2.5">
                  <div class="w-5 h-5 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5 border border-emerald-200/60">1</div>
                  <div><strong class="text-slate-800">Sales Summary:</strong> Total invoices, item units sold, gross sales revenue, and inventory cost.</div>
                </div>
                <div class="flex items-start gap-2.5">
                  <div class="w-5 h-5 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5 border border-blue-200/60">2</div>
                  <div><strong class="text-slate-800">Operating Expenses:</strong> All recorded expenses, utility bills, salaries, and purchase vouchers.</div>
                </div>
                <div class="flex items-start gap-2.5">
                  <div class="w-5 h-5 rounded-md bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5 border border-amber-200/60">3</div>
                  <div><strong class="text-slate-800">Net Profit / Loss:</strong> Exact margin calculations and true business net earnings.</div>
                </div>
                <div class="flex items-start gap-2.5">
                  <div class="w-5 h-5 rounded-md bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5 border border-purple-200/60">4</div>
                  <div><strong class="text-slate-800">Supplier Balances:</strong> Up-to-date outstanding accounts payable summary.</div>
                </div>
              </div>
            </div>

            <div class="bg-gradient-to-br from-amber-500/10 to-amber-600/5 rounded-2xl border border-amber-200/80 p-4 flex items-center gap-3">
              <div class="w-9 h-9 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center shrink-0 font-bold shadow-2xs">
                <i data-lucide="printer" class="w-4 h-4"></i>
              </div>
              <div class="text-xs">
                <p class="font-bold text-amber-950">Thermal 80mm Ready</p>
                <p class="text-amber-800/80 mt-0.5">Formatted for instant high-speed POS receipt printing.</p>
              </div>
            </div>
          </div>

        </div>
      </div>
    `;

    if (window.lucide) lucide.createIcons();
    this.setType('daily');
  },

  setType(type) {
    this.reportType = type;
    
    // Update UI buttons
    document.querySelectorAll('.report-type-btn').forEach(btn => {
      btn.className = 'report-type-btn flex items-center sm:flex-col justify-center gap-3 p-4 rounded-xl border border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:bg-white transition-all group font-bold cursor-pointer text-left sm:text-center';
      const iconWrap = btn.querySelector('div:first-child');
      if (iconWrap) iconWrap.className = 'w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 text-slate-500';
    });

    const activeBtn = document.getElementById(`type-${type}`);
    if (activeBtn) {
      activeBtn.className = 'report-type-btn flex items-center sm:flex-col justify-center gap-3 p-4 rounded-xl border-2 border-amber-500 bg-amber-50/70 text-slate-950 shadow-xs transition-all group font-bold cursor-pointer text-left sm:text-center ring-1 ring-amber-400/40';
      const iconWrap = activeBtn.querySelector('div:first-child');
      if (iconWrap) iconWrap.className = 'w-9 h-9 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center shrink-0 font-bold shadow-2xs';
    }

    const input = document.getElementById('report-date-input');
    const label = document.getElementById('picker-label');
    if (!input || !label) return;
    
    if (type === 'daily') {
      input.type = 'date';
      label.textContent = '2. Select Day';
      input.value = this.getLocalDateStr();
      this.selectedDate = input.value;
    } else if (type === 'monthly') {
      input.type = 'month';
      label.textContent = '2. Select Month';
      const now = new Date();
      input.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      this.selectedDate = input.value;
    } else if (type === 'annual') {
      label.textContent = '2. Select Year';
      input.type = 'number';
      input.min = '2000';
      input.max = '2100';
      input.value = new Date().getFullYear();
      this.selectedDate = input.value;
    }
    if (window.lucide) lucide.createIcons();
  },

  updateSelectedDate(val) {
    this.selectedDate = val;
  },

  async generate() {
    app.showLoading();
    
    let filters = {};
    let periodLabel = '';
    
    const inputVal = document.getElementById('report-date-input').value;
    
    if (this.reportType === 'daily') {
      filters = { start: inputVal, end: inputVal };
      periodLabel = app.formatDate(inputVal);
    } else if (this.reportType === 'monthly') {
      const [year, month] = inputVal.split('-').map(Number);
      const lastDay = new Date(year, month, 0).getDate();
      filters = { 
        start: `${year}-${String(month).padStart(2, '0')}-01`, 
        end: `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}` 
      };
      const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
      periodLabel = `${monthNames[month - 1]} ${year}`;
    } else if (this.reportType === 'annual') {
      const year = inputVal;
      filters = { 
        start: `${year}-01-01`, 
        end: `${year}-12-31` 
      };
      periodLabel = `Year ${year}`;
    }

    const data = await window.api.getReportSummary(filters);
    
    const margin = data.sales.amount > 0 ? (data.sales.profit / data.sales.amount * 100).toFixed(2) : '0.00';
    const netProfit = data.sales.profit - data.expenses.amount;

    const printContainer = document.getElementById('report-print-container');
    const html = `
        <div class="receipt-80mm" style="width: 100%; max-width: 80mm; margin: 0 auto; padding: 4px 6px; background: #fff; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Courier New', monospace, sans-serif; color: #000; box-sizing: border-box; font-size: 11px; line-height: 1.35; -webkit-font-smoothing: antialiased; text-rendering: geometricPrecision;">
            <!-- Header -->
            <div style="text-align: center; margin-bottom: 4px;">
                <h1 style="font-size: 16px; font-weight: 900; margin: 0 0 2px 0; text-transform: uppercase; letter-spacing: 0.5px; color: #000; line-height: 1.2;">${this.settings.company_name || 'NH DOORS'}</h1>
                <div style="font-size: 11px; font-weight: 600; color: #000; line-height: 1.25; margin-bottom: 2px;">${this.settings.address || 'Taxila'}</div>
                ${this.settings.phone ? `<div style="font-size: 11px; font-weight: 700; color: #000; line-height: 1.3;">${this.settings.phone.split(',').map(p => `<div>${p.trim()}</div>`).join('')}</div>` : ''}
                <div style="margin-top: 5px;">
                    <span style="display: inline-block; border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 2px 10px; font-size: 12px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.8px;">FINANCIAL REPORT &bull; ${this.reportType.toUpperCase()}</span>
                </div>
            </div>
            
            <!-- Metadata -->
            <div style="font-size: 11px; line-height: 1.35; margin-bottom: 4px; padding-bottom: 4px; border-bottom: 1px dashed #000;">
                <div style="display: flex; justify-content: space-between;">
                    <span><b>Period:</b> ${periodLabel}</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-top: 1px;">
                    <span><b>Date:</b> ${app.formatDateTime(new Date().toISOString())}</span>
                </div>
            </div>

            <!-- Sales Summary Section -->
            <div style="margin-bottom: 4px;">
                <div style="font-weight: 900; text-transform: uppercase; font-size: 10.5px; letter-spacing: 0.5px; margin-bottom: 2px; border-bottom: 1px solid #000; padding-bottom: 1px;">SALES SUMMARY</div>
                <table style="width: 100%; font-size: 11px; border-collapse: collapse; line-height: 1.45;">
                    <tr style="border-bottom: 1px dashed #f1f5f9;"><td style="padding: 2px 0;">Total Invoices:</td><td style="text-align: right; font-weight: 600; padding: 2px 0;">${data.sales.count}</td></tr>
                    <tr style="border-bottom: 1px dashed #f1f5f9;"><td style="padding: 2px 0;">Total Items Sold:</td><td style="text-align: right; font-weight: 600; padding: 2px 0;">${data.sales.itemsSold}</td></tr>
                    <tr style="border-bottom: 1px dashed #f1f5f9;"><td style="padding: 2px 0;">Total Sell Amount:</td><td style="text-align: right; font-weight: 700; padding: 2px 0;">${app.formatCurrency(data.sales.amount)}</td></tr>
                    <tr style="border-bottom: 1px dashed #f1f5f9;"><td style="padding: 2px 0;">Total Inventory Cost:</td><td style="text-align: right; font-weight: 600; padding: 2px 0;">${app.formatCurrency(data.sales.cost)}</td></tr>
                    <tr style="border-top: 1px dashed #000; border-bottom: 1px dashed #000;"><td style="padding: 2px 0; font-weight: 800;">Gross Profit:</td><td style="text-align: right; font-weight: 800; padding: 2px 0;">${app.formatCurrency(data.sales.profit)} (${margin}%)</td></tr>
                </table>
            </div>

            <!-- Expenses Summary Section -->
            <div style="margin-bottom: 4px; border-top: 1px dashed #000; padding-top: 3px;">
                <div style="font-weight: 900; text-transform: uppercase; font-size: 10.5px; letter-spacing: 0.5px; margin-bottom: 2px; border-bottom: 1px solid #000; padding-bottom: 1px;">EXPENSES & PURCHASES</div>
                <table style="width: 100%; font-size: 11px; border-collapse: collapse; line-height: 1.45;">
                    <tr style="border-bottom: 1px dashed #f1f5f9;"><td style="padding: 2px 0;">Total Expenses:</td><td style="text-align: right; font-weight: 700; padding: 2px 0;">${app.formatCurrency(data.expenses.amount)}</td></tr>
                    <tr><td style="padding: 2px 0;">Transactions Count:</td><td style="text-align: right; font-weight: 600; padding: 2px 0;">${data.expenses.count}</td></tr>
                </table>
            </div>

            <!-- Supplier Balances Section -->
            <div style="margin-bottom: 4px; border-top: 1px dashed #000; padding-top: 3px;">
                <div style="font-weight: 900; text-transform: uppercase; font-size: 10.5px; letter-spacing: 0.5px; margin-bottom: 2px; border-bottom: 1px solid #000; padding-bottom: 1px;">SUPPLIER BALANCES</div>
                <table style="width: 100%; font-size: 11px; border-collapse: collapse; line-height: 1.45;">
                    <tr style="border-bottom: 1px dashed #f1f5f9;"><td style="padding: 2px 0;">Total Accounts Payable:</td><td style="text-align: right; font-weight: 700; padding: 2px 0;">${app.formatCurrency(data.vendors.amount)}</td></tr>
                    <tr><td style="padding: 2px 0;">Active Suppliers:</td><td style="text-align: right; font-weight: 600; padding: 2px 0;">${data.vendors.count}</td></tr>
                </table>
            </div>

            <!-- Net Summary Box -->
            <div style="margin-top: 4px; border-top: 1.5px solid #000; padding-top: 4px; font-size: 11.5px; line-height: 1.5;">
                <div style="display: flex; justify-content: space-between;">
                    <span>Gross Profit:</span>
                    <span style="font-weight: 700;">${app.formatCurrency(data.sales.profit)}</span>
                </div>
                <div style="display: flex; justify-content: space-between;">
                    <span>Operating Expenses:</span>
                    <span style="font-weight: 700;">(${app.formatCurrency(data.expenses.amount)})</span>
                </div>
                <div style="display: flex; justify-content: space-between; border-top: 1.5px solid #000; border-bottom: 1.5px solid #000; padding: 3px 0; margin-top: 3px; font-size: 13.5px; font-weight: 900;">
                    <span>NET ${netProfit >= 0 ? 'PROFIT' : 'LOSS'}:</span>
                    <span>${netProfit < 0 ? '(' : ''}${app.formatCurrency(Math.abs(netProfit))}${netProfit < 0 ? ')' : ''}</span>
                </div>
            </div>

            <!-- Footer -->
            <div style="margin-top: 6px; border-top: 1px dashed #000; padding-top: 4px; text-align: center; font-size: 10px;">
                <p style="margin: 0; font-weight: 700; text-transform: uppercase;">*** END OF FINANCIAL REPORT ***</p>
            </div>
        </div>
    `;

    app.setPrintContent('report-print-container', html);

    // Show Preview
    const previewEl = document.getElementById('preview-paper');
    if (previewEl) previewEl.innerHTML = html;
    
    document.getElementById('preview-title').textContent = 'Financial Report Preview';
    document.getElementById('preview-subtitle').textContent = `80MM THERMAL RECEIPT • ${this.reportType.toUpperCase()}`;
    
    const modal = document.getElementById('preview-modal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    if (window.lucide) lucide.createIcons();

    app.hideLoading();
  }
};
