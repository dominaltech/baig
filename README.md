# Baig Tiles & Granite CRM & Billing Web App (PWA)

A complete, responsive, offline-first CRM and estimate billing web application custom-built for **Baig Tiles & Granite, Solapur**.

Designed and developed by **Dominal Technology**.

---

## 🌟 Key Features

1. **Pixel-Faithful Estimate Bill Generator**:
   - Recreates the exact paper estimate template (Image 1 reference) digitally, including the red header band, circular "BT" logo, Marathi tagline, address, contacts (9423391203 / 8080767512), GPay/PhonePe payment badges, 5-column item grid, and total/signature layout.
   - Live modal preview and `@media print` stylesheet for clean paper printing.

2. **Core Billing & Auto Inventory Deduction**:
   - Multi-row line item billing with auto-fill rates from product inventory.
   - Support for custom product entries that are automatically saved into the inventory database.
   - Automatic stock deduction upon finalizing bills with low-stock warnings.
   - Sequential bill numbering continuation (starts from #940 / #941).

3. **Customer Database & Khata Dues Tracking**:
   - Auto-captures customer information on every bill.
   - Searchable customer directory with purchase ledger history.
   - Dedicated "Pending Dues" (Khata) tracker with a "Receive Payment" modal.

4. **Offline PWA Support**:
   - Fully compliant Progressive Web App (`manifest.json` + `sw.js`).
   - Installs on Desktop and Mobile browsers directly.
   - 100% functional offline without internet connection.

5. **Voice Input for Address**:
   - Microphone button on the address field utilizing native Web Speech API.
   - Recognizes spoken addresses in **English (`en-IN`)**, **Hindi (`hi-IN`)**, and **Marathi (`mr-IN`)** dynamically based on selected app language.

6. **Multilingual Interface**:
   - Instant language switching between **English**, **Hindi (हिंदी)**, and **Marathi (मराठी)**.

7. **Role-Based Access (Owner vs Staff)**:
   - **Staff Mode**: Quick bill creation, customer search, inventory browsing.
   - **Owner Mode**: Business sales analytics, canvas revenue charts, product rate management, CSV data exports.

8. **Seed Data**:
   - Pre-populated with authentic seed data matching the real filled sample bill (#940) including customer *Laxmibai Pandurang Madam*, products (*Cosmos Nero*, *Cosmo Bianco*, *3D Yellow*, *WOB 1119*, *P. White*, *Steel Grey*, *Brazil Brown Lapato*, *Chemical Bag*, etc.), and finalized bill metrics.

---

## 📁 File Structure

```text
Baig Tiles/
├── index.html            # Main SPA container & view structure
├── css/
│   └── styles.css        # Minimal design system & print stylesheet
├── js/
│   ├── db.js             # IndexedDB Data Access Layer & Seed Data
│   ├── i18n.js           # English/Hindi/Marathi translation engine
│   ├── voice.js          # Web Speech API voice address input engine
│   ├── inventory.js      # Product inventory CRUD & low stock alerts
│   ├── customers.js      # Customer directory & purchase history
│   ├── dues.js           # Khata credit tracker & payment collector
│   ├── analytics.js      # Sales analytics & canvas revenue charts
│   ├── billing.js        # Core billing engine & pixel-faithful estimate builder
│   └── app.js            # App router, global search, roles & CSV exports
├── icons/
│   ├── icon-192.png      # PWA 192x192 icon
│   └── icon-512.png      # PWA 512x512 icon
├── manifest.json         # PWA Web Manifest
├── sw.js                 # PWA Service Worker for offline caching
└── README.md             # Technical documentation & guide
```

---

## 🚀 Running Locally

Because this application uses standard browser ES Modules, IndexedDB, and Service Workers, it should be served via an HTTP server:

### Option 1: Python HTTP Server (Recommended)
```bash
# In the project directory:
python -m http.server 8000
```
Open `http://localhost:8000` in Google Chrome, Edge, or Mobile Safari.

### Option 2: Node http-server or npx
```bash
npx http-server . -p 8000
```

---

## 🔌 Electron Migration Guide (`db.js` Abstraction Layer)

The data storage layer in `js/db.js` is strictly isolated from the UI components. It exposes a clean async Promise-based interface:

- `window.dbManager.getProducts()`
- `window.dbManager.saveProduct(product)`
- `window.dbManager.getCustomers()`
- `window.dbManager.saveCustomer(customer)`
- `window.dbManager.getBills()`
- `window.dbManager.saveBill(bill)`

### To Swap IndexedDB for SQLite in Electron:

1. In Electron `main.js`, set up an `sqlite3` or `better-sqlite3` database instance.
2. Expose IPC handler channels matching the methods above (e.g. `ipcRenderer.invoke('db:getProducts')`).
3. Replace the internal IndexedDB request logic inside `js/db.js` with `window.electronAPI.invoke(...)` calls.
4. **Zero changes** will be required in `billing.js`, `inventory.js`, `customers.js`, `dues.js`, `analytics.js`, or `index.html`.

---

## 📱 PWA Installation Instructions

- **On Desktop (Chrome/Edge)**: Click the "Install Baig Tiles & Granite CRM" button in the browser address bar.
- **On Android**: Tap the browser menu `⋮` and select "Add to Home screen".
- **On iOS (Safari)**: Tap the Share button `⎘` and select "Add to Home Screen".
