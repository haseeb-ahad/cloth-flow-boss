import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

// Supported languages with native names
export const LANGUAGES = [
  { code: "en", name: "English", nativeName: "English", dir: "ltr" },
  { code: "ur", name: "Urdu", nativeName: "اردو", dir: "rtl" },
  { code: "ar", name: "Arabic", nativeName: "العربية", dir: "rtl" },
  { code: "hi", name: "Hindi", nativeName: "हिन्दी", dir: "ltr" },
  { code: "es", name: "Spanish", nativeName: "Español", dir: "ltr" },
  { code: "fr", name: "French", nativeName: "Français", dir: "ltr" },
  { code: "de", name: "German", nativeName: "Deutsch", dir: "ltr" },
  { code: "zh", name: "Chinese", nativeName: "中文", dir: "ltr" },
  { code: "pt", name: "Portuguese", nativeName: "Português", dir: "ltr" },
  { code: "tr", name: "Turkish", nativeName: "Türkçe", dir: "ltr" },
  { code: "ru", name: "Russian", nativeName: "Русский", dir: "ltr" },
  { code: "ja", name: "Japanese", nativeName: "日本語", dir: "ltr" },
  { code: "ko", name: "Korean", nativeName: "한국어", dir: "ltr" },
  { code: "it", name: "Italian", nativeName: "Italiano", dir: "ltr" },
  { code: "nl", name: "Dutch", nativeName: "Nederlands", dir: "ltr" },
  { code: "pl", name: "Polish", nativeName: "Polski", dir: "ltr" },
  { code: "th", name: "Thai", nativeName: "ไทย", dir: "ltr" },
  { code: "vi", name: "Vietnamese", nativeName: "Tiếng Việt", dir: "ltr" },
  { code: "id", name: "Indonesian", nativeName: "Bahasa Indonesia", dir: "ltr" },
  { code: "ms", name: "Malay", nativeName: "Bahasa Melayu", dir: "ltr" },
  { code: "bn", name: "Bengali", nativeName: "বাংলা", dir: "ltr" },
  { code: "pa", name: "Punjabi", nativeName: "ਪੰਜਾਬੀ", dir: "ltr" },
  { code: "fa", name: "Persian", nativeName: "فارسی", dir: "rtl" },
  { code: "sw", name: "Swahili", nativeName: "Kiswahili", dir: "ltr" },
  { code: "ta", name: "Tamil", nativeName: "தமிழ்", dir: "ltr" },
  { code: "te", name: "Telugu", nativeName: "తెలుగు", dir: "ltr" },
  { code: "mr", name: "Marathi", nativeName: "मराठी", dir: "ltr" },
  { code: "gu", name: "Gujarati", nativeName: "ગુજરાતી", dir: "ltr" },
  { code: "kn", name: "Kannada", nativeName: "ಕನ್ನಡ", dir: "ltr" },
  { code: "ml", name: "Malayalam", nativeName: "മലയാളം", dir: "ltr" },
  { code: "uk", name: "Ukrainian", nativeName: "Українська", dir: "ltr" },
  { code: "ro", name: "Romanian", nativeName: "Română", dir: "ltr" },
  { code: "el", name: "Greek", nativeName: "Ελληνικά", dir: "ltr" },
  { code: "cs", name: "Czech", nativeName: "Čeština", dir: "ltr" },
  { code: "sv", name: "Swedish", nativeName: "Svenska", dir: "ltr" },
  { code: "hu", name: "Hungarian", nativeName: "Magyar", dir: "ltr" },
  { code: "he", name: "Hebrew", nativeName: "עברית", dir: "rtl" },
  { code: "fi", name: "Finnish", nativeName: "Suomi", dir: "ltr" },
  { code: "no", name: "Norwegian", nativeName: "Norsk", dir: "ltr" },
  { code: "da", name: "Danish", nativeName: "Dansk", dir: "ltr" },
];

// Translation keys and their values
type TranslationKey = keyof typeof translations.en;

