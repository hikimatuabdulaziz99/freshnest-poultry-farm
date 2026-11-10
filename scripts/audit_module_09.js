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
  SCHEMA_V9,
  DB_NAME,
  DB_VERSION,
} from '../src/database/schema.js';
import {
  mortalityService,
  COMMON_CAUSES,
  DISPOSAL_METHODS,
  calculateMortalityRate,
  getLocalDateString,
} from '../src/services/mortalityService.js';
import { batchService } from '../src/services/batchService.js';
import { birdService } from '../src/services/birdService.js';
import { penService } from '../src/services/penService.js';
import { dbService } from '../src/services/dbService.js';
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
  console.log(' FRESHNEST POULTRY FARM: MODULE 09 AUDIT & TESTS');
  console.log('====================================================\n');

  // -----------------------------------------------------------------
  // TEST 1: DATABASE MIGRATION & SCHEMA V9 PRESERVATION
  // -----------------------------------------------------------------
  console.log('>>> TEST 1: Database Migration & Schema V9 Preservation');
  const migDbName = 'test_freshnest_v9_migration_db';

  // Create V1 DB
  let migDb = new Dexie(migDbName);
  migDb.version(1).stores(SCHEMA_V1);
  await migDb.open();
  await migDb.birds.add({ tagNumber: 'V1-BIRD', breed: 'Isa Brown', status: 'Active' });
  await migDb.batches.add({ batchCode: 'V1-BATCH', initialCount: 500, currentCount: 500, status: 'Active' });
  await migDb.feeds.add({ name: 'V1 Mash', type: 'Layer Mash', currentStock: 50 });
  await migDb.medications.add({ name: 'V1 Tylosin', type: 'Antibiotic', currentStock: 10 });
  await migDb.vaccines.add({ name: 'V1 Marek', targetDisease: "Marek's Disease", currentStock: 5 });
  await migDb.eggLogs.add({ logId: 'EGG-0001', totalCollected: 300, date: '2026-09-01' });
  await migDb.close();

  // Upgrade through to V9
  migDb = new Dexie(migDbName);
  migDb.version(1).stores(SCHEMA_V1);
  migDb.version(2).stores(SCHEMA_V2);
  migDb.version(3).stores(SCHEMA_V3);
  migDb.version(4).stores(SCHEMA_V4);
  migDb.version(5).stores(SCHEMA_V5);
  migDb.version(6).stores(SCHEMA_V6);
  migDb.version(7).stores(SCHEMA_V7);
  migDb.version(8).stores(SCHEMA_V8);
  migDb.version(9).stores(SCHEMA_V9);
  await migDb.open();

  assert(migDb.verno === 9, 'Database successfully upgrades to version 9');
  assert(DB_VERSION >= 9, 'schema.js DB_VERSION constant is set to 9 or higher');

  // Verify all historical records preserved
  const preservedBird = await migDb.birds.where('tagNumber').equals('V1-BIRD').first();
  const preservedBatch = await migDb.batches.where('batchCode').equals('V1-BATCH').first();
  const preservedFeed = await migDb.feeds.where('name').equals('V1 Mash').first();
  const preservedMed = await migDb.medications.where('name').equals('V1 Tylosin').first();
  const preservedVac = await migDb.vaccines.where('name').equals('V1 Marek').first();
  const preservedEgg = await migDb.eggLogs.where('logId').equals('EGG-0001').first();

  assert(preservedBird !== undefined, 'V1 Bird record preserved in V9');
  assert(preservedBatch !== undefined, 'V1 Batch record preserved in V9');
  assert(preservedFeed !== undefined, 'V1 Feed record preserved in V9');
  assert(preservedMed !== undefined, 'V1 Medication record preserved in V9');
  assert(preservedVac !== undefined, 'V7 Vaccine record preserved in V9');
  assert(preservedEgg !== undefined, 'V8 Egg log record preserved in V9');

  // Verify mortalityLogs table is registered in V9
  assert(typeof migDb.mortalityLogs !== 'undefined', 'mortalityLogs table is registered in V9');

  await migDb.close();
  await Dexie.delete(migDbName);

  // -----------------------------------------------------------------
  // PREPARE ACTIVE TEST DATABASE
  // -----------------------------------------------------------------
  console.log('\n>>> Setting up active test environment');
  await db.open();
  await db.mortalityLogs.clear();
  await db.batches.clear();
  await db.birds.clear();
  await db.pens.clear();
  await db.farmSettings.clear();

  // Create prerequisite pen, layer batch, and individual bird
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

  const testBird = await birdService.createBird({
    tagNumber: 'BRD-MORT-01',
    breed: 'Isa Brown',
    type: 'Layer',
    gender: 'Female',
    houseNumber: 'Layer House Alpha',
    status: 'Active',
    hatchDate: '2026-01-01',
  });

  // -----------------------------------------------------------------
  // TEST 2: MONOTONIC UNIQUE SEQUENTIAL MORTALITY ID GENERATION
  // -----------------------------------------------------------------
  console.log('\n>>> TEST 2: Monotonic Unique Sequential Mortality ID Generation');
  const firstId = await mortalityService.generateNextMortalityId();
  assert(firstId.startsWith('MORT-'), 'Mortality ID starts with MORT- prefix');
  assert(firstId === 'MORT-0001', `First Mortality ID is MORT-0001 (got ${firstId})`);

  // Record a temporary log to advance sequence
  const tempLog = await mortalityService.recordMortality({
    recordType: 'BATCH',
    batchId: layerBatch.id,
    quantity: 1,
    cause: 'Unknown cause',
    date: '2026-10-01',
  });
  assert(tempLog.mortalityId === 'MORT-0001', 'First recorded log assigned MORT-0001');

  // Next sequence must be MORT-0002
  const nextId = await mortalityService.generateNextMortalityId();
  assert(nextId === 'MORT-0002', `Next sequence is MORT-0002 (got ${nextId})`);

  // Delete temp log; sequence must NOT rewind to MORT-0001
  await mortalityService.deleteMortality(tempLog.id);
  const persistentIdAfterDelete = await mortalityService.generateNextMortalityId();
  assert(
    persistentIdAfterDelete === 'MORT-0002',
    `Mortality ID never reused or rewound after deletion (got ${persistentIdAfterDelete})`
  );

  // -----------------------------------------------------------------
  // TEST 3: VALID BATCH MORTALITY RECORDING
  // -----------------------------------------------------------------
  console.log('\n>>> TEST 3: Valid Batch Mortality Recording');
  const freshBatch = await batchService.getBatchById(layerBatch.id);
  const batchLivingBefore = Number(freshBatch.currentCount); // 500

  const batchMortality1 = await mortalityService.recordMortality({
    recordType: 'BATCH',
    batchId: layerBatch.id,
    quantity: 5,
    cause: 'Heat stress',
    symptoms: 'Heavy panting, lethargy during heatwave',
    suspectedDisease: 'Heat exhaustion',
    disposalMethod: 'Burial',
    date: '2026-10-02',
    recordedBy: 'Farm Officer Musa',
    notes: 'Installed extra fans',
  });

  assert(batchMortality1.mortalityId === 'MORT-0002', 'Assigned monotonic sequential ID MORT-0002');
  assert(batchMortality1.quantity === 5, 'Mortality quantity is 5 birds');
  assert(batchMortality1.cause === 'Heat stress', 'Cause recorded as Heat stress');
  assert(batchMortality1.recordType === 'BATCH', 'Record type is BATCH');
  assert(batchMortality1.disposalMethod === 'Burial', 'Disposal method recorded as Burial');

  // -----------------------------------------------------------------
  // TEST 4: MORTALITY QUANTITY CANNOT EXCEED LIVING POPULATION
  // -----------------------------------------------------------------
  console.log('\n>>> TEST 4: Mortality Quantity Validation & Population Limits');
  let zeroQtyError = false;
  try {
    await mortalityService.recordMortality({
      recordType: 'BATCH',
      batchId: layerBatch.id,
      quantity: 0,
      cause: 'Disease',
      date: '2026-10-03',
    });
  } catch (err) {
    zeroQtyError = true;
  }
  assert(zeroQtyError, 'Mortality with zero quantity is strictly rejected');

  let negQtyError = false;
  try {
    await mortalityService.recordMortality({
      recordType: 'BATCH',
      batchId: layerBatch.id,
      quantity: -10,
      cause: 'Disease',
      date: '2026-10-03',
    });
  } catch (err) {
    negQtyError = true;
  }
  assert(negQtyError, 'Mortality with negative quantity is strictly rejected');

  // Living count is 495. Attempting to record 500 should throw
  let overdrawError = false;
  try {
    await mortalityService.recordMortality({
      recordType: 'BATCH',
      batchId: layerBatch.id,
      quantity: 500,
      cause: 'Disease',
      date: '2026-10-03',
    });
  } catch (err) {
    overdrawError = true;
  }
  assert(overdrawError, 'Mortality quantity exceeding batch living population is strictly blocked');

  // -----------------------------------------------------------------
  // TEST 5: BATCH currentCount DECREASES EXACTLY ONCE
  // -----------------------------------------------------------------
  console.log('\n>>> TEST 5: Batch currentCount Population Update Exactly Once');
  const batchAfterMort1 = await batchService.getBatchById(layerBatch.id);
  assert(
    batchAfterMort1.currentCount === batchLivingBefore - 5,
    `Batch currentCount decreased from ${batchLivingBefore} to ${batchAfterMort1.currentCount} (strictly -5)`
  );

  // Record a second batch mortality of 10 birds
  await mortalityService.recordMortality({
    recordType: 'BATCH',
    batchId: layerBatch.id,
    quantity: 10,
    cause: 'Infection',
    date: '2026-10-04',
    recordedBy: 'Vet Doctor',
  });

  const batchAfterMort2 = await batchService.getBatchById(layerBatch.id);
  assert(
    batchAfterMort2.currentCount === 485,
    `Batch currentCount decreased by another 10 to exactly 485 (got ${batchAfterMort2.currentCount})`
  );

  // -----------------------------------------------------------------
  // TEST 6: BATCH initialCount REMAINS STRICTLY PRESERVED
  // -----------------------------------------------------------------
  console.log('\n>>> TEST 6: Batch initialCount Preservation');
  assert(
    batchAfterMort2.initialCount === 500,
    `Batch initialCount remains strictly 500 despite multiple mortalities (got ${batchAfterMort2.initialCount})`
  );

  // -----------------------------------------------------------------
  // TEST 7: INDIVIDUAL BIRD MORTALITY CHANGES STATUS TO DEAD
  // -----------------------------------------------------------------
  console.log('\n>>> TEST 7: Individual Bird Mortality Changes Status to Dead');
  const birdBefore = await birdService.getBirdById(testBird.id);
  assert(birdBefore.status === 'Active', 'Test bird starts with status Active');

  const birdMort = await mortalityService.recordMortality({
    recordType: 'BIRD',
    birdId: testBird.id,
    cause: 'Injury',
    symptoms: 'Wing trauma',
    disposalMethod: 'Incineration',
    date: '2026-10-05',
    recordedBy: 'Handler Bello',
  });

  assert(birdMort.recordType === 'BIRD', 'Mortality record indicates BIRD type');
  assert(birdMort.quantity === 1, 'Individual bird mortality quantity is strictly 1');

  const birdAfter = await birdService.getBirdById(testBird.id);
  assert(birdAfter.status === 'Dead', 'Bird status changed to Dead after mortality recording');

  // Verify batch population was NOT decremented when recording individual bird mortality
  const batchCheck = await batchService.getBatchById(layerBatch.id);
  assert(
    batchCheck.currentCount === 485,
    'Batch population is not double-decremented by individual bird mortality'
  );

  // -----------------------------------------------------------------
  // TEST 8: DEAD AND SOLD BIRDS CANNOT BE RECORDED AGAIN
  // -----------------------------------------------------------------
  console.log('\n>>> TEST 8: Dead and Sold Birds Cannot Be Recorded Again');
  // Attempt to record death for bird already marked Dead
  let reDeadError = false;
  try {
    await mortalityService.recordMortality({
      recordType: 'BIRD',
      birdId: testBird.id,
      cause: 'Disease',
      date: '2026-10-06',
    });
  } catch (err) {
    reDeadError = true;
  }
  assert(reDeadError, 'Recording mortality for a bird already marked Dead is rejected');

  // Create a sold bird
  const soldBird = await birdService.createBird({
    tagNumber: 'BRD-SOLD-01',
    breed: 'Noiler',
    type: 'Cockerel',
    gender: 'Male',
    houseNumber: 'Layer House Alpha',
    status: 'Sold',
  });

  let soldError = false;
  try {
    await mortalityService.recordMortality({
      recordType: 'BIRD',
      birdId: soldBird.id,
      cause: 'Unknown cause',
      date: '2026-10-06',
    });
  } catch (err) {
    soldError = true;
  }
  assert(soldError, 'Recording mortality for a bird marked Sold is rejected');

  // -----------------------------------------------------------------
  // TEST 9: DUPLICATE SUBMISSIONS ARE PREVENTED
  // -----------------------------------------------------------------
  console.log('\n>>> TEST 9: Duplicate Submissions Prevention (3-second window)');
  // Record a valid mortality
  await mortalityService.recordMortality({
    recordType: 'BATCH',
    batchId: layerBatch.id,
    quantity: 2,
    cause: 'Predators',
    date: '2026-10-07',
    recordedBy: 'Security Guard',
  });

  // Attempt immediate duplicate submission with identical parameters
  let dupBlocked = false;
  try {
    await mortalityService.recordMortality({
      recordType: 'BATCH',
      batchId: layerBatch.id,
      quantity: 2,
      cause: 'Predators',
      date: '2026-10-07',
      recordedBy: 'Security Guard',
    });
  } catch (err) {
    dupBlocked = true;
  }
  assert(dupBlocked, 'Rapid duplicate mortality submission within 3-second window is rejected');

  // -----------------------------------------------------------------
  // TEST 10: ATOMIC TRANSACTION ROLLBACK ON FAILURE
  // -----------------------------------------------------------------
  console.log('\n>>> TEST 10: Atomic Transaction Rollback on Failure');
  const countBeforeFailed = await db.mortalityLogs.count();
  const batchBeforeFailed = await batchService.getBatchById(layerBatch.id);
  const liveBeforeFailed = batchBeforeFailed.currentCount;

  let txFailed = false;
  try {
    // Attempting to record mortality on a non-existent batch throws and rolls back
    await mortalityService.recordMortality({
      recordType: 'BATCH',
      batchId: 999999, // non-existent
      quantity: 5,
      cause: 'Disease',
      date: '2026-10-08',
    });
  } catch {
    txFailed = true;
  }
  assert(txFailed, 'Invalid batch operation throws error');

  const countAfterFailed = await db.mortalityLogs.count();
  const batchAfterFailed = await batchService.getBatchById(layerBatch.id);
  assert(countAfterFailed === countBeforeFailed, 'No orphan mortality record created on failure');
  assert(batchAfterFailed.currentCount === liveBeforeFailed, 'Batch population remained completely untouched on failure');

  // -----------------------------------------------------------------
  // TEST 11: HISTORICAL RECORDS REMAIN ACCESSIBLE & ENRICHED
  // -----------------------------------------------------------------
  console.log('\n>>> TEST 11: Historical Records Accessibility & Enrichment');
  const allLogs = await mortalityService.getMortalityLogs();
  assert(allLogs.length >= 4, `Mortality logs successfully retrieved (count: ${allLogs.length})`);

  const firstEnriched = allLogs.find((l) => l.mortalityId === 'MORT-0002');
  assert(firstEnriched !== undefined, 'Found log MORT-0002 in history');
  assert(firstEnriched.batchCode === 'BAT-0001', 'Enriched with batchCode BAT-0001');
  assert(firstEnriched.penName === 'Layer House Alpha', 'Enriched with penName Layer House Alpha');

  // -----------------------------------------------------------------
  // TEST 12: SEARCH AND FILTERS WORK
  // -----------------------------------------------------------------
  console.log('\n>>> TEST 12: Search and Filters Validation');
  const heatStressLogs = await mortalityService.getMortalityLogs({ cause: 'Heat stress' });
  assert(heatStressLogs.length >= 1, 'Filter by cause "Heat stress" returns matching records');
  assert(heatStressLogs.every((l) => l.cause === 'Heat stress'), 'All filtered records have cause "Heat stress"');

  const batchFilteredLogs = await mortalityService.getMortalityLogs({ batchId: layerBatch.id });
  assert(batchFilteredLogs.length >= 3, 'Filter by batchId returns all records for this batch');

  const birdFilteredLogs = await mortalityService.getMortalityLogs({ recordType: 'BIRD' });
  assert(birdFilteredLogs.length === 1, 'Filter by recordType "BIRD" returns exactly 1 bird record');

  const searchLogs = await mortalityService.getMortalityLogs({ search: 'Predators' });
  assert(searchLogs.length >= 1, 'Search query "Predators" returns matching record');

  // -----------------------------------------------------------------
  // TEST 13: MORTALITY STATISTICS AND RATES ACCURACY
  // -----------------------------------------------------------------
  console.log('\n>>> TEST 13: Mortality Statistics and Rates Accuracy');
  const stats = await mortalityService.getMortalityStats();
  assert(typeof stats.todayDeaths === 'number', 'Stats includes todayDeaths');
  assert(typeof stats.thisMonthDeaths === 'number', 'Stats includes thisMonthDeaths');
  assert(typeof stats.thisYearDeaths === 'number', 'Stats includes thisYearDeaths');
  assert(typeof stats.overallMortalityRate === 'number', 'Stats includes overallMortalityRate');
  assert(Array.isArray(stats.batchStats), 'Stats includes batchStats array');
  assert(stats.batchStats.length >= 1, 'batchStats contains entries');

  const layerBatchStat = stats.batchStats.find((b) => b.id === layerBatch.id);
  assert(layerBatchStat !== undefined, 'batchStats contains Isa Brown layer batch');
  // Deaths logged: 5 + 10 + 2 = 17 deaths. Initial: 500. Rate: (17 / 500) * 100 = 3.4%
  assert(layerBatchStat.deaths === 17, `Batch deaths equals 17 (got ${layerBatchStat.deaths})`);
  assert(layerBatchStat.mortalityRate === 3.4, `Batch mortality rate is (17 / 500) * 100 = 3.4% (got ${layerBatchStat.mortalityRate}%)`);
  assert(layerBatchStat.survivalRate === 96.6, `Batch survival rate is 100 - 3.4 = 96.6% (got ${layerBatchStat.survivalRate}%)`);

  // -----------------------------------------------------------------
  // TEST 14: ZERO-POPULATION CALCULATIONS ARE SAFE
  // -----------------------------------------------------------------
  console.log('\n>>> TEST 14: Zero-Population Division Safety');
  assert(calculateMortalityRate(0, 0) === 0, 'calculateMortalityRate(0, 0) safely returns 0');
  assert(calculateMortalityRate(10, 0) === 0, 'calculateMortalityRate(10, 0) safely returns 0 without division by zero');
  assert(calculateMortalityRate(0, 500) === 0, 'calculateMortalityRate(0, 500) safely returns 0');
  assert(calculateMortalityRate(null, null) === 0, 'calculateMortalityRate(null, null) safely returns 0');

  // -----------------------------------------------------------------
  // TEST 15: DASHBOARD & EARLY WARNING ALERTS
  // -----------------------------------------------------------------
  console.log('\n>>> TEST 15: Early Warning Alerts & Thresholds');
  // Create a batch with elevated mortality (> 5%)
  const highRiskBatch = await batchService.createBatch({
    name: 'High Risk Broiler Batch',
    birdType: 'Broiler',
    breed: 'Cobb 500',
    initialCount: 100,
    currentCount: 100,
    arrivalDate: '2026-02-01',
    penId: pen.id,
    status: 'Active',
  });

  // Log 8 deaths (8 / 100 = 8% mortality rate, which exceeds 5% threshold)
  await mortalityService.recordMortality({
    recordType: 'BATCH',
    batchId: highRiskBatch.id,
    quantity: 8,
    cause: 'Infection',
    date: getLocalDateString(),
    recordedBy: 'Vet',
  });

  const alerts = await mortalityService.getMortalityAlerts();
  const batchAlert = alerts.find((a) => a.batchId === highRiskBatch.id);
  assert(batchAlert !== undefined, 'Elevated batch mortality alert generated for batch with 8% mortality');
  assert(batchAlert.type === 'high_batch_mortality', 'Alert type is high_batch_mortality');

  // Check dbService dashboard integration includes mortality alert
  const dashboardAlerts = await dbService.getAlertsAndReminders();
  const dashMortAlert = dashboardAlerts.find((a) => a.module === 'mortality');
  assert(dashMortAlert !== undefined, 'Dashboard alerts include mortality threshold warning');

  // -----------------------------------------------------------------
  // TEST 16: SAFE EDITING & DELETION WITH POPULATION RESTORATION
  // -----------------------------------------------------------------
  console.log('\n>>> TEST 16: Safe Editing & Deletion with Population Restoration');
  // Batch current count before: 92 (100 - 8)
  const batchBeforeEdit = await batchService.getBatchById(highRiskBatch.id);
  assert(batchBeforeEdit.currentCount === 92, 'Batch current count is 92 before edit');

  // Find the mortality log of 8 birds
  const highRiskLog = (await mortalityService.getMortalityLogs({ batchId: highRiskBatch.id }))[0];

  // Edit log: reduce deaths from 8 to 5 (should restore 3 birds to living count: 92 + 3 = 95)
  await mortalityService.updateMortality(highRiskLog.id, {
    quantity: 5,
    notes: 'Recounted: only 5 birds deceased',
  });

  const batchAfterEdit = await batchService.getBatchById(highRiskBatch.id);
  assert(
    batchAfterEdit.currentCount === 95,
    `Editing mortality from 8 to 5 restores 3 birds (currentCount: 92 -> ${batchAfterEdit.currentCount})`
  );

  // Delete the mortality log: should restore remaining 5 birds to 100 (initialCount)
  await mortalityService.deleteMortality(highRiskLog.id);
  const batchAfterDelete = await batchService.getBatchById(highRiskBatch.id);
  assert(
    batchAfterDelete.currentCount === 100,
    `Deleting mortality log restores remaining 5 birds back to full 100 (got ${batchAfterDelete.currentCount})`
  );

  // Bird deletion test: deleting bird mortality restores bird status to Active
  const birdMortLog = (await mortalityService.getMortalityLogs({ recordType: 'BIRD' }))[0];
  await mortalityService.deleteMortality(birdMortLog.id);
  const restoredBird = await birdService.getBirdById(testBird.id);
  assert(restoredBird.status === 'Active', 'Deleting bird mortality restores bird status to Active');

  // CSV Export verification
  const csv = await mortalityService.exportMortalityCSV();
  assert(csv.includes('Mortality ID,Date,Target Type'), 'CSV export includes expected headers');
  assert(csv.includes('Heat stress'), 'CSV export includes logged causes');

  // -----------------------------------------------------------------
  // TEST 17: STATUS PRESERVATION & RESTORATION (Sick & Quarantined)
  // -----------------------------------------------------------------
  console.log('\n>>> TEST 17: Individual Bird Status Preservation & Restoration (Sick & Quarantined)');
  // Create a bird with status 'Sick'
  const sickBird = await birdService.createBird({
    tagNumber: 'BRD-SICK-01',
    breed: 'Noiler',
    type: 'Cockerel',
    gender: 'Male',
    houseNumber: 'Layer House Alpha',
    status: 'Sick',
  });

  // Record mortality for sick bird
  const sickMort = await mortalityService.recordMortality({
    recordType: 'BIRD',
    birdId: sickBird.id,
    cause: 'Infection',
    symptoms: 'Respiratory wheezing',
    date: '2026-10-15',
  });

  assert(sickMort.previousBirdStatus === 'Sick', 'Mortality record stored previousBirdStatus as Sick');
  assert(sickMort.previousStatus === 'Sick', 'Mortality record stored previousStatus as Sick');

  const sickBirdAfterDead = await birdService.getBirdById(sickBird.id);
  assert(sickBirdAfterDead.status === 'Dead', 'Sick bird status changed to Dead');

  // Delete mortality record: must restore bird back to 'Sick', NOT automatically 'Active'
  await mortalityService.deleteMortality(sickMort.id);
  const sickBirdRestored = await birdService.getBirdById(sickBird.id);
  assert(
    sickBirdRestored.status === 'Sick',
    `Deleting mortality record restores bird to its exact prior status "Sick" (got "${sickBirdRestored.status}")`
  );

  // Create a bird with status 'Quarantined'
  const quarantinedBird = await birdService.createBird({
    tagNumber: 'BRD-QUAR-01',
    breed: 'Bovans Black',
    type: 'Pullet',
    gender: 'Female',
    houseNumber: 'Isolation Pen',
    status: 'Quarantined',
  });

  const quarMort = await mortalityService.recordMortality({
    recordType: 'BIRD',
    birdId: quarantinedBird.id,
    cause: 'Disease',
    symptoms: 'Severe lethargy in isolation',
    date: '2026-10-16',
  });

  assert(quarMort.previousBirdStatus === 'Quarantined', 'Quarantined bird status preserved in record');
  const quarBirdDead = await birdService.getBirdById(quarantinedBird.id);
  assert(quarBirdDead.status === 'Dead', 'Quarantined bird status changed to Dead');

  // Delete mortality record: must restore bird back to 'Quarantined'
  await mortalityService.deleteMortality(quarMort.id);
  const quarBirdRestored = await birdService.getBirdById(quarantinedBird.id);
  assert(
    quarBirdRestored.status === 'Quarantined',
    `Deleting mortality record restores bird to its exact prior status "Quarantined" (got "${quarBirdRestored.status}")`
  );

  // -----------------------------------------------------------------
  // TEST 18: STATUS CONFLICT PROTECTION ON DELETION
  // -----------------------------------------------------------------
  console.log('\n>>> TEST 18: Status Conflict Protection on Bird Mortality Deletion');
  const conflictBird = await birdService.createBird({
    tagNumber: 'BRD-CONF-01',
    breed: 'Isa Brown',
    type: 'Layer',
    gender: 'Female',
    houseNumber: 'Layer House Alpha',
    status: 'Active',
  });

  const confMort = await mortalityService.recordMortality({
    recordType: 'BIRD',
    birdId: conflictBird.id,
    cause: 'Injury',
    date: '2026-10-17',
  });

  // Simulate external or subsequent status change: bird status altered to 'Sold'
  await db.birds.update(conflictBird.id, {
    status: 'Sold',
    updatedAt: new Date().toISOString(),
  });

  // Deleting mortality record must NOT overwrite status back to Active (conflict protection)
  const delRes = await mortalityService.deleteMortality(confMort.id);
  const conflictBirdAfterDel = await birdService.getBirdById(conflictBird.id);
  assert(
    conflictBirdAfterDel.status === 'Sold',
    `Conflict handled safely: bird status remains "Sold" and is not blindly overwritten (got "${conflictBirdAfterDel.status}")`
  );
  assert(delRes.restoredStatus === 'Sold', 'Delete result indicates conflict-preserved status');

  // -----------------------------------------------------------------
  // TEST 19: PREVENTING DUPLICATE ACTIVE MORTALITY LOGS FOR A BIRD
  // -----------------------------------------------------------------
  console.log('\n>>> TEST 19: Preventing Duplicate Active Mortality Records for a Single Bird');
  const singleBird = await birdService.createBird({
    tagNumber: 'BRD-DUPLOG-01',
    breed: 'Cobb 500',
    type: 'Broiler',
    gender: 'Male',
    houseNumber: 'Broiler Shed 1',
    status: 'Active',
  });

  const firstBirdMort = await mortalityService.recordMortality({
    recordType: 'BIRD',
    birdId: singleBird.id,
    cause: 'Infection',
    date: '2026-10-18',
  });
  assert(firstBirdMort !== undefined, 'First mortality record logged successfully');

  // Attempt to record a second mortality log for the same bird
  let dupBirdMortError = false;
  try {
    await mortalityService.recordMortality({
      recordType: 'BIRD',
      birdId: singleBird.id,
      cause: 'Heat stress',
      date: '2026-10-19',
    });
  } catch (err) {
    dupBirdMortError = true;
  }
  assert(dupBirdMortError, 'Recording a second active mortality record for the same bird is strictly blocked');

  // -----------------------------------------------------------------
  // TEST 20: INDIVIDUAL MORTALITY EDITING & BIRD REASSIGNMENT
  // -----------------------------------------------------------------
  console.log('\n>>> TEST 20: Individual Mortality Editing & Bird Reassignment');
  // Bird A (starts Sick, marked dead)
  const birdA = await birdService.createBird({
    tagNumber: 'BRD-REASS-A',
    breed: 'Noiler',
    type: 'Layer',
    gender: 'Female',
    houseNumber: 'Layer House Alpha',
    status: 'Sick',
  });

  // Bird B (starts Quarantined, living)
  const birdB = await birdService.createBird({
    tagNumber: 'BRD-REASS-B',
    breed: 'Noiler',
    type: 'Layer',
    gender: 'Female',
    houseNumber: 'Isolation Pen',
    status: 'Quarantined',
  });

  // Record mortality for Bird A
  const reassignMort = await mortalityService.recordMortality({
    recordType: 'BIRD',
    birdId: birdA.id,
    cause: 'Disease',
    symptoms: 'Diarrhea',
    date: '2026-10-20',
  });

  const birdABeforeReassign = await birdService.getBirdById(birdA.id);
  assert(birdABeforeReassign.status === 'Dead', 'Bird A marked as Dead');

  // Edit mortality record: reassign to Bird B
  const updatedMort = await mortalityService.updateMortality(reassignMort.id, {
    birdId: birdB.id,
    cause: 'Injury',
    notes: 'Reassigned from Bird A to Bird B due to tag mismatch',
  });

  assert(Number(updatedMort.birdId) === birdB.id, 'Mortality log reassigned to Bird B');
  assert(updatedMort.cause === 'Injury', 'Updated cause to Injury');
  assert(updatedMort.previousValues !== undefined, 'Audit trail previousValues stored on record');
  assert(Number(updatedMort.previousValues.birdId) === birdA.id, 'Audit trail records original birdId Bird A');

  // Bird A should be restored to its prior status ('Sick')
  const birdAAfterReassign = await birdService.getBirdById(birdA.id);
  assert(
    birdAAfterReassign.status === 'Sick',
    `Bird A restored to prior status "Sick" on reassignment (got "${birdAAfterReassign.status}")`
  );

  // Bird B should now be marked 'Dead'
  const birdBAfterReassign = await birdService.getBirdById(birdB.id);
  assert(
    birdBAfterReassign.status === 'Dead',
    `Bird B updated to status "Dead" on reassignment (got "${birdBAfterReassign.status}")`
  );

  // Create another bird already marked Dead
  const deadBirdC = await birdService.createBird({
    tagNumber: 'BRD-REASS-C-DEAD',
    breed: 'Noiler',
    type: 'Layer',
    gender: 'Female',
    houseNumber: 'Isolation Pen',
    status: 'Dead',
  });

  // Attempting to reassign to an already dead bird should throw
  let reassignDeadError = false;
  try {
    await mortalityService.updateMortality(reassignMort.id, {
      birdId: deadBirdC.id,
    });
  } catch {
    reassignDeadError = true;
  }
  assert(reassignDeadError, 'Reassigning mortality to an already dead bird is rejected');

  // Also test reassigning to a sold bird
  const soldBirdD = await birdService.createBird({
    tagNumber: 'BRD-REASS-D-SOLD',
    breed: 'Noiler',
    type: 'Layer',
    gender: 'Female',
    houseNumber: 'Layer House Alpha',
    status: 'Sold',
  });

  let reassignSoldError = false;
  try {
    await mortalityService.updateMortality(reassignMort.id, {
      birdId: soldBirdD.id,
    });
  } catch {
    reassignSoldError = true;
  }
  assert(reassignSoldError, 'Reassigning mortality to a sold bird is rejected');

  // Clean up reassign mort
  await mortalityService.deleteMortality(reassignMort.id);
  const birdBRestored = await birdService.getBirdById(birdB.id);
  assert(birdBRestored.status === 'Quarantined', 'Bird B restored to "Quarantined" after deleting reassigned mort');

  // -----------------------------------------------------------------
  // TEST 21: PERIOD-ACCURATE OPENING POPULATION AT RISK & SAFE DIVISION
  // -----------------------------------------------------------------
  console.log('\n>>> TEST 21: Period-Accurate Opening Population at Risk & Safe Division');
  // Create a test cohort batch with known arrival date
  const periodBatch = await batchService.createBatch({
    name: 'Period Rate Test Cohort',
    birdType: 'Broiler',
    breed: 'Ross 308',
    initialCount: 200,
    currentCount: 200,
    arrivalDate: '2026-08-01',
    penId: pen.id,
    status: 'Active',
  });

  // Log 10 deaths before September 2026 (prior to period)
  await mortalityService.recordMortality({
    recordType: 'BATCH',
    batchId: periodBatch.id,
    quantity: 10,
    cause: 'Infection',
    date: '2026-08-15',
  });

  // Log 5 deaths during September 2026 (within period)
  await mortalityService.recordMortality({
    recordType: 'BATCH',
    batchId: periodBatch.id,
    quantity: 5,
    cause: 'Heat stress',
    date: '2026-09-10',
  });

  // Query mortality statistics for the period 2026-09-01 to 2026-09-30
  const periodStats = await mortalityService.getMortalityStats({
    startDate: '2026-09-01',
    endDate: '2026-09-30',
  });

  const cohortStat = periodStats.batchStats.find((b) => b.id === periodBatch.id);
  assert(cohortStat !== undefined, 'Cohort batch found in period statistics');
  assert(cohortStat.priorDeaths === 10, `Prior deaths before 2026-09-01 is 10 (got ${cohortStat.priorDeaths})`);
  assert(
    cohortStat.openingPopulation === 190,
    `Opening population at risk is 200 - 10 = 190 (got ${cohortStat.openingPopulation})`
  );
  assert(cohortStat.deaths === 5, `Period deaths in September is 5 (got ${cohortStat.deaths})`);

  // Rate: (5 / 190) * 100 = 2.63%
  const expectedRate = Number(((5 / 190) * 100).toFixed(2)); // 2.63
  assert(
    cohortStat.mortalityRate === expectedRate,
    `Period mortality rate is (5 / 190) * 100 = ${expectedRate}% (got ${cohortStat.mortalityRate}%)`
  );

  // Test zero population at risk safety
  const depletedBatch = await batchService.createBatch({
    name: 'Depleted Test Cohort',
    birdType: 'Broiler',
    breed: 'Cobb 500',
    initialCount: 5,
    currentCount: 5,
    arrivalDate: '2026-08-01',
    penId: pen.id,
    status: 'Active',
  });

  // All 5 die before September
  await mortalityService.recordMortality({
    recordType: 'BATCH',
    batchId: depletedBatch.id,
    quantity: 5,
    cause: 'Disease',
    date: '2026-08-20',
  });

  const depletedStats = await mortalityService.getMortalityStats({
    startDate: '2026-09-01',
    endDate: '2026-09-30',
  });

  const depCohort = depletedStats.batchStats.find((b) => b.id === depletedBatch.id);
  assert(depCohort !== undefined, 'Depleted cohort found in stats');
  assert(depCohort.openingPopulation === 0, 'Depleted cohort has opening population of 0');
  assert(depCohort.mortalityRate === 0.0, 'Depleted cohort has safe 0.0% rate without division by zero error');
  assert(
    depCohort.rateLimitation.includes('Opening population at risk is zero'),
    'Includes informative rateLimitation note'
  );

  // -----------------------------------------------------------------
  // TEST 22: HISTORICAL RECORD PROTECTION & AUDIT TRAIL
  // -----------------------------------------------------------------
  console.log('\n>>> TEST 22: Historical Record Protection & Audit Trail');
  // Create a batch mortality log and edit multiple fields
  const auditTestLog = await mortalityService.recordMortality({
    recordType: 'BATCH',
    batchId: layerBatch.id,
    quantity: 3,
    cause: 'Disease',
    symptoms: 'Initial symptoms',
    notes: 'Initial notes',
    date: '2026-10-25',
    recordedBy: 'Auditor Emeka',
  });

  const updatedAuditLog = await mortalityService.updateMortality(auditTestLog.id, {
    quantity: 2,
    cause: 'Infection',
    symptoms: 'Refined diagnosis: Bacterial enteritis',
    notes: 'Confirmed by laboratory necropsy',
    recordedBy: 'Chief Vet Officer',
  });

  assert(updatedAuditLog.previousValues !== undefined, 'Updated record retains previousValues audit trail');
  assert(updatedAuditLog.previousValues.quantity === 3, 'Audit trail recorded previous quantity 3');
  assert(updatedAuditLog.previousValues.cause === 'Disease', 'Audit trail recorded previous cause Disease');
  assert(updatedAuditLog.previousValues.recordedBy === 'Auditor Emeka', 'Audit trail recorded original recordedBy');
  assert(updatedAuditLog.recordedBy === 'Chief Vet Officer', 'Current recordedBy updated to Chief Vet Officer');
  assert(updatedAuditLog.updatedAt !== undefined, 'updatedAt timestamp recorded');

  // Clean up audit test log
  await mortalityService.deleteMortality(auditTestLog.id);

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
