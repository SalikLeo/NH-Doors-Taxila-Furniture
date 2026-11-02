const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const { app } = require('electron');

let db;

function init(customPath = null) {
  let dbPath;
  if (customPath) {
    dbPath = customPath;
  } else if (app && typeof app.getPath === 'function') {
    const userDir = app.getPath('userData');
    if (!fs.existsSync(userDir)) fs.mkdirSync(userDir, { recursive: true });
    dbPath = path.join(userDir, 'nh_doors.db');
    
    // Auto-migration from older DB if new DB doesn't exist yet
    if (!fs.existsSync(dbPath)) {
      const oldPathSameDir = path.join(userDir, 'ishaq_jadoon.db');
      const appData = process.env.APPDATA || (process.platform === 'darwin' ? path.join(process.env.HOME, 'Library/Application Support') : path.join(process.env.HOME, '.config'));
      const oldPathOldDir = path.join(appData, 'ishaq-jadoon-traders', 'ishaq_jadoon.db');
      if (fs.existsSync(oldPathSameDir)) {
        try { fs.copyFileSync(oldPathSameDir, dbPath); } catch(e) {}
      } else if (fs.existsSync(oldPathOldDir)) {
        try { fs.copyFileSync(oldPathOldDir, dbPath); } catch(e) {}
      }
    }
  } else {
    const fs = require('fs');
    const appData = process.env.APPDATA || (process.platform === 'darwin' ? path.join(process.env.HOME, 'Library/Application Support') : path.join(process.env.HOME, '.config'));
    const dir = path.join(appData, 'nh-doors');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    dbPath = path.join(dir, 'nh_doors.db');
    if (!fs.existsSync(dbPath)) {
      const oldDbPath = path.join(appData, 'ishaq-jadoon-traders', 'ishaq_jadoon.db');
      if (fs.existsSync(oldDbPath)) {
        try { fs.copyFileSync(oldDbPath, dbPath); } catch(e) {}
      }
    }
  }

  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
  db.pragma('temp_store = MEMORY');
  db.pragma('cache_size = -64000');
  
  createTables();
  seedInitialData();
}

