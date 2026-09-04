# Baig Tiles & Granite CRM & Billing Software — Complete Features & Technical Specification

> **Application Name:** Baig Tiles & Granite CRM  
> **Domain:** Tiles, Granite, Marble, Ceramic & Construction Materials Billing & Khata CRM  
> **Location / Branch:** MIDC, Akkalkot Road, Solapur - 413006, Maharashtra, India  
> **Architecture:** 100% Offline-First Progressive Web App (PWA), Vanilla JavaScript (ES6+), IndexedDB, CSS3 Design System  
> **Developed by:** Dominal Technology  

---

## Table of Contents
1. [Core Architecture & Offline Capabilities](#1-core-architecture--offline-capabilities)
2. [Dual Billing Engine (Estimate Bill & GST Tax Invoice)](#2-dual-billing-engine-estimate-bill--gst-tax-invoice)
3. [Live Calculations & Numeric Input Protections](#3-live-calculations--numeric-input-protections)
4. [Customer Intelligence & Smart Autocomplete](#4-customer-intelligence--smart-autocomplete)
5. [Native Multilingual Voice Input (Speech-to-Text)](#5-native-multilingual-voice-input-speech-to-text)
6. [High-Precision Export & Printing Engine](#6-high-precision-export--printing-engine)
7. [Bills History & Advanced Filter Toolbar](#7-bills-history--advanced-filter-toolbar)
8. [Returns & Exchanges Management Module (माल परतावा)](#8-returns--exchanges-management-module-माल-परतावा)
9. [Product Inventory & Stock Management](#9-product-inventory--stock-management)
10. [Customer Database & Purchase History Ledger](#10-customer-database--purchase-history-ledger)
11. [Pending Dues & Khata Credit Tracker](#11-pending-dues--khata-credit-tracker)
12. [Business Analytics & Interactive Canvas Charts](#12-business-analytics--interactive-canvas-charts)
13. [Multilingual Translation Engine (English, Hindi, Marathi)](#13-multilingual-translation-engine-english-hindi-marathi)
14. [Role-Based Access Control (Owner vs Staff Mode)](#14-role-based-access-control-owner-vs-staff-mode)
15. [Data Export, Backup & Recovery](#15-data-export-backup--recovery)
16. [Electron Desktop & SQLite Migration Compatibility](#16-electron-desktop--sqlite-migration-compatibility)

---

## 1. Core Architecture & Offline Capabilities

- **100% Offline-First Operation:**
  - Operates completely offline without an internet connection using local browser storage and Service Worker caching.
  - Zero cloud dependency for core POS billing, customer records, stock tracking, and printing.
- **Service Worker (`sw.js`) & Network-First Cache Strategy:**
  - Implements a Network-First caching strategy: checks for live updates on deployment (Vercel / Web) and updates local cache transparently while instantly falling back to local cache when offline.
  - Automatic cache versioning (`baig-tiles-crm-v3.1`) with obsolete cache eviction on activation.
  - Automatic page reload broadcast listener upon receiving new application updates.
- **IndexedDB Database Layer (`db.js`):**
  - Robust schema with 5 dedicated Object Stores:
    1. `products`: `id` (auto-increment), indexes on `name`, `size`.
    2. `customers`: `id` (auto-increment), indexes on `name`, `phone`.
    3. `bills`: `id` (auto-increment), indexes on `billNo`, `customerId`, `status`, `date`.
    4. `returns`: `id` (auto-increment), indexes on `billId`, `customerName`, `date`.
    5. `settings`: key-value configuration store for language, user role, and sequential bill number tracking.
- **Auto-Seeding Authentic Sample Data:**
  - Pre-populates real business inventory, customer profiles, and historical bills matching authentic sample bill #940 on first launch.
- **PWA Web App Manifest (`manifest.json`):**
  - Standalone display mode, high-resolution icons (192x192, 512x512), dark blue theme color (`#0a2540`), and native home screen installation support on Windows, macOS, Android, and iOS.

---

## 2. Dual Billing Engine (Estimate Bill & GST Tax Invoice)

The billing engine provides one-click switching between **Estimate Bills** and **GST Tax Invoices**, dynamically modifying form fields, calculation pipelines, table headers, and print templates.

### A. Estimate Bill Mode (Kachha / Regular Bill)
- **Pixel-Faithful Replica of Paper Estimate Bill:**
  - Recreates the exact physical printed estimate book layout digitally.
  - Deep crimson red header band (`#d92525` to `#b80d19`) with a circular golden "BT" emblem logo.
  - English title (`BAIG TILES & GRANITE`) in bold condensed typography.
  - Marathi title (`बेग टाईल्स अॅन्ड ग्रेनाईट`) with yellow tagline pill (`सर्व प्रकारचे ग्रेनाईट, मार्बल्स अॅन्ड सिरेमिक्स`).
  - Physical shop address: *अक्कलकोट रोड, ई.आर.टी. चौक, स्पीड शोरुम जवळ, एम.आय.डी.सी., सोलापूर-४१३००६.*
  - Proprietor contact: *बीलाल बेग (9423391203 / 8080767512)* with visual **GPay** and **PhonePe** payment badges.
- **5-Column Estimate Table:**
  1. `Tiles No.` (Tile dimensions/size, e.g. `2x4:`, `12x18:`, `16x16:`, `=>`)
  2. `Particulars` (Product name and notes, e.g. `COSMOS NERO GL`, `P. PEBLLO (माल येणे आहे)`)
  3. `Boxes` (Number of boxes / quantity)
  4. `Rate` (Unit rate in ₹ per box)
  5. `Amount` (Calculated line item amount in Rs. / Ps.)
- **Estimate Totals & Khata Footer:**
  - Subtotal (एकूण रक्कम)
  - Previous Dues / मागील (Automatically linked from customer's past unpaid balance)
  - Round Off adjustment
  - Total (सर्व एकत्रित एकूण)
  - Cash / Advance Paid (रोख / अ‍ॅडव्हान्स जमा)
  - Balance Due / बाकी (उर्वरित बाकी)
  - Printed business terms & conditions (*Goods once sold will not be taken back or exchanged / Subject to Solapur Jurisdiction*) and Signature line.

### B. GST Tax Invoice Mode (Pakka Bill)
- **Official Cash-Credit Memo Structure:**
  - "Tax Invoice" capsule badge with header: `BAIG TRADERS`.
  - Authorized contact: `Awes Anis Baig : 8080767512`.
  - Seller GSTIN: `27EXMPB6588R1ZB` | Seller PAN: `EXMPB6588R`.
  - Sequential Tax Invoice Number and Invoice Date.
  - Dedicated Customer GSTIN capture and display with automatic uppercase formatting.
- **6-Column GST Invoice Table:**
  1. `Sr. No.` (Auto-numbered line sequence)
  2. `Particulars` (Product Name with Size descriptor)
  3. `HSN Code` (Default `6907` for ceramic/vitrified tiles, customizable per row)
  4. `Boxes` (Quantity)
  5. `Rate` (₹ per unit)
  6. `Amount` (₹ Taxable Amount)
- **Bank Payment Details Section:**
  - Bank Name: `HDFC BANK`
  - Account Number: `50200059363621`
  - IFSC Code: `HDFC0009343`
  - Branch Address: `Akkalkot Road, Solapur.`
- **Tax Breakdown Pipeline:**
  - Taxable Value of Goods & Services
  - Add: Central GST (CGST) @ editable percentage (default 9%)
  - Add: State GST (SGST) @ editable percentage (default 9%)
  - Invoice Net Grand Total (Previous dues are strictly excluded from GST tax invoice totals in compliance with Indian GST regulations).
- **Indian Currency Number to Words Engine:**
  - Real-time converter for invoice total into formal words with paise precision (e.g., *"One Lakh Thirty Five Thousand Two Hundred Sixty Rupees Only"*).
- **Signatory Sections:**
  - `Customer Sign.` and `For Baig Traders` authorized seal/signature box.

---

## 3. Live Calculations & Numeric Input Protections

- **Real-Time Calculation Pipeline:**
  - Instant re-computation of line item amounts (`boxes * rate`), taxable subtotal, CGST/SGST amounts, round-off, grand total, advance paid, and outstanding balance due on every single keystroke.
- **Mouse Scroll / Wheel Value Change Protection:**
  - Global event interceptor that instantly unfocuses/blurs `<input type="number">` elements when mouse wheel scrolling occurs.
  - Prevents desktop browser mouse-scrolling from inadvertently incrementing/decrementing rates, box counts, tax percentages, advance payments, and customer dues.
- **Browser Spin Button Suppression:**
  - CSS rules remove cluttering up/down stepper arrows across Chromium, Firefox, Edge, and Safari for a clean POS interface.
- **Mandatory Rate Enforcement:**
  - Validation alert preventing bill finalization if any line item has a missing or ₹0 rate.
- **Stock Validation & Over-Sell Alerts:**
  - When finalizing, detects if requested boxes exceed in-stock quantity and displays an interactive warning prompt before deducting.

---

## 4. Customer Intelligence & Smart Autocomplete

- **Interactive Search-as-you-type Dropdown:**
  - Triggers on typing customer name or focusing the customer field.
  - Instant matching against Name, Mobile Number, City/Address, and GSTIN.
- **Keyboard Navigation Support:**
  - Navigate suggestions using `ArrowDown` and `ArrowUp` keys.
  - Select with `Enter` or `Tab` key; dismiss with `Escape`.
- **Auto-Fill Customer Profile:**
  - Automatically fills Customer Name, Mobile Number, Address, and GSTIN into billing form upon selection.
- **Automated Historical Khata (Dues) Lookup:**
  - Instantly scans all previous bills for the selected customer, aggregates outstanding balances (`balanceDue`), and automatically pre-populates the **Previous Dues (मागील)** field.
- **New Customer Auto-Registration:**
  - Any new customer name entered during billing is automatically registered into the Customer database upon saving.

---

## 5. Native Multilingual Voice Input (Speech-to-Text)

- **Browser-Native Web Speech API Integration:**
  - Zero third-party cloud API keys or external services required; runs directly via browser speech recognition engine.
- **Dedicated Trilingual Speech Buttons:**
  - 🎤 **Speak (English):** Configured for `en-IN` Indian English dialect.
  - 🎤 **हिंदी मध्ये बोला:** Configured for `hi-IN` Hindi speech.
  - 🎤 **मराठी मध्ये बोला:** Configured for `mr-IN` Marathi speech.
- **Active Listening UI:**
  - Visual pulse animation and active status text during recording.
  - Seamlessly appends transcribed address strings to the Address input field and dispatches reactive DOM input events.

---

## 6. High-Precision Export & Printing Engine

- **Strict 1-Page A4 Print Layout (`@media print`):**
  - Formatted specifically for standard A4 portrait dimensions (`margin: 5mm 8mm`).
  - Hides navigation bars, search inputs, buttons, and app shell during printing.
  - Guarantees 1-page fit with strict page-break suppression (`page-break-inside: avoid`).
  - High-fidelity print graphics (`-webkit-print-color-adjust: exact`).
- **Direct PDF Export:**
  - Generates downloadable, vector-sharp PDF invoices (`Baig_Traders_Bill_{No}.pdf`) via `jsPDF` and `html2canvas`.
- **High-Resolution PNG Image Export:**
  - Exports a crisp, 2x retina scaled PNG image (`Baig_Traders_Bill_{No}.png`) suitable for sharing directly with customers over WhatsApp or email.

---

## 7. Bills History & Advanced Filter Toolbar

- **Comprehensive Bills Registry:**
  - Displays Bill No. (or Draft badge), Bill Type (ESTIMATE / GST INVOICE), Customer Name, Mobile, Formatted Date & Time, Item Count, Total Amount, and Status Badges.
- **Multi-Dimensional Filter Toolbar:**
  1. **Live Search Query:** Filters by Customer Name, Phone, Address/City, GSTIN, Bill Number, and line item particulars.
  2. **Date Range Filter:** Timezone-safe string matching (`From Date` to `To Date`).
  3. **Bill Number Range Filter:** Filter by specific bill range (`From Bill #` to `To Bill #`) or lookup an exact single bill.
  4. **Status & Type Filter:** All Bills, Finalized (Paid), Finalized (With Due), Drafts Only, GST Tax Invoices, Estimate Bills.
  5. **Sort Order:** Latest Bills (Newest first), Oldest First, Highest Amount (₹), Lowest Amount (₹).
  6. **One-Click Reset:** Instantly clears all filters back to default.
- **Real-Time Summary Metrics:**
  - Header statistics badge shows total count of filtered bills, total sales volume (₹), and total outstanding dues (₹).
- **Edit Existing Bills:**
  - Re-opens any existing draft or finalized bill into the billing form for live adjustments.
- **View & Reprint:**
  - Re-opens the exact bill preview modal for printing or re-downloading at any time.

---

## 8. Returns & Exchanges Management Module (माल परतावा)

- **Dedicated Goods Return / Exchange Workflow:**
  - Access via `+ Process Return / Exchange` button in Bills view or direct row action on any finalized bill.
- **Bill Selection & Details Preview:**
  - Dropdown lists all finalized bills with customer name and total.
  - Displays customer name, phone, invoice date, bill total, and current balance due.
- **Line-by-Line Item Selection Table:**
  - Displays all items originally sold on that invoice with sold box quantities and unit rates.
  - Input field for Return Quantity with automatic validation preventing returns greater than originally sold boxes.
  - Live calculation of row credit amount (`returnBoxes * rate`).
- **Reason for Return Tracking:**
  - Categorized selection:
    1. *Unused / Excess leftover boxes from site (उर्वरित माल)*
    2. *Color / Shade mismatch (कलर / शेड फरक)*
    3. *Damaged / Broken tiles in transit (तुटलेला माल)*
    4. *Customer Exchange / Changed mind (माल बदलून हवा)*
- **Automatic Dual Ledger & Inventory Restock:**
  - Automatically adds returned box quantities back into Inventory stock counts.
  - Automatically deducts the credit refund amount from the customer's bill total and balance due (Khata ledger).
- **Dedicated Returns Log View:**
  - Chronological audit table displaying Return Date & Time, Bill No., Customer Name & Phone, Itemized Details Summary, Total Returned Boxes, Total Credit/Refund Amount (₹), and Return Reason.

---

## 9. Product Inventory & Stock Management

- **Complete Inventory Table:**
  - Columns: Serial No., Product Name, Size / Category, Unit Rate (₹), Current Stock (Boxes), and Actions.
- **Category Filter Tabs:**
  - Instant filtering by: *All Categories*, *2x4 Tiles*, *12x18 Tiles*, *16x16 Tiles*, *Granite*, *Chemical Bags*.
- **Live Search Bar:**
  - Real-time filtering by product name, dimensions, or category.
- **Low Stock Alert System:**
  - Animated pulsing red badge (`LOW STOCK`) on products at or below their minimum alert threshold.
  - Dynamic alert counter pill in navigation bar (`e.g. 2 Low Stock Alerts`).
- **Product Add & Edit Modal:**
  - Add or update Product Name, Size/Category, HSN Code (for GST), Unit Rate (₹), Current Stock (Boxes), and Minimum Stock Alert Threshold.
  - Contextual auto-fill mode: if opened from an autocomplete prompt during billing, saving the product automatically populates the active billing row.
- **Role-Protected Deletion:**
  - Product delete button is visible only in **Owner Mode** to prevent accidental inventory deletion by staff.

---

## 10. Customer Database & Purchase History Ledger

- **Searchable Customer Directory:**
  - Columns: Serial No., Customer Name, Mobile Number, Address, Total Purchases (₹ and bill count), Outstanding Dues (₹), and History Action.
- **Comprehensive Header KPI Summary:**
  - Displays Total Registered Customers, Cumulative Lifetime Purchases (₹), and Total Outstanding Market Dues (₹).
- **Fast Customer Search:**
  - Filter directory in real-time by customer name, mobile number, address, city, or GSTIN.
- **Customer Ledger Modal:**
  - Displays full purchase ledger history for any selected customer.
  - Chronological list of all bills issued, bill dates, invoice totals, amounts paid, remaining balance due, status badges, and instant bill view buttons.

---

## 11. Pending Dues & Khata Credit Tracker

- **Dedicated Accounts Receivable (उधारी / बाकी) Dashboard:**
  - Displays total market outstanding balance across all customer accounts.
  - Filtered table showing all finalized bills with outstanding balances (`balanceDue > 0`), sorted from largest balance due to smallest.
- **Receive Payment Modal:**
  - One-click payment collection button on each row.
  - Displays customer name, bill number, current balance due, and payment amount input (pre-filled with total due).
  - Validates payment amount against current outstanding balance to prevent over-collection.
  - Automatically records payment, reduces balance due, updates customer ledger, and refreshes dues table.
- **Zero Balance Clear State:**
  - Displays clean celebratory state (*"✓ All accounts clear! No pending customer dues outstanding"*) when all dues are paid.

---

## 12. Business Analytics & Interactive Canvas Charts

*(Accessible in Owner Mode)*

- **Executive KPI Cards:**
  - **Total Revenue:** Cumulative lifetime revenue from all finalized sales.
  - **Weekly Sales:** Revenue generated in the last 7 days.
  - **Monthly Sales:** Revenue generated in the last 30 days.
  - **Total Bills:** Total count of finalized sales invoices.
- **Interactive HTML5 Canvas Sales Chart:**
  - Lightweight, responsive bar chart rendering daily/weekly revenue trends without external charting libraries.
  - High-DPI crisp rendering on retina displays with auto-scaling grid lines, currency formatting, and date labels.
  - Responsive window resize listener for seamless layout adjustments.
- **Top Selling Products Leaderboard:**
  - Ranked table of top-performing products by boxes sold and total sales revenue generated.

---

## 13. Multilingual Translation Engine (English, Hindi, Marathi)

- **Instant Language Switching:**
  - One-click language selector in app header:
    - 🇬🇧 **English (en)**
    - 🇮🇳 **हिंदी / Hindi (hi)**
    - 🇮🇳 **मराठी / Marathi (mr)**
- **Comprehensive UI Translation:**
  - Translates navigation links, headers, input labels, search placeholders, action buttons, table columns, badges, modals, settings, and alerts.
- **Dynamic Table Header Localization:**
  - Automatically re-translates dynamically generated billing tables upon mode or language changes.
- **Persistent Language Preference:**
  - Language selection is saved in IndexedDB settings and restored automatically across app restarts.

---

## 14. Role-Based Access Control (Owner vs Staff Mode)

- **Header Mode Switcher:**
  - Toggle between **Staff Mode** and **Owner Mode** with visual active indicators.
- **Staff Mode (Operational Focus):**
  - Optimized for front-desk sales counter.
  - Allows new bill creation, draft saving, bill finalization, customer searching, inventory viewing, and payment collection.
  - Hides sensitive business analytics, revenue charts, and product deletion controls.
- **Owner Mode (Executive Management):**
  - Unlocks the Analytics dashboard, canvas revenue charts, product deletion capabilities, and offline CSV data export tools.
- **Persistent Role Preference:**
  - Selected role is saved in IndexedDB and maintained across sessions.

---

## 15. Data Export, Backup & Recovery

- **Offline CSV Spreadsheet Export:**
  - **Weekly Sales CSV:** Exports finalized sales records from the past 7 days into standard CSV format for Excel / Google Sheets.
  - **Monthly Sales CSV:** Exports finalized sales records from the past 30 days for accounting and auditing.
- **Database Reset & Factory Recovery:**
  - Provides a safe database wipe and re-seed mechanism in Settings with confirmation prompts to restore original demo seed data when needed.
- **Vercel & Deployment Cache Headers (`vercel.json`):**
  - Configures strict `no-cache` rules for `sw.js` and standard revalidation headers for application assets, ensuring instant deployment updates.

---

## 16. Electron Desktop & SQLite Migration Compatibility

- **Decoupled Data Access Layer (`db.js`):**
  - All UI files (`billing.js`, `inventory.js`, `customers.js`, `dues.js`, `analytics.js`, `app.js`) communicate with data strictly through `window.dbManager` Promise methods:
    - `window.dbManager.getProducts()`, `saveProduct()`, `deleteProduct()`
    - `window.dbManager.getCustomers()`, `saveCustomer()`
    - `window.dbManager.getBills()`, `getBillById()`, `saveBill()`, `recordPayment()`
    - `window.dbManager.getReturns()`, `saveReturn()`, `restockProduct()`
    - `window.dbManager.getSetting()`, `setSetting()`
- **Seamless Desktop App Transition:**
  - To package as an Electron desktop app with SQLite: simply forward `window.dbManager` methods via Electron IPC (`ipcRenderer.invoke`) to an `sqlite3` or `better-sqlite3` database in `main.js`.
  - Zero modifications required in any UI, styling, or business logic code.

---

*© 2026 Baig Tiles & Granite, Solapur. System Architecture & Engineering by Dominal Technology.*
