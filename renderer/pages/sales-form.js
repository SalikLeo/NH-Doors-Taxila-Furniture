window.SalesForm = {
  editingSaleId: null,
  saleNumber: '',
  customerName: '',
  customerPhone: '',
  customerId: null,
  customerBalance: 0,
  customers: [],
  customerSearchResults: [],
  highlightedCustomerIndex: 0,
  availableStock: [],
  stockSearchResults: [],
  selectedStockItem: null,
  orderItems: [],     // Customer billed items (shown on receipt)
  usedMaterials: [],  // Raw materials from stock (deducted from inventory, hidden from receipt)
  discount: 0,
  receivedAmount: 0,
  isReceivedManuallyEdited: false,
  paymentMethod: 'Cash',
  settings: {},

  async loadCustomers() {
    try {
      this.customers = (await window.api.getCustomers()) || [];
    } catch (e) {
      console.error('Failed to load customers:', e);
      this.customers = [];
    }
  },

  async loadStock() {
    try {
      this.availableStock = (await window.api.searchAllProducts('')) || [];
    } catch (e) {
      console.error('Failed to load stock products:', e);
      this.availableStock = [];
    }
  },

  async render(container, args) {
    this.settings = (await window.api.getSettings()) || {};
    await this.loadCustomers();
    await this.loadStock();

    container.style.overflow = 'auto';
    container.style.height = '100vh';

    this.editingSaleId = args?.id || null;
    this.orderItems = [];
    this.usedMaterials = [];
    this.customerName = '';
    this.customerPhone = '';
    this.customerId = null;
    this.customerBalance = 0;
    this.discount = 0;
    this.receivedAmount = 0;
    this.isReceivedManuallyEdited = false;
    this.paymentMethod = 'Cash';
    this.selectedStockItem = null;

    if (this.editingSaleId) {
      const sale = await window.api.getProposal(this.editingSaleId);
      if (sale) {
        this.saleNumber = sale.proposal_number || `INV-${sale.id}`;
        this.customerName = sale.customer_name || '';
        this.customerPhone = sale.phone || '';
        this.discount = Number(sale.discount) || 0;
        this.paymentMethod = sale.payment_method || 'Cash';
        this.receivedAmount = Number(sale.received_amount) || 0;
        this.isReceivedManuallyEdited = true;

        const matchedCust = this.customers.find(c => 
          (c.name && c.name.toLowerCase() === this.customerName.toLowerCase()) || 
          (this.customerPhone && c.phone === this.customerPhone)
        );
        if (matchedCust) {
          this.customerId = matchedCust.id;
          this.customerBalance = matchedCust.amount || 0;
        }

        if (sale.items && sale.items.length > 0) {
          sale.items.forEach(it => {
            const isMaterial = it.item_type === 'material' || (!it.item_type && it.item_id && it.section);
            if (isMaterial) {
              const stockMatch = this.availableStock.find(p => p.id === it.item_id && p.slug === it.section);
              this.usedMaterials.push({
                id: it.item_id,
                section: it.section,
                item_name: it.description,
                category_label: stockMatch ? (stockMatch.category_label || stockMatch.slug) : (it.section || 'Material'),
                unit: it.unit || 'pcs',
                cost_price: Number(it.unit_cost) || 0,
                current_stock: stockMatch ? (stockMatch.current_stock || 0) : 0,
                qty: Number(it.qty) || 1,
                line_cost: Number(it.line_cost) || ((Number(it.unit_cost) || 0) * (Number(it.qty) || 1))
              });
            } else {
              this.orderItems.push({
                id: it.id || (Date.now() + Math.random()),
                description: it.description,
                qty: Number(it.qty) || 1,
                price: Number(it.unit_retail) || Number(it.line_retail) || 0,
                total: Number(it.line_retail) || ((Number(it.unit_retail) || 0) * (Number(it.qty) || 1))
              });
            }
          });
        }
      }
    } else {
      try {
        this.saleNumber = await window.api.getNextProposalNumber();
      } catch (e) {
        this.saleNumber = `INV-${Date.now().toString().slice(-4)}`;
      }
    }

    this.buildUI(container);
    this.renderOrderItems();
    this.renderUsedMaterials();
    this.setupShortcuts();
    this.recalculate();
  },

  buildUI(container) {
    container.innerHTML = `
      <div class="flex flex-col h-full bg-slate-100 select-none overflow-hidden" id="sf-root">
        <!-- Top Status Bar -->
        <div class="bg-slate-900 text-white px-5 py-2.5 flex justify-between items-center shrink-0 shadow-md">
          <div class="flex items-center gap-3">
            <span class="w-3 h-3 rounded-full ${this.editingSaleId ? 'bg-blue-400 animate-pulse' : 'bg-emerald-400'}"></span>
            <h1 class="text-lg font-black tracking-wide uppercase text-white flex items-center gap-2">
              ${this.editingSaleId ? `<span class="text-blue-400">EDIT ORDER</span> #${this.saleNumber}` : 'NEW SALE / CUSTOM ORDER'}
            </h1>
            <span class="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono font-bold">
              ${this.saleNumber}
            </span>
          </div>
          <div class="flex items-center gap-4 text-xs font-bold text-slate-300">
            <div id="sf-live-clock" class="text-amber-400 font-mono">Loading...</div>
            <div class="hidden sm:flex items-center gap-2 text-slate-400 text-[11px]">
              <span class="bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700 text-slate-300">F2</span> Save & Print
              <span class="bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700 text-slate-300">F3</span> Save Only
              <span class="bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700 text-slate-300">Esc</span> Reset
            </div>
          </div>
        </div>

        <!-- Main Workspace (2 Columns) -->
        <div class="flex-1 overflow-y-auto p-4 flex flex-col lg:flex-row gap-4">
          
          <!-- LEFT COLUMN: Customer & Order Items (For Receipt) -->
          <div class="flex-1 flex flex-col gap-4 min-w-0">
            
            <!-- Customer Card -->
            <div class="bg-white rounded-xl shadow-sm border border-slate-200/80 p-4">
              <div class="flex items-center justify-between mb-2">
                <label class="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <i data-lucide="user" class="w-3.5 h-3.5 text-amber-500"></i>
                  Customer Information
                </label>
                <div id="sf-cust-balance-badge" class="${this.customerBalance > 0 ? '' : 'hidden'} text-xs font-bold px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">
                  Previous Khata Due: Rs. <span id="sf-cust-balance-val">${Number(this.customerBalance).toLocaleString()}</span>
                </div>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 relative">
                <div class="relative">
                  <input type="text" id="sf-customer-name" value="${this.customerName}" placeholder="Customer Name"
                    autocomplete="off"
                    oninput="SalesForm.handleCustomerInput(this.value)"
                    onfocus="SalesForm.handleCustomerInput(this.value)"
                    onclick="SalesForm.handleCustomerInput(this.value)"
                    class="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm font-bold text-slate-800 focus:bg-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none">
                  <!-- Customer Suggestions Dropdown -->
                  <div id="sf-customer-dropdown" class="hidden absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-48 overflow-y-auto"></div>
                </div>

                <div>
                  <input type="text" id="sf-customer-phone" value="${this.customerPhone}" placeholder="Phone Number"
                    oninput="SalesForm.customerPhone = this.value"
                    class="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm font-bold text-slate-800 focus:bg-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none">
                </div>
              </div>
            </div>

            <!-- Customer Order Items (Printed on Receipt) -->
            <div class="bg-white rounded-xl shadow-sm border border-slate-200/80 p-4 flex-1 flex flex-col">
              <div class="flex items-center justify-between mb-2">
                <div>
                  <h2 class="text-sm font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                    <i data-lucide="receipt" class="w-4 h-4 text-emerald-600"></i>
                    1. Customer Bill (Printed on Receipt)
                  </h2>
                  <p class="text-[11px] text-slate-500 font-medium mt-0.5">
                    What is the customer ordering?
                  </p>
                </div>
                <span class="text-xs font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
                  Bill Total: Rs. <span id="sf-bill-subtotal">0</span>
                </span>
              </div>

              <!-- Input Row for Order Item -->
              <div class="bg-slate-50 border border-slate-200 rounded-xl p-3 mb-3 grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                <div class="sm:col-span-6">
                  <label class="block text-[10px] font-black uppercase text-slate-500 mb-1">Item Description / Name</label>
                  <input type="text" id="sf-new-item-desc" placeholder="Item Description / Name"
                    onkeydown="if(event.key === 'Enter') { document.getElementById('sf-new-item-price').focus(); }"
                    class="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-sm font-bold text-slate-800 focus:border-emerald-500 outline-none">
                </div>
                <div class="sm:col-span-2">
                  <label class="block text-[10px] font-black uppercase text-slate-500 mb-1">Qty</label>
                  <input type="number" id="sf-new-item-qty" value="1" min="1" step="1"
                    class="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-sm font-bold text-center text-slate-800 focus:border-emerald-500 outline-none">
                </div>
                <div class="sm:col-span-3">
                  <label class="block text-[10px] font-black uppercase text-slate-500 mb-1">Total Price (Rs.)</label>
                  <input type="number" id="sf-new-item-price" placeholder="Price" min="0" step="1"
                    onkeydown="if(event.key === 'Enter') SalesForm.addOrderItem();"
                    class="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-sm font-bold text-slate-800 text-right focus:border-emerald-500 outline-none font-mono">
                </div>
                <div class="sm:col-span-1 flex items-end">
                  <button type="button" onclick="SalesForm.addOrderItem()"
                    class="w-full bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black py-1.5 rounded-lg flex items-center justify-center transition-all shadow-sm"
                    title="Add Item to Bill">
                    <i data-lucide="plus" class="w-4 h-4"></i>
                  </button>
                </div>
              </div>

              <!-- Order Items Table -->
              <div class="flex-1 overflow-y-auto border border-slate-200 rounded-xl min-h-[140px] max-h-[220px]">
                <table class="w-full text-left border-collapse">
                  <thead class="bg-slate-50 sticky top-0 border-b border-slate-200 text-[10px] font-black text-slate-500 uppercase tracking-wider">
                    <tr>
                      <th class="py-2 px-3 w-10 text-center">#</th>
                      <th class="py-2 px-3">Item Description</th>
                      <th class="py-2 px-3 w-16 text-center">Qty</th>
                      <th class="py-2 px-3 w-28 text-right">Price (Rs.)</th>
                      <th class="py-2 px-3 w-10 text-center"></th>
                    </tr>
                  </thead>
                  <tbody id="sf-order-items-tbody">
                    <!-- Populated dynamically -->
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <!-- RIGHT COLUMN: Stock Materials Used (Deducted from Inventory) -->
          <div class="flex-1 flex flex-col gap-4 min-w-0">
            <div class="bg-white rounded-xl shadow-sm border border-slate-200/80 p-4 flex-1 flex flex-col">
              <div class="flex items-center justify-between mb-2">
                <div>
                  <h2 class="text-sm font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                    <i data-lucide="box" class="w-4 h-4 text-amber-600"></i>
                    2. Materials Used From Stock (Workshop Only)
                  </h2>
                  <p class="text-[11px] text-slate-500 font-medium mt-0.5">
                    Select stock materials used to reduce from inventory.
                  </p>
                </div>
                <span class="text-xs font-black text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg">
                  Material Cost: Rs. <span id="sf-materials-total-cost">0</span>
                </span>
              </div>

              <!-- Input Row for Material Selection -->
              <div class="bg-slate-50 border border-slate-200 rounded-xl p-3 mb-3 grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                <div class="sm:col-span-7 relative">
                  <label class="block text-[10px] font-black uppercase text-slate-500 mb-1">Select Material from Stock</label>
                  <input type="text" id="sf-material-search" placeholder="Search material from stock..."
                    autocomplete="off"
                    oninput="SalesForm.handleMaterialSearch(this.value)"
                    onfocus="SalesForm.handleMaterialSearch(this.value)"
                    onclick="SalesForm.handleMaterialSearch(this.value)"
                    class="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-sm font-bold text-slate-800 focus:border-amber-500 outline-none">
                  <!-- Stock Dropdown Suggestions -->
                  <div id="sf-material-dropdown" class="hidden absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-56 overflow-y-auto"></div>
                </div>

                <div class="sm:col-span-3">
                  <label class="block text-[10px] font-black uppercase text-slate-500 mb-1">
                    Qty Used <span id="sf-selected-unit" class="text-slate-400 font-normal"></span>
                  </label>
                  <input type="number" id="sf-material-qty" value="1" min="0.1" step="any"
                    onkeydown="if(event.key === 'Enter') SalesForm.addUsedMaterial();"
                    class="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-sm font-bold text-center text-slate-800 focus:border-amber-500 outline-none">
                </div>

                <div class="sm:col-span-2 flex items-end">
                  <button type="button" onclick="SalesForm.addUsedMaterial()"
                    class="w-full bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-black py-1.5 rounded-lg flex items-center justify-center gap-1 transition-all shadow-sm text-xs"
                    title="Add Material to Order">
                    <i data-lucide="plus" class="w-3.5 h-3.5"></i> Add
                  </button>
                </div>
              </div>

              <!-- Materials Table -->
              <div class="flex-1 overflow-y-auto border border-slate-200 rounded-xl min-h-[140px] max-h-[220px]">
                <table class="w-full text-left border-collapse">
                  <thead class="bg-slate-50 sticky top-0 border-b border-slate-200 text-[10px] font-black text-slate-500 uppercase tracking-wider">
                    <tr>
                      <th class="py-2 px-3 w-8 text-center">#</th>
                      <th class="py-2 px-3">Stock Material</th>
                      <th class="py-2 px-3 w-20 text-center">In Stock</th>
                      <th class="py-2 px-3 w-16 text-center">Used</th>
                      <th class="py-2 px-3 w-24 text-right">Cost (Rs.)</th>
                      <th class="py-2 px-3 w-8 text-center"></th>
                    </tr>
                  </thead>
                  <tbody id="sf-materials-tbody">
                    <!-- Populated dynamically -->
                  </tbody>
                </table>
              </div>

              <!-- Material & Profit Summary Card -->
              <div class="mt-3 p-2.5 bg-amber-50/70 border border-amber-200/80 rounded-xl flex items-center justify-between text-xs">
                <div class="flex items-center gap-2">
                  <span class="w-2 h-2 rounded-full bg-amber-500"></span>
                  <span class="font-bold text-amber-900">Estimated Profit for this Order:</span>
                </div>
                <div class="font-black text-emerald-700 text-sm font-mono" id="sf-order-profit">
                  Rs. 0
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- BOTTOM CHECKOUT / PAYMENT BAR -->
        <div class="bg-white border-t border-slate-200 p-4 shadow-lg shrink-0">
          <div class="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
            
            <!-- Left: Payment details inputs -->
            <div class="flex items-center gap-4 flex-wrap w-full md:w-auto">
              
              <!-- Total -->
              <div class="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-center min-w-[110px]">
                <span class="block text-[10px] font-black uppercase text-slate-400">Order Total</span>
                <span class="text-base font-black text-slate-800 font-mono" id="sf-footer-total">Rs. 0</span>
              </div>

              <!-- Discount -->
              <div class="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-center min-w-[110px]">
                <label for="sf-discount-input" class="block text-[10px] font-black uppercase text-slate-400">Discount (Rs.)</label>
                <input type="number" id="sf-discount-input" value="${this.discount || 0}" min="0" step="1"
                  oninput="SalesForm.handleDiscountChange(this.value)"
                  class="w-20 bg-transparent text-sm font-black text-slate-800 text-center outline-none font-mono">
              </div>

              <!-- Final Net Bill -->
              <div class="bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-1.5 text-center min-w-[120px]">
                <span class="block text-[10px] font-black uppercase text-emerald-600">Final Bill</span>
                <span class="text-lg font-black text-emerald-700 font-mono" id="sf-footer-net">Rs. 0</span>
              </div>

              <!-- Received / Advance -->
              <div class="bg-amber-50 border border-amber-200 rounded-xl px-3 py-1.5 text-center min-w-[120px]">
                <label for="sf-received-input" class="block text-[10px] font-black uppercase text-amber-700">Received / Advance</label>
                <input type="number" id="sf-received-input" value="${this.receivedAmount || 0}" min="0" step="1"
                  oninput="SalesForm.handleReceivedChange(this.value)"
                  class="w-24 bg-transparent text-base font-black text-amber-900 text-center outline-none font-mono">
              </div>

              <!-- Remaining Due (Khata) -->
              <div id="sf-remaining-card" class="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-center min-w-[120px]">
                <span class="block text-[10px] font-black uppercase text-slate-400">Balance Due</span>
                <span class="text-sm font-black text-slate-700 font-mono" id="sf-footer-due">Rs. 0</span>
              </div>

              <!-- Payment Method Toggle -->
              <div class="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
                <button type="button" onclick="SalesForm.setPaymentMethod('Cash')" id="sf-btn-cash"
                  class="px-3 py-1 text-xs font-black rounded-lg transition-all ${this.paymentMethod === 'Cash' ? 'bg-white shadow text-slate-900' : 'text-slate-500'}">
                  Cash
                </button>
                <button type="button" onclick="SalesForm.setPaymentMethod('Online')" id="sf-btn-online"
                  class="px-3 py-1 text-xs font-black rounded-lg transition-all ${this.paymentMethod === 'Online' ? 'bg-white shadow text-slate-900' : 'text-slate-500'}">
                  Online
                </button>
              </div>
            </div>

            <!-- Right: Action Buttons -->
            <div class="flex items-center gap-2 w-full md:w-auto justify-end">
              <button type="button" onclick="SalesForm.resetForm()"
                class="px-3 py-2.5 rounded-xl border border-slate-300 text-slate-600 hover:bg-slate-100 font-bold text-xs transition-all flex items-center gap-1.5">
                <i data-lucide="rotate-ccw" class="w-4 h-4"></i> Reset
              </button>
              
              <button type="button" onclick="SalesForm.saveOrder(false)"
                class="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs transition-all shadow flex items-center gap-1.5">
                <i data-lucide="save" class="w-4 h-4"></i> Save Order
              </button>

              <button type="button" onclick="SalesForm.saveOrder(true)"
                class="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black text-sm transition-all shadow-md flex items-center gap-2">
                <i data-lucide="printer" class="w-4 h-4"></i> Save & Print Receipt
              </button>
            </div>

          </div>
        </div>
      </div>
    `;

    if (window.lucide) lucide.createIcons();
    this.renderOrderItems();
    this.renderUsedMaterials();
    this.startClock();
  },

  startClock() {
    const clockEl = document.getElementById('sf-live-clock');
    if (!clockEl) return;
    const update = () => {
      const now = new Date();
      if (clockEl) {
        clockEl.textContent = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) + ' ' + 
                              now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
      }
    };
    update();
    if (this.clockInterval) clearInterval(this.clockInterval);
    this.clockInterval = setInterval(update, 1000);
  },

  setupShortcuts() {
    this.keydownHandler = (e) => {
      if (app.currentPage !== 'proposal-form') return;
      if (e.key === 'F2') {
        e.preventDefault();
        this.saveOrder(true);
      } else if (e.key === 'F3') {
        e.preventDefault();
        this.saveOrder(false);
      } else if (e.key === 'Escape') {
        this.closeAllDropdowns();
      }
    };
    window.removeEventListener('keydown', this.keydownHandler);
    window.addEventListener('keydown', this.keydownHandler);

    this.outsideClickHandler = (e) => {
      if (app.currentPage !== 'proposal-form') return;

      const matDropdown = document.getElementById('sf-material-dropdown');
      const matInput = document.getElementById('sf-material-search');
      if (matDropdown && !matDropdown.classList.contains('hidden')) {
        if (!matDropdown.contains(e.target) && e.target !== matInput) {
          matDropdown.classList.add('hidden');
        }
      }

      const custDropdown = document.getElementById('sf-customer-dropdown');
      const custInput = document.getElementById('sf-customer-name');
      if (custDropdown && !custDropdown.classList.contains('hidden')) {
        if (!custDropdown.contains(e.target) && e.target !== custInput) {
          custDropdown.classList.add('hidden');
        }
      }
    };
    document.removeEventListener('click', this.outsideClickHandler);
    document.addEventListener('click', this.outsideClickHandler);
    document.removeEventListener('mousedown', this.outsideClickHandler);
    document.addEventListener('mousedown', this.outsideClickHandler);
  },

  closeAllDropdowns() {
    const matDropdown = document.getElementById('sf-material-dropdown');
    if (matDropdown) matDropdown.classList.add('hidden');
    const custDropdown = document.getElementById('sf-customer-dropdown');
    if (custDropdown) custDropdown.classList.add('hidden');
  },

  // Customer handling
  handleCustomerInput(query) {
    this.customerName = query;
    const dropdown = document.getElementById('sf-customer-dropdown');
    if (!dropdown) return;

    const q = (query || '').trim().toLowerCase();
    const matches = (q
      ? this.customers.filter(c => 
          (c.name && c.name.toLowerCase().includes(q)) || 
          (c.phone && c.phone.includes(q))
        )
      : this.customers
    ).slice(0, 8);

    if (matches.length === 0) {
      dropdown.classList.add('hidden');
      dropdown.innerHTML = '';
      return;
    }

    dropdown.innerHTML = matches.map((c, i) => `
      <div onclick="SalesForm.selectCustomer(${c.id})" class="px-3 py-2 hover:bg-amber-50 cursor-pointer border-b border-slate-100 flex items-center justify-between text-xs transition-colors">
        <div>
          <span class="font-bold text-slate-800">${c.name}</span>
          ${c.phone ? `<span class="text-slate-400 ml-2 font-mono">${c.phone}</span>` : ''}
        </div>
        ${c.amount > 0 ? `<span class="font-bold text-rose-600 font-mono">Khata: Rs. ${Number(c.amount).toLocaleString()}</span>` : ''}
      </div>
    `).join('');
    dropdown.classList.remove('hidden');
  },

  selectCustomer(id) {
    const cust = this.customers.find(c => c.id === id);
    if (!cust) return;
    this.customerId = cust.id;
    this.customerName = cust.name;
    this.customerPhone = cust.phone || '';
    this.customerBalance = cust.amount || 0;

    const nameInput = document.getElementById('sf-customer-name');
    const phoneInput = document.getElementById('sf-customer-phone');
    if (nameInput) nameInput.value = this.customerName;
    if (phoneInput) phoneInput.value = this.customerPhone;

    const balanceBadge = document.getElementById('sf-cust-balance-badge');
    const balanceVal = document.getElementById('sf-cust-balance-val');
    if (balanceBadge && balanceVal) {
      if (this.customerBalance > 0) {
        balanceVal.textContent = Number(this.customerBalance).toLocaleString();
        balanceBadge.classList.remove('hidden');
      } else {
        balanceBadge.classList.add('hidden');
      }
    }

    const dropdown = document.getElementById('sf-customer-dropdown');
    if (dropdown) dropdown.classList.add('hidden');
  },

  // Order Items logic (Customer Bill)
  addOrderItem() {
    const descInput = document.getElementById('sf-new-item-desc');
    const qtyInput = document.getElementById('sf-new-item-qty');
    const priceInput = document.getElementById('sf-new-item-price');

    const desc = (descInput?.value || '').trim();
    const qty = Math.max(1, parseFloat(qtyInput?.value) || 1);
    const totalPrice = parseFloat(priceInput?.value) || 0;

    if (!desc) {
      app.showAlert('Please enter an item name.');
      descInput?.focus();
      return;
    }

    if (totalPrice <= 0) {
      app.showAlert('Please enter the price for this item.');
      priceInput?.focus();
      return;
    }

    this.orderItems.push({
      id: Date.now() + Math.random(),
      description: desc,
      qty: qty,
      price: totalPrice,
      total: totalPrice
    });

    if (descInput) descInput.value = '';
    if (qtyInput) qtyInput.value = '1';
    if (priceInput) priceInput.value = '';

    this.renderOrderItems();
    this.recalculate();
    descInput?.focus();
  },

  removeOrderItem(id) {
    this.orderItems = this.orderItems.filter(it => it.id !== id);
    this.renderOrderItems();
    this.recalculate();
  },

  renderOrderItems() {
    const tbody = document.getElementById('sf-order-items-tbody');
    if (!tbody) return;

    if (this.orderItems.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" class="py-8 text-center text-slate-400 text-xs font-medium">
            No items in customer bill yet. Add an item above.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = this.orderItems.map((it, idx) => `
      <tr class="border-b border-slate-100 hover:bg-slate-50/70 text-xs">
        <td class="py-2 px-3 text-center font-bold text-slate-400">${idx + 1}</td>
        <td class="py-2 px-3 font-bold text-slate-800">${it.description}</td>
        <td class="py-2 px-3 text-center font-bold text-slate-700">${it.qty}</td>
        <td class="py-2 px-3 text-right font-black text-slate-900 font-mono">Rs. ${Number(it.total).toLocaleString()}</td>
        <td class="py-2 px-3 text-center">
          <button type="button" onclick="SalesForm.removeOrderItem(${it.id})" class="text-rose-500 hover:text-rose-700 p-1 hover:bg-rose-50 rounded">
            <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
          </button>
        </td>
      </tr>
    `).join('');

    if (window.lucide) lucide.createIcons();
  },

  // Stock Materials Used logic (Workshop Only)
  handleMaterialSearch(query) {
    const dropdown = document.getElementById('sf-material-dropdown');
    if (!dropdown) return;

    const q = (query || '').trim().toLowerCase();
    const matches = (q
      ? this.availableStock.filter(p => 
          (p.item_name && p.item_name.toLowerCase().includes(q)) ||
          (p.category_label && p.category_label.toLowerCase().includes(q)) ||
          (p.description && p.description.toLowerCase().includes(q))
        )
      : this.availableStock
    ).slice(0, 15);

    if (matches.length === 0) {
      dropdown.classList.add('hidden');
      dropdown.innerHTML = '';
      return;
    }

    dropdown.innerHTML = matches.map(p => {
      const isAlreadyAdded = this.usedMaterials.some(m => 
        (String(m.id) === String(p.id) && String(m.section) === String(p.slug)) ||
        (m.item_name && p.item_name && m.item_name.trim().toLowerCase() === p.item_name.trim().toLowerCase())
      );
      if (isAlreadyAdded) {
        return `
          <div class="px-3 py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-xs opacity-55 cursor-not-allowed select-none" title="Already added to order">
            <div class="flex items-center gap-1.5 min-w-0">
              <span class="font-bold text-slate-400 line-through truncate">${p.item_name}</span>
              <span class="text-[9px] bg-slate-200 text-slate-600 font-black px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0">Already Added</span>
            </div>
            <div class="text-right shrink-0 ml-2">
              <span class="font-semibold text-slate-400 text-[11px]">Stock: ${p.current_stock || 0} ${p.unit || 'pcs'}</span>
            </div>
          </div>
        `;
      }

      return `
        <div onclick="SalesForm.selectStockMaterial(${p.id}, '${p.slug}')" class="px-3 py-2 hover:bg-amber-50 cursor-pointer border-b border-slate-100 flex items-center justify-between text-xs transition-colors">
          <div class="min-w-0">
            <span class="font-bold text-slate-800">${p.item_name}</span>
            <span class="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded ml-2">${p.category_label || p.slug}</span>
          </div>
          <div class="text-right shrink-0 ml-2">
            <span class="font-bold ${p.current_stock > 0 ? 'text-emerald-600' : 'text-rose-500'}">
              Stock: ${p.current_stock || 0} ${p.unit || 'pcs'}
            </span>
            <span class="text-slate-400 text-[11px] ml-2 font-mono">Cost: Rs. ${Number(p.cost_price || 0).toLocaleString()}</span>
          </div>
        </div>
      `;
    }).join('');
    dropdown.classList.remove('hidden');
  },

  selectStockMaterial(id, slug) {
    const isAlreadyAdded = this.usedMaterials.some(m => 
      (String(m.id) === String(id) && String(m.section) === String(slug)) ||
      (this.availableStock.find(p => p.id === id && p.slug === slug)?.item_name && m.item_name && m.item_name.trim().toLowerCase() === this.availableStock.find(p => p.id === id && p.slug === slug).item_name.trim().toLowerCase())
    );
    if (isAlreadyAdded) return;

    const item = this.availableStock.find(p => p.id === id && p.slug === slug);
    if (!item) return;

    this.selectedStockItem = item;
    const searchInput = document.getElementById('sf-material-search');
    const unitBadge = document.getElementById('sf-selected-unit');
    const qtyInput = document.getElementById('sf-material-qty');

    if (searchInput) searchInput.value = `${item.item_name} (In Stock: ${item.current_stock || 0} ${item.unit || 'pcs'})`;
    if (unitBadge) unitBadge.textContent = `(${item.unit || 'pcs'})`;
    if (qtyInput) qtyInput.focus();

    const dropdown = document.getElementById('sf-material-dropdown');
    if (dropdown) dropdown.classList.add('hidden');
  },

  addUsedMaterial() {
    if (!this.selectedStockItem) {
      app.showAlert('Please select a stock material first.');
      document.getElementById('sf-material-search')?.focus();
      return;
    }

    const qtyInput = document.getElementById('sf-material-qty');
    const qty = parseFloat(qtyInput?.value) || 0;

    if (qty <= 0) {
      app.showAlert('Please enter quantity used (greater than 0).');
      qtyInput?.focus();
      return;
    }

    const item = this.selectedStockItem;
    const cost = Number(item.cost_price) || 0;

    // Check if already in list, then increment
    const existing = this.usedMaterials.find(m => m.id === item.id && m.section === item.slug);
    if (existing) {
      existing.qty += qty;
      existing.line_cost = existing.qty * cost;
    } else {
      this.usedMaterials.push({
        id: item.id,
        section: item.slug,
        item_name: item.item_name,
        category_label: item.category_label || item.slug,
        unit: item.unit || 'pcs',
        cost_price: cost,
        current_stock: item.current_stock || 0,
        qty: qty,
        line_cost: qty * cost
      });
    }

    this.selectedStockItem = null;
    const searchInput = document.getElementById('sf-material-search');
    const unitBadge = document.getElementById('sf-selected-unit');
    if (searchInput) searchInput.value = '';
    if (unitBadge) unitBadge.textContent = '';
    if (qtyInput) qtyInput.value = '1';

    this.renderUsedMaterials();
    this.recalculate();
    searchInput?.focus();
  },

  removeUsedMaterial(index) {
    this.usedMaterials.splice(index, 1);
    this.renderUsedMaterials();
    this.recalculate();
  },

  renderUsedMaterials() {
    const tbody = document.getElementById('sf-materials-tbody');
    if (!tbody) return;

    if (this.usedMaterials.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="py-8 text-center text-slate-400 text-xs font-medium">
            No stock materials selected yet. If raw materials were used for this order, add them above.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = this.usedMaterials.map((m, idx) => `
      <tr class="border-b border-slate-100 hover:bg-slate-50/70 text-xs">
        <td class="py-2 px-3 text-center font-bold text-slate-400">${idx + 1}</td>
        <td class="py-2 px-3">
          <div class="font-bold text-slate-800">${m.item_name}</div>
          <div class="text-[10px] text-slate-400 font-semibold">${m.category_label}</div>
        </td>
        <td class="py-2 px-3 text-center font-mono font-bold text-slate-500">${m.current_stock} ${m.unit}</td>
        <td class="py-2 px-3 text-center font-bold text-amber-700 bg-amber-50/50 rounded">${m.qty} ${m.unit}</td>
        <td class="py-2 px-3 text-right font-bold text-slate-800 font-mono">Rs. ${Number(m.line_cost).toLocaleString()}</td>
        <td class="py-2 px-3 text-center">
          <button type="button" onclick="SalesForm.removeUsedMaterial(${idx})" class="text-rose-500 hover:text-rose-700 p-1 hover:bg-rose-50 rounded">
            <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
          </button>
        </td>
      </tr>
    `).join('');

    if (window.lucide) lucide.createIcons();
  },

  // Financial calculations
  recalculate() {
    const billSubtotal = this.orderItems.reduce((acc, it) => acc + (Number(it.total) || 0), 0);
    const materialsCost = this.usedMaterials.reduce((acc, m) => acc + (Number(m.line_cost) || 0), 0);

    const discInput = document.getElementById('sf-discount-input');
    const disc = Math.max(0, parseFloat(discInput?.value) || this.discount || 0);
    this.discount = disc;

    const netTotal = Math.max(0, billSubtotal - disc);

    const recvInput = document.getElementById('sf-received-input');
    if (!this.isReceivedManuallyEdited && recvInput) {
      this.receivedAmount = netTotal;
      recvInput.value = netTotal;
    } else {
      this.receivedAmount = Math.max(0, parseFloat(recvInput?.value) || 0);
    }

    const dueAmount = Math.max(0, netTotal - this.receivedAmount);
    const profit = netTotal - materialsCost;

    // Update displays
    const billSubEl = document.getElementById('sf-bill-subtotal');
    if (billSubEl) billSubEl.textContent = billSubtotal.toLocaleString();

    const matCostEl = document.getElementById('sf-materials-total-cost');
    if (matCostEl) matCostEl.textContent = materialsCost.toLocaleString();

    const profitEl = document.getElementById('sf-order-profit');
    if (profitEl) {
      profitEl.textContent = `Rs. ${profit.toLocaleString()}`;
      profitEl.className = `font-black text-sm font-mono ${profit >= 0 ? 'text-emerald-700' : 'text-rose-600'}`;
    }

    const footerTotalEl = document.getElementById('sf-footer-total');
    if (footerTotalEl) footerTotalEl.textContent = `Rs. ${billSubtotal.toLocaleString()}`;

    const footerNetEl = document.getElementById('sf-footer-net');
    if (footerNetEl) footerNetEl.textContent = `Rs. ${netTotal.toLocaleString()}`;

    const footerDueEl = document.getElementById('sf-footer-due');
    const remCard = document.getElementById('sf-remaining-card');
    if (footerDueEl) footerDueEl.textContent = `Rs. ${dueAmount.toLocaleString()}`;
    if (remCard) {
      if (dueAmount > 0) {
        remCard.className = 'bg-rose-50 border border-rose-300 rounded-xl px-3 py-1.5 text-center min-w-[120px]';
        footerDueEl.className = 'text-sm font-black text-rose-700 font-mono';
      } else {
        remCard.className = 'bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-center min-w-[120px]';
        footerDueEl.className = 'text-sm font-black text-slate-700 font-mono';
      }
    }
  },

  handleDiscountChange(val) {
    this.discount = Math.max(0, parseFloat(val) || 0);
    this.recalculate();
  },

  handleReceivedChange(val) {
    this.isReceivedManuallyEdited = true;
    this.receivedAmount = Math.max(0, parseFloat(val) || 0);
    this.recalculate();
  },

  setPaymentMethod(method) {
    this.paymentMethod = method;
    const btnCash = document.getElementById('sf-btn-cash');
    const btnOnline = document.getElementById('sf-btn-online');
    if (btnCash && btnOnline) {
      if (method === 'Cash') {
        btnCash.className = 'px-3 py-1 text-xs font-black rounded-lg transition-all bg-white shadow text-slate-900';
        btnOnline.className = 'px-3 py-1 text-xs font-black rounded-lg transition-all text-slate-500';
      } else {
        btnOnline.className = 'px-3 py-1 text-xs font-black rounded-lg transition-all bg-white shadow text-slate-900';
        btnCash.className = 'px-3 py-1 text-xs font-black rounded-lg transition-all text-slate-500';
      }
    }
  },

  resetForm() {
    this.editingSaleId = null;
    this.orderItems = [];
    this.usedMaterials = [];
    this.customerName = '';
    this.customerPhone = '';
    this.customerId = null;
    this.customerBalance = 0;
    this.discount = 0;
    this.receivedAmount = 0;
    this.isReceivedManuallyEdited = false;
    this.paymentMethod = 'Cash';
    this.selectedStockItem = null;

    window.api.getNextProposalNumber().then(num => {
      this.saleNumber = num;
      const root = document.getElementById('sf-root')?.parentElement;
      if (root) this.buildUI(root);
      this.recalculate();
    }).catch(() => {
      const root = document.getElementById('sf-root')?.parentElement;
      if (root) this.buildUI(root);
      this.recalculate();
    });
  },

  // Save order to database & print receipt
  async saveOrder(shouldPrint = false) {
    if (this.orderItems.length === 0) {
      app.showAlert('Please add at least one item to the customer bill.');
      document.getElementById('sf-new-item-desc')?.focus();
      return;
    }

    const nameInput = document.getElementById('sf-customer-name');
    const finalCustName = (nameInput?.value || this.customerName || 'Walk-in Customer').trim();
    const finalCustPhone = (document.getElementById('sf-customer-phone')?.value || this.customerPhone || '').trim();

    const billSubtotal = this.orderItems.reduce((acc, it) => acc + (Number(it.total) || 0), 0);
    const materialsCost = this.usedMaterials.reduce((acc, m) => acc + (Number(m.line_cost) || 0), 0);
    const netTotal = Math.max(0, billSubtotal - this.discount);
    const received = Math.max(0, this.receivedAmount);
    const dueAmount = Math.max(0, netTotal - received);
    const profit = netTotal - materialsCost;
    const status = dueAmount === 0 ? 'Paid' : 'Partial';

    // Build combined items payload for proposals table
    const combinedItems = [];

    // 1. Customer Billed Items (Type: 'billed')
    this.orderItems.forEach(it => {
      combinedItems.push({
        item_type: 'billed',
        item_id: null,
        section: null,
        description: it.description,
        qty: it.qty,
        unit: 'pcs',
        unit_retail: it.price / it.qty,
        unit_cost: 0,
        unit_discounted: it.price / it.qty,
        line_retail: it.total,
        line_cost: 0,
        line_profit: it.total
      });
    });

    // 2. Used Materials from Stock (Type: 'material' -> deducted from inventory)
    this.usedMaterials.forEach(m => {
      combinedItems.push({
        item_type: 'material',
        item_id: m.id,
        section: m.section,
        description: m.item_name,
        qty: m.qty,
        unit: m.unit,
        unit_retail: 0,
        unit_cost: m.cost_price,
        unit_discounted: 0,
        line_retail: 0,
        line_cost: m.line_cost,
        line_profit: -m.line_cost
      });
    });

    const saleData = {
      id: this.editingSaleId,
      proposal_number: this.saleNumber,
      customer_name: finalCustName,
      phone: finalCustPhone,
      date: new Date().toISOString(),
      retail_total: netTotal,
      cost_total: materialsCost,
      profit: profit,
      received_amount: received,
      discount: this.discount,
      status: status,
      payment_method: this.paymentMethod,
      items: combinedItems
    };

    if (shouldPrint) {
      // Recheck / Confirm Window: Do NOT save to DB yet!
      this.pendingSaleData = {
        saleData,
        dueAmount,
        finalCustName,
        finalCustPhone,
        customerId: this.customerId
      };

      const receiptHtml = await this.generateReceipt({
        ...saleData,
        id: this.editingSaleId || this.saleNumber
      });

      const invTitle = this.saleNumber ? (this.saleNumber.startsWith('#') ? `Receipt: ${this.saleNumber}` : `Receipt: #${this.saleNumber}`) : 'Receipt Preview';
      app.showPreview(
        receiptHtml, 
        invTitle, 
        '80MM THERMAL RECEIPT', 
        'receipt-print', 
        () => this.confirmAndCompleteSale()
      );
      return;
    }

    // Direct save without printing (Save Order button)
    app.showLoading();
    try {
      const savedId = await window.api.saveProposal(saleData);

      // Handle Customer Khata balance update
      if (dueAmount > 0 || this.customerId) {
        let activeCustId = this.customerId;
        if (!activeCustId && finalCustName.toLowerCase() !== 'walk-in customer') {
          try {
            activeCustId = await window.api.saveCustomer({
              name: finalCustName,
              phone: finalCustPhone,
              address: '',
              amount: 0
            });
          } catch (e) {}
        }
        if (activeCustId) {
          try {
            const cust = (await window.api.getCustomers()).find(c => c.id === activeCustId);
            if (cust) {
              const currentKhata = Number(cust.amount) || 0;
              const updatedKhata = Math.max(0, currentKhata + dueAmount);
              await window.api.saveCustomer({
                id: cust.id,
                name: cust.name,
                phone: cust.phone,
                address: cust.address,
                amount: updatedKhata
              });
            }
          } catch (e) {
            console.error('Failed to update customer khata balance:', e);
          }
        }
      }

      app.hideLoading();
      app.showAlert(`Order #${this.saleNumber} successfully saved!`);
      this.resetForm();
    } catch (err) {
      app.hideLoading();
      console.error('Save Order Error:', err);
      app.showAlert('Error saving order: ' + err.message);
    }
  },

  // Called when user clicks "Confirm & Print" in the preview window
  async confirmAndCompleteSale() {
    if (!this.pendingSaleData) {
      this.closePreview();
      return;
    }

    const { saleData, dueAmount, finalCustName, finalCustPhone, customerId } = this.pendingSaleData;

    app.showLoading();
    try {
      const savedId = await window.api.saveProposal(saleData);

      // Handle Customer Khata balance update
      if (dueAmount > 0 || customerId) {
        let activeCustId = customerId;
        if (!activeCustId && finalCustName.toLowerCase() !== 'walk-in customer') {
          try {
            activeCustId = await window.api.saveCustomer({
              name: finalCustName,
              phone: finalCustPhone,
              address: '',
              amount: 0
            });
          } catch (e) {}
        }
        if (activeCustId) {
          try {
            const cust = (await window.api.getCustomers()).find(c => c.id === activeCustId);
            if (cust) {
              const currentKhata = Number(cust.amount) || 0;
              const updatedKhata = Math.max(0, currentKhata + dueAmount);
              await window.api.saveCustomer({
                id: cust.id,
                name: cust.name,
                phone: cust.phone,
                address: cust.address,
                amount: updatedKhata
              });
            }
          } catch (e) {
            console.error('Failed to update customer khata balance:', e);
          }
        }
      }

      this.pendingSaleData = null;
      app.hideLoading();

      // Close preview modal
      const modal = document.getElementById('preview-modal');
      if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
      }

      // Print physical thermal receipt
      await app.printReceipt();

      app.showAlert(`Order #${this.saleNumber} completed & printed!`);
      this.resetForm();
    } catch (err) {
      app.hideLoading();
      console.error('Confirm & Save Order Error:', err);
      app.showAlert('Error completing order: ' + err.message);
    }
  },

  onClosePreview() {
    // If preview modal is closed or discarded, clear pending data (do NOT save anything)
    this.pendingSaleData = null;
  },

  // Generate Customer Thermal Receipt (NEVER shows ingredients / stock materials!)
  async generateReceipt(data) {
    if (!this.settings || !this.settings.company_name) {
      this.settings = (await window.api.getSettings()) || {};
    }

    const companyName = this.settings.company_name || 'NH DOORS';
    const address = this.settings.address || 'Taxila';
    const phone = this.settings.phone || '';
    const invoiceNum = data.proposal_number || `INV-${data.id}`;
    const dateObj = data.date ? new Date(data.date) : new Date();
    const dateFormatted = dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const timeFormatted = dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

    // ONLY include billed customer items (hide raw materials / ingredients)
    const rawItems = data.items || [];
    const billedItems = rawItems.filter(it => it.item_type === 'billed' || (!it.item_type && !it.item_id));

    const rowsHtml = billedItems.map((it, idx) => `
      <tr style="border-bottom: 1px dashed #000; font-size: 10px;">
        <td style="padding: 3px 2px; text-align: left; vertical-align: top;">
          <b>${it.description}</b>
        </td>
        <td style="padding: 3px 2px; text-align: center; vertical-align: top; width: 14%;">
          ${it.qty || 1}
        </td>
        <td style="padding: 3px 2px; text-align: right; vertical-align: top; width: 25%;">
          ${app.formatCurrency(it.line_retail || it.unit_retail || 0)}
        </td>
      </tr>
    `).join('');

    const subtotal = Number(data.retail_total || 0) + Number(data.discount || 0);
    const netTotal = Number(data.retail_total || 0);
    const discount = Number(data.discount || 0);
    const received = Number(data.received_amount !== undefined ? data.received_amount : netTotal);
    const due = Math.max(0, netTotal - received);

    const html = `
      <div class="receipt-80mm" style="width: 100%; max-width: 80mm; margin: 0 auto; padding: 4px 6px; background: #fff; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #000; font-size: 11px; line-height: 1.35; box-sizing: border-box; -webkit-font-smoothing: antialiased;">
        
        <!-- Header -->
        <div style="text-align: center; margin-bottom: 4px;">
          <h1 style="font-size: 16px; font-weight: 900; margin: 0 0 2px 0; text-transform: uppercase; letter-spacing: 0.5px; color: #000; line-height: 1.2;">
            ${companyName}
          </h1>
          <div style="font-size: 11px; font-weight: 600; color: #000; line-height: 1.25; margin-bottom: 2px;">
            ${address}
          </div>
          ${phone ? `<div style="font-size: 11px; font-weight: 700; color: #000; line-height: 1.3;">${phone}</div>` : ''}
          <div style="margin-top: 5px;">
            <span style="display: inline-block; border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 2px 12px; font-size: 12px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.8px;">
              SALES INVOICE
            </span>
          </div>
        </div>

        <!-- Metadata -->
        <div style="font-size: 11px; line-height: 1.35; margin-bottom: 4px; padding-bottom: 4px; border-bottom: 1px dashed #000;">
          <div style="display: flex; justify-content: space-between;">
            <span><b>INV #:</b> ${invoiceNum.startsWith('#') ? invoiceNum : `#${invoiceNum}`}</span>
            <span><b>DATE:</b> ${dateFormatted} ${timeFormatted}</span>
          </div>
          ${data.customer_name ? `<div style="margin-top: 1.5px;"><b>CUSTOMER:</b> ${data.customer_name}</div>` : ''}
          ${data.phone ? `<div style="margin-top: 1px;"><b>PHONE:</b> ${data.phone}</div>` : ''}
          <div style="margin-top: 1px;"><b>PAYMENT:</b> ${(data.payment_method || 'CASH').toUpperCase()}</div>
        </div>

        <!-- Billed Items Table -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 4px; font-size: 10.5px;">
          <thead>
            <tr style="border-bottom: 1.5px solid #000; font-size: 9.5px; font-weight: 900; text-transform: uppercase;">
              <th style="padding: 2.5px 2px; text-align: left;">ORDER ITEM</th>
              <th style="padding: 2.5px 2px; text-align: center; width: 14%;">QTY</th>
              <th style="padding: 2.5px 2px; text-align: right; width: 25%;">AMOUNT</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <!-- Totals Summary -->
        <div style="font-size: 11px; font-weight: 700; line-height: 1.4; border-top: 1px dashed #000; padding-top: 3px;">
          <div style="display: flex; justify-content: space-between;">
            <span>TOTAL:</span>
            <span>${app.formatCurrency(subtotal)}</span>
          </div>
          ${discount > 0 ? `
          <div style="display: flex; justify-content: space-between; color: #444;">
            <span>DISCOUNT:</span>
            <span>- ${app.formatCurrency(discount)}</span>
          </div>` : ''}
          <div style="display: flex; justify-content: space-between; font-size: 13px; font-weight: 900; border-top: 1px solid #000; border-bottom: 1px solid #000; padding: 2px 0; margin: 2px 0;">
            <span>NET BILL:</span>
            <span>${app.formatCurrency(netTotal)}</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span>RECEIVED / ADVANCE:</span>
            <span>${app.formatCurrency(received)}</span>
          </div>
          ${due > 0 ? `
          <div style="display: flex; justify-content: space-between; font-weight: 900; color: #000; margin-top: 1px;">
            <span>REMAINING BALANCE:</span>
            <span>${app.formatCurrency(due)}</span>
          </div>` : ''}
        </div>

        <!-- Footer -->
        <div style="text-align: center; margin-top: 6px; border-top: 1px dashed #000; padding-top: 4px; font-size: 9px; font-weight: 700;">
          <div>*** THANK YOU FOR YOUR BUSINESS ***</div>
        </div>
      </div>
    `;
    this.lastReceiptHtml = html;
    return html;
  },

  showPrintPreview() {
    if (this.lastReceiptHtml) {
      app.showPreview(this.lastReceiptHtml, 'Customer Receipt', '80MM THERMAL RECEIPT');
    }
  },

  closePreview() {
    const modal = document.getElementById('preview-modal');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
  },

  loadAllItems() {
    this.loadStock();
  },

  refreshStockIndicators() {
    this.loadStock();
  }
};
