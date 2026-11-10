import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import {
  SCHEMA_V1,
  SCHEMA_V2,
  SCHEMA_V3,
  SCHEMA_V4,
  SCHEMA_V5,
  SCHEMA_V6,
  DB_NAME,
  DB_VERSION,
} from '../src/database/schema.js';
import {
  medicationService,
  MEDICATION_TYPES,
  ADMINISTRATION_ROUTES,
  MEDICATION_UNITS,
  MEDICATION_STATUSES,
  computeMedicationStatus,
  calculateWithdrawalEndDate,
} from '../src/services/medicationService.js';
import { batchService } from '../src/services/batchService.js';
import { penService } from '../src/services/penService.js';
import { birdService } from '../src/services/birdService.js';
import { db } from '../src/database/db.js';

let passedTests = 0;
let failedTests = 0;

function assert(condition, testName, details = '') {
  if (condition) {
    console.log(`  [PASS] ${testName}`);
    passedTests++;
  } else {
    console.error(`  [FAIL] ${testName} ${details ? '- ' + details : ''}`);
    failedTests++;
  }
}

async function runAudit() {
  console.log('====================================================');
  console.log(' FRESHNEST POULTRY FARM: MODULE 06 AUDIT & TESTS');
  console.log('====================================================\n');

  // -----------------------------------------------------------------
  // TEST 1: DATABASE SCHEMA MIGRATION (V1 -> V2 -> V3 -> V4 -> V5 -> V6)
  // -----------------------------------------------------------------
  console.log('>>> TEST 1: Database Migration & Schema V6 Preservation');
  const migDbName = 'test_freshnest_v6_migration_db';

  // Create V1 DB
  let migDb = new Dexie(migDbName);
  migDb.version(1).stores(SCHEMA_V1);
  await migDb.open();
  await migDb.birds.add({ tagNumber: 'V1-BIRD', breed: 'Isa Brown', status: 'Active' });
  await migDb.batches.add({ batchCode: 'V1-BATCH', initialCount: 200, status: 'Active' });
  await migDb.feeds.add({ name: 'V1 Mash', type: 'Layer Mash', currentStock: 50 });
  await migDb.medications.add({ name: 'V1 Tylosin', type: 'Antibiotic', currentStock: 10 });
  await migDb.close();

  // Upgrade through V2, V3, V4, V5 to V6
  migDb = new Dexie(migDbName);
  migDb.version(1).stores(SCHEMA_V1);
  migDb.version(2).stores(SCHEMA_V2);
  migDb.version(3).stores(SCHEMA_V3);
  migDb.version(4).stores(SCHEMA_V4);
  migDb.version(5).stores(SCHEMA_V5);
  migDb.version(6).stores(SCHEMA_V6);
  await migDb.open();

  assert(migDb.verno === 6, 'Database successfully upgrades to version 6');
  assert(DB_VERSION >= 6, 'schema.js DB_VERSION constant is set to 6 or higher');

  // Verify preserved data
  const preservedBird = await migDb.birds.where('tagNumber').equals('V1-BIRD').first();
  const preservedBatch = await migDb.batches.where('batchCode').equals('V1-BATCH').first();
  const preservedFeed = await migDb.feeds.where('name').equals('V1 Mash').first();
  const preservedMed = await migDb.medications.where('name').equals('V1 Tylosin').first();

  assert(preservedBird !== undefined, 'V1 Bird record preserved in V6');
  assert(preservedBatch !== undefined, 'V1 Batch record preserved in V6');
  assert(preservedFeed !== undefined, 'V1 Feed record preserved in V6');
  assert(preservedMed !== undefined, 'V1 Medication record preserved in V6');

  // Verify new tables and indexes in V6
  assert(typeof migDb.medicationPurchases !== 'undefined', 'medicationPurchases table is registered in V6');
  assert(typeof migDb.medicationLogs !== 'undefined', 'medicationLogs table is registered in V6');

  await migDb.close();
  await Dexie.delete(migDbName);

  // -----------------------------------------------------------------
  // TEST 2: SEED DATA & CONSTANTS
  // -----------------------------------------------------------------
  console.log('\n>>> TEST 2: Seed Data & Veterinary Constants');
  assert(Array.isArray(MEDICATION_TYPES) && MEDICATION_TYPES.length >= 7, 'Medication types list has standard categories');
  assert(MEDICATION_TYPES.includes('Antibiotic') && MEDICATION_TYPES.includes('Antiparasitic'), 'Includes essential Antibiotic & Antiparasitic types');
  assert(Array.isArray(ADMINISTRATION_ROUTES) && ADMINISTRATION_ROUTES.length >= 6, 'Administration routes list defined');
  assert(Array.isArray(MEDICATION_UNITS) && MEDICATION_UNITS.includes('sachet') && MEDICATION_UNITS.includes('ml'), 'Measurement units include sachet & ml');
  assert(Array.isArray(MEDICATION_STATUSES) && MEDICATION_STATUSES.includes('Expired'), 'Statuses include Expired & Low Stock');

  // Open singleton DB and seed
  await db.open();
  await db.medications.clear();
  await db.medicationPurchases.clear();
  await db.medicationLogs.clear();
  await db.farmSettings.clear();

  await medicationService.seedInitialMedicationsIfEmpty();
  const seededCount = await db.medications.count();
  assert(seededCount >= 7, `Initial medications seeded successfully (${seededCount} items)`);

  const tylodox = await db.medications.where('name').equals('Tylodox Powder Fortified').first();
  assert(tylodox && tylodox.medicationId === 'MED-0001', 'Tylodox seeded with MED-0001');
  assert(tylodox && tylodox.withdrawalPeriodDays === 7, 'Tylodox has 7-day withdrawal period');

  // -----------------------------------------------------------------
  // TEST 3: MONOTONIC ID GENERATION
  // -----------------------------------------------------------------
  console.log('\n>>> TEST 3: Monotonic Sequential ID Generation');
  const nextMedId = await medicationService.generateNextMedicationId();
  assert(/^MED-\d{4}$/.test(nextMedId), `Generated valid Medication ID format: ${nextMedId}`);

  const nextPurId = await medicationService.generateNextPurchaseId();
  assert(/^MPUR-\d{4}$/.test(nextPurId), `Generated valid Purchase ID format: ${nextPurId}`);

  const nextLogId = await medicationService.generateNextLogId();
  assert(/^MLOG-\d{4}$/.test(nextLogId), `Generated valid Treatment Log ID format: ${nextLogId}`);

  // Test sequence preservation after deletion
  const dummyMed = await medicationService.createMedication({
    name: 'Temporary Anthelmintic',
    type: 'Antiparasitic',
    unit: 'sachet',
    currentStock: 5,
    reorderLevel: 2,
    unitPrice: 1500,
    withdrawalPeriodDays: 2,
  });
  const dummyIdStr = dummyMed.medicationId;
  await medicationService.deleteMedication(dummyMed.id);

  const afterDeleteMedId = await medicationService.generateNextMedicationId();
  assert(afterDeleteMedId > dummyIdStr, `Next Medication ID (${afterDeleteMedId}) exceeds deleted ID (${dummyIdStr})`);

  // -----------------------------------------------------------------
  // TEST 4: STATUS COMPUTATION & DATE WITHDRAWAL UTILITIES
  // -----------------------------------------------------------------
  console.log('\n>>> TEST 4: Authoritative Status & Withdrawal End Date Calculations');
  const todayStr = new Date().toISOString().slice(0, 10);
  const pastDate = '2024-01-01';
  const futureDate = '2028-12-31';

  assert(computeMedicationStatus(10, 5, pastDate) === 'Expired', 'Identifies Expired medicine regardless of stock');
  assert(computeMedicationStatus(0, 5, futureDate) === 'Out of Stock', 'Identifies Out of Stock (0 units)');
  assert(computeMedicationStatus(3, 5, futureDate) === 'Low Stock', 'Identifies Low Stock (below threshold)');
  assert(computeMedicationStatus(20, 5, futureDate) === 'In Stock', 'Identifies In Stock (above threshold)');

  // Withdrawal End Date
  const startDate = '2026-11-01';
  const end7Days = calculateWithdrawalEndDate(startDate, 7);
  assert(end7Days === '2026-11-08', `7-day withdrawal from 2026-11-01 ends on 2026-11-08 (got ${end7Days})`);

  const end0Days = calculateWithdrawalEndDate(startDate, 0);
  assert(end0Days === '2026-11-01', `0-day withdrawal ends on the same date (got ${end0Days})`);

  // -----------------------------------------------------------------
  // TEST 5: STOCK-IN / PURCHASE WORKFLOW (ATOMIC REPLENISHMENT)
  // -----------------------------------------------------------------
  console.log('\n>>> TEST 5: Stock-In Purchases & Inventory Replenishment');
  const targetMed = await db.medications.where('medicationId').equals('MED-0001').first();
  const initialStock = Number(targetMed.currentStock);

  const purchaseResult = await medicationService.recordMedicationPurchase({
    medicationId: targetMed.medicationId,
    quantity: 10,
    unitCost: 3500,
    purchaseDate: todayStr,
    supplier: 'Animal Care Konsult Nigeria Ltd',
    invoiceNumber: 'INV-MED-TEST-001',
    lotNumber: 'LOT-TEST-99',
    expiryDate: futureDate,
    notes: 'Audit test stock replenishment',
  });

  assert(purchaseResult.purchaseId.startsWith('MPUR-'), 'Returns valid purchase record with MPUR ID');
  assert(purchaseResult.totalCost === 35000, `Total cost correctly calculated: ₦35,000 (got ${purchaseResult.totalCost})`);

  const updatedMed = await db.medications.get(targetMed.id);
  assert(updatedMed.currentStock === initialStock + 10, `Medication stock incremented atomically from ${initialStock} to ${updatedMed.currentStock}`);

  // Test duplicate invoice prevention
  let dupInvoiceBlocked = false;
  try {
    await medicationService.recordMedicationPurchase({
      medicationId: targetMed.medicationId,
      quantity: 5,
      unitCost: 3500,
      purchaseDate: todayStr,
      supplier: 'Animal Care Konsult Nigeria Ltd',
      invoiceNumber: 'INV-MED-TEST-001',
    });
  } catch (err) {
    dupInvoiceBlocked = true;
  }
  assert(dupInvoiceBlocked, 'Rejects duplicate invoice number from same supplier');

  // -----------------------------------------------------------------
  // TEST 6: TREATMENT ADMINISTRATION (STOCK-OUT & BIOSECURITY CHECKS)
  // -----------------------------------------------------------------
  console.log('\n>>> TEST 6: Treatment Administration, Stock-Out, & Safeguards');

  // Setup a test pen, batch, and bird
  const testPen = await penService.createPen({
    name: 'Medical Quarantine Bay',
    type: 'Brooder',
    capacity: 500,
    location: 'North Wing',
  });

  const testBatch = await batchService.createBatch({
    name: 'Audit Broiler Cohort',
    birdType: 'Broiler',
    breed: 'Cobb 500',
    initialCount: 250,
    arrivalDate: todayStr,
    penId: testPen.id,
    supplier: 'Zartech Hatchery',
  });

  const testBird = await birdService.createBird({
    tagNumber: 'MED-BIRD-001',
    name: 'Breeder Hen #1',
    type: 'Layer',
    breed: 'Lohmann Brown',
    gender: 'Female',
    status: 'Active',
    houseNumber: 'Pen 1',
    hatchDate: '2026-01-01',
  });

  // Administer to batch
  const preTreatStock = updatedMed.currentStock;
  const treatmentResult = await medicationService.administerMedication({
    targetType: 'batch',
    batchId: testBatch.batchId,
    medicationId: targetMed.medicationId,
    quantity: 2,
    dosageGiven: '2 sachets in 200L water',
    route: 'Oral / Drinking Water',
    reason: 'Mild rales and respiratory stress',
    administeredDate: todayStr,
    administeredBy: 'Dr. Alabi (Veterinary Officer)',
    withdrawalPeriodDays: 7,
  });

  assert(treatmentResult.logId.startsWith('MLOG-'), 'Returns valid treatment log with MLOG ID');
  assert(treatmentResult.withdrawalEndDate === calculateWithdrawalEndDate(todayStr, 7), 'Withdrawal end date correctly logged');

  const afterTreatMed = await db.medications.get(targetMed.id);
  assert(afterTreatMed.currentStock === preTreatStock - 2, `Medication stock decremented atomically to ${afterTreatMed.currentStock}`);

  // Test Negative Stock Prevention
  let insStockBlocked = false;
  try {
    await medicationService.administerMedication({
      targetType: 'batch',
      batchId: testBatch.batchId,
      medicationId: targetMed.medicationId,
      quantity: 99999, // excessive amount
      administeredDate: todayStr,
      administeredBy: 'Operator',
    });
  } catch (err) {
    insStockBlocked = err.message.includes('Insufficient stock');
  }
  assert(insStockBlocked, 'Rejects treatment when requested quantity exceeds available stock');

  // Test Biosecurity Safeguard: Expired Medication Block
  const expiredMed = await medicationService.createMedication({
    name: 'Expired Chloramphenicol Tincture',
    type: 'Antibiotic',
    unit: 'bottle',
    currentStock: 10,
    reorderLevel: 2,
    unitPrice: 2000,
    expiryDate: '2024-05-01', // expired
    withdrawalPeriodDays: 14,
  });

  let expiredBlocked = false;
  try {
    await medicationService.administerMedication({
      targetType: 'bird',
      birdId: testBird.birdId,
      medicationId: expiredMed.medicationId,
      quantity: 1,
      administeredDate: todayStr,
      administeredBy: 'Staff',
    });
  } catch (err) {
    expiredBlocked = err.isExpiredBlock === true || err.message.includes('expired');
  }
  assert(expiredBlocked, 'Biosecurity block prevents administering expired medication by default');

  // Test Emergency Override of Expired Medication
  const overrideResult = await medicationService.administerMedication(
    {
      targetType: 'bird',
      birdId: testBird.birdId,
      medicationId: expiredMed.medicationId,
      quantity: 1,
      dosageGiven: '1 drop topical',
      administeredDate: todayStr,
      administeredBy: 'Staff Emergency',
    },
    { overrideExpired: true }
  );
  assert(overrideResult && overrideResult.logId.startsWith('MLOG-'), 'Allows administration when overrideExpired option is explicitly passed');

  // -----------------------------------------------------------------
  // TEST 7: FOOD SAFETY & WITHDRAWAL PERIOD TRACKING
  // -----------------------------------------------------------------
  console.log('\n>>> TEST 7: Food Safety Withdrawal Hold Tracking');
  const activeRestrictions = await medicationService.getActiveWithdrawalRestrictions();
  assert(activeRestrictions.length >= 1, `Active withdrawal holds detected (${activeRestrictions.length} active holds)`);

  const batchHold = await medicationService.isBatchUnderWithdrawal(testBatch.batchId);
  assert(batchHold === true, `Test Batch ${testBatch.batchId} correctly reported under active withdrawal hold`);

  const birdHold = await medicationService.isBirdUnderWithdrawal(testBird.birdId);
  assert(birdHold === true, `Test Bird ${testBird.birdId} correctly reported under active withdrawal hold`);

  // Verify non-treated pen/batch is NOT under hold
  const cleanBatch = await batchService.createBatch({
    name: 'Clean Organic Layer Batch',
    birdType: 'Layer',
    breed: 'Isa Brown',
    initialCount: 100,
    arrivalDate: todayStr,
    penId: testPen.id,
  });
  const cleanBatchHold = await medicationService.isBatchUnderWithdrawal(cleanBatch.batchId);
  assert(cleanBatchHold === false, 'Untreated batch is not under withdrawal restriction');

  // Test 0-day withdrawal does not create food safety hold
  const zeroDayMed = await db.medications.where('name').equals('Amino Total + Electrolytes Liquid').first();
  await medicationService.administerMedication({
    targetType: 'batch',
    batchId: cleanBatch.batchId,
    medicationId: zeroDayMed.medicationId,
    quantity: 1,
    dosageGiven: '100ml',
    administeredDate: todayStr,
    administeredBy: 'Staff',
    withdrawalPeriodDays: 0,
  });

  const stillCleanHold = await medicationService.isBatchUnderWithdrawal(cleanBatch.batchId);
  assert(stillCleanHold === false, '0-day withdrawal supplement does not place batch on food safety hold');

  // -----------------------------------------------------------------
  // TEST 8: SAFE DELETION SAFEGUARD
  // -----------------------------------------------------------------
  console.log('\n>>> TEST 8: Safe Deletion & Audit Integrity Safeguards');
  let deleteBlocked = false;
  try {
    // Attempt to delete Tylodox which has both purchases and logs
    await medicationService.deleteMedication(targetMed.id);
  } catch (err) {
    deleteBlocked = err.message.includes('Cannot delete medication');
  }
  assert(deleteBlocked, 'Prevents deleting medication referenced by purchase ledgers or treatment logs');

  // Clean unreferenced med deletes safely
  const unreferencedMed = await medicationService.createMedication({
    name: 'Unused Hydrogen Peroxide 3%',
    type: 'Antiseptic',
    unit: 'bottle',
    currentStock: 3,
    reorderLevel: 1,
    unitPrice: 800,
  });
  const delResult = await medicationService.deleteMedication(unreferencedMed.id);
  assert(delResult.success === true, 'Allows safe deletion of unreferenced medication');

  // -----------------------------------------------------------------
  // TEST 9: STATISTICS & INVENTORY VALUATION (₦)
  // -----------------------------------------------------------------
  console.log('\n>>> TEST 9: Statistics & Inventory Valuation');
  const stats = await medicationService.getMedicationStatistics();
  assert(stats.totalProducts >= 7, `Total products: ${stats.totalProducts}`);
  assert(stats.totalStock > 0, `Total stock: ${stats.totalStock}`);
  assert(stats.totalTreatments >= 3, `Total treatments logged: ${stats.totalTreatments}`);
  assert(stats.activeWithdrawals >= 2, `Active withdrawals count: ${stats.activeWithdrawals}`);
  assert(stats.totalInventoryValue > 0, `Total inventory valuation in ₦: ${stats.totalInventoryValue}`);

  // Test alerts query
  const alerts = await medicationService.getMedicationAlerts();
  assert(Array.isArray(alerts) && alerts.length > 0, `Medication alerts generated (${alerts.length} alerts)`);

  // -----------------------------------------------------------------
  // CLEANUP & SUMMARY
  // -----------------------------------------------------------------
  console.log('\n====================================================');
  console.log(` AUDIT SUMMARY: ${passedTests} PASSED, ${failedTests} FAILED`);
  console.log('====================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runAudit().catch((err) => {
  console.error('FATAL AUDIT ERROR:', err);
  process.exit(1);
});
