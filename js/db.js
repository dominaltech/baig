/* 
  Baig Tiles & Granite CRM - IndexedDB Data Access Layer (db.js)
  Provides clean Promise-based API for products, customers, bills, and settings.
  Designed for seamless swapping to SQLite via IPC in Electron.
*/

const DB_NAME = 'BaigTilesDB';
const DB_VERSION = 1;

class DatabaseManager {
  constructor() {
    this.db = null;
  }

  async init() {
    if (this.db) return this.db;
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = (e) => {
        console.error('IndexedDB error:', e.target.error);
        reject(e.target.error);
      };

      request.onsuccess = async (e) => {
        this.db = e.target.result;
        await this.checkAndSeedData();
        resolve(this.db);
      };

      request.onupgradeneeded = (e) => {
        const db = e.target.result;

        // Products Store
        if (!db.objectStoreNames.contains('products')) {
          const prodStore = db.createObjectStore('products', { keyPath: 'id', autoIncrement: true });
          prodStore.createIndex('name', 'name', { unique: false });
          prodStore.createIndex('size', 'size', { unique: false });
        }

        // Customers Store
        if (!db.objectStoreNames.contains('customers')) {
          const custStore = db.createObjectStore('customers', { keyPath: 'id', autoIncrement: true });
          custStore.createIndex('name', 'name', { unique: false });
          custStore.createIndex('phone', 'phone', { unique: false });
        }

        // Bills Store
        if (!db.objectStoreNames.contains('bills')) {
          const billStore = db.createObjectStore('bills', { keyPath: 'id', autoIncrement: true });
          billStore.createIndex('billNo', 'billNo', { unique: false });
          billStore.createIndex('customerId', 'customerId', { unique: false });
          billStore.createIndex('status', 'status', { unique: false });
          billStore.createIndex('date', 'date', { unique: false });
        }

        // Settings Store
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
      };
    });
  }

  // Transaction Helper
  async _tx(storeNames, mode, callback) {
    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeNames, mode);
      const stores = storeNames.map(name => tx.objectStore(name));
      tx.oncomplete = () => resolve(result);
      tx.onerror = () => reject(tx.error);
      const result = callback(...stores);
    });
  }

  // --- SEED REAL DATA FROM SAMPLE BILL (IMAGE 2) ---
  async checkAndSeedData() {
    const productsCount = await this.count('products');
    if (productsCount === 0) {
      console.log('Seeding initial business data from sample bill...');
      await this.seedInitialData();
    }
  }

  async count(storeName) {
    return new Promise((resolve) => {
      const tx = this.db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.count();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(0);
    });
  }

  async seedInitialData() {
    // 1. Initial Products List matching Sample Bill line items + standard stock
    const seedProducts = [
      { id: 1, name: 'COSMOS NERO GL', size: '2x4', rate: 45, stock: 150, minStockAlert: 20 },
      { id: 2, name: 'COSMO BIANCO GL', size: '2x4', rate: 45, stock: 200, minStockAlert: 25 },
      { id: 3, name: '3D YELLOW पोलीस', size: '2x4', rate: 58, stock: 80, minStockAlert: 15 },
      { id: 4, name: 'WOB : 1119 GL', size: '2x4', rate: 42, stock: 300, minStockAlert: 30 },
      { id: 5, name: 'P. White', size: '12x18', rate: 250, stock: 40, minStockAlert: 10 },
      { id: 6, name: 'P. White', size: '2x4', rate: 42, stock: 120, minStockAlert: 15 },
      { id: 7, name: 'ARISTON AQUA', size: '2x4', rate: 42, stock: 95, minStockAlert: 10 },
      { id: 8, name: '1081 : L : S', size: '12x18', rate: 250, stock: 65, minStockAlert: 10 },
      { id: 9, name: 'P. GREY STONE BAJAS', size: '16x16', rate: 350, stock: 110, minStockAlert: 20 },
      { id: 10, name: 'P. PEBLLO - 292 (माल येणे आहे)', size: '16x16', rate: 350, stock: 250, minStockAlert: 50 },
      { id: 11, name: 'Steel GRE', size: 'Granite', rate: 70, stock: 180, minStockAlert: 25 },
      { id: 12, name: 'BRAZIL BROWN Lapato', size: 'Granite', rate: 95, stock: 140, minStockAlert: 20 },
      { id: 13, name: 'विद्रा', size: 'Chemical', rate: 80, stock: 50, minStockAlert: 10 },
      { id: 14, name: 'Chemical Bag', size: 'Bag', rate: 450, stock: 60, minStockAlert: 10 },
      { id: 15, name: 'ROSE WOOD POLISHED', size: '2x4', rate: 55, stock: 8, minStockAlert: 15 }, // Low stock demo item
      { id: 16, name: 'ROYAL BLACK MARBLE', size: 'Granite', rate: 110, stock: 5, minStockAlert: 10 } // Low stock demo item
    ];

    // 2. Initial Customers matching Image 2
    const seedCustomers = [
      {
        id: 1,
        name: 'लक्ष्मी बाई पांडुरंग मँडम',
        phone: '6300867296',
        address: 'पितळा पुर, सोलापूर',
        createdAt: '2024-07-25'
      },
      {
        id: 2,
        name: 'अशोकराव शिंद',
        phone: '9822145890',
        address: 'नवी पेठ, सोलापूर',
        createdAt: '2024-07-28'
      },
      {
        id: 3,
        name: 'विशाल माने',
        phone: '8805912345',
        address: 'जुना पुना नाका, सोलापूर',
        createdAt: '2024-08-01'
      }
    ];

    // 3. Sample Finalized Bill #940 matching Image 2 filled sample bill
    const sampleBillItems = [
      { tilesNo: '2x4:', particulars: 'COSMOS NERO GL', boxes: 6, rate: 45, amount: 4320 },
      { tilesNo: '2x4:', particulars: 'COSMO BIANCO GL', boxes: 10, rate: 45, amount: 7200 },
      { tilesNo: '2x4:', particulars: '3D YELLOW पोलीस', boxes: 10, rate: 58, amount: 9280 },
      { tilesNo: '2x4:', particulars: 'WOB : 1119 GL', boxes: 26, rate: 42, amount: 17472 },
      { tilesNo: '12x18:', particulars: 'P. White', boxes: 3, rate: 250, amount: 750 },
      { tilesNo: '2x4:', particulars: 'P. White (3 नंग)', boxes: 2, rate: 42, amount: 2016 },
      { tilesNo: '2x4:', particulars: 'ARISTON AQUA', boxes: 2, rate: 42, amount: 1344 },
      { tilesNo: '12x18:', particulars: '1081 : L : S', boxes: 5, rate: 250, amount: 1250 },
      { tilesNo: '16x16:', particulars: 'P. GREY STONE BAJAS', boxes: 17, rate: 350, amount: 5950 },
      { tilesNo: '16x16:', particulars: 'P. PEBLLO - 292 (माल येणे आहे)', boxes: 190, rate: 350, amount: 66500 },
      { tilesNo: '=>', particulars: 'Steel GRE (2 शीट)', boxes: 62, rate: 70, amount: 4340 },
      { tilesNo: '=>', particulars: 'BRAZIL BROWN Lapato (3 शीट)', boxes: 96, rate: 95, amount: 9120 },
      { tilesNo: '=>', particulars: 'विद्रा (15 नंग)', boxes: 15, rate: 80, amount: 1200 },
      { tilesNo: '=>', particulars: 'Chemical Bag', boxes: 10, rate: 450, amount: 4500 }
    ];

    const seedBills = [
      {
        id: 1,
        billNo: 940,
        customerId: 1,
        customerName: 'लक्ष्मी बाई पांडुरंग मँडम',
        customerPhone: '6300867296',
        customerAddress: 'पितळा पुर, सोलापूर',
        date: '2024-07-25',
        items: sampleBillItems,
        subtotal: 135260,
        previousDues: 720,
        roundOff: 0,
        total: 135980,
        paidAmount: 51000,
        balanceDue: 84980,
        status: 'finalized',
        createdAt: '2024-07-25T11:30:00.000Z'
      },
      {
        id: 2,
        billNo: 941,
        customerId: 2,
        customerName: 'अशोकराव शिंदे',
        customerPhone: '9822145890',
        customerAddress: 'नवी पेठ, सोलापूर',
        date: '2024-07-28',
        items: [
          { tilesNo: '2x4', particulars: 'COSMOS NERO GL', boxes: 12, rate: 45, amount: 5400 },
          { tilesNo: 'Bag', particulars: 'Chemical Bag', boxes: 4, rate: 450, amount: 1800 }
        ],
        subtotal: 7200,
        previousDues: 0,
        roundOff: 0,
        total: 7200,
        paidAmount: 7200,
        balanceDue: 0,
        status: 'finalized',
        createdAt: '2024-07-28T15:15:00.000Z'
      },
      {
        id: 3,
        billNo: 0,
        customerId: 3,
        customerName: 'विशाल माने',
        customerPhone: '8805912345',
        customerAddress: 'जुना पुना नाका, सोलापूर',
        date: '2024-08-01',
        items: [
          { tilesNo: 'Granite', particulars: 'Steel GRE', boxes: 20, rate: 70, amount: 1400 }
        ],
        subtotal: 1400,
        previousDues: 0,
        roundOff: 0,
        total: 1400,
        paidAmount: 0,
        balanceDue: 1400,
        status: 'draft',
        createdAt: '2024-08-01T09:45:00.000Z'
      }
    ];

    const seedSettings = [
      { key: 'appLanguage', value: 'en' },
      { key: 'userRole', value: 'owner' },
      { key: 'lastBillNo', value: 941 }
    ];

    // Save to IndexedDB
    const tx = this.db.transaction(['products', 'customers', 'bills', 'settings'], 'readwrite');
    const pStore = tx.objectStore('products');
    const cStore = tx.objectStore('customers');
    const bStore = tx.objectStore('bills');
    const sStore = tx.objectStore('settings');

    seedProducts.forEach(p => pStore.put(p));
    seedCustomers.forEach(c => cStore.put(c));
    seedBills.forEach(b => bStore.put(b));
    seedSettings.forEach(s => sStore.put(s));

    return new Promise((resolve) => {
      tx.oncomplete = () => {
        console.log('Seed data initialized successfully!');
        resolve(true);
      };
    });
  }

  // --- PRODUCTS DATA ACCESS API ---
  async getProducts() {
    await this.init();
    return new Promise((resolve) => {
      const tx = this.db.transaction('products', 'readonly');
      const store = tx.objectStore('products');
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
    });
  }

  async saveProduct(product) {
    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('products', 'readwrite');
      const store = tx.objectStore('products');
      const req = store.put(product);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async deleteProduct(id) {
    await this.init();
    return new Promise((resolve) => {
      const tx = this.db.transaction('products', 'readwrite');
      const store = tx.objectStore('products');
      store.delete(id);
      tx.oncomplete = () => resolve(true);
    });
  }

  // --- CUSTOMERS DATA ACCESS API ---
  async getCustomers() {
    await this.init();
    return new Promise((resolve) => {
      const tx = this.db.transaction('customers', 'readonly');
      const store = tx.objectStore('customers');
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
    });
  }

  async saveCustomer(customer) {
    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('customers', 'readwrite');
      const store = tx.objectStore('customers');

      // Check if customer with same phone already exists
      const phoneReq = store.index('phone').get(customer.phone);
      phoneReq.onsuccess = () => {
        const existing = phoneReq.result;
        if (existing && !customer.id) {
          // Update existing customer details
          existing.name = customer.name;
          existing.address = customer.address;
          store.put(existing);
          resolve(existing.id);
        } else {
          const req = store.put(customer);
          req.onsuccess = () => resolve(req.result);
        }
      };
    });
  }

  // --- BILLS DATA ACCESS API ---
  async getBills() {
    await this.init();
    return new Promise((resolve) => {
      const tx = this.db.transaction('bills', 'readonly');
      const store = tx.objectStore('bills');
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
    });
  }

  async getBillById(id) {
    await this.init();
    return new Promise((resolve) => {
      const tx = this.db.transaction('bills', 'readonly');
      const store = tx.objectStore('bills');
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result);
    });
  }

  async saveBill(bill) {
    await this.init();
    return new Promise(async (resolve, reject) => {
      // 1. Ensure customer is saved/updated
      let customerId = bill.customerId;
      if (!customerId && bill.customerName) {
        customerId = await this.saveCustomer({
          name: bill.customerName,
          phone: bill.customerPhone,
          address: bill.customerAddress,
          createdAt: new Date().toISOString().split('T')[0]
        });
      }
      bill.customerId = customerId;

      // 2. If bill is being Finalized, auto-increment billNo and deduct stock
      if (bill.status === 'finalized' && (!bill.billNo || bill.billNo === 0)) {
        const lastNo = await this.getSetting('lastBillNo') || 941;
        const nextNo = lastNo + 1;
        bill.billNo = nextNo;
        await this.setSetting('lastBillNo', nextNo);

        // Deduct product stock
        await this.deductInventoryStock(bill.items);
      }

      // 3. Save bill object
      const tx = this.db.transaction('bills', 'readwrite');
      const store = tx.objectStore('bills');
      const req = store.put(bill);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async deductInventoryStock(billItems) {
    const products = await this.getProducts();
    const tx = this.db.transaction('products', 'readwrite');
    const store = tx.objectStore('products');

    for (const item of billItems) {
      const prod = products.find(p => p.name.toLowerCase() === item.particulars.toLowerCase());
      if (prod) {
        prod.stock = Math.max(0, prod.stock - parseInt(item.boxes || 0, 10));
        store.put(prod);
      }
    }
  }

  async recordPayment(billId, paymentAmount) {
    const bill = await this.getBillById(billId);
    if (!bill) return false;

    bill.paidAmount = (bill.paidAmount || 0) + paymentAmount;
    bill.balanceDue = Math.max(0, bill.total - bill.paidAmount);

    await this.saveBill(bill);
    return true;
  }

  // --- SETTINGS API ---
  async getSetting(key) {
    await this.init();
    return new Promise((resolve) => {
      const tx = this.db.transaction('settings', 'readonly');
      const store = tx.objectStore('settings');
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result ? req.result.value : null);
    });
  }

  async setSetting(key, value) {
    await this.init();
    return new Promise((resolve) => {
      const tx = this.db.transaction('settings', 'readwrite');
      const store = tx.objectStore('settings');
      store.put({ key, value });
      tx.oncomplete = () => resolve(true);
    });
  }

  // --- DATA RESET & EXPORT ---
  async clearAllData() {
    await this.init();
    const tx = this.db.transaction(['products', 'customers', 'bills', 'settings'], 'readwrite');
    tx.objectStore('products').clear();
    tx.objectStore('customers').clear();
    tx.objectStore('bills').clear();
    tx.objectStore('settings').clear();

    return new Promise((resolve) => {
      tx.oncomplete = async () => {
        await this.seedInitialData();
        resolve(true);
      };
    });
  }
}

// Global DB Singleton Instance
window.dbManager = new DatabaseManager();