function createTables() {
  // Settings & App Storage
  db.exec(`CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT)`);
  db.exec(`CREATE TABLE IF NOT EXISTS app_kv_store (key TEXT PRIMARY KEY, value TEXT)`);
    db.exec(`CREATE TABLE IF NOT EXISTS product_rate_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_slug TEXT,
    product_id INTEGER,
    item_name TEXT,
    old_stock INTEGER,
    added_qty INTEGER,
    new_stock INTEGER,
    old_cost_price REAL,
    purchase_price REAL,
    new_cost_price REAL,
    retail_price REAL,
    wholesale_price REAL,
    source TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  db.exec(`CREATE TABLE IF NOT EXISTS category_labels (id INTEGER PRIMARY KEY AUTOINCREMENT, slug TEXT UNIQUE, label TEXT)`);
  db.exec(`CREATE TABLE IF NOT EXISTS product_units (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE)`);

  // Check if we already have categories. If not, this is a fresh DB, create standard tables.
  const tableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='category_labels'").get();
  const hasCategories = tableExists && db.prepare("SELECT COUNT(*) as c FROM category_labels").get().c > 0;

  if (!hasCategories) {
    // Initial Products Tables
    db.exec(`CREATE TABLE IF NOT EXISTS products_panels (id INTEGER PRIMARY KEY AUTOINCREMENT, brand TEXT, wattage TEXT, description TEXT, current_stock INTEGER, unit TEXT, cost_price REAL, retail_price REAL, wholesale_cost_price REAL DEFAULT 0, wholesale_price REAL DEFAULT 0)`);
    db.exec(`CREATE TABLE IF NOT EXISTS products_inverters (id INTEGER PRIMARY KEY AUTOINCREMENT, category TEXT, brand TEXT, model TEXT, description TEXT, current_stock INTEGER, unit TEXT, cost_price REAL, retail_price REAL, wholesale_cost_price REAL DEFAULT 0, wholesale_price REAL DEFAULT 0)`);
    db.exec(`CREATE TABLE IF NOT EXISTS products_structures (id INTEGER PRIMARY KEY AUTOINCREMENT, type TEXT, description TEXT, current_stock INTEGER, unit TEXT, cost_price REAL, retail_price REAL, wholesale_cost_price REAL DEFAULT 0, wholesale_price REAL DEFAULT 0)`);
    db.exec(`CREATE TABLE IF NOT EXISTS products_cables (id INTEGER PRIMARY KEY AUTOINCREMENT, brand TEXT, size TEXT, description TEXT, current_stock INTEGER, unit TEXT, cost_price REAL, retail_price REAL, wholesale_cost_price REAL DEFAULT 0, wholesale_price REAL DEFAULT 0)`);
    db.exec(`CREATE TABLE IF NOT EXISTS products_breakers (id INTEGER PRIMARY KEY AUTOINCREMENT, type TEXT, brand TEXT, spec TEXT, description TEXT, current_stock INTEGER, unit TEXT, cost_price REAL, retail_price REAL, wholesale_cost_price REAL DEFAULT 0, wholesale_price REAL DEFAULT 0)`);
    db.exec(`CREATE TABLE IF NOT EXISTS products_batteries (id INTEGER PRIMARY KEY AUTOINCREMENT, category TEXT, brand TEXT, model TEXT, description TEXT, current_stock INTEGER, unit TEXT, cost_price REAL, retail_price REAL, wholesale_cost_price REAL DEFAULT 0, wholesale_price REAL DEFAULT 0)`);
    db.exec(`CREATE TABLE IF NOT EXISTS products_misc (id INTEGER PRIMARY KEY AUTOINCREMENT, item_name TEXT, type TEXT, description TEXT, current_stock INTEGER, unit TEXT, cost_price REAL, retail_price REAL, wholesale_cost_price REAL DEFAULT 0, wholesale_price REAL DEFAULT 0)`);
    db.exec(`CREATE TABLE IF NOT EXISTS products_others (id INTEGER PRIMARY KEY AUTOINCREMENT, item_name TEXT, description TEXT, current_stock INTEGER, unit TEXT, cost_price REAL, retail_price REAL, wholesale_cost_price REAL DEFAULT 0, wholesale_price REAL DEFAULT 0)`);
  }

  // Migration: Add columns if missing to ALL product tables
  const productTables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'products_%'").all();
  productTables.forEach(row => {
    const tableName = row.name;
    const cat = tableName.replace('products_', '');

    const tableInfo = db.prepare(`PRAGMA table_info(${tableName})`).all();
    const columns = tableInfo.map(c => c.name);
    
    if (!columns.includes('item_name')) {
        try { 
          db.exec(`ALTER TABLE ${tableName} ADD COLUMN item_name TEXT`);
          // Migration: Populate item_name from old fields
          if (cat === 'panels') db.exec(`UPDATE products_panels SET item_name = brand || ' ' || wattage`);
          else if (cat === 'inverters' || cat === 'batteries') db.exec(`UPDATE products_${cat} SET item_name = brand || ' ' || model`);
          else if (cat === 'structures') db.exec(`UPDATE products_structures SET item_name = type`);
          else if (cat === 'cables') db.exec(`UPDATE products_cables SET item_name = brand || ' ' || size`);
          else if (cat === 'breakers') db.exec(`UPDATE products_breakers SET item_name = type || ' ' || brand`);
        } catch(e) {}
    }
    if (columns.includes('item_name')) {
      try {
        if (cat === 'panels') db.exec(`UPDATE products_panels SET item_name = brand || ' ' || wattage WHERE item_name IS NULL`);
        else if (cat === 'inverters' || cat === 'batteries') db.exec(`UPDATE products_${cat} SET item_name = brand || ' ' || model WHERE item_name IS NULL`);
        else if (cat === 'structures') db.exec(`UPDATE products_structures SET item_name = type WHERE item_name IS NULL`);
        else if (cat === 'cables') db.exec(`UPDATE products_cables SET item_name = brand || ' ' || size WHERE item_name IS NULL`);
        else if (cat === 'breakers') db.exec(`UPDATE products_breakers SET item_name = type || ' ' || brand WHERE item_name IS NULL`);
      } catch(e) {}
    }
    if (!columns.includes('description')) {
        try { db.exec(`ALTER TABLE ${tableName} ADD COLUMN description TEXT`); } catch(e) {}
    }
    if (!columns.includes('current_stock')) {
        try { db.exec(`ALTER TABLE ${tableName} ADD COLUMN current_stock INTEGER DEFAULT 0`); } catch(e) {}
    }
    if (!columns.includes('unit')) {
        try { db.exec(`ALTER TABLE ${tableName} ADD COLUMN unit TEXT DEFAULT 'pcs'`); } catch(e) {}
    }
    if (!columns.includes('company_id')) {
        try { db.exec(`ALTER TABLE ${tableName} ADD COLUMN company_id INTEGER`); } catch(e) {}
    }
    if (!columns.includes('wholesale_cost_price')) {
        try { 
          db.exec(`ALTER TABLE ${tableName} ADD COLUMN wholesale_cost_price REAL DEFAULT 0`);
          db.exec(`UPDATE ${tableName} SET wholesale_cost_price = cost_price WHERE wholesale_cost_price IS NULL OR wholesale_cost_price = 0`);
        } catch(e) {}
    }
    if (!columns.includes('wholesale_price')) {
        try { 
          db.exec(`ALTER TABLE ${tableName} ADD COLUMN wholesale_price REAL DEFAULT 0`);
          db.exec(`UPDATE ${tableName} SET wholesale_price = retail_price WHERE wholesale_price IS NULL OR wholesale_price = 0`);
        } catch(e) {}
    }
    if (!columns.includes('pieces_per_carton')) {
        try { 
          db.exec(`ALTER TABLE ${tableName} ADD COLUMN pieces_per_carton INTEGER DEFAULT NULL`);
        } catch(e) {}
    }
  });

  // Ensure stock floats are clean (never more than 2 decimals)
  productTables.forEach(row => {
    try {
      db.exec(`UPDATE ${row.name} SET current_stock = ROUND(current_stock, 2) WHERE current_stock IS NOT NULL`);
    } catch(e) {}
  });

  // Performance Indexes
  try {
    db.exec(`CREATE TABLE IF NOT EXISTS favorites (id INTEGER PRIMARY KEY AUTOINCREMENT, category_slug TEXT, product_id INTEGER, UNIQUE(category_slug, product_id))`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_favorites_cat_prod ON favorites(category_slug, product_id)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_rate_hist_prod ON product_rate_history(product_id)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_rate_hist_cat_prod ON product_rate_history(category_slug, product_id)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_proposals_cust ON proposals(customer_name)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_proposal_items_pid ON proposal_items(proposal_id)`);
    productTables.forEach(row => {
      try {
        db.exec(`CREATE INDEX IF NOT EXISTS idx_${row.name}_name ON ${row.name}(item_name)`);
        db.exec(`CREATE INDEX IF NOT EXISTS idx_${row.name}_comp ON ${row.name}(company_id)`);
      } catch(e) {}
    });
  } catch(e) {}

  db.exec(`CREATE TABLE IF NOT EXISTS product_units (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE)`);
  db.exec(`DELETE FROM product_units WHERE name IN ('BAG', 'FEET', 'RUNNING FEET', 'KG', 'LITER', 'METER', 'COTTON')`);
  ['CARTON', 'PCS', 'SET'].forEach(u => {
    try { db.prepare('INSERT OR IGNORE INTO product_units (name) VALUES (?)').run(u); } catch(e) {}
  });

  // Proposals
  db.exec(`CREATE TABLE IF NOT EXISTS proposals (
    id INTEGER PRIMARY KEY AUTOINCREMENT, 
    proposal_number TEXT, 
    customer_name TEXT, 
    location TEXT, 
    phone TEXT, 
    date TEXT, 
    retail_total REAL, 
    cost_total REAL, 
    profit REAL, 
    status TEXT, 
    received_amount REAL DEFAULT 0,
    discount REAL DEFAULT 0,
    seller_name TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Force columns if missing (Migrations)
  const tableInfo = db.prepare("PRAGMA table_info(proposals)").all();
  const columns = tableInfo.map(c => c.name);
  if (!columns.includes('received_amount')) {
    try { db.exec('ALTER TABLE proposals ADD COLUMN received_amount REAL DEFAULT 0'); } catch(e) { console.error("Migration failed (received_amount):", e); }
  }
  if (!columns.includes('discount')) {
    try { db.exec('ALTER TABLE proposals ADD COLUMN discount REAL DEFAULT 0'); } catch(e) { console.error("Migration failed (discount):", e); }
  }
  if (!columns.includes('seller_name')) {
    try { db.exec('ALTER TABLE proposals ADD COLUMN seller_name TEXT'); } catch(e) { console.error("Migration failed (seller_name):", e); }
  }
  if (!columns.includes('created_at')) {
    try { db.exec('ALTER TABLE proposals ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP'); } catch(e) { console.error("Migration failed (created_at):", e); }
  }
  if (!columns.includes('booking_day')) {
    try { db.exec('ALTER TABLE proposals ADD COLUMN booking_day TEXT'); } catch(e) {}
  }
  if (!columns.includes('delivery_day')) {
    try { db.exec('ALTER TABLE proposals ADD COLUMN delivery_day TEXT'); } catch(e) {}
  }
  if (!columns.includes('shop_id')) {
    try { db.exec('ALTER TABLE proposals ADD COLUMN shop_id INTEGER'); } catch(e) {}
  }
  if (!columns.includes('shop_name')) {
    try { db.exec('ALTER TABLE proposals ADD COLUMN shop_name TEXT'); } catch(e) {}
  }
  if (!columns.includes('shop_address')) {
    try { db.exec('ALTER TABLE proposals ADD COLUMN shop_address TEXT'); } catch(e) {}
  }
  if (!columns.includes('salesman_name')) {
    try { db.exec('ALTER TABLE proposals ADD COLUMN salesman_name TEXT'); } catch(e) {}
  }
  if (!columns.includes('salesman_contact')) {
    try { db.exec('ALTER TABLE proposals ADD COLUMN salesman_contact TEXT'); } catch(e) {}
  }
  if (!columns.includes('sys_rating')) {
    try { db.exec('ALTER TABLE proposals ADD COLUMN sys_rating TEXT'); } catch(e) { console.error("Migration failed (sys_rating):", e); }
  }
  if (!columns.includes('sys_type')) {
    try { db.exec('ALTER TABLE proposals ADD COLUMN sys_type TEXT'); } catch(e) { console.error("Migration failed (sys_type):", e); }
  }
  if (!columns.includes('pv_rating')) {
    try { db.exec('ALTER TABLE proposals ADD COLUMN pv_rating TEXT'); } catch(e) { console.error("Migration failed (pv_rating):", e); }
  }
  if (!columns.includes('inverter')) {
    try { db.exec('ALTER TABLE proposals ADD COLUMN inverter TEXT'); } catch(e) { console.error("Migration failed (inverter):", e); }
  }
  if (!columns.includes('payment_method')) {
    try { db.exec("ALTER TABLE proposals ADD COLUMN payment_method TEXT DEFAULT 'Cash'"); } catch(e) { console.error("Migration failed (payment_method):", e); }
  }
  if (!columns.includes('tax_percent')) {
    try { db.exec('ALTER TABLE proposals ADD COLUMN tax_percent REAL DEFAULT 0.5'); } catch(e) {}
  }
  if (!columns.includes('tax_amount')) {
    try { db.exec('ALTER TABLE proposals ADD COLUMN tax_amount REAL DEFAULT 0'); } catch(e) {}
  }
  if (!columns.includes('subtotal')) {
    try { db.exec('ALTER TABLE proposals ADD COLUMN subtotal REAL DEFAULT 0'); } catch(e) {}
  }
  if (!columns.includes('sale_mode')) {
    try { db.exec("ALTER TABLE proposals ADD COLUMN sale_mode TEXT DEFAULT 'retail'"); } catch(e) { console.error("Migration failed (sale_mode):", e); }
  }

  // Same for expenses
  const expInfo = db.prepare("PRAGMA table_info(expenses)").all().map(c => c.name);
  if (!expInfo.includes('created_at')) {
    try { db.exec('ALTER TABLE expenses ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP'); } catch(e) {}
  }

  // Same for employees 
  const empInfo = db.prepare("PRAGMA table_info(employees)").all().map(c => c.name);
  if (!empInfo.includes('created_at')) {
    try { db.exec('ALTER TABLE employees ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP'); } catch(e) {}
  }
  if (!empInfo.includes('date_inactive')) {
    try { db.exec('ALTER TABLE employees ADD COLUMN date_inactive TEXT'); } catch(e) {}
  }

  db.exec(`CREATE TABLE IF NOT EXISTS proposal_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT, 
    proposal_id INTEGER, 
    item_id INTEGER,
    section TEXT, 
    description TEXT, 
    qty REAL, 
    unit_cost REAL, 
    unit_retail REAL, 
    line_cost REAL, 
    line_retail REAL, 
    line_profit REAL,
    FOREIGN KEY(proposal_id) REFERENCES proposals(id) ON DELETE CASCADE
  )`);

  // Migration: Add item_id if missing
  try { db.exec('ALTER TABLE proposal_items ADD COLUMN item_id INTEGER'); } catch(e) {}
  try { db.exec('ALTER TABLE proposal_items ADD COLUMN unit_discounted REAL'); } catch(e) {}
  try { db.exec('ALTER TABLE proposal_items ADD COLUMN unit TEXT'); } catch(e) {}
  try { db.exec("ALTER TABLE proposal_items ADD COLUMN item_type TEXT DEFAULT 'billed'"); } catch(e) {}

  // Expenses
  db.exec(`CREATE TABLE IF NOT EXISTS expense_categories (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE)`);
  db.exec(`CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT, 
    date TEXT, 
    category TEXT, 
    amount REAL, 
    description TEXT, 
    paid_by TEXT, 
    notes TEXT, 
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Employees
  db.exec(`CREATE TABLE IF NOT EXISTS employees (
    id INTEGER PRIMARY KEY AUTOINCREMENT, 
    full_name TEXT, 
    role TEXT, 
    phone TEXT, 
    email TEXT, 
    date_joined TEXT, 
    salary REAL, 
    status TEXT, 
    notes TEXT, 
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  
  // Companies
  db.exec(`CREATE TABLE IF NOT EXISTS companies (
    id INTEGER PRIMARY KEY AUTOINCREMENT, 
    name TEXT, 
    description TEXT, 
    amount REAL DEFAULT 0, 
    phone TEXT, 
    email TEXT, 
    address TEXT, 
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Customers
  db.exec(`CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT, 
    name TEXT, 
    description TEXT, 
    amount REAL DEFAULT 0, 
    phone TEXT, 
    email TEXT, 
    address TEXT, 
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Shops
  db.exec(`CREATE TABLE IF NOT EXISTS shops (
    id INTEGER PRIMARY KEY AUTOINCREMENT, 
    name TEXT, 
    owner_name TEXT, 
    phone TEXT, 
    address TEXT, 
    city TEXT DEFAULT 'Wah Cantt', 
    amount REAL DEFAULT 0, 
    notes TEXT, 
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Migration for shops
  try {
    const shopCols = db.prepare("PRAGMA table_info(shops)").all().map(c => c.name);
    if (!shopCols.includes('owner_name')) db.exec('ALTER TABLE shops ADD COLUMN owner_name TEXT');
    if (!shopCols.includes('city')) db.exec("ALTER TABLE shops ADD COLUMN city TEXT DEFAULT 'Wah Cantt'");
    if (!shopCols.includes('notes')) db.exec('ALTER TABLE shops ADD COLUMN notes TEXT');
    if (!shopCols.includes('amount')) db.exec('ALTER TABLE shops ADD COLUMN amount REAL DEFAULT 0');
  } catch(e) {}

  // Favorites
  db.exec(`CREATE TABLE IF NOT EXISTS favorites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_slug TEXT,
    product_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(category_slug, product_id)
  )`);

  // Performance Indexes for ultra-fast queries
  try {
    db.exec(`CREATE INDEX IF NOT EXISTS idx_prop_num ON proposals(proposal_number)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_prop_cust ON proposals(customer_name)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_prop_items_pid ON proposal_items(proposal_id)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_cust_name ON customers(name)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_cust_phone ON customers(phone)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_comp_name ON companies(name)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_favs_cat_prod ON favorites(category_slug, product_id)`);
  } catch(e) {}
}

function seedInitialData() {
  try {
    // Ensure default company settings
    const existingCompany = db.prepare("SELECT value FROM settings WHERE key = 'company_name'").get();
    if (!existingCompany || !existingCompany.value || existingCompany.value === 'Ultimate Marketing' || existingCompany.value.toLowerCase().includes('baba') || existingCompany.value.toLowerCase().includes('waziristan') || existingCompany.value.toLowerCase().includes('ishaq') || existingCompany.value.toLowerCase().includes('jadoon')) {
      db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('company_name', ?)").run('NH Doors');
    }
    
    // Address
    const existingAddr = db.prepare("SELECT value FROM settings WHERE key = 'address'").get();
    if (!existingAddr || !existingAddr.value || existingAddr.value.includes('Barrier 3') || existingAddr.value.includes('Wah Cantt')) {
      db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('address', ?)").run('Taxila');
    }
    
    // Check phone
    const existingPhone = db.prepare("SELECT value FROM settings WHERE key = 'phone'").get();
    if (!existingPhone || !existingPhone.value || existingPhone.value.includes('0312') || existingPhone.value.includes('Kaleem') || existingPhone.value.includes('03095369472') || existingPhone.value.includes('Ishaq') || existingPhone.value.includes('0301-2630481')) {
      db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('phone', ?)").run('');
    }

    // Clean up stale logo if it belongs to Baba Waziristan or temporary downloads or old stores
    const existingLogo = db.prepare("SELECT value FROM settings WHERE key = 'logo_path'").get();
    if (existingLogo && existingLogo.value && (
      existingLogo.value.toLowerCase().includes('baba') ||
      existingLogo.value.toLowerCase().includes('waziristan') ||
      existingLogo.value.toLowerCase().includes('ishaq') ||
      existingLogo.value.toLowerCase().includes('jadoon') ||
      existingLogo.value.toLowerCase().includes('downloads\\logo.jpg') ||
      existingLogo.value.toLowerCase().includes('downloads/logo.jpg')
    )) {
      db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('logo_path', ?)").run('');
    }

    db.prepare("INSERT OR IGNORE INTO settings (key, value) VALUES ('tagline', ?)").run('Doors & Furniture');

    // Default auto backup directory in Documents
    const defaultBackupDir = (app && typeof app.getPath === 'function') 
      ? path.join(app.getPath('documents'), 'NH Doors Backups')
      : path.join(require('os').homedir(), 'Documents', 'NH Doors Backups');
    const existingBackupDir = db.prepare("SELECT value FROM settings WHERE key = 'auto_backup_dir'").get();
    if (!existingBackupDir || !existingBackupDir.value || existingBackupDir.value.includes('Ishaq Jadoon Traders Backups')) {
      db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('auto_backup_dir', ?)").run(defaultBackupDir);
    }
    try {
      if (!fs.existsSync(defaultBackupDir)) {
        fs.mkdirSync(defaultBackupDir, { recursive: true });
      }
    } catch(e) {}

    // Default expense categories
    const cats = ['Office', 'Transport', 'Utilities', 'Salaries', 'Purchase', 'Other'];
    const expenseStmt = db.prepare('INSERT OR IGNORE INTO expense_categories (name) VALUES (?)');
    cats.forEach(c => expenseStmt.run(c));

    // Update / Ensure Furniture & Doors workshop category labels
    const productLabels = [
      { slug: 'panels', label: 'Panels & Sheets' },
      { slug: 'inverters', label: 'Lar & Timber' },
      { slug: 'structures', label: 'Glue & Adhesives' },
      { slug: 'cables', label: 'Hardware & Locks' },
      { slug: 'breakers', label: 'Polish & Paints' },
      { slug: 'batteries', label: 'Glass & Mirrors' },
      { slug: 'misc', label: 'Laminates & Veneer' },
      { slug: 'others', label: 'General Materials' }
    ];
    
    // Always upsert standard categories
    const oldFmcgOrSolarLabels = [
      'Biscuits', 'Cold Drinks', 'Jellies & Candies', 'Snacks & Chips', 'Chocolates', 
      'Dairy & Groceries', 'Juices & Beverages', 'General Items', 
      'Panels', 'Solar Panels', 'Inverters', 'Structures', 'Cables', 'Breakers', 'Batteries', 'Accessories'
    ];
    productLabels.forEach(l => {
      const existing = db.prepare('SELECT id, label FROM category_labels WHERE slug = ?').get(l.slug);
      if (!existing) {
        db.prepare('INSERT INTO category_labels (slug, label) VALUES (?, ?)').run(l.slug, l.label);
      } else if (oldFmcgOrSolarLabels.includes(existing.label)) {
        db.prepare('UPDATE category_labels SET label = ? WHERE slug = ?').run(l.label, l.slug);
      }
    });

    // Default units
    db.exec(`DELETE FROM product_units WHERE name IN ('BOTTLE', 'RUNNING FEET', 'METER', 'COTTON')`);
    const productUnits = ['PCS', 'KG', 'FEET', 'SHEET', 'CAN', 'PACK', 'SET', 'BOX'];
    const unitStmt = db.prepare('INSERT OR IGNORE INTO product_units (name) VALUES (?)');
    productUnits.forEach(u => unitStmt.run(u));
  } catch (e) {
    console.error("Failed to seed initial data:", e);
  }
}

function clearAllData() {
  try {
    const transaction = db.transaction(() => {
      // 1. Delete all rows from dynamic product tables
      const productTables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'products_%'").all();
      productTables.forEach(row => {
        try {
          db.exec(`DELETE FROM ${row.name}`);
        } catch (e) {
          console.error(`Error clearing ${row.name}:`, e);
        }
      });

      // 2. Delete all records from transactional & operational tables
      const tablesToClear = [
        'proposals',
        'proposal_items',
        'product_rate_history',
        'expenses',
        'companies',
        'customers',
        'shops',
        'employees',
        'favorites',
        'app_kv_store'
      ];

      tablesToClear.forEach(tbl => {
        try {
          const tableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(tbl);
          if (tableExists) {
            db.exec(`DELETE FROM ${tbl}`);
          }
        } catch (e) {
          console.error(`Error clearing table ${tbl}:`, e);
        }
      });

      // 3. Reset all auto-increment counters to start back from 1
      try {
        db.exec(`DELETE FROM sqlite_sequence`);
      } catch (e) {}

      // 4. Ensure standard category labels and units remain intact
      const productLabels = [
        { slug: 'panels', label: 'Biscuits' },
        { slug: 'inverters', label: 'Cold Drinks' },
        { slug: 'structures', label: 'Jellies & Candies' },
        { slug: 'cables', label: 'Snacks & Chips' },
        { slug: 'breakers', label: 'Chocolates' },
        { slug: 'batteries', label: 'Dairy & Groceries' },
        { slug: 'misc', label: 'Juices & Beverages' },
        { slug: 'others', label: 'General Items' }
      ];
      productLabels.forEach(l => {
        try {
          db.prepare('INSERT OR IGNORE INTO category_labels (slug, label) VALUES (?, ?)').run(l.slug, l.label);
        } catch (e) {}
      });

      const defaultUnits = ['PACK', 'PCS', 'BOX', 'BOTTLE', 'CARTON', 'SET'];
      defaultUnits.forEach(u => {
        try {
          db.prepare('INSERT OR IGNORE INTO product_units (name) VALUES (?)').run(u);
        } catch (e) {}
      });

      const defaultExpCats = ['Office', 'Transport', 'Utilities', 'Salaries', 'Purchase', 'Other'];
      defaultExpCats.forEach(c => {
        try {
          db.prepare('INSERT OR IGNORE INTO expense_categories (name) VALUES (?)').run(c);
        } catch (e) {}
      });
    });

    transaction();

    try {
      db.pragma('wal_checkpoint(TRUNCATE)');
      db.exec('VACUUM');
    } catch (e) {
      console.error('Vacuum error:', e);
    }

    return { success: true };
  } catch (err) {
    console.error('clearAllData error:', err);
    return { success: false, error: err.message };
  }
}

// ------ SETTINGS ------
function getSettings() {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const settings = {};
  rows.forEach(r => settings[r.key] = r.value);
  return settings;
}

function saveSettings(data) {
  const stmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
  const transaction = db.transaction(() => {
    for (const [key, value] of Object.entries(data)) {
      stmt.run(key, value);
    }
  });
  transaction();
}

// ------ APP KV STORAGE ------
function getAllKv() {
  try {
    return db.prepare('SELECT key, value FROM app_kv_store').all();
  } catch (e) {
    return [];
  }
}

function setKv(key, value) {
  try {
    const val = typeof value === 'string' ? value : JSON.stringify(value);
    db.prepare('INSERT OR REPLACE INTO app_kv_store (key, value) VALUES (?, ?)').run(key, val);
    return { success: true };
  } catch (e) {
    return { error: e.message };
  }
}

function saveAllKv(entries) {
  try {
    const stmt = db.prepare('INSERT OR REPLACE INTO app_kv_store (key, value) VALUES (?, ?)');
    const transaction = db.transaction((items) => {
      for (const [key, value] of Object.entries(items)) {
        const val = typeof value === 'string' ? value : JSON.stringify(value);
        stmt.run(key, val);
      }
    });
    transaction(entries);
    return { success: true };
  } catch (e) {
    return { error: e.message };
  }
}

function getProducts(category, companyId = null) {
  if (category === 'all') {
    return searchAllProducts('', companyId);
  }
  let sql = `
    SELECT p.*, c.name as company_name, (f.id IS NOT NULL) as is_favorite, '${category}' as slug,
      (SELECT prh.purchase_price FROM product_rate_history prh WHERE prh.category_slug = '${category}' AND prh.product_id = p.id AND prh.purchase_price > 0 ORDER BY prh.id DESC LIMIT 1) as last_purchase_price
    FROM products_${category} p
    LEFT JOIN favorites f ON f.category_slug = '${category}' AND f.product_id = p.id
    LEFT JOIN companies c ON c.id = p.company_id
  `;
  
  const params = [];
  if (companyId) {
    sql += ` WHERE p.company_id = ?`;
    params.push(companyId);
  }
  
  sql += ` ORDER BY p.id DESC`;
  try {
    return db.prepare(sql).all(...params);
  } catch (e) {
    console.warn(`[getProducts] error querying products_${category}:`, e.message);
    return [];
  }
}

function findProductByName(itemName, excludeCategory = null, excludeId = null) {
  if (!itemName || typeof itemName !== 'string') return null;
  const cleanName = itemName.trim().replace(/\s+/g, ' ');
  if (!cleanName) return null;
  const lowerName = cleanName.toLowerCase();

  const labels = getCategoryLabels();
  for (const l of labels) {
    const cat = l.slug;
    const catLabel = l.label || cat;
    let sql = `
      SELECT id, item_name, current_stock, '${cat}' as slug, '${catLabel.replace(/'/g, "''")}' as category_label 
      FROM products_${cat} 
      WHERE LOWER(TRIM(COALESCE(item_name, description, ''))) = ?
    `;
    const params = [lowerName];
    if (excludeCategory && excludeId && String(cat).toLowerCase() === String(excludeCategory).toLowerCase()) {
      sql += ' AND id != ?';
      params.push(Number(excludeId));
    }
    try {
      const match = db.prepare(sql).get(...params);
      if (match) {
        return match;
      }
    } catch (e) {}
  }
  return null;
}

function addProduct(category, data) {
  const itemName = (data.item_name || data.description || '').trim();
  if (itemName) {
    const existing = findProductByName(itemName);
    if (existing) {
      const catName = existing.category_label || existing.slug;
      throw new Error(`Item "${existing.item_name || itemName}" is already in stock under "${catName}". Duplicate items cannot be added.`);
    }
  }

  if (data.current_stock !== undefined) {
    data.current_stock = Math.round((Number(data.current_stock) || 0) * 100) / 100;
  }
  const keys = Object.keys(data);
  const values = Object.values(data);
  const placeholders = keys.map(() => '?').join(', ');
  const info = db.prepare(`INSERT INTO products_${category} (${keys.join(', ')}) VALUES (${placeholders})`).run(...values);
  return info.lastInsertRowid;
}

function updateProduct(category, id, data) {
  if (data.current_stock !== undefined) {
    data.current_stock = Math.round((Number(data.current_stock) || 0) * 100) / 100;
  }
  if (data.item_name !== undefined) {
    const itemName = String(data.item_name || '').trim();
    if (itemName) {
      const existing = findProductByName(itemName, category, id);
      if (existing) {
        const catName = existing.category_label || existing.slug;
        throw new Error(`Item "${existing.item_name || itemName}" is already in stock under "${catName}". Duplicate items cannot be added.`);
      }
    }
  }

  const tableInfo = db.prepare(`PRAGMA table_info(products_${category})`).all();
  const columns = tableInfo.map(c => c.name);
  const cleanData = {};
  for (const [key, value] of Object.entries(data)) {
    if (columns.includes(key) && key !== 'id') cleanData[key] = value;
  }
  const updates = Object.keys(cleanData).map(k => `${k} = ?`).join(', ');
  const values = Object.values(cleanData);
  db.prepare(`UPDATE products_${category} SET ${updates} WHERE id = ?`).run(...values, id);
}

function changeProductCategory(oldCategory, newCategory, id, data = {}) {
  if (!oldCategory || !newCategory || !id) {
    throw new Error('Old category, new category, and item ID are required.');
  }

  const oldTable = getProductTable(oldCategory);
  const newTable = getProductTable(newCategory);
  if (!oldTable) throw new Error(`Source category table for "${oldCategory}" does not exist.`);
  if (!newTable) throw new Error(`Target category table for "${newCategory}" does not exist.`);

  if (oldCategory === newCategory) {
    updateProduct(newCategory, id, data);
    return { id, category: newCategory };
  }

  const oldRow = db.prepare(`SELECT * FROM ${oldTable} WHERE id = ?`).get(id);
  if (!oldRow) {
    throw new Error(`Item not found in category "${oldCategory}".`);
  }

  const itemName = (data.item_name !== undefined)
    ? String(data.item_name || '').trim()
    : String(oldRow.item_name || oldRow.description || '').trim();

  if (itemName) {
    const existing = findProductByName(itemName, oldCategory, id);
    if (existing) {
      const catName = existing.category_label || existing.slug;
      throw new Error(`Item "${existing.item_name || itemName}" is already in stock under "${catName}". Duplicate items cannot be added.`);
    }
  }

  const targetTableInfo = db.prepare(`PRAGMA table_info(${newTable})`).all();
  const targetColumns = targetTableInfo.map(c => c.name);

  // Merge oldRow with incoming data updates
  const merged = { ...oldRow, ...data };
  delete merged.id;

  const cleanData = {};
  for (const [key, value] of Object.entries(merged)) {
    if (targetColumns.includes(key)) {
      cleanData[key] = value;
    }
  }

  if (targetColumns.includes('item_name') && cleanData.item_name === undefined) {
    cleanData.item_name = itemName;
  }
  if (targetColumns.includes('wholesale_cost_price') && (cleanData.wholesale_cost_price === undefined || cleanData.wholesale_cost_price === null)) {
    cleanData.wholesale_cost_price = cleanData.cost_price || 0;
  }
  if (targetColumns.includes('wholesale_price') && (cleanData.wholesale_price === undefined || cleanData.wholesale_price === null)) {
    cleanData.wholesale_price = cleanData.retail_price || 0;
  }

  const slugToCode = {
    panels: 'pnl', inverters: 'inv', structures: 'str', cables: 'cab',
    breakers: 'brk', batteries: 'bat', misc: 'msc', others: 'oth'
  };
  const oldCode = slugToCode[oldCategory] || oldCategory;

  let newId = null;

  const migrateTx = db.transaction(() => {
    // 1. Insert into new category table
    const keys = Object.keys(cleanData);
    const placeholders = keys.map(() => '?').join(', ');
    const insertStmt = db.prepare(`INSERT INTO ${newTable} (${keys.join(', ')}) VALUES (${placeholders})`);
    const info = insertStmt.run(...Object.values(cleanData));
    newId = info.lastInsertRowid;

    // 2. Delete from old category table
    db.prepare(`DELETE FROM ${oldTable} WHERE id = ?`).run(id);

    // 3. Update favorites
    try {
      db.prepare('DELETE FROM favorites WHERE category_slug = ? AND product_id = ?').run(newCategory, newId);
      db.prepare('UPDATE favorites SET category_slug = ?, product_id = ? WHERE category_slug = ? AND product_id = ?').run(newCategory, newId, oldCategory, id);
    } catch (e) {
      console.warn('[changeProductCategory] favorites migration error:', e.message);
    }

    // 4. Update product_rate_history
    try {
      db.prepare('UPDATE product_rate_history SET category_slug = ?, product_id = ?, item_name = COALESCE(?, item_name) WHERE category_slug = ? AND product_id = ?').run(newCategory, newId, itemName || null, oldCategory, id);
    } catch (e) {
      console.warn('[changeProductCategory] rate history migration error:', e.message);
    }

    // 5. Update proposal_items
    try {
      db.prepare('UPDATE proposal_items SET section = ?, item_id = ? WHERE (section = ? OR section = ?) AND item_id = ?').run(newCategory, newId, oldCategory, oldCode, id);
    } catch (e) {
      console.warn('[changeProductCategory] proposal items migration error:', e.message);
    }
  });

  migrateTx();

  return { id: newId, category: newCategory };
}

function deleteProduct(category, id) {
  db.prepare(`DELETE FROM products_${category} WHERE id = ?`).run(id);
}

function getCategoryLabels() {
  return db.prepare('SELECT * FROM category_labels').all();
}

function updateCategoryLabel(slug, label) {
  db.prepare('UPDATE category_labels SET label = ? WHERE slug = ?').run(label, slug);
}

function searchAllProducts(query = '', companyId = null) {
  const labels = getCategoryLabels();
  let results = [];
  const qClean = (query || '').trim();
  const qLower = qClean.toLowerCase();
  const qFuzzy = `%${qClean}%`;

  labels.forEach(l => {
    const cat = l.slug;
    const escapedLabel = (l.label || '').replace(/'/g, "''");
    let sql = `
      SELECT p.*, c.name as company_name, (f.id IS NOT NULL) as is_favorite, '${cat}' as slug, '${escapedLabel}' as category_label,
        (SELECT prh.purchase_price FROM product_rate_history prh WHERE prh.category_slug = '${cat}' AND prh.product_id = p.id AND prh.purchase_price > 0 ORDER BY prh.id DESC LIMIT 1) as last_purchase_price
      FROM products_${cat} p 
      LEFT JOIN favorites f ON f.category_slug = '${cat}' AND f.product_id = p.id
      LEFT JOIN companies c ON c.id = p.company_id
    `;
    let params = [];

    if (qClean) {
      const labelMatches = l.label.toLowerCase().includes(qLower);
      if (labelMatches) {
        if (companyId) {
          sql += " WHERE p.company_id = ?";
          params.push(companyId);
        }
      } else {
        sql += ` WHERE (p.item_name LIKE ? OR p.description LIKE ?)`;
        params.push(qFuzzy, qFuzzy);
        if (companyId) {
          sql += ` AND p.company_id = ?`;
          params.push(companyId);
        }
      }
    } else if (companyId) {
      sql += " WHERE p.company_id = ?";
      params.push(companyId);
    }

    sql += " ORDER BY p.item_name ASC";
    try {
      const rows = db.prepare(sql).all(...params);
      results = results.concat(rows);
    } catch(e) {}
  });

  return results;
}

function toggleFavorite(category, id) {
  const exists = db.prepare('SELECT id FROM favorites WHERE category_slug = ? AND product_id = ?').get(category, id);
  if (exists) {
    db.prepare('DELETE FROM favorites WHERE id = ?').run(exists.id);
    return { status: 'removed' };
  } else {
    db.prepare('INSERT INTO favorites (category_slug, product_id) VALUES (?, ?)').run(category, id);
    return { status: 'added' };
  }
}

function getFavoriteProducts() {
  const labels = getCategoryLabels();
  let results = [];
  labels.forEach(l => {
    const cat = l.slug;
    const sql = `
      SELECT p.*, '${cat}' as slug, 1 as is_favorite 
      FROM products_${cat} p
      INNER JOIN favorites f ON f.category_slug = '${cat}' AND f.product_id = p.id
    `;
    const rows = db.prepare(sql).all();
    results = results.concat(rows);
  });
  return results;
}

function getCategoryStats() {
  try {
    const labels = getCategoryLabels();
    return labels.map(l => {
      let count = 0;
      try {
        count = db.prepare(`SELECT COUNT(*) as c FROM products_${l.slug}`).get().c || 0;
      } catch (e) {
        console.warn(`[getCategoryStats] Failed to count products_${l.slug}:`, e.message);
      }
      return { ...l, count };
    });
  } catch (err) {
    console.error('[getCategoryStats] error:', err.message);
    return [];
  }
}

function addCategory(label) {
    const slug = label.toLowerCase().trim().replace(/[^a-z0-9]/g, '_');
    
    // Check if exists
    const exists = db.prepare('SELECT id FROM category_labels WHERE slug = ?').get(slug);
    if (exists) return { error: 'Category already exists' };

    const transaction = db.transaction(() => {
        db.prepare('INSERT INTO category_labels (slug, label) VALUES (?, ?)').run(slug, label);
        db.exec(`CREATE TABLE products_${slug} (
            id INTEGER PRIMARY KEY AUTOINCREMENT, 
            item_name TEXT, 
            description TEXT, 
            current_stock INTEGER DEFAULT 0, 
            unit TEXT DEFAULT 'pcs', 
            cost_price REAL DEFAULT 0, 
            retail_price REAL DEFAULT 0,
            wholesale_cost_price REAL DEFAULT 0,
            wholesale_price REAL DEFAULT 0,
            company_id INTEGER,
            pieces_per_carton INTEGER DEFAULT 12
        )`);
    });
    transaction();
    return { success: true, slug };
}

function deleteCategory(slug) {
    const transaction = db.transaction(() => {
        db.prepare('DELETE FROM category_labels WHERE slug = ?').run(slug);
        db.prepare('DELETE FROM favorites WHERE category_slug = ?').run(slug);
        db.exec(`DROP TABLE IF EXISTS products_${slug}`);
    });
    transaction();
    return { success: true };
}

// ------ PROPOSALS ------
function getProposals() {
  return db.prepare('SELECT * FROM proposals ORDER BY id DESC').all();
}

function getProposal(id) {
  const proposal = db.prepare('SELECT * FROM proposals WHERE id = ?').get(id);
  if (proposal) {
    proposal.items = db.prepare('SELECT * FROM proposal_items WHERE proposal_id = ?').all(id);
  }
  return proposal;
}

function getNextProposalNumber() {
  const last = db.prepare('SELECT proposal_number FROM proposals ORDER BY id DESC LIMIT 1').get();
  if (!last) return 'INV-1';
  
  // Try to match INV- first, then fallback to SE- for legacy support
  let match = last.proposal_number.match(/INV-(\d+)/);
  if (!match) match = last.proposal_number.match(/SE-(\d+)/);
  
  if (match) {
    const num = parseInt(match[1]) + 1;
    return `INV-${num}`;
  }
  return 'INV-1';
}

function getNextCustomerName() {
  const last = db.prepare("SELECT customer_name FROM proposals WHERE customer_name LIKE 'Customer-%' OR customer_name LIKE 'CST-%' ORDER BY id DESC LIMIT 1").get();
  if (!last) return 'Customer-1';
  
  const match = last.customer_name.match(/(?:Customer|CST)-(\d+)/);
  if (match) {
    const num = parseInt(match[1]) + 1;
    return `Customer-${num}`;
  }
  return 'Customer-1';
}

function getProductTable(section) {
  if (!section) return null;
  const stockMap = {
    pnl: 'panels', inv: 'inverters', str: 'structures', cab: 'cables',
    brk: 'breakers', bat: 'batteries', msc: 'misc', oth: 'others'
  };
  const tableSlug = stockMap[section] || section;
  const tableName = `products_${tableSlug}`;
  try {
    const exists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name = ?").get(tableName);
    return exists ? tableName : null;
  } catch (e) {
    return null;
  }
}

function saveProposal(data) {
  const { items, ...proposalData } = data;
  let proposalId;
  const transaction = db.transaction(() => {
    // Determine existing columns in proposals table to avoid unknown column errors
    const tableInfo = db.prepare("PRAGMA table_info(proposals)").all();
    const columns = tableInfo.map(c => c.name);
    const cleanData = {};
    for (const [k, v] of Object.entries(proposalData)) {
      if (columns.includes(k)) cleanData[k] = v;
    }

    if (proposalData.id) {
      proposalId = proposalData.id;

      // 1. Restore previous items to stock before updating
      const oldItems = db.prepare('SELECT item_id, section, qty FROM proposal_items WHERE proposal_id = ?').all(proposalId);
      for (const oldItem of oldItems) {
        if (oldItem.item_id && oldItem.section) {
          const table = getProductTable(oldItem.section);
          if (table) {
            try {
              db.prepare(`UPDATE ${table} SET current_stock = ROUND(current_stock + ?, 2) WHERE id = ?`).run(oldItem.qty, oldItem.item_id);
            } catch (stockErr) {
              console.error(`[STOCK RESTORE EDIT] Failed to restore for ${table}:`, stockErr);
            }
          }
        }
      }

      const updates = Object.keys(cleanData).filter(k => k !== 'id').map(k => `${k} = @${k}`).join(', ');
      db.prepare(`UPDATE proposals SET ${updates} WHERE id = @id`).run(cleanData);
      db.prepare('DELETE FROM proposal_items WHERE proposal_id = ?').run(proposalId);
    } else {
      const keys = Object.keys(cleanData);
      const placeholders = keys.map(k => `@${k}`).join(', ');
      const info = db.prepare(`INSERT INTO proposals (${keys.join(', ')}) VALUES (${placeholders})`).run(cleanData);
      proposalId = info.lastInsertRowid;
    }

    if (items && items.length > 0) {
      const stmt = db.prepare(`INSERT INTO proposal_items (proposal_id, item_id, section, description, qty, unit, unit_cost, unit_retail, unit_discounted, line_cost, line_retail, line_profit, item_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

      for (const item of items) {
        const itemType = item.item_type || (item.item_id && item.section ? 'material' : 'billed');
        const discPrice = (item.unit_discounted !== undefined && item.unit_discounted !== null) ? item.unit_discounted : (item.unit_retail || 0);
        stmt.run(
          proposalId, 
          item.item_id || null, 
          item.section || null, 
          item.description || item.item_name || '', 
          item.qty || 1, 
          item.unit || 'pcs', 
          item.unit_cost || 0, 
          item.unit_retail || 0, 
          discPrice, 
          item.line_cost || 0, 
          item.line_retail || 0, 
          item.line_profit || 0,
          itemType
        );
        
        // Deduct stock for all items that represent stock materials
        if (item.item_id && item.section) {
            const table = getProductTable(item.section);
            if (table) {
              try {
                db.prepare(`UPDATE ${table} SET current_stock = MAX(0, ROUND(current_stock - ?, 2)) WHERE id = ?`).run(item.qty, item.item_id);
              } catch(stockErr) {
                console.error(`[STOCK DEDUCT] Failed to deduct for ${table}:`, stockErr);
              }
            }
        }
      }
    }
  });
  transaction();
  return proposalId;
}

function deleteProposal(id) {
  const transaction = db.transaction(() => {
    // 1. Restore all items sold in this proposal back to current_stock
    const items = db.prepare('SELECT item_id, section, qty FROM proposal_items WHERE proposal_id = ?').all(id);
    for (const item of items) {
      if (item.item_id && item.section) {
        const table = getProductTable(item.section);
        if (table) {
          try {
            db.prepare(`UPDATE ${table} SET current_stock = ROUND(current_stock + ?, 2) WHERE id = ?`).run(item.qty, item.item_id);
          } catch (stockErr) {
            console.error(`[STOCK RESTORE DELETE] Failed to restore for ${table}:`, stockErr);
          }
        }
      }
    }

    db.prepare('DELETE FROM proposal_items WHERE proposal_id = ?').run(id);
    db.prepare('DELETE FROM proposals WHERE id = ?').run(id);
  });
  transaction();
}

function updateProposalStatus(id, status) {
  db.prepare('UPDATE proposals SET status = ? WHERE id = ?').run(status, id);
}

function receivePayment(idOrNumber, addedAmount, paymentMethod = 'Cash') {
  let p;
  if (typeof idOrNumber === 'number' || (!isNaN(idOrNumber) && !String(idOrNumber).startsWith('INV-'))) {
    p = db.prepare('SELECT id, proposal_number, retail_total, received_amount FROM proposals WHERE id = ?').get(idOrNumber);
  }
  if (!p) {
    p = db.prepare('SELECT id, proposal_number, retail_total, received_amount FROM proposals WHERE proposal_number = ?').get(String(idOrNumber).replace(/^#/, ''));
  }
  if (!p) return null;
  
  const newReceived = (p.received_amount || 0) + Number(addedAmount || 0);
  const status = newReceived >= (p.retail_total || 0) ? 'Paid' : 'Partial';
  
  db.prepare('UPDATE proposals SET received_amount = ?, status = ?, payment_method = ? WHERE id = ?').run(newReceived, status, paymentMethod, p.id);
  return { newReceived, status, id: p.id, proposalNumber: p.proposal_number };
}

// ------ EXPENSES ------
function getExpenses(filters) {
  let sql = 'SELECT * FROM expenses';
  let params = [];
  
  if (filters && filters.month !== undefined && filters.year !== undefined) {
    const monthStr = String(filters.month + 1).padStart(2, '0');
    sql += ' WHERE date LIKE ?';
    params.push(`${filters.year}-${monthStr}-%`);
  }
  
  sql += ' ORDER BY date DESC';
  return db.prepare(sql).all(...params);
}

function saveExpense(data) {
  if (data.id) {
    const { id, ...updates } = data;
    const clause = Object.keys(updates).map(k => `${k} = @${k}`).join(', ');
    db.prepare(`UPDATE expenses SET ${clause} WHERE id = @id`).run(data);
  } else {
    const keys = Object.keys(data);
    const placeholders = keys.map(k => `@${k}`).join(', ');
    db.prepare(`INSERT INTO expenses (${keys.join(', ')}) VALUES (${placeholders})`).run(data);
  }
}

function deleteExpense(id) {
  db.prepare('DELETE FROM expenses WHERE id = ?').run(id);
}

function getExpenseCategories() {
  return db.prepare('SELECT * FROM expense_categories ORDER BY name ASC').all();
}

function addExpenseCategory(name) {
  try {
    const info = db.prepare('INSERT INTO expense_categories (name) VALUES (?)').run(name);
    return info.lastInsertRowid;
  } catch (e) {
    return { error: 'Category already exists or error occurred' };
  }
}

function deleteExpenseCategory(id) {
  db.prepare('DELETE FROM expense_categories WHERE id = ?').run(id);
}

function getExpensesSummary(filters) {
  const now = new Date();
  let m = now.getMonth();
  let y = now.getFullYear();

  if (filters && filters.month !== undefined && filters.year !== undefined) {
    m = filters.month;
    y = filters.year;
  }

  const monthStr = `${y}-${String(m + 1).padStart(2, '0')}`;
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  
  const monthTotal = db.prepare(`SELECT SUM(amount) as s FROM expenses WHERE date LIKE '${monthStr}-%'`).get().s || 0;
  const dailyTotal = db.prepare("SELECT SUM(amount) as s FROM expenses WHERE substr(date, 1, 10) = ?").get(todayStr)?.s || 0;
  const salariesTotal = db.prepare(`SELECT SUM(amount) as s FROM expenses WHERE LOWER(category) LIKE '%salary%' AND date LIKE '${monthStr}-%'`).get().s || 0;
  
  return { selectedMonth: monthTotal, daily: dailyTotal, salaries: salariesTotal };
}

// ------ EMPLOYEES ------
function getEmployees(status) {
  if (status && status !== 'All') {
    return db.prepare('SELECT * FROM employees WHERE status = ? ORDER BY full_name').all(status);
  }
  return db.prepare('SELECT * FROM employees ORDER BY full_name').all();
}

function saveEmployee(data) {
  if (data.id) {
    const { id, ...updates } = data;
    const clause = Object.keys(updates).map(k => `${k} = @${k}`).join(', ');
    db.prepare(`UPDATE employees SET ${clause} WHERE id = @id`).run(data);
  } else {
    const keys = Object.keys(data);
    const placeholders = keys.map(k => `@${k}`).join(', ');
    db.prepare(`INSERT INTO employees (${keys.join(', ')}) VALUES (${placeholders})`).run(data);
  }
}

function deleteEmployee(id) {
  db.prepare('DELETE FROM employees WHERE id = ?').run(id);
}

// ------ COMPANIES ------
function getCompanies() {
  return db.prepare('SELECT * FROM companies ORDER BY name ASC').all();
}

function saveCompany(data) {
  if (data.id) {
    const { id, ...updates } = data;
    const clause = Object.keys(updates).map(k => `${k} = @${k}`).join(', ');
    db.prepare(`UPDATE companies SET ${clause} WHERE id = @id`).run(data);
  } else {
    const keys = Object.keys(data);
    const placeholders = keys.map(k => `@${k}`).join(', ');
    db.prepare(`INSERT INTO companies (${keys.join(', ')}) VALUES (${placeholders})`).run(data);
  }
}

function deleteCompany(id) {
  db.prepare('DELETE FROM companies WHERE id = ?').run(id);
}

// ------ CUSTOMERS ------
function getCustomers() {
  return db.prepare('SELECT * FROM customers ORDER BY name ASC').all();
}

function saveCustomer(data) {
  let customerId;
  const transaction = db.transaction(() => {
    if (data.id) {
      const { id, ...updates } = data;
      const clause = Object.keys(updates).map(k => `${k} = @${k}`).join(', ');
      db.prepare(`UPDATE customers SET ${clause} WHERE id = @id`).run(data);
      customerId = data.id;
    } else {
      const keys = Object.keys(data);
      const placeholders = keys.map(k => `@${k}`).join(', ');
      const info = db.prepare(`INSERT INTO customers (${keys.join(', ')}) VALUES (${placeholders})`).run(data);
      customerId = info.lastInsertRowid;
    }
  });
  transaction();
  return customerId;
}

function deleteCustomer(id) {
  db.prepare('DELETE FROM customers WHERE id = ?').run(id);
}

// ------ DASHBOARD ------
function getDashboardStats(filter = 'daily') {
  console.log('[DASHBOARD] Fetching stats with filter:', filter);
  let period = typeof filter === 'string' ? filter : (filter.period || 'daily');
  
  let propConditions = [];
  let expConditions = [];
  let propParams = [];
  let expParams = [];
  let topSoldConditions = [];
  let topSoldParams = [];

  if (period === 'daily') {
    const targetDate = (typeof filter === 'object' && filter.targetDate) ? filter.targetDate : null;
    if (targetDate) {
      propConditions.push("date(COALESCE(date, created_at), 'localtime') = ?");
      propParams.push(targetDate);
      expConditions.push("substr(COALESCE(date, date(created_at, 'localtime')), 1, 10) = ?");
      expParams.push(targetDate);
      topSoldConditions.push("date(COALESCE(p.date, p.created_at), 'localtime') = ?");
      topSoldParams.push(targetDate);
    } else {
      propConditions.push("date(COALESCE(date, created_at), 'localtime') = date('now', 'localtime')");
      expConditions.push("substr(COALESCE(date, date(created_at, 'localtime')), 1, 10) = date('now', 'localtime')");
      topSoldConditions.push("date(COALESCE(p.date, p.created_at), 'localtime') = date('now', 'localtime')");
    }
  } else if (period === 'monthly') {
    let targetMonth = null;
    if (typeof filter === 'object') {
      if (filter.targetMonth) {
        targetMonth = filter.targetMonth;
      } else if (filter.year && filter.month) {
        targetMonth = `${filter.year}-${String(filter.month).padStart(2, '0')}`;
      }
    }
    if (targetMonth) {
      propConditions.push("strftime('%Y-%m', COALESCE(date, created_at), 'localtime') = ?");
      propParams.push(targetMonth);
      expConditions.push("substr(COALESCE(date, date(created_at, 'localtime')), 1, 7) = ?");
      expParams.push(targetMonth);
      topSoldConditions.push("strftime('%Y-%m', COALESCE(p.date, p.created_at), 'localtime') = ?");
      topSoldParams.push(targetMonth);
    } else {
      propConditions.push("strftime('%Y-%m', COALESCE(date, created_at), 'localtime') = strftime('%Y-%m', 'now', 'localtime')");
      expConditions.push("substr(COALESCE(date, date(created_at, 'localtime')), 1, 7) = strftime('%Y-%m', 'now', 'localtime')");
      topSoldConditions.push("strftime('%Y-%m', COALESCE(p.date, p.created_at), 'localtime') = strftime('%Y-%m', 'now', 'localtime')");
    }
  } else if (period === 'annual') {
    let targetYear = null;
    if (typeof filter === 'object') {
      if (filter.targetYear) targetYear = String(filter.targetYear);
      else if (filter.year) targetYear = String(filter.year);
    }
    if (targetYear) {
      propConditions.push("strftime('%Y', COALESCE(date, created_at), 'localtime') = ?");
      propParams.push(targetYear);
      expConditions.push("substr(COALESCE(date, date(created_at, 'localtime')), 1, 4) = ?");
      expParams.push(targetYear);
      topSoldConditions.push("strftime('%Y', COALESCE(p.date, p.created_at), 'localtime') = ?");
      topSoldParams.push(targetYear);
    } else {
      propConditions.push("strftime('%Y', COALESCE(date, created_at), 'localtime') = strftime('%Y', 'now', 'localtime')");
      expConditions.push("substr(COALESCE(date, date(created_at, 'localtime')), 1, 4) = strftime('%Y', 'now', 'localtime')");
      topSoldConditions.push("strftime('%Y', COALESCE(p.date, p.created_at), 'localtime') = strftime('%Y', 'now', 'localtime')");
    }
  } else if (period === 'custom') {
    let start = typeof filter === 'object' && filter.startDate ? filter.startDate : '';
    let end = typeof filter === 'object' && filter.endDate ? filter.endDate : '';
    if (start && end) {
      propConditions.push("date(COALESCE(date, created_at), 'localtime') >= ? AND date(COALESCE(date, created_at), 'localtime') <= ?");
      propParams.push(start, end);
      expConditions.push("substr(COALESCE(date, date(created_at, 'localtime')), 1, 10) >= ? AND substr(COALESCE(date, date(created_at, 'localtime')), 1, 10) <= ?");
      expParams.push(start, end);
      topSoldConditions.push("date(COALESCE(p.date, p.created_at), 'localtime') >= ? AND date(COALESCE(p.date, p.created_at), 'localtime') <= ?");
      topSoldParams.push(start, end);
    } else if (start) {
      propConditions.push("date(COALESCE(date, created_at), 'localtime') >= ?");
      propParams.push(start);
      expConditions.push("substr(COALESCE(date, date(created_at, 'localtime')), 1, 10) >= ?");
      expParams.push(start);
      topSoldConditions.push("date(COALESCE(p.date, p.created_at), 'localtime') >= ?");
      topSoldParams.push(start);
    } else if (end) {
      propConditions.push("date(COALESCE(date, created_at), 'localtime') <= ?");
      propParams.push(end);
      expConditions.push("substr(COALESCE(date, date(created_at, 'localtime')), 1, 10) <= ?");
      expParams.push(end);
      topSoldConditions.push("date(COALESCE(p.date, p.created_at), 'localtime') <= ?");
      topSoldParams.push(end);
    }
  }

  const propWhereClause = propConditions.length > 0 ? "WHERE " + propConditions.join(" AND ") : "";
  const expWhereClause = expConditions.length > 0 ? "WHERE " + expConditions.join(" AND ") : "";
  const topSoldWhereClause = topSoldConditions.length > 0 ? "WHERE " + topSoldConditions.join(" AND ") : "";

  const proposalCount = db.prepare(`SELECT COUNT(*) as c FROM proposals ${propWhereClause}`).get(...propParams)?.c || 0;
  const revenueStr = db.prepare(`SELECT SUM(retail_total) as r FROM proposals ${propWhereClause}`).get(...propParams)?.r || 0;
  const profitStr = db.prepare(`SELECT SUM(profit) as p FROM proposals ${propWhereClause}`).get(...propParams)?.p || 0;
  const discountStr = db.prepare(`SELECT SUM(discount) as d FROM proposals ${propWhereClause}`).get(...propParams)?.d || 0;
  const expensesStr = db.prepare(`SELECT SUM(amount) as a FROM expenses ${expWhereClause}`).get(...expParams)?.a || 0;

  const employeesCount = db.prepare("SELECT COUNT(*) as c FROM employees WHERE status = 'Active'").get()?.c || 0;
  const totalCustomers = db.prepare("SELECT COUNT(*) as c FROM customers").get()?.c || 0;
  const totalVendors = db.prepare("SELECT COUNT(*) as c FROM companies").get()?.c || 0;
  const totalReceivables = db.prepare("SELECT COALESCE(SUM(amount), 0) as r FROM customers WHERE amount > 0").get()?.r || 0;

  let totalStockUnits = 0;
  let totalStockValuation = 0;
  try {
    const labels = getCategoryLabels();
    labels.forEach(l => {
      const row = db.prepare(`SELECT SUM(current_stock) as s, SUM(current_stock * cost_price) as val FROM products_${l.slug}`).get();
      totalStockUnits += (row?.s || 0);
      totalStockValuation += (row?.val || 0);
    });
  } catch(e) {}

  const recentProposals = db.prepare(`SELECT proposal_number, customer_name, shop_name, phone, date, retail_total, received_amount, status FROM proposals ${propWhereClause} ORDER BY id DESC LIMIT 5`).all(...propParams);
  const recentExpenses = db.prepare(`SELECT date, category, amount, description FROM expenses ${expWhereClause} ORDER BY id DESC LIMIT 5`).all(...expParams);

  // Top Sold for the specific period
  const topSold = db.prepare(`
    SELECT pi.description, SUM(pi.qty) as qty 
    FROM proposal_items pi 
    JOIN proposals p ON pi.proposal_id = p.id 
    ${topSoldWhereClause}
    GROUP BY pi.description 
    ORDER BY qty DESC 
    LIMIT 1
  `).get(...topSoldParams) || { description: '-', qty: 0 };

  // Handle "Name - Desc" format for Dashboard display
  let itemName = topSold.description || '-';
  if (itemName.includes(' - ')) {
    itemName = itemName.split(' - ')[0];
  }

  // Fetch available years for dashboard dropdowns
  const currentYr = new Date().getFullYear();
  const yearsSet = new Set([currentYr, currentYr - 1, currentYr - 2]);
  try {
    const yrRows = db.prepare("SELECT DISTINCT strftime('%Y', COALESCE(date, created_at), 'localtime') as yr FROM proposals WHERE yr IS NOT NULL").all();
    yrRows.forEach(r => { if (r.yr) yearsSet.add(parseInt(r.yr)); });
  } catch(e) {}
  const availableYears = Array.from(yearsSet).filter(Boolean).sort((a, b) => b - a);

  return {
    proposalCount,
    totalRevenue: revenueStr,
    totalProfit: profitStr,
    totalDiscount: discountStr,
    totalExpenses: expensesStr,
    activeEmployees: employeesCount,
    topSold: itemName,
    recentProposals,
    recentExpenses,
    totalCustomers,
    totalVendors,
    totalReceivables,
    totalStockUnits,
    totalStockValuation,
    availableYears
  };
}

// ------ SALES STATS ------
function getItemSales(section, period, targetDate = null) {
  const params = [];
  const conditions = [];

  if (section && section !== 'all') {
    const slugToCode = {
      'panels': 'pnl', 'inverters': 'inv', 'structures': 'str', 'cables': 'cab',
      'breakers': 'brk', 'batteries': 'bat', 'misc': 'msc', 'others': 'oth'
    };
    const codeToSlug = {
      'pnl': 'panels', 'inv': 'inverters', 'str': 'structures', 'cab': 'cables',
      'brk': 'breakers', 'bat': 'batteries', 'msc': 'msc', 'oth': 'others'
    };

    const alt = slugToCode[section] || codeToSlug[section];
    if (alt) {
        conditions.push("(pi.section = ? OR pi.section = ?)");
        params.push(section, alt);
    } else {
        conditions.push("pi.section = ?");
        params.push(section);
    }
  }

  if (period === 'daily') {
    if (targetDate) {
      conditions.push("date(COALESCE(p.date, p.created_at), 'localtime') = ?");
      params.push(targetDate);
    } else {
      conditions.push("date(COALESCE(p.date, p.created_at), 'localtime') = date('now', 'localtime')");
    }
  } else if (period === 'monthly') {
    if (targetDate) {
      conditions.push("strftime('%Y-%m', COALESCE(p.date, p.created_at), 'localtime') = ?");
      params.push(targetDate);
    } else {
      conditions.push("strftime('%Y-%m', COALESCE(p.date, p.created_at), 'localtime') = strftime('%Y-%m', 'now', 'localtime')");
    }
  } else if (period === 'annual') {
    if (targetDate) {
      conditions.push("strftime('%Y', COALESCE(p.date, p.created_at), 'localtime') = ?");
      params.push(String(targetDate));
    } else {
      conditions.push("strftime('%Y', COALESCE(p.date, p.created_at), 'localtime') = strftime('%Y', 'now', 'localtime')");
    }
  }

  const whereClause = conditions.length > 0 ? "WHERE " + conditions.join(" AND ") : "";
  const joinClause = "JOIN proposals p ON pi.proposal_id = p.id";

  const sql = `
    SELECT 
      pi.description,
      pi.section,
      SUM(pi.qty) as total_qty,
      SUM(pi.line_cost) as total_cost,
      SUM(pi.line_retail) as total_revenue,
      SUM(pi.line_profit) as total_profit
    FROM proposal_items pi
    ${joinClause}
    ${whereClause}
    GROUP BY pi.description, pi.section
    ORDER BY total_qty DESC
  `;

  console.log("[STATS] Executing SQL:", sql);
  console.log("[STATS] Params:", params);

  return db.prepare(sql).all(...params);
}

function getReportSummary(filters) {
  const { start, end } = filters;
  
  // Sales Summary
  const sales = db.prepare(`
    SELECT 
      COUNT(*) as count,
      SUM(retail_total) as amount,
      SUM(cost_total) as cost,
      SUM(profit) as profit
    FROM proposals 
    WHERE date(COALESCE(date, created_at), 'localtime') >= ? AND date(COALESCE(date, created_at), 'localtime') <= ?
  `).get(start, end) || { count: 0, amount: 0, cost: 0, profit: 0 };
  
  const itemsRow = db.prepare(`
    SELECT SUM(qty) as items
    FROM proposal_items pi
    JOIN proposals p ON pi.proposal_id = p.id
    WHERE date(COALESCE(p.date, p.created_at), 'localtime') >= ? AND date(COALESCE(p.date, p.created_at), 'localtime') <= ?
  `).get(start, end);
  const itemsSold = (itemsRow && itemsRow.items) || 0;

  // Expenses Summary
  const expenses = db.prepare(`
    SELECT 
      COUNT(*) as count,
      SUM(amount) as amount
    FROM expenses
    WHERE substr(COALESCE(date, date(created_at, 'localtime')), 1, 10) >= ? AND substr(COALESCE(date, date(created_at, 'localtime')), 1, 10) <= ?
  `).get(start, end) || { count: 0, amount: 0 };

  // Vendor Balances (Current total)
  const vendors = db.prepare(`
    SELECT 
      COUNT(*) as count,
      SUM(amount) as amount
    FROM companies
  `).get() || { count: 0, amount: 0 };

  return {
    sales: {
      count: sales.count || 0,
      amount: sales.amount || 0,
      cost: sales.cost || 0,
      profit: sales.profit || 0,
      itemsSold: itemsSold
    },
    expenses: {
      count: expenses.count || 0,
      amount: expenses.amount || 0
    },
    vendors: {
      count: vendors.count || 0,
      amount: vendors.amount || 0
    }
  };
}

function getAllProposalItems() {
  const sql = `
    SELECT 
      pi.id,
      pi.proposal_id,
      pi.item_id,
      pi.section,
      pi.description,
      pi.qty,
      pi.unit,
      pi.unit_cost,
      pi.unit_retail,
      pi.unit_discounted,
      pi.line_cost,
      pi.line_retail,
      pi.line_profit,
      p.proposal_number,
      p.customer_name,
      p.phone,
      p.seller_name,
      p.payment_method,
      p.sale_mode,
      p.date,
      p.created_at
    FROM proposal_items pi
    JOIN proposals p ON pi.proposal_id = p.id
    ORDER BY p.id DESC, pi.id ASC
  `;
  return db.prepare(sql).all();
}

function getShops() {
  return db.prepare('SELECT * FROM shops ORDER BY name ASC').all();
}

function getShop(id) {
  return db.prepare('SELECT * FROM shops WHERE id = ?').get(id);
}

function saveShop(data) {
  let shopId;
  const transaction = db.transaction(() => {
    if (data.id) {
      const { id, ...updates } = data;
      const clause = Object.keys(updates).map(k => `${k} = @${k}`).join(', ');
      db.prepare(`UPDATE shops SET ${clause} WHERE id = @id`).run(data);
      shopId = data.id;
    } else {
      const keys = Object.keys(data);
      const placeholders = keys.map(k => `@${k}`).join(', ');
      const info = db.prepare(`INSERT INTO shops (${keys.join(', ')}) VALUES (${placeholders})`).run(data);
      shopId = info.lastInsertRowid;
    }
  });
  transaction();
  return shopId;
}

function deleteShop(id) {
  db.prepare('DELETE FROM shops WHERE id = ?').run(id);
}

function getUnits() {
  return db.prepare('SELECT * FROM product_units ORDER BY name ASC').all();
}

function addUnit(name) {
  try {
    return db.prepare('INSERT INTO product_units (name) VALUES (?)').run(name.toUpperCase());
  } catch(e) { return { error: e.message }; }
}

function updateUnit(id, name) {
  try {
    return db.prepare('UPDATE product_units SET name = ? WHERE id = ?').run(name.toUpperCase(), id);
  } catch(e) { return { error: e.message }; }
}

function deleteUnit(id) {
  try {
    return db.prepare('DELETE FROM product_units WHERE id = ?').run(id);
  } catch(e) { return { error: e.message }; }
}

function getDbPath() {
  if (app && typeof app.getPath === 'function') {
    return path.join(app.getPath('userData'), 'nh_doors.db');
  }
  const appData = process.env.APPDATA || (process.platform === 'darwin' ? path.join(process.env.HOME, 'Library/Application Support') : path.join(process.env.HOME, '.config'));
  return path.join(appData, 'nh-doors', 'nh_doors.db');
}

function close() {
  if (db) db.close();
}


async function backupDatabase(destinationPath) {
  if (!db) throw new Error('Database not initialized');
  try {
    db.pragma('wal_checkpoint(TRUNCATE)');
  } catch (e) {
    console.error('WAL checkpoint error during backup:', e);
  }
  try {
    if (typeof db.backup === 'function') {
      await db.backup(destinationPath);
      return { success: true, path: destinationPath };
    }
  } catch (e) {
    console.warn('db.backup failed, falling back to VACUUM INTO / copy:', e);
  }
  try {
    if (fs.existsSync(destinationPath)) {
      fs.unlinkSync(destinationPath);
    }
    db.prepare('VACUUM INTO ?').run(destinationPath);
    return { success: true, path: destinationPath };
  } catch (e) {
    const dbPath = getDbPath();
    fs.copyFileSync(dbPath, destinationPath);
    return { success: true, path: destinationPath };
  }
}

// Rate History & Stock Management Functions
function addProductStock(data) {
  const {
    category,
    productId,
    addedQty = 0,
    purchasePrice = 0,
    retailPrice = null,
    wholesalePrice = null,
    source = 'Manual Stock Add',
    notes = ''
  } = data;

  const current = db.prepare(`SELECT * FROM products_${category} WHERE id = ?`).get(productId);
  if (!current) throw new Error('Product not found');

  const oldStock = Number(current.current_stock) || 0;
  const oldCost = Number(current.cost_price) || 0;
  const inQty = Number(addedQty) || 0;
  const inPrice = Number(purchasePrice) || 0;

  let newCost = inPrice;
  if (oldStock > 0 && oldCost > 0 && inQty > 0) {
    const totalOldVal = oldStock * oldCost;
    const totalInVal = inQty * inPrice;
    const totalQty = oldStock + inQty;
    newCost = totalQty > 0 ? (totalOldVal + totalInVal) / totalQty : inPrice;
  }
  newCost = Math.round(newCost * 100) / 100;

  const newStock = Math.round((Math.max(0, oldStock) + inQty) * 100) / 100;
  const newRetail = (retailPrice !== null && retailPrice !== undefined && retailPrice !== '') 
    ? Number(retailPrice) 
    : (current.retail_price || 0);
  const newWholesale = (wholesalePrice !== null && wholesalePrice !== undefined && wholesalePrice !== '')
    ? Number(wholesalePrice)
    : (current.wholesale_price || current.retail_price || 0);

  const stmt = db.prepare(`
    UPDATE products_${category} 
    SET current_stock = ?, cost_price = ?, wholesale_cost_price = ?, retail_price = ?, wholesale_price = ?
    WHERE id = ?
  `);
  stmt.run(newStock, newCost, newCost, newRetail, newWholesale, productId);

  const historyStmt = db.prepare(`
    INSERT INTO product_rate_history (
      category_slug, product_id, item_name,
      old_stock, added_qty, new_stock,
      old_cost_price, purchase_price, new_cost_price,
      retail_price, wholesale_price, source, notes, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', 'localtime'))
  `);

  const itemName = current.item_name || current.description || 'Product #' + productId;
  const result = historyStmt.run(
    category, productId, itemName,
    oldStock, inQty, newStock,
    oldCost, inPrice, newCost,
    newRetail, newWholesale, source, notes
  );

  return {
    success: true,
    newStock,
    newCost,
    retailPrice: newRetail,
    wholesalePrice: newWholesale,
    historyId: result.lastInsertRowid
  };
}

function getRateHistory(category = null, productId = null) {
  let sql = `SELECT * FROM product_rate_history`;
  const params = [];
  if (category && productId) {
    sql += ` WHERE category_slug = ? AND product_id = ?`;
    params.push(category, productId);
  } else if (category) {
    sql += ` WHERE category_slug = ?`;
    params.push(category);
  }
  sql += ` ORDER BY id DESC LIMIT 500`;
  return db.prepare(sql).all(...params);
}

function deleteRateHistory(id) {
  return db.prepare('DELETE FROM product_rate_history WHERE id = ?').run(id);
}

function getAllRatesList() {
  const labels = getCategoryLabels();
  let allItems = [];
  
  const histStmt = db.prepare(`
    SELECT created_at, purchase_price, old_cost_price, new_cost_price, source, added_qty 
    FROM product_rate_history 
    WHERE category_slug = ? AND product_id = ? AND purchase_price > 0
    ORDER BY id DESC LIMIT 1
  `);

  labels.forEach(l => {
    const cat = l.slug;
    const catLabel = l.label;
    try {
      const rows = db.prepare(`
        SELECT p.*, '${cat}' as slug, '${catLabel.replace(/'/g, "''")}' as category_label
        FROM products_${cat} p
        ORDER BY p.item_name ASC
      `).all();

      rows.forEach(r => {
        const cost = Number(r.cost_price) || 0;
        const retail = Number(r.retail_price) || 0;
        const profit = retail - cost;
        const profitPct = cost > 0 ? ((profit / cost) * 100) : 0;
        
        let latestHist = null;
        try {
          latestHist = histStmt.get(cat, r.id);
        } catch(e) {}

        allItems.push({
          id: r.id,
          slug: cat,
          category_label: catLabel,
          item_name: r.item_name || r.description || `Item #${r.id}`,
          description: r.description || '',
          unit: r.unit || 'pcs',
          current_stock: r.current_stock || 0,
          cost_price: cost,
          retail_price: retail,
          wholesale_price: r.wholesale_price || retail,
          profit: profit,
          profit_margin_pct: Math.round(profitPct * 10) / 10,
          last_update: latestHist ? latestHist.created_at : null,
          last_purchase_price: latestHist ? latestHist.purchase_price : null,
          last_added_qty: latestHist ? latestHist.added_qty : null
        });
      });
    } catch (e) {
      console.error(`Error loading rates for ${cat}:`, e);
    }
  });

  return allItems;
}

