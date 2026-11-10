/**
 * FreshNest Poultry Farm - Database Schema Architecture
 * Designed for IndexedDB via Dexie.js
 * 
 * Supports all 13 core modules:
 * 1. Dashboard (aggregations derived from module tables)
 * 2. Bird Management
 * 3. Batch Management
 * 4. Feed Management
 * 5. Medication
 * 6. Vaccination
 * 7. Egg Production
 * 8. Mortality
 * 9. Sales
 * 10. Expenses
 * 11. Inventory
 * 12. Reports (generated from ledger tables)
 * 13. Settings
 */

export const DB_NAME = 'freshnest_poultry_db';
export const DB_VERSION = 12;

export const SCHEMA_V1 = {
  // 1. Birds Table (Individual bird tracking for breeders / valuable stock)
  birds: '++id, tagNumber, breed, type, houseNumber, status, hatchDate, createdAt',

  // 2. Batches Table (Flock & cohort tracking)
  batches: '++id, batchCode, birdType, breed, initialCount, currentCount, arrivalDate, status, houseId, createdAt',

  // 3. Feeds Table (Feed catalog & formulas)
  feeds: '++id, name, type, brand, unit, currentStock, reorderLevel, createdAt',

  // Feed Consumption Logs
  feedLogs: '++id, batchId, feedId, quantity, date, recordedBy, createdAt',

  // 4. Medications Table
  medications: '++id, name, type, targetDisease, dosage, withdrawalDays, currentStock, unit, expiryDate, createdAt',

  // Medication Administration Logs
  medicationLogs: '++id, batchId, medicationId, dosageGiven, administeredDate, withdrawalEndDate, administeredBy, createdAt',

  // 5. Vaccines Table
  vaccines: '++id, name, targetDisease, administrationMethod, recommendedAgeDays, currentStock, expiryDate, createdAt',

  // Vaccination Schedule & Logs
  vaccinationLogs: '++id, batchId, vaccineId, scheduledDate, administeredDate, status, administeredBy, createdAt',

  // 6. Egg Production Logs
  eggLogs: '++id, batchId, date, goodEggs, crackedEggs, dirtyEggs, totalEggs, collectedBy, createdAt',

  // 7. Mortality & Culling Records
  mortalityLogs: '++id, batchId, date, count, cause, disposedMethod, recordedBy, createdAt',

  // 8. Sales Transactions
  sales: '++id, invoiceNumber, customerName, itemType, quantity, unit, unitPrice, totalAmount, paymentStatus, saleDate, createdAt',

  // 9. Farm Expenses
  expenses: '++id, category, itemDescription, amount, paymentMethod, paidTo, expenseDate, receiptNumber, recordedBy, createdAt',

  // 10. General Farm Inventory
  inventory: '++id, itemName, category, sku, currentQuantity, unit, unitCost, minimumThreshold, location, lastUpdated',

  // 11. Farm Configuration & System Settings
  farmSettings: 'key, value, updatedAt',

  // 12. Offline Audit & Sync Queue
  syncLogs: '++id, module, action, recordId, timestamp, status',
};

/**
 * Version 2 Schema - Introduces Local Administrator Authentication
 */
export const SCHEMA_V2 = {
  ...SCHEMA_V1,
  // Administrators Table (PBKDF2 encrypted credentials and local admin account)
  administrators: '++id, username, fullName, status, createdAt',
};

/**
 * Version 3 Schema - Module 03 Bird Management
 * Indexed fields for individual bird registry, tag lookups, lineage and status queries
 */
export const SCHEMA_V3 = {
  ...SCHEMA_V2,
  birds: '++id, birdId, tagNumber, name, type, breed, gender, batchId, houseNumber, status, hatchDate, createdAt',
};

/**
 * Version 4 Schema - Module 04 Batch & Pen Management
 * Dedicated pens table for housing capacity and expanded cohort batch indexes
 */
export const SCHEMA_V4 = {
  ...SCHEMA_V3,
  batches: '++id, batchId, batchCode, birdType, breed, initialCount, currentCount, arrivalDate, status, houseId, penId, supplier, expectedMarketDate, createdAt',
  pens: '++id, penId, name, type, capacity, status, location, createdAt',
};

/**
 * Version 5 Schema - Module 05 Feed Management
 * Dedicated feedPurchases ledger for stock-in, enhanced feeds catalog with nutritional & cost indexes,
 * and structured feedLogs for flock feeding sessions and FCR calculations
 */
export const SCHEMA_V5 = {
  ...SCHEMA_V4,
  feeds: '++id, feedId, name, type, brand, form, unit, currentStock, reorderLevel, status, expiryDate, createdAt',
  feedPurchases: '++id, purchaseId, feedId, supplier, purchaseDate, invoiceNumber, createdAt',
  feedLogs: '++id, logId, batchId, feedId, date, session, recordedBy, createdAt',
};