const translations = {
  en: {
    // Navigation
    dashboard: "Dashboard",
    newInvoice: "New Invoice",
    inventory: "Inventory",
    salesHistory: "Sales History",
    credits: "Credits",
    creditManagement: "Credit Management",
    receivePayment: "Receive Payment",
    expenses: "Expenses",
    customers: "Customers",
    manageWorkers: "Manage Workers",
    settings: "Settings",
    logout: "Logout",
    collapse: "Collapse",
    
    // Common
    save: "Save",
    cancel: "Cancel",
    delete: "Delete",
    edit: "Edit",
    add: "Add",
    search: "Search",
    filter: "Filter",
    export: "Export",
    import: "Import",
    loading: "Loading...",
    noData: "No data found",
    confirm: "Confirm",
    back: "Back",
    next: "Next",
    submit: "Submit",
    reset: "Reset",
    close: "Close",
    view: "View",
    print: "Print",
    download: "Download",
    upload: "Upload",
    select: "Select",
    all: "All",
    none: "None",
    yes: "Yes",
    no: "No",
    active: "Active",
    inactive: "Inactive",
    pending: "Pending",
    completed: "Completed",
    
    // Settings
    generalSettings: "General Settings",
    receiptSettings: "Receipt Settings",
    languageSettings: "Language & Timezone Settings",
    profileSettings: "Profile Settings",
    appName: "Application Name",
    appDescription: "Application Description",
    uploadLogo: "Upload Logo",
    shopName: "Shop Name",
    shopAddress: "Shop Address",
    ownerNames: "Owner Names",
    addOwnerName: "Add Owner Name",
    phoneNumbers: "Phone Numbers",
    addPhoneNumber: "Add Phone Number",
    thankYouMessage: "Thank You Message",
    footerMessage: "Footer Message",
    workerName: "Worker Name (Shown on Receipt)",
    workerPhone: "Worker Phone (Shown on Receipt)",
    selectLanguage: "Select Language",
    selectTimezone: "Select Timezone",
    saveGeneralSettings: "Save General Settings",
    saveReceiptSettings: "Save Receipt Settings",
    saveSettings: "Save Settings",
    saveProfile: "Save Profile",
    
    // Profile
    fullName: "Full Name",
    email: "Email",
    phoneNumber: "Phone Number",
    
    // Invoice
    items: "Items",
    total: "Total",
    invoiceDate: "Invoice date",
    paymentMethod: "Payment method",
    cash: "Cash",
    card: "Card",
    online: "Online",
    credit: "Credit",
    discount: "Discount",
    paidAmount: "Paid amount (Optional)",
    fullPayment: "Full payment",
    leaveEmptyForFullPayment: "Leave empty for full payment",
    saveAndPrint: "Save & Print",
    customerName: "Customer Name",
    customerPhone: "Customer Phone",
    selectProduct: "Select product",
    quantity: "Quantity",
    price: "Price",
    subtotal: "Subtotal",
    netTotal: "Net Total",
    totalCost: "Total cost",
    totalProfit: "Total profit",
    finalTotal: "Final Total",
    paid: "Paid",
    due: "Due",
    
    // Inventory
    addProduct: "Add Product",
    productName: "Product Name",
    category: "Category",
    purchasePrice: "Purchase Price",
    sellingPrice: "Selling Price",
    stockQuantity: "Stock Quantity",
    quantityType: "Quantity Type",
    supplier: "Supplier",
    sku: "SKU",
    description: "Description",
    lowStock: "Low Stock",
    outOfStock: "Out of Stock",
    inStock: "In Stock",
    
    // Credits
    addCredit: "Add Credit",
    creditAmount: "Credit Amount",
    remainingAmount: "Remaining Amount",
    dueDate: "Due Date",
    status: "Status",
    notes: "Notes",
    paymentReceived: "Payment Received",
    markAsPaid: "Mark as Paid",
    
    // Customers
    addCustomer: "Add Customer",
    customerDetails: "Customer Details",
    totalPurchases: "Total Purchases",
    lastPurchase: "Last Purchase",
    
    // Expenses
    addExpense: "Add Expense",
    expenseType: "Expense Type",
    amount: "Amount",
    date: "Date",
    rent: "Rent",
    utilities: "Utilities",
    salaries: "Salaries",
    supplies: "Supplies",
    other: "Other",
    
    // Workers
    addWorker: "Add Worker",
    workerDetails: "Worker Details",
    permissions: "Permissions",
    role: "Role",
    admin: "Admin",
    worker: "Worker",
    
    // Dashboard
    todaySales: "Today's Sales",
    weeklySales: "Weekly Sales",
    monthlySales: "Monthly Sales",
    totalCustomers: "Total Customers",
    totalProducts: "Total Products",
    pendingCredits: "Pending Credits",
    topProducts: "Top Products",
    topCustomers: "Top Customers",
    recentSales: "Recent Sales",
    salesOverview: "Sales Overview",
    profitOverview: "Profit Overview",
    
    // Messages
    savedSuccessfully: "Saved successfully!",
    deletedSuccessfully: "Deleted successfully!",
    errorOccurred: "An error occurred",
    confirmDelete: "Are you sure you want to delete?",
    noPermission: "You do not have permission for this action",
    
    // Receipt
    billNo: "Bill No",
    invoiceNo: "Invoice No",
    item: "Item",
    qty: "Qty",
    
    // Time
    today: "Today",
    yesterday: "Yesterday",
    thisWeek: "This Week",
    thisMonth: "This Month",
    lastMonth: "Last Month",
    custom: "Custom",
    
    // Actions
    actions: "Actions",
    moreOptions: "More Options",
  },
  ur: {
    // Navigation
    dashboard: "ڈیش بورڈ",
    newInvoice: "نیا انوائس",
    inventory: "انوینٹری",
    salesHistory: "فروخت کی تاریخ",
    credits: "ادھار",
    creditManagement: "ادھار مینجمنٹ",
    receivePayment: "ادائیگی وصول کریں",
    expenses: "اخراجات",
    customers: "گاہک",
    manageWorkers: "ورکرز منیج کریں",
    settings: "ترتیبات",
    logout: "لاگ آؤٹ",
    collapse: "سمیٹیں",
    
    // Common
    save: "محفوظ کریں",
    cancel: "منسوخ",
    delete: "حذف کریں",
    edit: "ترمیم",
    add: "شامل کریں",
    search: "تلاش",
    filter: "فلٹر",
    export: "برآمد",
    import: "درآمد",
    loading: "لوڈ ہو رہا ہے...",
    noData: "کوئی ڈیٹا نہیں ملا",
    confirm: "تصدیق",
    back: "واپس",
    next: "اگلا",
    submit: "جمع کریں",
    reset: "ری سیٹ",
    close: "بند کریں",
    view: "دیکھیں",
    print: "پرنٹ",
    download: "ڈاؤن لوڈ",
    upload: "اپ لوڈ",
    select: "منتخب کریں",
    all: "سب",
    none: "کوئی نہیں",
    yes: "ہاں",
    no: "نہیں",
    active: "فعال",
    inactive: "غیر فعال",
    pending: "زیر التواء",
    completed: "مکمل",
    
    // Settings
    generalSettings: "عمومی ترتیبات",
    receiptSettings: "رسید کی ترتیبات",
    languageSettings: "زبان اور ٹائم زون کی ترتیبات",
    profileSettings: "پروفائل کی ترتیبات",
    appName: "ایپ کا نام",
    appDescription: "ایپ کی تفصیل",
    uploadLogo: "لوگو اپ لوڈ کریں",
    shopName: "دکان کا نام",
    shopAddress: "دکان کا پتہ",
    ownerNames: "مالکان کے نام",
    addOwnerName: "مالک کا نام شامل کریں",
    phoneNumbers: "فون نمبرز",
    addPhoneNumber: "فون نمبر شامل کریں",
    thankYouMessage: "شکریہ کا پیغام",
    footerMessage: "فٹر پیغام",
    workerName: "ورکر کا نام (رسید پر)",
    workerPhone: "ورکر کا فون (رسید پر)",
    selectLanguage: "زبان منتخب کریں",
    selectTimezone: "ٹائم زون منتخب کریں",
    saveGeneralSettings: "عمومی ترتیبات محفوظ کریں",
    saveReceiptSettings: "رسید کی ترتیبات محفوظ کریں",
    saveSettings: "ترتیبات محفوظ کریں",
    saveProfile: "پروفائل محفوظ کریں",
    
    // Profile
    fullName: "پورا نام",
    email: "ای میل",
    phoneNumber: "فون نمبر",
    
    // Invoice
    items: "اشیاء",
    total: "کل",
    invoiceDate: "انوائس کی تاریخ",
    paymentMethod: "ادائیگی کا طریقہ",
    cash: "نقد",
    card: "کارڈ",
    online: "آن لائن",
    credit: "ادھار",
    discount: "رعایت",
    paidAmount: "ادا کی گئی رقم (اختیاری)",
    fullPayment: "مکمل ادائیگی",
    leaveEmptyForFullPayment: "مکمل ادائیگی کے لیے خالی چھوڑیں",
    saveAndPrint: "محفوظ کریں اور پرنٹ کریں",
    customerName: "گاہک کا نام",
    customerPhone: "گاہک کا فون",
    selectProduct: "پروڈکٹ منتخب کریں",
    quantity: "مقدار",
    price: "قیمت",
    subtotal: "ذیلی کل",
    netTotal: "خالص کل",
    totalCost: "کل لاگت",
    totalProfit: "کل منافع",
    finalTotal: "حتمی کل",
    paid: "ادا شدہ",
    due: "واجب الادا",
    
    // Inventory
    addProduct: "پروڈکٹ شامل کریں",
    productName: "پروڈکٹ کا نام",
    category: "زمرہ",
    purchasePrice: "خرید قیمت",
    sellingPrice: "فروخت قیمت",
    stockQuantity: "اسٹاک مقدار",
    quantityType: "مقدار کی قسم",
    supplier: "سپلائر",
    sku: "SKU",
    description: "تفصیل",
    lowStock: "کم اسٹاک",
    outOfStock: "اسٹاک ختم",
    inStock: "اسٹاک میں",
    
    // Credits
    addCredit: "ادھار شامل کریں",
    creditAmount: "ادھار کی رقم",
    remainingAmount: "باقی رقم",
    dueDate: "آخری تاریخ",
    status: "حالت",
    notes: "نوٹس",
    paymentReceived: "ادائیگی موصول",
    markAsPaid: "ادا شدہ کریں",
    
    // Customers
    addCustomer: "گاہک شامل کریں",
    customerDetails: "گاہک کی تفصیلات",
    totalPurchases: "کل خریداری",
    lastPurchase: "آخری خریداری",
    
    // Expenses
    addExpense: "خرچ شامل کریں",
    expenseType: "خرچ کی قسم",
    amount: "رقم",
    date: "تاریخ",
    rent: "کرایہ",
    utilities: "یوٹیلٹیز",
    salaries: "تنخواہیں",
    supplies: "سپلائیز",
    other: "دیگر",
    
    // Workers
    addWorker: "ورکر شامل کریں",
    workerDetails: "ورکر کی تفصیلات",
    permissions: "اجازتیں",
    role: "کردار",
    admin: "ایڈمن",
    worker: "ورکر",
    
    // Dashboard
    todaySales: "آج کی فروخت",
    weeklySales: "ہفتہ وار فروخت",
    monthlySales: "ماہانہ فروخت",
    totalCustomers: "کل گاہک",
    totalProducts: "کل پروڈکٹس",
    pendingCredits: "زیر التواء ادھار",
    topProducts: "ٹاپ پروڈکٹس",
    topCustomers: "ٹاپ گاہک",
    recentSales: "حالیہ فروخت",
    salesOverview: "فروخت کا جائزہ",
    profitOverview: "منافع کا جائزہ",
    
    // Messages
    savedSuccessfully: "کامیابی سے محفوظ ہو گیا!",
    deletedSuccessfully: "کامیابی سے حذف ہو گیا!",
    errorOccurred: "ایک خرابی پیش آئی",
    confirmDelete: "کیا آپ واقعی حذف کرنا چاہتے ہیں؟",
    noPermission: "آپ کو اس کام کی اجازت نہیں ہے",
    
    // Receipt
    billNo: "بل نمبر",
    invoiceNo: "انوائس نمبر",
    item: "آئٹم",
    qty: "مقدار",
    
    // Time
    today: "آج",
    yesterday: "کل",
    thisWeek: "اس ہفتے",
    thisMonth: "اس مہینے",
    lastMonth: "پچھلے مہینے",
    custom: "مخصوص",
    
    // Actions
    actions: "کارروائیاں",
    moreOptions: "مزید اختیارات",
  },
  ar: {
    // Navigation
    dashboard: "لوحة التحكم",
    newInvoice: "فاتورة جديدة",
    inventory: "المخزون",
    salesHistory: "سجل المبيعات",
    credits: "الائتمان",
    creditManagement: "إدارة الائتمان",
    receivePayment: "استلام الدفع",
    expenses: "المصروفات",
    customers: "العملاء",
    manageWorkers: "إدارة العمال",
    settings: "الإعدادات",
    logout: "تسجيل الخروج",
    collapse: "طي",
    
    // Common
    save: "حفظ",
    cancel: "إلغاء",
    delete: "حذف",
    edit: "تعديل",
    add: "إضافة",
    search: "بحث",
    filter: "تصفية",
    export: "تصدير",
    import: "استيراد",
    loading: "جاري التحميل...",
    noData: "لا توجد بيانات",
    confirm: "تأكيد",
    back: "رجوع",
    next: "التالي",
    submit: "إرسال",
    reset: "إعادة تعيين",
    close: "إغلاق",
    view: "عرض",
    print: "طباعة",
    download: "تحميل",
    upload: "رفع",
    select: "اختيار",
    all: "الكل",
    none: "لا شيء",
    yes: "نعم",
    no: "لا",
    active: "نشط",
    inactive: "غير نشط",
    pending: "قيد الانتظار",
    completed: "مكتمل",
    
    // Settings
    generalSettings: "الإعدادات العامة",
    receiptSettings: "إعدادات الإيصال",
    languageSettings: "إعدادات اللغة والمنطقة الزمنية",
    profileSettings: "إعدادات الملف الشخصي",
    appName: "اسم التطبيق",
    appDescription: "وصف التطبيق",
    uploadLogo: "رفع الشعار",
    shopName: "اسم المتجر",
    shopAddress: "عنوان المتجر",
    ownerNames: "أسماء المالكين",
    addOwnerName: "إضافة اسم المالك",
    phoneNumbers: "أرقام الهاتف",
    addPhoneNumber: "إضافة رقم هاتف",
    thankYouMessage: "رسالة الشكر",
    footerMessage: "رسالة التذييل",
    workerName: "اسم العامل (على الإيصال)",
    workerPhone: "هاتف العامل (على الإيصال)",
    selectLanguage: "اختر اللغة",
    selectTimezone: "اختر المنطقة الزمنية",
    saveGeneralSettings: "حفظ الإعدادات العامة",
    saveReceiptSettings: "حفظ إعدادات الإيصال",
    saveSettings: "حفظ الإعدادات",
    saveProfile: "حفظ الملف الشخصي",
    
    // Profile
    fullName: "الاسم الكامل",
    email: "البريد الإلكتروني",
    phoneNumber: "رقم الهاتف",
    
    // Invoice
    items: "العناصر",
    total: "المجموع",
    invoiceDate: "تاريخ الفاتورة",
    paymentMethod: "طريقة الدفع",
    cash: "نقدي",
    card: "بطاقة",
    online: "عبر الإنترنت",
    credit: "ائتمان",
    discount: "خصم",
    paidAmount: "المبلغ المدفوع (اختياري)",
    fullPayment: "الدفع الكامل",
    leaveEmptyForFullPayment: "اترك فارغاً للدفع الكامل",
    saveAndPrint: "حفظ وطباعة",
    customerName: "اسم العميل",
    customerPhone: "هاتف العميل",
    selectProduct: "اختر المنتج",
    quantity: "الكمية",
    price: "السعر",
    subtotal: "المجموع الفرعي",
    netTotal: "الصافي",
    totalCost: "التكلفة الإجمالية",
    totalProfit: "الربح الإجمالي",
    finalTotal: "المجموع النهائي",
    paid: "مدفوع",
    due: "مستحق",
    
    // Inventory
    addProduct: "إضافة منتج",
    productName: "اسم المنتج",
    category: "الفئة",
    purchasePrice: "سعر الشراء",
    sellingPrice: "سعر البيع",
    stockQuantity: "كمية المخزون",
    quantityType: "نوع الكمية",
    supplier: "المورد",
    sku: "SKU",
    description: "الوصف",
    lowStock: "مخزون منخفض",
    outOfStock: "نفد المخزون",
    inStock: "متوفر",
    
    // Credits
    addCredit: "إضافة ائتمان",
    creditAmount: "مبلغ الائتمان",
    remainingAmount: "المبلغ المتبقي",
    dueDate: "تاريخ الاستحقاق",
    status: "الحالة",
    notes: "ملاحظات",
    paymentReceived: "تم استلام الدفع",
    markAsPaid: "تحديد كمدفوع",
    
    // Customers
    addCustomer: "إضافة عميل",
    customerDetails: "تفاصيل العميل",
    totalPurchases: "إجمالي المشتريات",
    lastPurchase: "آخر عملية شراء",
    
    // Expenses
    addExpense: "إضافة مصروف",
    expenseType: "نوع المصروف",
    amount: "المبلغ",
    date: "التاريخ",
    rent: "الإيجار",
    utilities: "المرافق",
    salaries: "الرواتب",
    supplies: "اللوازم",
    other: "أخرى",
    
    // Workers
    addWorker: "إضافة عامل",
    workerDetails: "تفاصيل العامل",
    permissions: "الصلاحيات",
    role: "الدور",
    admin: "مدير",
    worker: "عامل",
    
    // Dashboard
    todaySales: "مبيعات اليوم",
    weeklySales: "المبيعات الأسبوعية",
    monthlySales: "المبيعات الشهرية",
    totalCustomers: "إجمالي العملاء",
    totalProducts: "إجمالي المنتجات",
    pendingCredits: "الائتمان المعلق",
    topProducts: "أفضل المنتجات",
    topCustomers: "أفضل العملاء",
    recentSales: "المبيعات الأخيرة",
    salesOverview: "نظرة عامة على المبيعات",
    profitOverview: "نظرة عامة على الأرباح",
    
    // Messages
    savedSuccessfully: "تم الحفظ بنجاح!",
    deletedSuccessfully: "تم الحذف بنجاح!",
    errorOccurred: "حدث خطأ",
    confirmDelete: "هل أنت متأكد أنك تريد الحذف؟",
    noPermission: "ليس لديك صلاحية لهذا الإجراء",
    
    // Receipt
    billNo: "رقم الفاتورة",
    invoiceNo: "رقم الإيصال",
    item: "العنصر",
    qty: "الكمية",
    
    // Time
    today: "اليوم",
    yesterday: "أمس",
    thisWeek: "هذا الأسبوع",
    thisMonth: "هذا الشهر",
    lastMonth: "الشهر الماضي",
    custom: "مخصص",
    
    // Actions
    actions: "الإجراءات",
    moreOptions: "المزيد من الخيارات",
  },
  hi: {
    // Navigation
    dashboard: "डैशबोर्ड",
    newInvoice: "नया इनवॉइस",
    inventory: "इन्वेंटरी",
    salesHistory: "बिक्री इतिहास",
    credits: "उधार",
    creditManagement: "उधार प्रबंधन",
    receivePayment: "भुगतान प्राप्त करें",
    expenses: "खर्च",
    customers: "ग्राहक",
    manageWorkers: "कर्मचारी प्रबंधन",
    settings: "सेटिंग्स",
    logout: "लॉगआउट",
    collapse: "समेटें",
    
    // Common
    save: "सहेजें",
    cancel: "रद्द करें",
    delete: "हटाएं",
    edit: "संपादित करें",
    add: "जोड़ें",
    search: "खोजें",
    filter: "फ़िल्टर",
    export: "निर्यात",
    import: "आयात",
    loading: "लोड हो रहा है...",
    noData: "कोई डेटा नहीं मिला",
    confirm: "पुष्टि करें",
    back: "वापस",
    next: "अगला",
    submit: "जमा करें",
    reset: "रीसेट",
    close: "बंद करें",
    view: "देखें",
    print: "प्रिंट",
    download: "डाउनलोड",
    upload: "अपलोड",
    select: "चुनें",
    all: "सभी",
    none: "कोई नहीं",
    yes: "हाँ",
    no: "नहीं",
    active: "सक्रिय",
    inactive: "निष्क्रिय",
    pending: "लंबित",
    completed: "पूर्ण",
    
    // Settings
    generalSettings: "सामान्य सेटिंग्स",
    receiptSettings: "रसीद सेटिंग्स",
    languageSettings: "भाषा और समय क्षेत्र सेटिंग्स",
    profileSettings: "प्रोफाइल सेटिंग्स",
    appName: "ऐप का नाम",
    appDescription: "ऐप का विवरण",
    uploadLogo: "लोगो अपलोड करें",
    shopName: "दुकान का नाम",
    shopAddress: "दुकान का पता",
    ownerNames: "मालिक के नाम",
    addOwnerName: "मालिक का नाम जोड़ें",
    phoneNumbers: "फोन नंबर",
    addPhoneNumber: "फोन नंबर जोड़ें",
    thankYouMessage: "धन्यवाद संदेश",
    footerMessage: "फुटर संदेश",
    workerName: "कर्मचारी का नाम (रसीद पर)",
    workerPhone: "कर्मचारी का फोन (रसीद पर)",
    selectLanguage: "भाषा चुनें",
    selectTimezone: "समय क्षेत्र चुनें",
    saveGeneralSettings: "सामान्य सेटिंग्स सहेजें",
    saveReceiptSettings: "रसीद सेटिंग्स सहेजें",
    saveSettings: "सेटिंग्स सहेजें",
    saveProfile: "प्रोफाइल सहेजें",
    
    // Profile
    fullName: "पूरा नाम",
    email: "ईमेल",
    phoneNumber: "फोन नंबर",
    
    // Invoice
    items: "आइटम",
    total: "कुल",
    invoiceDate: "इनवॉइस तारीख",
    paymentMethod: "भुगतान विधि",
    cash: "नकद",
    card: "कार्ड",
    online: "ऑनलाइन",
    credit: "उधार",
    discount: "छूट",
    paidAmount: "भुगतान राशि (वैकल्पिक)",
    fullPayment: "पूर्ण भुगतान",
    leaveEmptyForFullPayment: "पूर्ण भुगतान के लिए खाली छोड़ें",
    saveAndPrint: "सहेजें और प्रिंट करें",
    customerName: "ग्राहक का नाम",
    customerPhone: "ग्राहक का फोन",
    selectProduct: "उत्पाद चुनें",
    quantity: "मात्रा",
    price: "कीमत",
    subtotal: "उपयोग",
    netTotal: "शुद्ध कुल",
    totalCost: "कुल लागत",
    totalProfit: "कुल लाभ",
    finalTotal: "अंतिम कुल",
    paid: "भुगतान किया",
    due: "बकाया",
    
    // Inventory
    addProduct: "उत्पाद जोड़ें",
    productName: "उत्पाद का नाम",
    category: "श्रेणी",
    purchasePrice: "खरीद मूल्य",
    sellingPrice: "बिक्री मूल्य",
    stockQuantity: "स्टॉक मात्रा",
    quantityType: "मात्रा प्रकार",
    supplier: "आपूर्तिकर्ता",
    sku: "SKU",
    description: "विवरण",
    lowStock: "कम स्टॉक",
    outOfStock: "स्टॉक खत्म",
    inStock: "स्टॉक में",
    
    // Credits
    addCredit: "उधार जोड़ें",
    creditAmount: "उधार राशि",
    remainingAmount: "शेष राशि",
    dueDate: "अंतिम तिथि",
    status: "स्थिति",
    notes: "नोट्स",
    paymentReceived: "भुगतान प्राप्त",
    markAsPaid: "भुगतान के रूप में चिह्नित करें",
    
    // Customers
    addCustomer: "ग्राहक जोड़ें",
    customerDetails: "ग्राहक विवरण",
    totalPurchases: "कुल खरीदारी",
    lastPurchase: "अंतिम खरीदारी",
    
    // Expenses
    addExpense: "खर्च जोड़ें",
    expenseType: "खर्च का प्रकार",
    amount: "राशि",
    date: "तारीख",
    rent: "किराया",
    utilities: "उपयोगिताएं",
    salaries: "वेतन",
    supplies: "सप्लाई",
    other: "अन्य",
    
    // Workers
    addWorker: "कर्मचारी जोड़ें",
    workerDetails: "कर्मचारी विवरण",
    permissions: "अनुमतियाँ",
    role: "भूमिका",
    admin: "एडमिन",
    worker: "कर्मचारी",
    
    // Dashboard
    todaySales: "आज की बिक्री",
    weeklySales: "साप्ताहिक बिक्री",
    monthlySales: "मासिक बिक्री",
    totalCustomers: "कुल ग्राहक",
    totalProducts: "कुल उत्पाद",
    pendingCredits: "लंबित उधार",
    topProducts: "शीर्ष उत्पाद",
    topCustomers: "शीर्ष ग्राहक",
    recentSales: "हाल की बिक्री",
    salesOverview: "बिक्री अवलोकन",
    profitOverview: "लाभ अवलोकन",
    
    // Messages
    savedSuccessfully: "सफलतापूर्वक सहेजा गया!",
    deletedSuccessfully: "सफलतापूर्वक हटाया गया!",
    errorOccurred: "एक त्रुटि हुई",
    confirmDelete: "क्या आप वाकई हटाना चाहते हैं?",
    noPermission: "आपको इस कार्य की अनुमति नहीं है",
    
    // Receipt
    billNo: "बिल नंबर",
    invoiceNo: "इनवॉइस नंबर",
    item: "आइटम",
    qty: "मात्रा",
    
    // Time
    today: "आज",
    yesterday: "कल",
    thisWeek: "इस सप्ताह",
    thisMonth: "इस महीने",
    lastMonth: "पिछले महीने",
    custom: "कस्टम",
    
    // Actions
    actions: "क्रियाएं",
    moreOptions: "अधिक विकल्प",
  },
  // Add more languages as needed - using English as fallback
  es: {} as typeof translations.en,
  fr: {} as typeof translations.en,
  de: {} as typeof translations.en,
  zh: {} as typeof translations.en,
  pt: {} as typeof translations.en,
  tr: {} as typeof translations.en,
  ru: {} as typeof translations.en,
  ja: {} as typeof translations.en,
  ko: {} as typeof translations.en,
  it: {} as typeof translations.en,
  nl: {} as typeof translations.en,
  pl: {} as typeof translations.en,
  th: {} as typeof translations.en,
  vi: {} as typeof translations.en,
  id: {} as typeof translations.en,
  ms: {} as typeof translations.en,
  bn: {} as typeof translations.en,
  pa: {} as typeof translations.en,
  fa: {} as typeof translations.en,
  sw: {} as typeof translations.en,
  ta: {} as typeof translations.en,
  te: {} as typeof translations.en,
  mr: {} as typeof translations.en,
  gu: {} as typeof translations.en,
  kn: {} as typeof translations.en,
  ml: {} as typeof translations.en,
  uk: {} as typeof translations.en,
  ro: {} as typeof translations.en,
  el: {} as typeof translations.en,
  cs: {} as typeof translations.en,
  sv: {} as typeof translations.en,
  hu: {} as typeof translations.en,
  he: {} as typeof translations.en,
  fi: {} as typeof translations.en,
  no: {} as typeof translations.en,
  da: {} as typeof translations.en,
};