function markProposalPaid(idOrNumber) {
  let p = null;
  if (typeof idOrNumber === 'number' || (!isNaN(Number(idOrNumber)) && !String(idOrNumber).includes('INV') && !String(idOrNumber).includes('-'))) {
    p = db.prepare('SELECT id, retail_total FROM proposals WHERE id = ?').get(Number(idOrNumber));
  }
  if (!p) {
    const cleanNum = String(idOrNumber).replace(/^#/, '').trim();
    p = db.prepare('SELECT id, retail_total FROM proposals WHERE proposal_number = ? OR proposal_number = ? OR id = ?').get(cleanNum, 'INV-' + cleanNum, Number(cleanNum) || 0);
  }
  if (!p) return { error: 'Proposal not found' };

  db.prepare("UPDATE proposals SET received_amount = retail_total, status = 'Paid' WHERE id = ?").run(p.id);
  return { success: true, id: p.id };
}

module.exports = {
  init, getDbPath, close, backupDatabase, clearAllData,
  addProductStock, getRateHistory, deleteRateHistory, getAllRatesList, markProposalPaid,
  getSettings, saveSettings,
  getProducts, addProduct, updateProduct, deleteProduct, findProductByName, changeProductCategory,
  getCategoryLabels, updateCategoryLabel, searchAllProducts, getCategoryStats, addCategory, deleteCategory,
  getProposals, getProposal, saveProposal, deleteProposal, updateProposalStatus, receivePayment, getNextProposalNumber, getNextCustomerName,
  getAllProposalItems,
  getExpenses, saveExpense, deleteExpense, getExpensesSummary,
  getExpenseCategories, addExpenseCategory, deleteExpenseCategory,
  getEmployees, saveEmployee, deleteEmployee,
  getCompanies, saveCompany, deleteCompany,
  getCustomers, saveCustomer, deleteCustomer,
  getShops, saveShop, deleteShop, getShop,
  getDashboardStats,
  getItemSales,
  getReportSummary,
  toggleFavorite,
  getFavoriteProducts,
  getUnits, addUnit, updateUnit, deleteUnit,
  getAllKv, setKv, saveAllKv
};