/**
 * Version 6 Schema - Module 06 Medication Management
 * Comprehensive pharmacy inventory, stock-in purchases, treatment logs with batch/bird association,
 * biosecurity expiration tracking, and food safety withdrawal period indexes
 */
export const SCHEMA_V6 = {
  ...SCHEMA_V5,
  medications: '++id, medicationId, name, type, activeIngredient, route, unit, currentStock, reorderLevel, status, expiryDate, withdrawalPeriodDays, createdAt',
  medicationPurchases: '++id, purchaseId, medicationId, supplier, purchaseDate, invoiceNumber, createdAt',
  medicationLogs: '++id, logId, birdId, batchId, medicationId, date, status, withdrawalEndDate, administeredBy, createdAt',
};

/**
 * Version 7 Schema - Module 07 Vaccination Management
 * Dedicated vaccines catalog, vaccinePurchases ledger, vaccinationSchedules calendar,
 * and comprehensive flock/bird vaccinationLogs with cold chain monitoring indexes
 */
export const SCHEMA_V7 = {
  ...SCHEMA_V6,
  vaccines: '++id, vaccineId, name, targetDisease, vaccineType, administrationMethod, recommendedAgeDays, unit, currentStock, reorderLevel, status, expiryDate, createdAt',
  vaccinePurchases: '++id, purchaseId, vaccineId, supplier, purchaseDate, invoiceNumber, createdAt',
  vaccinationSchedules: '++id, scheduleId, batchId, vaccineId, scheduledDate, status, assignedStaff, createdAt',
  vaccinationLogs: '++id, logId, scheduleId, batchId, birdId, vaccineId, administeredDate, status, administeredBy, createdAt',
};

/**
 * Version 8 Schema - Module 08 Egg Production Management
 * Daily egg collection records with period splits (morning, afternoon, evening),
 * defect tracking, quality grading breakdowns, and atomic egg inventory stock tracking.
 */
export const SCHEMA_V8 = {
  ...SCHEMA_V7,
  eggLogs: '++id, logId, batchId, collectionDate, date, totalCollected, recordedBy, createdAt',
  eggInventory: '++id, movementId, movementType, grade, referenceId, movementDate, createdAt',
};

/**
 * Version 9 Schema - Module 09 Mortality Management
 * Comprehensive death & culling tracking for batches and individual birds,
 * cause classification, biosecurity disposal logging, and flock survival indexes.
 */
export const SCHEMA_V9 = {
  ...SCHEMA_V8,
  mortalityLogs: '++id, mortalityId, logId, batchId, birdId, date, mortalityDate, cause, penId, recordType, recordedBy, createdAt',
};

/**
 * Version 10 Schema - Module 10 Sales & Revenue Management
 * Point of sale for live birds (batches & individual), table eggs (crates & loose),
 * dedicated payments ledger, customer accounts, and revenue tracking.
 */
export const SCHEMA_V10 = {
  ...SCHEMA_V9,
  sales: '++id, saleId, invoiceNumber, customerName, customerPhone, productType, itemType, paymentStatus, paymentMethod, saleDate, date, status, recordedBy, createdAt',
  payments: '++id, paymentId, saleId, paymentMethod, paymentDate, date, recordedBy, createdAt',
};

/**
 * Version 11 Schema - Module 11 Expenses Management
 * Operational expense tracking, category breakdown, dedicated expense payments ledger,
 * purchase integration with stock-in feeds/meds/vaccines, and cash outflow tracking.
 */
export const SCHEMA_V11 = {
  ...SCHEMA_V10,
  expenses: '++id, expenseId, category, expenseDate, date, paidTo, supplier, paymentStatus, paymentMethod, batchId, penId, linkedPurchaseType, linkedPurchaseId, status, recordedBy, createdAt',
  expensePayments: '++id, paymentId, expenseId, paymentDate, date, paymentMethod, status, recordedBy, createdAt',
  expenseCategories: '++id, name, isDefault, createdAt',
};

/**
 * Version 12 Schema - Module 12 General Inventory Management
 * Comprehensive catalog for general farm supplies, tools, equipment, packaging, consumables;
 * atomic stock-in/stock-out, paired location transfers, biosecurity expiration tracking,
 * and immutable stock movement audit ledger.
 */
export const SCHEMA_V12 = {
  ...SCHEMA_V11,
  inventory: '++id, itemId, itemName, name, category, sku, status, storageLocation, location, supplier, expiryDate, reorderLevel, minimumStockLevel, createdAt, updatedAt',
  inventoryMovements: '++id, movementId, itemId, movementType, date, movementDate, quantity, previousBalance, newBalance, storageLocation, toLocation, fromLocation, reason, referenceNumber, recordedBy, batchId, penId, createdAt',
  inventoryCategories: '++id, name, isDefault, createdAt',
};
