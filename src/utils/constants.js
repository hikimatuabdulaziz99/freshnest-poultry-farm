/**
 * FreshNest Poultry Farm - Global Constants & Module Registry
 */

export const APP_INFO = {
  name: 'FreshNest Poultry Farm',
  shortName: 'FreshNest',
  tagline: 'Smart Management for Healthy Poultry Farming',
  version: '1.0.0-foundation',
  databaseEngine: 'IndexedDB / Dexie.js (Offline-First)',
};

export const MODULE_CATEGORIES = {
  CORE: 'Core Operations',
  HEALTH: 'Flock Health & Care',
  FINANCE: 'Financials & Stock',
  SYSTEM: 'Analytics & Setup',
};

export const APP_MODULES = [
  // 1. Dashboard
  {
    id: 'dashboard',
    label: 'Dashboard',
    category: MODULE_CATEGORIES.CORE,
    icon: 'LayoutDashboard',
    path: '/dashboard',
    description: 'Real-time overview of flock health, production statistics, and quick farm metrics.',
    associatedTables: ['batches', 'eggLogs', 'mortalityLogs', 'sales', 'expenses'],
    futureCapabilities: [
      'Active flock population counter',
      'Daily egg yield percentage & trends',
      'Mortality threshold alerts',
      'Cashflow & weekly profit overview',
    ],
  },
  // 2. Bird Management
  {
    id: 'birds',
    label: 'Bird Management',
    category: MODULE_CATEGORIES.CORE,
    icon: 'Bird',
    path: '/birds',
    description: 'Individual bird registry, tag indexing, breed profiling, and parent lineage tracking.',
    associatedTables: ['birds'],
    futureCapabilities: [
      'Wing tag and leg band tracking',
      'Breed genetics and pedigree indexing',
      'Individual health records',
      'Breeder bird culling assessments',
    ],
  },
  // 3. Batch & Pen Management
  {
    id: 'batches',
    label: 'Batch & Pen Management',
    category: MODULE_CATEGORIES.CORE,
    icon: 'Layers',
    path: '/batches',
    description: 'Cohort tracking from day-old chick arrival to harvest, and pen housing management with capacity limits.',
    associatedTables: ['batches', 'pens'],
    futureCapabilities: [
      'Flock stage progression (Brooding, Grower, Layer, Broiler)',
      'Pen and house placement assignments with strict capacity checks',
      'Target vs actual growth curves',
      'Batch closure, archiving, and profitability analysis',
    ],
  },
  // 4. Feed Management
  {
    id: 'feed',
    label: 'Feed Management',
    category: MODULE_CATEGORIES.HEALTH,
    icon: 'Wheat',
    path: '/feed',
    description: 'Feed inventory stock levels, ration formulations, and daily consumption per bird.',
    associatedTables: ['feeds', 'feedLogs', 'feedPurchases'],
    futureCapabilities: [
      'Feed Conversion Ratio (FCR) auto-calculation',
      'Bag stock and mill batch tracking',
      'Daily feeding schedules and alerts',
      'Feed cost per bird analysis',
    ],
  },
  // 5. Medication
  {
    id: 'medication',
    label: 'Medication',
    category: MODULE_CATEGORIES.HEALTH,
    icon: 'Pill',
    path: '/medication',
    description: 'Pharmaceutical administration, treatment regimens, and mandatory withdrawal period tracking.',
    associatedTables: ['medications', 'medicationLogs', 'medicationPurchases'],
    futureCapabilities: [
      'Active withdrawal period countdown & warning banners',
      'Dosage calculation per 1,000 birds',
      'Disease outbreak treatment history',
      'Drug inventory expiration alerts',
    ],
  },
  // 6. Vaccination
  {
    id: 'vaccination',
    label: 'Vaccination',
    category: MODULE_CATEGORIES.HEALTH,
    icon: 'Syringe',
    path: '/vaccination',
    description: 'Standard immunisation schedules, cold chain records, and scheduled vaccination alerts.',
    associatedTables: ['vaccines', 'vaccinationLogs', 'vaccinePurchases', 'vaccinationSchedules'],
    futureCapabilities: [
      'Automated Marek, Newcastle, Gumboro, and Fowl Pox schedules',
      'Scheduled due date calendar notifications',
      'Batch immunity coverage records',
      'Vaccine batch and vial expiration tracking',
    ],
  },
  // 7. Egg Production
  {
    id: 'eggs',
    label: 'Egg Production',
    category: MODULE_CATEGORIES.HEALTH,
    icon: 'Egg',
    path: '/eggs',
    description: 'Daily collection logs, grading (clean, dirty, cracked), crate packing, and laying percentages.',
    associatedTables: ['eggLogs'],
    futureCapabilities: [
      'Hen-Day Production (HDP) calculation',
      'Grade A, B, and reject sorting analytics',
      'Tray and crate inventory updates',
      'Peak lay curve benchmark comparison',
    ],
  },
  // 8. Mortality
  {
    id: 'mortality',
    label: 'Mortality',
    category: MODULE_CATEGORIES.HEALTH,
    icon: 'ActivitySquare',
    path: '/mortality',
    description: 'Death logs, culling records, post-mortem notes, and bio-security disposal tracking.',
    associatedTables: ['mortalityLogs', 'batches'],
    futureCapabilities: [
      'Batch survival rate calculation',
      'Bio-hazard cause analysis & autopsy notes',
      'Spike rate warnings exceeding standard threshold',
      'Sanitary disposal protocol logging',
    ],
  },
  // 9. Sales
  {
    id: 'sales',
    label: 'Sales',
    category: MODULE_CATEGORIES.FINANCE,
    icon: 'ShoppingBag',
    path: '/sales',
    description: 'Point of sale for live birds, dressed chicken, crates of eggs, and organic manure.',
    associatedTables: ['sales'],
    futureCapabilities: [
      'Direct customer invoicing & receipt generation',
      'Wholesale crate and retail pricing tiers',
      'Payment terms (Cash, Transfer, Credit)',
      'Sales channel revenue breakdown',
    ],
  },
  // 10. Expenses
  {
    id: 'expenses',
    label: 'Expenses',
    category: MODULE_CATEGORIES.FINANCE,
    icon: 'Receipt',
    path: '/expenses',
    description: 'Farm operational expenditure, utility bills, veterinary fees, staff wages, and supplies.',
    associatedTables: ['expenses'],
    futureCapabilities: [
      'Category-based expense allocation',
      'Receipt attachment and vendor ledger',
      'Cost per bird / cost per egg tracking',
      'Monthly operating expenditure forecasting',
    ],
  },
  // 11. Inventory
  {
    id: 'inventory',
    label: 'Inventory',
    category: MODULE_CATEGORIES.FINANCE,
    icon: 'Boxes',
    path: '/inventory',
    description: 'Equipment, spare parts, drinker nipples, bedding materials, and farm supplies.',
    associatedTables: ['inventory'],
    futureCapabilities: [
      'Low stock automated reorder thresholds',
      'Tool checkout and equipment asset lifecycle',
      'Bio-security sanitizers & disinfectant logs',
      'Warehouse bin and storage locations',
    ],
  },
  // 12. Reports
  {
    id: 'reports',
    label: 'Reports',
    category: MODULE_CATEGORIES.SYSTEM,
    icon: 'FileBarChart',
    path: '/reports',
    description: 'Production summaries, financial ledgers, flock performance audits, and exportable reports.',
    associatedTables: ['batches', 'sales', 'expenses', 'eggLogs', 'mortalityLogs'],
    futureCapabilities: [
      'Comprehensive PDF / CSV farm exports',
      'Flock end-of-cycle performance report',
      'Profit & Loss ledger',
      'Auditor & veterinary compliance exports',
    ],
  },
  // 13. Settings
  {
    id: 'settings',
    label: 'Settings',
    category: MODULE_CATEGORIES.SYSTEM,
    icon: 'SlidersHorizontal',
    path: '/settings',
    description: 'Farm profile, measurement units, notification rules, backup & restore, and system diagnostics.',
    associatedTables: ['farmSettings'],
    futureCapabilities: [
      'Offline IndexedDB full database backup & restore',
      'Farm name, address, and currency configuration',
      'House/pen definitions & capacity limits',
      'System diagnostics & storage space cleaner',
    ],
  },
];
