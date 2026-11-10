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
  DB_NAME,
  DB_VERSION,
} from '../src/database/schema.js';
import {
  vaccineService,
  VACCINE_TYPES,
  ADMINISTRATION_METHODS,
  VACCINE_UNITS,
  VACCINE_STATUSES,
  SCHEDULE_STATUSES,
  calculateExpectedVaccinationDate,
} from '../src/services/vaccineService.js';
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
  console.log(' FRESHNEST POULTRY FARM: MODULE 07 AUDIT & TESTS');
  console.log('====================================================\n');

  // -----------------------------------------------------------------
  // TEST 1: DATABASE SCHEMA MIGRATION (V1 -> V2 -> V3 -> V4 -> V5 -> V6 -> V7)
  // -----------------------------------------------------------------
  console.log('>>> TEST 1: Database Migration & Schema V7 Preservation');
  const migDbName = 'test_freshnest_v7_migration_db';

  // Create V1 DB
  let migDb = new Dexie(migDbName);
  migDb.version(1).stores(SCHEMA_V1);
  await migDb.open();
  await migDb.birds.add({ tagNumber: 'V1-BIRD', breed: 'Isa Brown', status: 'Active' });
  await migDb.batches.add({ batchCode: 'V1-BATCH', initialCount: 200, status: 'Active' });
  await migDb.feeds.add({ name: 'V1 Mash', type: 'Layer Mash', currentStock: 50 });
  await migDb.medications.add({ name: 'V1 Tylosin', type: 'Antibiotic', currentStock: 10 });
  await migDb.close();

  // Upgrade through V2, V3, V4, V5, V6 to V7
  migDb = new Dexie(migDbName);
  migDb.version(1).stores(SCHEMA_V1);
  migDb.version(2).stores(SCHEMA_V2);
  migDb.version(3).stores(SCHEMA_V3);
  migDb.version(4).stores(SCHEMA_V4);
  migDb.version(5).stores(SCHEMA_V5);
  migDb.version(6).stores(SCHEMA_V6);
  migDb.version(7).stores(SCHEMA_V7);
  await migDb.open();

  assert(migDb.verno === 7, 'Database successfully upgrades to version 7');
  assert(DB_VERSION >= 7, 'schema.js DB_VERSION constant is set to 7 or higher');

  // Verify preserved data
  const preservedBird = await migDb.birds.where('tagNumber').equals('V1-BIRD').first();
  const preservedBatch = await migDb.batches.where('batchCode').equals('V1-BATCH').first();
  const preservedFeed = await migDb.feeds.where('name').equals('V1 Mash').first();
  const preservedMed = await migDb.medications.where('name').equals('V1 Tylosin').first();

  assert(preservedBird !== undefined, 'V1 Bird record preserved in V7');
  assert(preservedBatch !== undefined, 'V1 Batch record preserved in V7');
  assert(preservedFeed !== undefined, 'V1 Feed record preserved in V7');
  assert(preservedMed !== undefined, 'V1 Medication record preserved in V7');

  // Verify new tables in V7
  assert(typeof migDb.vaccines !== 'undefined', 'vaccines table is registered in V7');
  assert(typeof migDb.vaccinePurchases !== 'undefined', 'vaccinePurchases table is registered in V7');
  assert(typeof migDb.vaccinationSchedules !== 'undefined', 'vaccinationSchedules table is registered in V7');
  assert(typeof migDb.vaccinationLogs !== 'undefined', 'vaccinationLogs table is registered in V7');

  await migDb.close();
  await Dexie.delete(migDbName);

  // -----------------------------------------------------------------
  // PREPARE ACTIVE TEST DATABASE
  // -----------------------------------------------------------------
  console.log('\n>>> Setting up active test environment');
  await db.open();
  // Clear tables to start clean for module test
  await db.vaccines.clear();
  await db.vaccinePurchases.clear();
  await db.vaccinationSchedules.clear();
  await db.vaccinationLogs.clear();
  await db.batches.clear();
  await db.pens.clear();
  await db.birds.clear();

  // Create prerequisite pen and batch
  const testPen = await penService.createPen({
    name: 'Brooder House A',
    type: 'Brooder',
    capacity: 2500,
    location: 'North Wing',
  });

  const arrivalDate = '2026-10-01';
  const testBatch = await batchService.createBatch({
    name: 'Broiler Flock Test 01',
    batchCode: 'BAT-VACTEST-01',
    birdType: 'Broiler',
    breed: 'Cobb 500',
    initialCount: 1000,
    currentCount: 1000,
    arrivalDate: arrivalDate,
    penId: testPen.penId,
    supplier: 'Zartech Hatchery',
  });

  // -----------------------------------------------------------------
  // TEST 2: MONOTONIC UNIQUE ID GENERATION
  // -----------------------------------------------------------------
  console.log('\n>>> TEST 2: Monotonic Unique ID Generation');
  const vacId1 = await vaccineService.generateVaccineId();
  const vacId2 = await vaccineService.generateVaccineId();
  assert(vacId1.startsWith('VAC-'), 'Vaccine ID starts with VAC- prefix');
  assert(vacId1 === 'VAC-0001', 'First Vaccine ID is VAC-0001');

  const purId1 = await vaccineService.generatePurchaseId();
  assert(purId1 === 'VPUR-0001', 'First Purchase ID is VPUR-0001');

  const schId1 = await vaccineService.generateScheduleId();
  assert(schId1 === 'VSCH-0001', 'First Schedule ID is VSCH-0001');

  const logId1 = await vaccineService.generateLogId();
  assert(logId1 === 'VLOG-0001', 'First Log ID is VLOG-0001');

  // -----------------------------------------------------------------
  // TEST 3: VACCINE CATALOG CREATION & CRUD
  // -----------------------------------------------------------------
  console.log('\n>>> TEST 3: Vaccine Catalog Creation & CRUD Operations');
  const futureExpiry = new Date(Date.now() + 180 * 86400000).toISOString().slice(0, 10);

  const newVac = await vaccineService.createVaccine({
    name: 'Newcastle LaSota Clone 30',
    targetDisease: 'Newcastle Disease',
    manufacturer: 'NVRI Vom',
    vaccineType: 'Live Attenuated',
    administrationMethod: 'Drinking Water',
    dosageInstructions: '1 dose per bird in chlorine-free water',
    recommendedAgeDays: 14,
    unit: 'vial',
    currentStock: 10,
    reorderLevel: 5,
    costPerUnit: 4500,
    lotNumber: 'NVRI-26-001',
    storageTemperature: '2°C – 8°C (Refrigerated)',
    packSize: '1,000 doses / vial',
    expiryDate: futureExpiry,
    notes: 'Keep frozen until reconstitution',
  });

  assert(newVac.vaccineId === 'VAC-0001', 'Vaccine created with generated ID VAC-0001');
  assert(newVac.currentStock === 10, 'Vaccine initial stock stored correctly');
  assert(newVac.costPerUnit === 4500, 'Vaccine unit cost in ₦ stored correctly');

  // Validation: Missing name throws error
  let missingNameError = false;
  try {
    await vaccineService.createVaccine({ targetDisease: 'Gumboro' });
  } catch (err) {
    missingNameError = true;
  }
  assert(missingNameError, 'Creating vaccine without name throws validation error');

  // Validation: Negative stock throws error
  let negativeStockError = false;
  try {
    await vaccineService.createVaccine({ name: 'Bad Vac', currentStock: -5 });
  } catch (err) {
    negativeStockError = true;
  }
  assert(negativeStockError, 'Creating vaccine with negative stock throws error');

  // Update vaccine
  const updatedVac = await vaccineService.updateVaccine(newVac.id, {
    reorderLevel: 8,
    costPerUnit: 4800,
  });
  assert(updatedVac.reorderLevel === 8, 'Vaccine reorder level updated successfully');
  assert(updatedVac.costPerUnit === 4800, 'Vaccine cost updated successfully');

  // -----------------------------------------------------------------
  // TEST 4: VACCINE PURCHASE (STOCK-IN) & LEDGER TRANSACTION
  // -----------------------------------------------------------------
  console.log('\n>>> TEST 4: Vaccine Stock-In Purchase & Atomic Increment');
  const purchaseRes = await vaccineService.recordVaccinePurchase({
    vaccineId: newVac.vaccineId,
    supplier: 'Chi Pharmaceuticals Ltd',
    purchaseDate: '2026-11-01',
    invoiceNumber: 'INV-CHI-9921',
    quantity: 15,
    unitCost: 4600,
    lotNumber: 'CHI-NV-402',
    expiryDate: futureExpiry,
    coldChainVerified: true,
    storageTemperature: '2°C – 8°C (Refrigerated)',
    notes: 'Delivered in temperature-controlled cooler box with ice packs',
  });

  assert(purchaseRes.purchaseId === 'VPUR-0001', 'Purchase recorded with ID VPUR-0001');
  assert(purchaseRes.totalCost === 15 * 4600, 'Total cost calculated accurately: 15 * 4,600 = ₦69,000');

  // Verify atomic stock increment on parent vaccine
  const vacAfterPurchase = await vaccineService.getVaccineById(newVac.vaccineId);
  assert(vacAfterPurchase.currentStock === 25, 'Vaccine stock atomically increased from 10 to 25');

  // Duplicate invoice check
  let dupInvoiceBlocked = false;
  try {
    await vaccineService.recordVaccinePurchase({
      vaccineId: newVac.vaccineId,
      supplier: 'Chi Pharmaceuticals Ltd',
      invoiceNumber: 'INV-CHI-9921',
      quantity: 5,
    });
  } catch (err) {
    dupInvoiceBlocked = true;
  }
  assert(dupInvoiceBlocked, 'Duplicate invoice number from same supplier is blocked');

  // -----------------------------------------------------------------
  // TEST 5: COHORT SCHEDULING & EXPECTED DATE CALCULATION
  // -----------------------------------------------------------------
  console.log('\n>>> TEST 5: Vaccination Cohort Scheduling & Age Calculation');
  // Batch arrived on 2026-10-01, target age 14 days -> Expected: 2026-10-15
  const expectedDate = calculateExpectedVaccinationDate('2026-10-01', 14);
  assert(expectedDate === '2026-10-15', 'Expected vaccination date calculated accurately: Oct 01 + 14 days = Oct 15');

  const futureScheduleDate = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);
  const futureScheduleRes = await vaccineService.createVaccinationSchedule({
    batchId: testBatch.batchId,
    vaccineId: newVac.vaccineId,
    scheduledDate: futureScheduleDate,
    targetAgeDays: 14,
    assignedStaff: 'Dr. Alabi (Veterinary Officer)',
  });
  assert(futureScheduleRes.status === 'Scheduled', 'Future schedule status is Scheduled');

  const scheduleRes = await vaccineService.createVaccinationSchedule({
    batchId: testBatch.batchId,
    vaccineId: newVac.vaccineId,
    scheduledDate: '2026-10-15',
    targetAgeDays: 14,
    assignedStaff: 'Dr. Alabi (Veterinary Officer)',
    notes: 'Administer via drinking water early morning before 8 AM',
  });

  assert(scheduleRes.scheduleId.startsWith('VSCH-'), 'Schedule created with ID VSCH- prefix');
  assert(scheduleRes.status === 'Overdue', 'Past schedule (2026-10-15) automatically marked Overdue');
  assert(scheduleRes.batchName === testBatch.batchCode || scheduleRes.batchName === testBatch.name, 'Schedule denormalized batchName correctly');

  // Reschedule
  const rescheduled = await vaccineService.updateVaccinationSchedule(scheduleRes.scheduleId, {
    scheduledDate: '2026-10-16',
    notes: 'Rescheduled 1 day due to extreme ambient heat',
  });
  assert(rescheduled.scheduledDate === '2026-10-16', 'Scheduled date updated via updateVaccinationSchedule');

  // -----------------------------------------------------------------
  // TEST 6: VACCINATION ALERTS (DUE TODAY, OVERDUE, EXPIRED, LOW STOCK)
  // -----------------------------------------------------------------
  console.log('\n>>> TEST 6: Automated Alerts & Reminders Detection');
  // Today's date string
  const todayStr = new Date().toISOString().slice(0, 10);

  // Create a schedule due today
  await vaccineService.createVaccinationSchedule({
    batchId: testBatch.batchId,
    vaccineId: newVac.vaccineId,
    scheduledDate: todayStr,
    targetAgeDays: 28,
  });

  const alerts = await vaccineService.getVaccinationAlerts();
  assert(alerts.overdue.length >= 1, 'Overdue schedule (2026-10-16) identified in alerts');
  assert(alerts.dueToday.length >= 1, 'Due today schedule identified in alerts');

  // -----------------------------------------------------------------
  // TEST 7: SAFE VACCINATION ADMINISTRATION & STOCK DECREMENT
  // -----------------------------------------------------------------
  console.log('\n>>> TEST 7: Vaccination Administration & Biosecurity Enforcement');
  // Administer 10 vials to batch
  const adminRes = await vaccineService.recordVaccination({
    scheduleId: scheduleRes.scheduleId,
    batchId: testBatch.batchId,
    vaccineId: newVac.vaccineId,
    quantity: 10,
    birdsVaccinated: 1000,
    administrationMethod: 'Drinking Water',
    administeredBy: 'Dr. Alabi',
    lotNumber: 'CHI-NV-402',
    administeredDate: new Date().toISOString(),
    reactionsObserved: 'Flock healthy, normal water uptake with skimmed milk stabilizer',
  });

  assert(adminRes.logId === 'VLOG-0001', 'Administration logged with ID VLOG-0001');

  // Check parent stock was decremented from 25 to 15
  const vacAfterAdmin = await vaccineService.getVaccineById(newVac.vaccineId);
  assert(vacAfterAdmin.currentStock === 15, 'Vaccine stock decremented atomically: 25 - 10 = 15');

  // Check linked schedule is marked 'Completed'
  const linkedSched = await db.vaccinationSchedules.where('scheduleId').equals(scheduleRes.scheduleId).first();
  assert(linkedSched.status === 'Completed', 'Linked schedule marked as Completed upon administration');

  // Insufficient stock prevention: try administering 20 when stock is 15
  let insufficientStockBlocked = false;
  try {
    await vaccineService.recordVaccination({
      batchId: testBatch.batchId,
      vaccineId: newVac.vaccineId,
      quantity: 20,
      administrationMethod: 'Drinking Water',
    });
  } catch (err) {
    insufficientStockBlocked = true;
  }
  assert(insufficientStockBlocked, 'Administering more doses than available stock is rejected');

  // Strict biosecurity block: NEVER administer expired vaccine
  console.log('\n>>> TEST 8: Biosecurity Rule: Strict Expired Vaccine Administration Block');
  const expiredVac = await vaccineService.createVaccine({
    name: 'Old Gumboro Vaccine',
    targetDisease: 'Infectious Bursal Disease (Gumboro)',
    vaccineType: 'Live Attenuated',
    administrationMethod: 'Drinking Water',
    unit: 'vial',
    currentStock: 20,
    reorderLevel: 5,
    expiryDate: '2025-01-01', // Expired
  });

  let expiredAdminBlocked = false;
  let blockErrorMessage = '';
  try {
    await vaccineService.recordVaccination({
      batchId: testBatch.batchId,
      vaccineId: expiredVac.vaccineId,
      quantity: 2,
      administrationMethod: 'Drinking Water',
    });
  } catch (err) {
    expiredAdminBlocked = true;
    blockErrorMessage = err.message;
  }
  assert(expiredAdminBlocked, 'Expired vaccine administration is strictly blocked');
  assert(blockErrorMessage.toLowerCase().includes('expired'), 'Error message clearly references biosecurity expiration block');

  // -----------------------------------------------------------------
  // TEST 9: INTEGRITY-PRESERVING SAFE DELETION & ARCHIVING
  // -----------------------------------------------------------------
  console.log('\n>>> TEST 9: Referential Integrity Deletion Guard & Archiving');
  // Attempting to delete newVac (referenced in purchases, schedules, and logs)
  let refDeleteBlocked = false;
  try {
    await vaccineService.deleteVaccine(newVac.id);
  } catch (err) {
    refDeleteBlocked = true;
  }
  assert(refDeleteBlocked, 'Deleting vaccine referenced in history/schedules is prevented');

  // Archiving referenced vaccine succeeds
  const archivedVac = await vaccineService.archiveVaccine(newVac.id);
  assert(archivedVac.status === 'Archived', 'Archiving vaccine sets status to Archived without losing records');

  // Deleting an unreferenced vaccine succeeds
  const disposableVac = await vaccineService.createVaccine({
    name: 'Disposable Test Vac',
    targetDisease: 'Other',
    vaccineType: 'Other',
    administrationMethod: 'Other',
    unit: 'vial',
    currentStock: 0,
    reorderLevel: 0,
  });
  const delSuccess = await vaccineService.deleteVaccine(disposableVac.id);
  assert(delSuccess === true, 'Deleting unreferenced vaccine succeeds');
  const verifyDeleted = await vaccineService.getVaccineById(disposableVac.vaccineId);
  assert(verifyDeleted === null, 'Deleted vaccine is no longer in database');

  // -----------------------------------------------------------------
  // TEST 10: VACCINATION STATISTICS & NGN VALUATION
  // -----------------------------------------------------------------
  console.log('\n>>> TEST 10: Valuation in Nigerian Naira (₦) & Dashboard Stats');
  const stats = await vaccineService.getVaccinationStatistics();
  assert(stats.totalVaccines >= 2, 'Total vaccine count reported accurately');
  assert(stats.totalStockDoses > 0, 'Total stock doses calculated accurately');
  assert(stats.completedCount >= 1, 'Completed events count accurate');
  assert(typeof stats.inventoryValuation === 'number' && stats.inventoryValuation > 0, 'Inventory valuation calculated in ₦');

  // -----------------------------------------------------------------
  // TEST 11: ADVANCED AGE REFERENCE & TARGET DATE ACCURACY
  // -----------------------------------------------------------------
  console.log('\n>>> TEST 11: Batch Age at Arrival & Multi-Reference Date Calculation');
  // 1. Batch with known hatchDate (Oct 01) and arrivalDate (Oct 05) - 4 days old at placement
  const batchHatchAndArrival = {
    hatchDate: '2026-10-01',
    arrivalDate: '2026-10-05',
    birdType: 'Broiler',
  };
  const targetDateWithHatch = calculateExpectedVaccinationDate(batchHatchAndArrival, 14);
  assert(targetDateWithHatch === '2026-10-15', 'Vaccination date references true hatch date (Oct 01 + 14 = Oct 15), not arrival date');

  // 2. Started pullets batch arriving at age 28 days (4 weeks old) on 2026-10-01
  const pulletBatch = {
    arrivalDate: '2026-10-01',
    ageAtArrivalDays: 28,
    birdType: 'Pullet',
  };
  // Target age 42 days (6 weeks old) -> needs 42 - 28 = 14 additional days from arrival -> Oct 15
  const pulletTargetDate = calculateExpectedVaccinationDate(pulletBatch, 42);
  assert(pulletTargetDate === '2026-10-15', 'Started pullet calculation accounts for age at arrival: 28 days old + 14 days = 42 days (Oct 15)');

  // 3. Batch with missing age information returns null (does not silently generate inaccurate date)
  const unknownAgeBatch = {
    birdType: 'Other',
    notes: 'Rescued flock with unknown hatch history',
  };
  const unknownTargetDate = calculateExpectedVaccinationDate(unknownAgeBatch, 14);
  assert(unknownTargetDate === null, 'Missing batch age information returns null, preventing silent inaccurate date generation');

  // -----------------------------------------------------------------
  // TEST 12: LIVING BATCH POPULATION & INDIVIDUAL BIRD STATUS INTEGRITY
  // -----------------------------------------------------------------
  console.log('\n>>> TEST 12: Living Batch Population Limit & Bird Status Protection');
  // Attempt to vaccinate more birds than living batch population (1500 > 1000)
  let overPopulationBlocked = false;
  try {
    await vaccineService.recordVaccination({
      batchId: testBatch.batchId,
      vaccineId: newVac.vaccineId,
      quantity: 5,
      birdsVaccinated: 1500, // Exceeds 1000 living birds
      administrationMethod: 'Drinking Water',
    });
  } catch (err) {
    overPopulationBlocked = true;
  }
  assert(overPopulationBlocked, 'Administering vaccination to more birds than living batch population is strictly rejected');

  // Register an individual bird and test vaccination
  const testBird = await birdService.createBird({
    tagNumber: 'BRD-VAC-01',
    name: 'Hen Alpha',
    type: 'Layer',
    breed: 'Isa Brown',
    gender: 'Female',
    status: 'Active',
    houseNumber: testPen.name,
  });

  const birdAdminRes = await vaccineService.recordVaccination({
    targetType: 'bird',
    birdId: testBird.birdId,
    vaccineId: newVac.vaccineId,
    quantity: 1,
    administrationMethod: 'Eye Drop',
  });
  assert(birdAdminRes.logId.startsWith('VLOG-'), 'Vaccination recorded successfully for individual bird');

  // Deceased bird protection
  const deadBird = await birdService.createBird({
    tagNumber: 'BRD-VAC-DEAD',
    name: 'Hen Omega',
    type: 'Layer',
    breed: 'Isa Brown',
    gender: 'Female',
    status: 'Dead',
    houseNumber: testPen.name,
  });

  let deadBirdBlocked = false;
  try {
    await vaccineService.recordVaccination({
      targetType: 'bird',
      birdId: deadBird.birdId,
      vaccineId: newVac.vaccineId,
      quantity: 1,
      administrationMethod: 'Eye Drop',
    });
  } catch (err) {
    deadBirdBlocked = true;
  }
  assert(deadBirdBlocked, 'Vaccinating a deceased or sold bird is rejected');

  // -----------------------------------------------------------------
  // TEST 13: ACTUAL ADMINISTRATION DATE EXPIRY CHECK
  // -----------------------------------------------------------------
  console.log('\n>>> TEST 13: Expiry Check Against Actual Administration Date');
  const pastVac = await vaccineService.createVaccine({
    name: 'Historic Vaccine',
    targetDisease: 'Newcastle Disease (ND)',
    vaccineType: 'Live Attenuated',
    administrationMethod: 'Drinking Water',
    unit: 'vial',
    currentStock: 10,
    reorderLevel: 2,
    expiryDate: '2026-06-01', // Expired on June 1
  });

  // Attempt administration on July 10, 2026 (after expiry)
  let adminAfterExpiryBlocked = false;
  try {
    await vaccineService.recordVaccination({
      batchId: testBatch.batchId,
      vaccineId: pastVac.vaccineId,
      quantity: 1,
      administeredDate: '2026-07-10T09:00:00.000Z',
    });
  } catch (err) {
    adminAfterExpiryBlocked = true;
  }
  assert(adminAfterExpiryBlocked, 'Administering vaccine on a date after its expiry date is blocked by biosecurity');

  // -----------------------------------------------------------------
  // TEST 14: DOUBLE-SUBMISSION / RAPID DUPLICATE PREVENTION
  // -----------------------------------------------------------------
  console.log('\n>>> TEST 14: Double-Click & Rapid Duplicate Submission Prevention');
  let duplicateSubmissionBlocked = false;
  try {
    // Record first valid administration
    await vaccineService.recordVaccination({
      batchId: testBatch.batchId,
      vaccineId: newVac.vaccineId,
      quantity: 1,
      administeredDate: '2026-11-03T10:00:00.000Z',
    });
    // Attempt duplicate submission with exact same parameters immediately
    await vaccineService.recordVaccination({
      batchId: testBatch.batchId,
      vaccineId: newVac.vaccineId,
      quantity: 1,
      administeredDate: '2026-11-03T10:00:00.000Z',
    });
  } catch (err) {
    duplicateSubmissionBlocked = true;
  }
  assert(duplicateSubmissionBlocked, 'Duplicate administration submission is rejected to prevent double stock decrement');

  // -----------------------------------------------------------------
  // TEST 15: COMPLETED & CANCELLED SCHEDULES NEVER SHOWN AS OVERDUE
  // -----------------------------------------------------------------
  console.log('\n>>> TEST 15: Status Accuracy (Completed/Cancelled Never Overdue)');
  const pastDate = '2026-09-01'; // Past date
  const completedSched = await vaccineService.createVaccinationSchedule({
    batchId: testBatch.batchId,
    vaccineId: newVac.vaccineId,
    scheduledDate: pastDate,
  });
  await vaccineService.updateVaccinationSchedule(completedSched.scheduleId, { status: 'Completed' });

  const cancelledSched = await vaccineService.createVaccinationSchedule({
    batchId: testBatch.batchId,
    vaccineId: newVac.vaccineId,
    scheduledDate: pastDate,
  });
  await vaccineService.cancelVaccinationSchedule(cancelledSched.scheduleId, 'Flock already has high maternal antibodies');

  const alertsRefreshed = await vaccineService.getVaccinationAlerts();
  const completedInOverdue = alertsRefreshed.overdue.some((s) => s.scheduleId === completedSched.scheduleId);
  const cancelledInOverdue = alertsRefreshed.overdue.some((s) => s.scheduleId === cancelledSched.scheduleId);
  assert(!completedInOverdue, 'Completed schedule is not shown as overdue');
  assert(!cancelledInOverdue, 'Cancelled schedule is not shown as overdue');

  // -----------------------------------------------------------------
  // TEST 16: COLD CHAIN WARNING DETECTION
  // -----------------------------------------------------------------
  console.log('\n>>> TEST 16: Cold Chain Storage Information Warnings');
  const noStorageVac = await vaccineService.createVaccine({
    name: 'Unspecified Temp Vaccine',
    targetDisease: 'Other',
    vaccineType: 'Other',
    administrationMethod: 'Other',
    unit: 'vial',
    currentStock: 5,
    reorderLevel: 2,
    storageTemperature: 'Unspecified',
  });
  const alertsWithStorage = await vaccineService.getVaccinationAlerts();
  const hasStorageWarning = alertsWithStorage.storageWarnings && alertsWithStorage.storageWarnings.some((a) => a.vaccineId === noStorageVac.vaccineId);
  assert(hasStorageWarning, 'Vaccine with unspecified storage temperature produces a clear cold chain warning');

  // -----------------------------------------------------------------
  // TEST 17: IMMUTABILITY OF HISTORICAL VACCINATION LOGS UPON BATCH UPDATE
  // -----------------------------------------------------------------
  console.log('\n>>> TEST 17: Immutability of Historical Vaccination Records');
  const logsBeforeBatchUpdate = await db.vaccinationLogs.toArray();
  const logCountBefore = logsBeforeBatchUpdate.length;

  // Update batch details (e.g. moving pen or changing notes)
  await batchService.updateBatch(testBatch.id, {
    notes: 'Updated flock notes after week 4 review',
  });

  const logsAfterBatchUpdate = await db.vaccinationLogs.toArray();
  assert(logsAfterBatchUpdate.length === logCountBefore, 'Historical vaccination logs count remains unchanged after batch updates');
  assert(logsAfterBatchUpdate[0].logId === logsBeforeBatchUpdate[0].logId, 'First vaccination log retains its exact immutable logId');
  assert(logsAfterBatchUpdate[0].quantity === logsBeforeBatchUpdate[0].quantity, 'Vaccination log doses administered remain unaltered');

  // -----------------------------------------------------------------
  // SUMMARY
  // -----------------------------------------------------------------
  console.log('\n====================================================');
  console.log(` AUDIT COMPLETE: ${passedTests} passed, ${failedTests} failed`);
  console.log('====================================================');

  if (failedTests > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runAudit().catch((err) => {
  console.error('Fatal audit failure:', err);
  process.exit(1);
});