interface LanguageContextType {
  language: string;
  setLanguage: (lang: string) => void;
  t: (key: TranslationKey) => string;
  dir: "ltr" | "rtl";
  loading: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguageState] = useState("en");
  const [loading, setLoading] = useState(true);
  const [ownerId, setOwnerId] = useState<string | null>(null);

  useEffect(() => {
    const loadUserAndLanguage = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          return;
        }

        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role, admin_id")
          .eq("user_id", user.id)
          .single();

        const resolvedOwnerId = roleData?.role === "admin" ? user.id : roleData?.admin_id;
        setOwnerId(resolvedOwnerId || null);

        if (resolvedOwnerId) {
          const { data } = await supabase
            .from("app_settings")
            .select("language")
            .eq("owner_id", resolvedOwnerId)
            .maybeSingle();
          
          if (data?.language) {
            setLanguageState(data.language);
            // Update document direction
            const langConfig = LANGUAGES.find(l => l.code === data.language);
            if (langConfig) {
              document.documentElement.dir = langConfig.dir;
              document.documentElement.lang = data.language;
            }
          }
        }
      } catch (error) {
        console.error("Error loading language:", error);
      } finally {
        setLoading(false);
      }
    };
    
    loadUserAndLanguage();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      loadUserAndLanguage();
    });

    return () => subscription.unsubscribe();
  }, []);

  const setLanguage = async (lang: string) => {
    setLanguageState(lang);
    
    // Update document direction
    const langConfig = LANGUAGES.find(l => l.code === lang);
    if (langConfig) {
      document.documentElement.dir = langConfig.dir;
      document.documentElement.lang = lang;
    }
    
    if (!ownerId) return;
    
    try {
      await supabase
        .from("app_settings")
        .update({ language: lang } as any)
        .eq("owner_id", ownerId);
    } catch (error) {
      console.error("Error saving language:", error);
    }
  };

  const t = (key: TranslationKey): string => {
    const langTranslations = translations[language as keyof typeof translations] || translations.en;
    return langTranslations[key] || translations.en[key] || key;
  };

  const dir = LANGUAGES.find(l => l.code === language)?.dir === "rtl" ? "rtl" : "ltr";

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, dir, loading }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};

export default LanguageContext;
