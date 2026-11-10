import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import {
  SCHEMA_V1,
  SCHEMA_V2,
  SCHEMA_V3,
  SCHEMA_V4,
  SCHEMA_V5,
  SCHEMA_V6,
  SCHEMA_V7,
  SCHEMA_V8,
  DB_NAME,
  DB_VERSION,
} from '../src/database/schema.js';
import {
  eggProductionService,
  EGG_GRADES,
  SELLABLE_GRADES,
  DEFECT_GRADES,
  MOVEMENT_TYPES,
  EGGS_PER_CRATE,
  calculateHDP,
  formatEggCount,
} from '../src/services/eggProductionService.js';
import { batchService } from '../src/services/batchService.js';
import { penService } from '../src/services/penService.js';
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
  console.log(' FRESHNEST POULTRY FARM: MODULE 08 AUDIT & TESTS');
  console.log('====================================================\n');

  // -----------------------------------------------------------------
  // TEST 1: DATABASE SCHEMA MIGRATION (V1 -> ... -> V7 -> V8)
  // -----------------------------------------------------------------
  console.log('>>> TEST 1: Database Migration & Schema V8 Preservation');
  const migDbName = 'test_freshnest_v8_migration_db';

  // Create V1 DB
  let migDb = new Dexie(migDbName);
  migDb.version(1).stores(SCHEMA_V1);
  await migDb.open();
  await migDb.birds.add({ tagNumber: 'V1-BIRD', breed: 'Isa Brown', status: 'Active' });
  await migDb.batches.add({ batchCode: 'V1-BATCH', initialCount: 500, status: 'Active' });
  await migDb.feeds.add({ name: 'V1 Mash', type: 'Layer Mash', currentStock: 50 });
  await migDb.medications.add({ name: 'V1 Tylosin', type: 'Antibiotic', currentStock: 10 });
  await migDb.vaccines.add({ name: 'V1 Marek', targetDisease: "Marek's Disease", currentStock: 5 });
  await migDb.close();

  // Upgrade through to V8
  migDb = new Dexie(migDbName);
  migDb.version(1).stores(SCHEMA_V1);
  migDb.version(2).stores(SCHEMA_V2);
  migDb.version(3).stores(SCHEMA_V3);
  migDb.version(4).stores(SCHEMA_V4);
  migDb.version(5).stores(SCHEMA_V5);
  migDb.version(6).stores(SCHEMA_V6);
  migDb.version(7).stores(SCHEMA_V7);
  migDb.version(8).stores(SCHEMA_V8);
  await migDb.open();

  assert(migDb.verno === 8, 'Database successfully upgrades to version 8');
  assert(DB_VERSION >= 8, 'schema.js DB_VERSION constant is set to 8 or higher');

  // Verify preserved data
  const preservedBird = await migDb.birds.where('tagNumber').equals('V1-BIRD').first();
  const preservedBatch = await migDb.batches.where('batchCode').equals('V1-BATCH').first();
  const preservedFeed = await migDb.feeds.where('name').equals('V1 Mash').first();
  const preservedMed = await migDb.medications.where('name').equals('V1 Tylosin').first();
  const preservedVac = await migDb.vaccines.where('name').equals('V1 Marek').first();

  assert(preservedBird !== undefined, 'V1 Bird record preserved in V8');
  assert(preservedBatch !== undefined, 'V1 Batch record preserved in V8');
  assert(preservedFeed !== undefined, 'V1 Feed record preserved in V8');
  assert(preservedMed !== undefined, 'V1 Medication record preserved in V8');
  assert(preservedVac !== undefined, 'V7 Vaccine record preserved in V8');

  // Verify tables in V8
  assert(typeof migDb.eggLogs !== 'undefined', 'eggLogs table is registered in V8');
  assert(typeof migDb.eggInventory !== 'undefined', 'eggInventory table is registered in V8');

  await migDb.close();
  await Dexie.delete(migDbName);

  // -----------------------------------------------------------------
  // PREPARE ACTIVE TEST DATABASE
  // -----------------------------------------------------------------
  console.log('\n>>> Setting up active test environment');
  await db.open();
  await db.eggLogs.clear();
  await db.eggInventory.clear();
  await db.batches.clear();
  await db.pens.clear();
  await db.farmSettings.clear();

  // Create prerequisite pen and layer batch
  const pen = await penService.createPen({
    name: 'Layer House Alpha',
    type: 'Layer',
    capacity: 1000,
    location: 'North Zone',
  });

  const layerBatch = await batchService.createBatch({
    name: 'Isa Brown Layers 2026-A',
    birdType: 'Layer',
    breed: 'Isa Brown',
    initialCount: 500,
    currentCount: 500,
    arrivalDate: '2026-01-10',
    penId: pen.id,
    status: 'Active',
  });

  // -----------------------------------------------------------------
  // TEST 2: MONOTONIC UNIQUE SEQUENTIAL ID GENERATION
  // -----------------------------------------------------------------
  console.log('\n>>> TEST 2: Monotonic Unique ID Generation');
  const firstLogId = await eggProductionService.generateNextLogId();
  assert(firstLogId.startsWith('EGG-'), 'Collection Log ID starts with EGG- prefix');
  assert(firstLogId === 'EGG-0001', `First Log ID is EGG-0001 (got ${firstLogId})`);

  const firstMovId = await eggProductionService.generateNextMovementId();
  assert(firstMovId.startsWith('EMOV-'), 'Inventory Movement ID starts with EMOV- prefix');
  assert(firstMovId === 'EMOV-0001', `First Movement ID is EMOV-0001 (got ${firstMovId})`);

  // -----------------------------------------------------------------
  // TEST 3: DAILY COLLECTION LOGGING & SESSION VALIDATION
  // -----------------------------------------------------------------
  console.log('\n>>> TEST 3: Daily Collection Logging & Session Validation');
  const collection1 = await eggProductionService.createCollectionLog({
    batchId: layerBatch.id,
    collectionDate: '2026-10-01',
    morningCollection: 200,
    afternoonCollection: 160,
    eveningCollection: 90,
    crackedEggs: 8,
    dirtyEggs: 5,
    damagedEggs: 2,
    recordedBy: 'Supervisor Amina',
    notes: 'Morning lay peak',
  });

  assert(collection1.logId === 'EGG-0001', 'First collection log assigned ID EGG-0001');
  assert(collection1.totalCollected === 450, 'Total collected equals 200 + 160 + 90 = 450');
  assert(collection1.goodEggs === 435, 'Good eggs calculated: 450 - 15 defects = 435');
  assert(collection1.layingRate === 90.0, 'Hen-Day Production (HDP) calculated: (450 / 500) * 100 = 90.0%');

  // Next ID should be EGG-0002
  const secondLogId = await eggProductionService.generateNextLogId();
  assert(secondLogId === 'EGG-0002', `Next Log ID is EGG-0002 (got ${secondLogId})`);

  // Validation: zero collection error
  let zeroError = false;
  try {
    await eggProductionService.createCollectionLog({
      batchId: layerBatch.id,
      collectionDate: '2026-10-02',
      morningCollection: 0,
      afternoonCollection: 0,
      eveningCollection: 0,
    });
  } catch (err) {
    zeroError = true;
  }
  assert(zeroError, 'Logging collection with zero total eggs collected throws validation error');

  // Validation: negative count error
  let negError = false;
  try {
    await eggProductionService.createCollectionLog({
      batchId: layerBatch.id,
      collectionDate: '2026-10-02',
      morningCollection: -10,
      afternoonCollection: 50,
      eveningCollection: 20,
    });
  } catch (err) {
    negError = true;
  }
  assert(negError, 'Logging collection with negative session count throws validation error');

  // -----------------------------------------------------------------
  // TEST 4: DEFECT BREAKDOWN & REJECT LOGIC
  // -----------------------------------------------------------------
  console.log('\n>>> TEST 4: Defect Breakdown & Reject Logic');
  let defectOverflowError = false;
  try {
    await eggProductionService.createCollectionLog({
      batchId: layerBatch.id,
      collectionDate: '2026-10-02',
      morningCollection: 50,
      afternoonCollection: 0,
      eveningCollection: 0,
      crackedEggs: 30,
      dirtyEggs: 20,
      damagedEggs: 10, // 60 defects > 50 total
    });
  } catch (err) {
    defectOverflowError = true;
  }
  assert(defectOverflowError, 'Defect counts exceeding total collected eggs is strictly rejected');

  // -----------------------------------------------------------------
  // TEST 5: HEN-DAY PRODUCTION (HDP) & ZERO-DIVISION SAFETY
  // -----------------------------------------------------------------
  console.log('\n>>> TEST 5: Hen-Day Production (HDP) & Zero-Division Safety');
  assert(calculateHDP(450, 500) === 90.0, 'HDP formula (450 / 500) * 100 = 90.0%');
  assert(calculateHDP(387, 450) === 86.0, 'HDP formula (387 / 450) * 100 = 86.0%');
  assert(calculateHDP(100, 0) === 0, 'HDP with zero living population safely returns 0 without division error');
  assert(calculateHDP(0, 500) === 0, 'HDP with zero eggs collected safely returns 0');
  assert(calculateHDP(null, null) === 0, 'HDP with null values safely returns 0');

  // -----------------------------------------------------------------
  // TEST 6: DUPLICATE COLLECTION CHECK FOR SAME BATCH & DATE
  // -----------------------------------------------------------------
  console.log('\n>>> TEST 6: Duplicate Collection Check for Same Batch & Date');
  let dupError = false;
  try {
    await eggProductionService.createCollectionLog({
      batchId: layerBatch.id,
      collectionDate: '2026-10-01', // Already logged above
      morningCollection: 100,
      afternoonCollection: 100,
      eveningCollection: 50,
    });
  } catch (err) {
    dupError = true;
  }
  assert(dupError, 'Duplicate collection log for same batch on same date is prevented');

  // -----------------------------------------------------------------
  // TEST 7: ATOMIC INVENTORY STOCK-IN ON COLLECTION
  // -----------------------------------------------------------------
  console.log('\n>>> TEST 7: Atomic Inventory Stock-In on Collection');
  const stockAfterCol1 = await eggProductionService.getInventoryStock();
  assert(stockAfterCol1.totalSellableEggs === 435, 'Sellable stock has 435 good eggs');
  assert(stockAfterCol1.byGrade['Grade A'] === 435, 'Good eggs defaulted to Grade A before explicit grading');
  assert(stockAfterCol1.byGrade['Cracked Eggs'] === 8, 'Cracked defect eggs tracked in inventory (8)');
  assert(stockAfterCol1.byGrade['Dirty Eggs'] === 5, 'Dirty defect eggs tracked in inventory (5)');
  assert(stockAfterCol1.byGrade['Damaged / Rejected Eggs'] === 2, 'Damaged defect eggs tracked in inventory (2)');
  assert(stockAfterCol1.totalSellableCrates === 14, '14 full crates of sellable eggs (435 / 30 = 14 crates)');
  assert(stockAfterCol1.totalSellableLoose === 15, '15 loose sellable eggs (435 % 30 = 15)');

  // -----------------------------------------------------------------
  // TEST 8: COMMERCIAL EGG GRADING WORKFLOW
  // -----------------------------------------------------------------
  console.log('\n>>> TEST 8: Commercial Egg Grading Workflow');
  // Attempt invalid grading where sum does not equal good eggs (435)
  let badGradeError = false;
  try {
    await eggProductionService.gradeCollection(collection1.logId, {
      gradeA: 300,
      gradeB: 100,
      smallEggs: 20, // 420 !== 435
      gradedBy: 'Quality Grader Bello',
    });
  } catch (err) {
    badGradeError = true;
  }
  assert(badGradeError, 'Grading sum not matching total good eggs is strictly rejected');

  // Accurate grading: 300 Grade A + 100 Grade B + 35 Small = 435
  const gradeResult = await eggProductionService.gradeCollection(collection1.logId, {
    gradeA: 300,
    gradeB: 100,
    smallEggs: 35,
    notes: 'Grade A premium large, Grade B standard',
    gradedBy: 'Quality Grader Bello',
  });

  assert(gradeResult.success === true, 'Valid grading submitted successfully');

  // Check inventory reflects graded counts
  const stockAfterGrading = await eggProductionService.getInventoryStock();
  assert(stockAfterGrading.byGrade['Grade A'] === 300, 'Grade A stock updated to 300');
  assert(stockAfterGrading.byGrade['Grade B'] === 100, 'Grade B stock updated to 100');
  assert(stockAfterGrading.byGrade['Small Eggs'] === 35, 'Small eggs stock updated to 35');
  assert(stockAfterGrading.totalSellableEggs === 435, 'Total sellable eggs remains exactly 435');

  // -----------------------------------------------------------------
  // TEST 9: MANUAL MOVEMENTS & STRICT NEGATIVE STOCK PREVENTION
  // -----------------------------------------------------------------
  console.log('\n>>> TEST 9: Manual Movements & Strict Negative Stock Prevention');
  // Attempt to sell 400 Grade A when only 300 exist
  let overdrawError = false;
  try {
    await eggProductionService.recordStockMovement({
      movementType: 'SALE',
      grade: 'Grade A',
      quantity: 400,
      movementDate: '2026-10-02',
      referenceId: 'INV-1001',
    });
  } catch (err) {
    overdrawError = true;
  }
  assert(overdrawError, 'Selling more eggs than available stock in a grade is strictly blocked');

  // Valid sale: sell 150 Grade A (5 crates)
  const saleMov = await eggProductionService.recordStockMovement({
    movementType: 'SALE',
    grade: 'Grade A',
    quantity: 150,
    movementDate: '2026-10-02',
    referenceId: 'INV-1001',
    notes: 'Sold to Premier Supermarket',
    recordedBy: 'Sales Rep John',
  });

  assert(saleMov.movementId.startsWith('EMOV-'), 'Sale movement assigned EMOV- ID');
  assert(saleMov.crates === 5, 'Sale represents exactly 5 crates (150 / 30)');

  const stockAfterSale = await eggProductionService.getInventoryStock();
  assert(stockAfterSale.byGrade['Grade A'] === 150, 'Grade A stock decremented to 150 (300 - 150)');
  assert(stockAfterSale.totalSellableEggs === 285, 'Total sellable stock now 285 (435 - 150)');

  // -----------------------------------------------------------------
  // TEST 10: REFERENTIAL INTEGRITY & ROLLBACK ON DELETION
  // -----------------------------------------------------------------
  console.log('\n>>> TEST 10: Referential Integrity & Rollback on Deletion');
  // Deleting collection1 should be blocked because 150 Grade A eggs were already sold!
  // Removing collection1 would require deducting 300 Grade A eggs, but only 150 remain,
  // which would cause negative stock!
  let deleteBlocked = false;
  try {
    await eggProductionService.deleteCollectionLog(collection1.id);
  } catch (err) {
    deleteBlocked = true;
  }
  assert(deleteBlocked, 'Deleting collection log whose eggs were partially sold is blocked to prevent negative inventory');

  // Create another collection log that hasn't been sold
  const collection2 = await eggProductionService.createCollectionLog({
    batchId: layerBatch.id,
    collectionDate: '2026-10-03',
    morningCollection: 100,
    afternoonCollection: 50,
    eveningCollection: 30,
    crackedEggs: 2,
    dirtyEggs: 1,
    damagedEggs: 0,
    recordedBy: 'Staff Musa',
  });

  const stockBeforeDel2 = await eggProductionService.getInventoryStock();
  const sellableBefore = stockBeforeDel2.totalSellableEggs;

  // Deleting collection2 succeeds because none of its eggs were sold
  const delResult = await eggProductionService.deleteCollectionLog(collection2.id);
  assert(delResult.success === true, 'Deleting unallocated collection log succeeds');

  const stockAfterDel2 = await eggProductionService.getInventoryStock();
  assert(stockAfterDel2.totalSellableEggs === sellableBefore - 177, 'Inventory movements atomically rolled back on deletion');

  // -----------------------------------------------------------------
  // TEST 11: CRATE CONVERSIONS & FORMATTING
  // -----------------------------------------------------------------
  console.log('\n>>> TEST 11: Crate Conversions & Formatting');
  assert(EGGS_PER_CRATE === 30, 'Standard poultry crate size is 30 eggs');
  assert(formatEggCount(90) === '90 eggs (3 crates)', 'formatEggCount handles exact crates: 90 -> "90 eggs (3 crates)"');
  assert(formatEggCount(95) === '95 eggs (3 crates, 5 loose)', 'formatEggCount handles loose eggs: 95 -> "95 eggs (3 crates, 5 loose)"');
  assert(formatEggCount(25) === '25 eggs', 'formatEggCount handles < 1 crate: 25 eggs');

  // -----------------------------------------------------------------
  // TEST 12: STATS, AGGREGATIONS & CSV EXPORT
  // -----------------------------------------------------------------
  console.log('\n>>> TEST 12: Stats, Aggregations & CSV Export');
  const stats = await eggProductionService.getEggProductionStats();
  assert(typeof stats.todayCollected === 'number', 'Production stats includes todayCollected');
  assert(typeof stats.sevenDayDailyAvg === 'number', 'Production stats includes sevenDayDailyAvg');
  assert(typeof stats.overallHDP === 'number', 'Production stats includes overallHDP');
  assert(Array.isArray(stats.trendDays), 'Production stats includes trendDays array');
  assert(stats.trendDays.length === 7, 'trendDays covers exactly 7 daily bins');

  const csvCollections = await eggProductionService.exportCollectionsCSV();
  assert(csvCollections.includes('Log ID,Date,Batch Code'), 'Collections CSV contains expected header columns');
  assert(csvCollections.includes('EGG-0001'), 'Collections CSV includes recorded log EGG-0001');

  const csvInventory = await eggProductionService.exportInventoryCSV();
  assert(csvInventory.includes('Movement ID,Date,Type,Grade'), 'Inventory CSV contains expected header columns');
  assert(csvInventory.includes('INV-1001'), 'Inventory CSV includes recorded sale reference INV-1001');

  // -----------------------------------------------------------------
  // TEST 13: COLLECTION LOG EDITING & INVENTORY RECONCILIATION
  // -----------------------------------------------------------------
  console.log('\n>>> TEST 13: Collection Log Editing & Inventory Reconciliation');
  // Create an editable collection log
  const editBatch = await batchService.createBatch({
    name: 'Isa Brown Layers 2026-B',
    birdType: 'Layer',
    breed: 'Isa Brown',
    initialCount: 200,
    currentCount: 200,
    arrivalDate: '2026-02-01',
    penId: pen.id,
    status: 'Active',
  });

  const editableCol = await eggProductionService.createCollectionLog({
    batchId: editBatch.id,
    collectionDate: '2026-10-10',
    morningCollection: 60,
    afternoonCollection: 50,
    eveningCollection: 40, // 150 total
    crackedEggs: 5,
    dirtyEggs: 3,
    damagedEggs: 2, // 10 defects, 140 good
    recordedBy: 'Auditor Jane',
  });

  assert(editableCol.totalCollected === 150, 'Editable collection initial total is 150');
  assert(editableCol.goodEggs === 140, 'Editable collection initial good eggs is 140');

  // Sell most of Grade A eggs so available stock is small (10 eggs)
  const stockBeforeEdit = await eggProductionService.getInventoryStock();
  const availableA = stockBeforeEdit.byGrade['Grade A'] || 0;
  if (availableA > 10) {
    await eggProductionService.recordStockMovement({
      movementType: 'SALE',
      grade: 'Grade A',
      quantity: availableA - 10,
      movementDate: '2026-10-11',
      referenceId: 'INV-EDIT-DRAIN',
      recordedBy: 'Sales Rep',
    });
  }

  // Attempting to edit this collection to reduce good eggs by 60 should fail
  // because only 10 eggs are available in Grade A!
  let editOverdrawError = false;
  try {
    await eggProductionService.updateCollectionLog(editableCol.id, {
      morningCollection: 30,
      afternoonCollection: 30,
      eveningCollection: 30, // 90 total, 10 defects = 80 good (net reduction of 60)
      crackedEggs: 5,
      dirtyEggs: 3,
      damagedEggs: 2,
    });
  } catch (err) {
    editOverdrawError = true;
  }
  assert(editOverdrawError, 'Editing collection log that would reduce stock below sold quantity is strictly blocked');

  // Valid edit: increasing good eggs or adjusting within available balance
  const updatedCol = await eggProductionService.updateCollectionLog(editableCol.id, {
    morningCollection: 80,
    afternoonCollection: 60,
    eveningCollection: 40, // 180 total
    crackedEggs: 6,
    dirtyEggs: 2,
    damagedEggs: 2, // 10 defects, 170 good
    notes: 'Recounted morning crates',
  });

  assert(updatedCol.totalCollected === 180, 'Updated collection reflects new total of 180 eggs');
  assert(updatedCol.goodEggs === 170, 'Updated collection reflects new good eggs count of 170');
  assert(updatedCol.notes === 'Recounted morning crates', 'Updated collection notes preserved');

  // -----------------------------------------------------------------
  // TEST 14: RE-GRADING NEGATIVE STOCK PROTECTION
  // -----------------------------------------------------------------
  console.log('\n>>> TEST 14: Re-Grading Negative Stock Protection');
  const regradeBatch = await batchService.createBatch({
    name: 'Isa Brown Layers 2026-C',
    birdType: 'Layer',
    breed: 'Isa Brown',
    initialCount: 200,
    currentCount: 200,
    arrivalDate: '2026-02-15',
    penId: pen.id,
    status: 'Active',
  });

  const regradeCol = await eggProductionService.createCollectionLog({
    batchId: regradeBatch.id,
    collectionDate: '2026-10-12',
    morningCollection: 60,
    afternoonCollection: 40,
    eveningCollection: 0, // 100 total, 0 defects = 100 good
    crackedEggs: 0,
    dirtyEggs: 0,
    damagedEggs: 0,
    recordedBy: 'Auditor Jane',
  });

  // Initial grading: 60 Grade A, 30 Grade B, 10 Small Eggs
  await eggProductionService.gradeCollection(regradeCol.logId, {
    gradeA: 60,
    gradeB: 30,
    smallEggs: 10,
    gradedBy: 'Quality Inspector',
  });

  // Sell down Grade B eggs so only 5 Grade B eggs remain in total stock
  const stockBeforeRegrade = await eggProductionService.getInventoryStock();
  const availableB = stockBeforeRegrade.byGrade['Grade B'] || 0;
  assert(availableB >= 30, 'Grade B stock has at least 30 eggs after initial grading');

  if (availableB > 5) {
    await eggProductionService.recordStockMovement({
      movementType: 'SALE',
      grade: 'Grade B',
      quantity: availableB - 5,
      movementDate: '2026-10-12',
      referenceId: 'INV-GB-DRAIN',
      recordedBy: 'Sales Rep',
    });
  }

  // Attempt to re-grade with only 10 Grade B (attempted reduction of 20 Grade B, but only 5 remain in stock!)
  let regradeBreachError = false;
  try {
    await eggProductionService.gradeCollection(regradeCol.logId, {
      gradeA: 80,
      gradeB: 10, // Reduction of 20 Grade B breaches 5 available
      smallEggs: 10,
      gradedBy: 'Quality Inspector',
    });
  } catch (err) {
    regradeBreachError = true;
  }
  assert(regradeBreachError, 'Re-grading that attempts to reduce already-sold grade stock is strictly rejected');

  // -----------------------------------------------------------------
  // TEST 15: STOCK TRANSFERS & TOTAL STOCK CONSERVATION
  // -----------------------------------------------------------------
  console.log('\n>>> TEST 15: Stock Transfers & Total Stock Conservation');
  const stockBeforeTransfer = await eggProductionService.getInventoryStock();
  const totalFarmStockBefore = stockBeforeTransfer.totalEggsInStock;
  const gradeABefore = stockBeforeTransfer.byGrade['Grade A'] || 0;
  const gradeBBefore = stockBeforeTransfer.byGrade['Grade B'] || 0;

  assert(gradeABefore >= 30, 'Grade A has sufficient stock for transfer (at least 30 eggs)');

  // Transfer 30 eggs from Grade A to Grade B
  const transferResult = await eggProductionService.recordStockMovement({
    movementType: 'TRANSFER',
    grade: 'Grade A',
    destinationGrade: 'Grade B',
    quantity: 30,
    movementDate: '2026-10-13',
    referenceId: 'TRF-AB-01',
    notes: 'Reclassified eggs to Grade B',
    recordedBy: 'Inventory Officer',
  });

  assert(transferResult.movementType === 'TRANSFER', 'Movement returned indicates TRANSFER type');
  assert(transferResult.sourceMovement.movementType === 'TRANSFER_OUT', 'Source movement generated as TRANSFER_OUT');
  assert(transferResult.destMovement.movementType === 'TRANSFER_IN', 'Destination movement generated as TRANSFER_IN');

  const stockAfterTransfer = await eggProductionService.getInventoryStock();
  assert(
    stockAfterTransfer.byGrade['Grade A'] === gradeABefore - 30,
    `Source Grade A stock decremented by 30 (${gradeABefore} -> ${stockAfterTransfer.byGrade['Grade A']})`
  );
  assert(
    stockAfterTransfer.byGrade['Grade B'] === gradeBBefore + 30,
    `Destination Grade B stock incremented by 30 (${gradeBBefore} -> ${stockAfterTransfer.byGrade['Grade B']})`
  );
  assert(
    stockAfterTransfer.totalEggsInStock === totalFarmStockBefore,
    `Total farm stock is strictly conserved during transfer (${totalFarmStockBefore} eggs before & after)`
  );

  // Transfer validation: same source and destination
  let sameGradeTransferError = false;
  try {
    await eggProductionService.recordStockMovement({
      movementType: 'TRANSFER',
      grade: 'Grade A',
      destinationGrade: 'Grade A',
      quantity: 10,
      movementDate: '2026-10-13',
    });
  } catch (err) {
    sameGradeTransferError = true;
  }
  assert(sameGradeTransferError, 'Transferring between identical source and destination grades is rejected');

  // Transfer validation: exceeding source stock
  let overTransferError = false;
  try {
    await eggProductionService.recordStockMovement({
      movementType: 'TRANSFER',
      grade: 'Grade A',
      destinationGrade: 'Grade B',
      quantity: 999999,
      movementDate: '2026-10-13',
    });
  } catch (err) {
    overTransferError = true;
  }
  assert(overTransferError, 'Transferring more eggs than available in source grade is strictly rejected');

  // -----------------------------------------------------------------
  // TEST 16: RAPID DUPLICATE MOVEMENT SUBMISSION GUARD
  // -----------------------------------------------------------------
  console.log('\n>>> TEST 16: Rapid Duplicate Movement Submission Guard');
  // Record a damage movement
  await eggProductionService.recordStockMovement({
    movementType: 'DAMAGE',
    grade: 'Grade A',
    quantity: 3,
    movementDate: '2026-10-14',
    referenceId: 'DMG-TEST-01',
    recordedBy: 'Handler Tom',
  });

  // Immediately attempt identical submission (within 3 seconds)
  let rapidDuplicateBlocked = false;
  try {
    await eggProductionService.recordStockMovement({
      movementType: 'DAMAGE',
      grade: 'Grade A',
      quantity: 3,
      movementDate: '2026-10-14',
      referenceId: 'DMG-TEST-01',
      recordedBy: 'Handler Tom',
    });
  } catch (err) {
    rapidDuplicateBlocked = true;
  }
  assert(rapidDuplicateBlocked, 'Rapid duplicate movement submission within 3-second window is prevented');

  // -----------------------------------------------------------------
  // TEST 17: HEN-DAY PRODUCTION (HDP) COHORT EXCLUSION
  // -----------------------------------------------------------------
  console.log('\n>>> TEST 17: Hen-Day Production (HDP) Non-Laying Cohort Exclusion');
  // Create a non-laying broiler pen and batch
  const broilerPen = await penService.createPen({
    name: 'Broiler House Alpha',
    type: 'Broiler',
    capacity: 2000,
    location: 'South Zone',
  });

  const broilerBatch = await batchService.createBatch({
    name: 'Cobb 500 Meat Broilers',
    birdType: 'Broiler',
    breed: 'Cobb 500',
    initialCount: 500,
    currentCount: 500,
    arrivalDate: '2026-03-01',
    penId: broilerPen.id,
    status: 'Active',
  });

  // Calculate HDP for a collection on broiler batch (if logged)
  // Our service getBatchLivingCount checks if birdType is non-laying and handles it safely
  const broilerCol = await eggProductionService.createCollectionLog({
    batchId: broilerBatch.id,
    collectionDate: '2026-10-15',
    morningCollection: 10,
    afternoonCollection: 0,
    eveningCollection: 0,
    crackedEggs: 0,
    dirtyEggs: 0,
    damagedEggs: 0,
    recordedBy: 'Auditor',
  });

  assert(broilerCol.layingRate === 0, 'Non-laying cohort (Broiler) produces 0.0% HDP instead of falsely inflating lay rates');

  // -----------------------------------------------------------------
  // AUDIT SUMMARY
  // -----------------------------------------------------------------
  console.log('\n====================================================');
  console.log(` AUDIT COMPLETE: ${passedTests} passed, ${failedTests} failed`);
  console.log('====================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runAudit().catch((err) => {
  console.error('Audit execution error:', err);
  process.exit(1);
});
