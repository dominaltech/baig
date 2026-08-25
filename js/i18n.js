/* 
  Baig Tiles & Granite CRM - i18n Translation Module (i18n.js)
  Supports English (en), Hindi (hi), and Marathi (mr)
*/

const translations = {
  en: {
    appName: "Baig Tiles & Granite",
    appSubtitle: "Solapur • Estimate Billing & CRM",
    navCreateBill: "New Bill",
    navBillsList: "Bills History",
    navInventory: "Products & Stock",
    navCustomers: "Customers",
    navDues: "Pending Dues (Khata)",
    navAnalytics: "Analytics",
    navSettings: "Settings",
    
    // Header & Controls
    searchPlaceholder: "Search bills, products, customers...",
    roleOwner: "Owner Mode",
    roleStaff: "Staff Mode",
    
    // Billing View
    createBillTitle: "Create Bill",
    createEstimateTitle: "Create Estimate Bill",
    billTypeEstimate: "Estimate Bill",
    billTypeGst: "GST Tax Invoice",
    customerDetails: "Customer Information",
    customerName: "Customer Name / To",
    customerPhone: "Mobile No.",
    customerAddress: "Address",
    voiceAddressTooltip: "Click to speak address",
    selectCustomer: "-- Select Existing Customer --",
    billDate: "Bill Date",
    billNumber: "Bill No.",
    
    // Bill Table
    colTilesNo: "Tiles No. / Size",
    colParticulars: "Particulars / Item",
    colBoxes: "Boxes / Qty",
    colRate: "Rate (₹)",
    colAmount: "Amount (Rs.)",
    colAction: "Actions",
    addItem: "+ Add Line Item",
    selectProduct: "-- Select Product --",
    customProductOption: "+ Add Custom Product...",
    
    // Summary & Totals
    subtotal: "Subtotal",
    previousDues: "Previous Dues (मागील)",
    roundOff: "Round Off",
    grandTotal: "Grand Total",
    advancePaid: "Cash / Advance Paid",
    balanceDue: "Balance Due (बाकी)",
    
    // Actions
    btnPreview: "Preview Bill",
    btnSaveDraft: "Save Draft",
    btnFinalize: "Finalize & Print",
    btnPrint: "Print Estimate",
    btnDownloadPDF: "Download PDF",
    btnDownloadImage: "Download Image",
    btnCancel: "Cancel",
    btnSave: "Save",
    
    // Inventory
    inventoryTitle: "Product Inventory & Stock",
    addProduct: "+ Add Product",
    categoryFilter: "Category Filter",
    productName: "Product Name",
    productSize: "Size / Category",
    currentStock: "Stock (Boxes)",
    minStockAlert: "Min Stock Alert",
    lowStockTag: "LOW STOCK",
    
    // Customers
    customersTitle: "Customer Database",
    totalPurchases: "Total Bills",
    totalOutstanding: "Total Owed",
    viewHistory: "View History",
    
    // Dues
    duesTitle: "Pending Customer Dues (Khata)",
    receivePayment: "Receive Payment",
    payAmount: "Amount Paid",
    
    // Analytics
    analyticsTitle: "Business Sales Analytics",
    weeklySales: "Weekly Sales",
    monthlySales: "Monthly Sales",
    totalBills: "Total Bills Issued",
    topProducts: "Top Selling Products",
    
    // Settings
    settingsTitle: "App Settings & Data Export",
    languageSelectLabel: "App Interface Language",
    installAppLabel: "Install Application (Mobile & PC)",
    btnInstallApp: "Install App",
    exportDataLabel: "Download Business Data (Offline CSV)",
    btnExportWeekly: "Download Weekly CSV",
    btnExportMonthly: "Download Monthly CSV",
    wipeDataLabel: "Reset / Clear All Data",
    btnWipeData: "Reset to Initial Seed Data"
  },
  
  hi: {
    appName: "बेग टाईल्स एंड ग्रेनाइट",
    appSubtitle: "सोलापुर • एस्टीमेट बिलिंग एवं सआरएम",
    navCreateBill: "नया बिल बनाएं",
    navBillsList: "बिल इतिहास",
    navInventory: "उत्पाद एवं स्टॉक",
    navCustomers: "ग्राहक सूची",
    navDues: "बकाया राशि (खाता)",
    navAnalytics: "बिक्री रिपोर्ट",
    navSettings: "सेटिंग्स",
    
    // Header & Controls
    searchPlaceholder: "बिल, उत्पाद, ग्राहक खोजें...",
    roleOwner: "मालिक मोड",
    roleStaff: "स्टाफ मोड",
    
    // Billing View
    createEstimateTitle: "एस्टीमेट बिल तैयार करें",
    customerDetails: "ग्राहक विवरण",
    customerName: "ग्राहक का नाम / प्रति",
    customerPhone: "मोबाइल नंबर",
    customerAddress: "पता",
    voiceAddressTooltip: "पता बोलने के लिए क्लिक करें",
    selectCustomer: "-- मौजूदा ग्राहक चुनें --",
    billDate: "दिनांक",
    billNumber: "बिल नं.",
    
    // Bill Table
    colTilesNo: "टाइल्स नं. / साइज",
    colParticulars: "विवरण / सामान",
    colBoxes: "बॉक्स / मात्रा",
    colRate: "दर (₹)",
    colAmount: "राशि (रु.)",
    colAction: "कार्रवाई",
    addItem: "+ नई लाइन जोड़ें",
    selectProduct: "-- उत्पाद चुनें --",
    customProductOption: "+ नया उत्पाद दर्ज करें...",
    
    // Summary & Totals
    subtotal: "उप-कुल (Subtotal)",
    previousDues: "पिछला बकाया (मागील)",
    roundOff: "राउंड ऑफ",
    grandTotal: "कुल राशि",
    advancePaid: "नकद / एडवांस जमा",
    balanceDue: "शेष बकाया (बाकी)",
    
    // Actions (Hindi)
    btnPreview: "बिल पूर्वावलोकन (Preview)",
    btnSaveDraft: "ड्राफ्ट सहेजें",
    btnFinalize: "अंतिम रूप दें और प्रिंट करें",
    btnPrint: "प्रिंट एस्टीमेट",
    btnDownloadPDF: "PDF डाउनलोड करें",
    btnDownloadImage: "इमेज डाउनलोड करें",
    btnCancel: "रद्द करें",
    btnSave: "सहेजें",
    
    // Inventory
    inventoryTitle: "उत्पाद सूची एवं स्टॉक प्रबंधन",
    addProduct: "+ नया उत्पाद जोड़ें",
    categoryFilter: "श्रेणी फ़िल्टर",
    productName: "उत्पाद का नाम",
    productSize: "साइज / श्रेणी",
    currentStock: "स्टॉक (बॉक्स)",
    minStockAlert: "न्यूनतम स्टॉक अलर्ट",
    lowStockTag: "कम स्टॉक",
    
    // Customers
    customersTitle: "ग्राहक डेटाबेस",
    totalPurchases: "कुल बिल",
    totalOutstanding: "कुल बकाया",
    viewHistory: "इतिहास देखें",
    
    // Dues
    duesTitle: "ग्राहक बकाया खाता",
    receivePayment: "भुगतान प्राप्त करें",
    payAmount: "प्राप्त राशि",
    
    // Analytics
    analyticsTitle: "व्यवसाय विश्लेषण",
    weeklySales: "साप्ताहिक बिक्री",
    monthlySales: "मासिक बिक्री",
    totalBills: "कुल बिल",
    topProducts: "सर्वश्रेष्ठ उत्पाद",
    
    // Settings (Hindi)
    settingsTitle: "ऐप सेटिंग्स एवं डेटा निर्यात",
    languageSelectLabel: "ऐप की भाषा चुनें",
    installAppLabel: "ऐप इंस्टॉल करें (मोबाइल और पीसी)",
    btnInstallApp: "ऐप इंस्टॉल करें",
    exportDataLabel: "ऑफलाइन डेटा डाउनलोड करें (CSV)",
    btnExportWeekly: "साप्ताहिक CSV डाउनलोड",
    btnExportMonthly: "मासिक CSV डाउनलोड",
    wipeDataLabel: "डेटा रीसेट करें",
    btnWipeData: "शुरुआती डेटा पर रीसेट करें"
  },
  
  mr: {
    appName: "बेग टाईल्स अॅन्ड ग्रेनाईट",
    appSubtitle: "सोलापूर • एस्टीमेट बिलिंग व ग्राहक व्यवस्थापन",
    navCreateBill: "नवीन बिल तयार करा",
    navBillsList: "बिलांचा इतिहास",
    navInventory: "माल व साठा (स्टॉक)",
    navCustomers: "ग्राहक यादी",
    navDues: "उधारी / बाकी (खाता)",
    navAnalytics: "विक्री अहवाल",
    navSettings: "सेटिंग्ज",
    
    // Header & Controls
    searchPlaceholder: "बिल, माल, ग्राहक शोधा...",
    roleOwner: "मालक मोड",
    roleStaff: "स्टाफ मोड",
    
    // Billing View
    createEstimateTitle: "एस्टीमेट बिल तयार करा",
    customerDetails: "ग्राहकाची माहिती",
    customerName: "ग्राहकाचे नाव / प्रति",
    customerPhone: "मोबाईल नंबर",
    customerAddress: "पत्ता",
    voiceAddressTooltip: "पत्ता बोलण्यासाठी क्लिक करा",
    selectCustomer: "-- हयातीतील ग्राहक निवडा --",
    billDate: "दिनांक",
    billNumber: "बिल नं.",
    
    // Bill Table
    colTilesNo: "टाईल्स नं. / साईझ",
    colParticulars: "तपशील / नग",
    colBoxes: "बॉक्स / प्रमाण",
    colRate: "दर (₹)",
    colAmount: "रक्कम (रु.)",
    colAction: "कृती",
    addItem: "+ नवीन रांग जोडा",
    selectProduct: "-- माल निवडा --",
    customProductOption: "+ नवीन माल प्रविष्ट करा...",
    
    // Summary & Totals
    subtotal: "एकूण रक्कम (Subtotal)",
    previousDues: "मागील बाकी (मागील)",
    roundOff: "राउंड ऑफ",
    grandTotal: "सर्व एकत्रित एकूण",
    advancePaid: "रोख / अ‍ॅडव्हान्स जमा",
    balanceDue: "उर्वरित बाकी (बाकी)",
    
    // Actions
    btnPreview: "बिल पहा (Preview)",
    btnSaveDraft: "ड्राफ्ट ठेवा",
    btnFinalize: "पक्के करा व प्रिंट काढा",
    btnPrint: "एस्टीमेट प्रिंट",
    btnDownloadPDF: "PDF डाऊनलोड करा",
    btnDownloadImage: "इमेज डाऊनलोड करा",
    btnCancel: "रद्द करा",
    btnSave: "जतन करा",
    
    // Inventory
    inventoryTitle: "साठा (स्टॉक) व्यवस्थापन",
    addProduct: "+ नवीन माल जोडा",
    categoryFilter: "प्रकार फिल्टर",
    productName: "मालाचे नाव",
    productSize: "साईझ / प्रकार",
    currentStock: "शिल्लक साठा (बॉक्स)",
    minStockAlert: "किमान स्टॉक अलर्ट",
    lowStockTag: "साठा कमी आहे",
    
    // Customers
    customersTitle: "ग्राहक नोंदवही",
    totalPurchases: "एकूण बिले",
    totalOutstanding: "एकूण बाकी",
    viewHistory: "इतिहास पहा",
    
    // Dues
    duesTitle: "उधारी व बाकी रक्कम (खाता)",
    receivePayment: "रक्कम जमा करा",
    payAmount: "जमा रक्कम",
    
    // Analytics
    analyticsTitle: "व्यवसाय अहवाल व विक्री",
    weeklySales: "आठवड्याची विक्री",
    monthlySales: "महिन्याची विक्री",
    totalBills: "एकूण बिले",
    topProducts: "सर्वाधिक विकला जाणारा माल",
    
    // Settings
    settingsTitle: "सेटिंग्ज व डेटा डाऊनलोड",
    languageSelectLabel: "अ‍ॅपची भाषा बदला",
    installAppLabel: "अ‍ॅप इन्स्टॉल करा (मोबाईल व पीसी)",
    btnInstallApp: "अ‍ॅप इन्स्टॉल करा",
    exportDataLabel: "डेटा डाऊनलोड (CSV)",
    btnExportWeekly: "आठवड्याचा CSV डाऊनलोड",
    btnExportMonthly: "महिन्याचा CSV डाऊनलोड",
    wipeDataLabel: "डेटा रीसेट",
    btnWipeData: "आरंभीच्या डेटावर रीसेट करा"
  }
};

class I18nManager {
  constructor() {
    this.currentLang = 'en';
  }

  async init() {
    const savedLang = await window.dbManager.getSetting('appLanguage');
    if (savedLang && ['en', 'hi', 'mr'].includes(savedLang)) {
      this.currentLang = savedLang;
    }
    this.applyTranslations();
  }

  setLanguage(lang) {
    if (!['en', 'hi', 'mr'].includes(lang)) return;
    this.currentLang = lang;
    window.dbManager.setSetting('appLanguage', lang);
    this.applyTranslations();
  }

  t(key) {
    return (translations[this.currentLang] && translations[this.currentLang][key]) || 
           (translations['en'][key]) || key;
  }

  applyTranslations() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      el.textContent = this.t(key);
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      el.placeholder = this.t(key);
    });

    // Update document title
    document.title = this.t('appName') + ' - ' + this.t('appSubtitle');
  }
}

window.i18n = new I18nManager();
