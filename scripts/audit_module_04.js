import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { SCHEMA_V1, SCHEMA_V2, SCHEMA_V3, SCHEMA_V4, DB_NAME, DB_VERSION } from '../src/database/schema.js';
import { batchService, BATCH_TYPES, BATCH_STATUSES } from '../src/services/batchService.js';
import { penService, PEN_TYPES, PEN_STATUSES } from '../src/services/penService.js';
import { birdService } from '../src/services/birdService.js';
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
  console.log(' FRESHNEST POULTRY FARM: MODULE 04 AUDIT & TESTS');
  console.log('====================================================\n');

  // -----------------------------------------------------------------
  // TEST 1: DATABASE SCHEMA MIGRATION (V1 -> V2 -> V3 -> V4)
  // -----------------------------------------------------------------
  console.log('>>> TEST 1: Database Migration & Schema V4 Preservation');
  const migDbName = 'test_freshnest_v4_migration_db';
  
  // Create V1 DB
  let migDb = new Dexie(migDbName);
  migDb.version(1).stores(SCHEMA_V1);
  await migDb.open();
  const v1Bird = await migDb.birds.add({ tagNumber: 'V1-BIRD', breed: 'Isa Brown', status: 'Active' });
  const v1Batch = await migDb.batches.add({ batchCode: 'V1-BATCH', initialCount: 200, status: 'Active' });
  await migDb.close();

  // Upgrade to V2
  migDb = new Dexie(migDbName);
  migDb.version(1).stores(SCHEMA_V1);
  migDb.version(2).stores(SCHEMA_V2);
  await migDb.open();
  const v2Admin = await migDb.administrators.add({ username: 'lead_admin', status: 'active' });
  await migDb.close();

  // Upgrade to V3
  migDb = new Dexie(migDbName);
  migDb.version(1).stores(SCHEMA_V1);
  migDb.version(2).stores(SCHEMA_V2);
  migDb.version(3).stores(SCHEMA_V3);
  await migDb.open();
  const v3Bird = await migDb.birds.add({ birdId: 'BRD-0001', tagNumber: 'V3-TAG', breed: 'Cobb 500', status: 'Active' });
  await migDb.close();

  // Upgrade to V4 (Module 04 Batch & Pen Management)
  migDb = new Dexie(migDbName);
  migDb.version(1).stores(SCHEMA_V1);
  migDb.version(2).stores(SCHEMA_V2);
  migDb.version(3).stores(SCHEMA_V3);
  migDb.version(4).stores(SCHEMA_V4);
  await migDb.open();

  // Verify all historical records intact
  const bird1 = await migDb.birds.get(v1Bird);
  const batch1 = await migDb.batches.get(v1Batch);
  const admin1 = await migDb.administrators.get(v2Admin);
  const bird2 = await migDb.birds.get(v3Bird);

  assert(bird1?.tagNumber === 'V1-BIRD', 'V1 birds preserved after V4 migration');
  assert(batch1?.batchCode === 'V1-BATCH', 'V1 batches preserved after V4 migration');
  assert(admin1?.username === 'lead_admin', 'V2 administrators preserved after V4 migration');
  assert(bird2?.birdId === 'BRD-0001', 'V3 indexed birds preserved after V4 migration');
  assert(migDb.verno === 4, `Database upgraded cleanly to Version 4 (actual: ${migDb.verno})`);

  // Verify pens table exists in V4
  const pensTable = migDb.pens;
  assert(Boolean(pensTable), 'Version 4 includes dedicated pens table');
  const penIndexes = pensTable.schema.indexes.map((idx) => idx.name);
  assert(penIndexes.includes('penId'), 'Pens table indexed by penId');
  assert(penIndexes.includes('capacity'), 'Pens table indexed by capacity');
  await migDb.close();

  // -----------------------------------------------------------------
  // TEST 2: PEN MANAGEMENT & SEEDING
  // -----------------------------------------------------------------
  console.log('\n>>> TEST 2: Pen Creation, Seeding & Validation');
  await db.open();
  await db.pens.clear();
  await db.batches.clear();
  await db.birds.clear();
  await db.farmSettings.clear();

  // Seed default pens
  await penService.seedDefaultPensIfEmpty();
  const seededPens = await penService.getPens();
  assert(seededPens.length >= 7, `Seeded default pens (count: ${seededPens.length})`);
  assert(seededPens.some((p) => p.penId === 'PEN-001'), 'Includes PEN-001 Brooder');
  assert(seededPens.some((p) => p.penId === 'PEN-005'), 'Includes PEN-005 Broiler Unit');

  // Create custom pen
  const newPen = await penService.createPen({
    penId: 'PEN-099',
    name: 'Experimental Aviary',
    type: 'Breeder',
    capacity: 250,
    location: 'West Research Annex',
    status: 'Available',
    notes: 'Ventilated climate test pen',
  });
  assert(newPen.penId === 'PEN-099', 'Created custom pen PEN-099');

  // Prevent duplicate Pen ID
  let duplicatePenRejected = false;
  try {
    await penService.createPen({
      penId: 'pen-099', // Case-insensitive duplicate
      name: 'Duplicate Aviary',
      type: 'Layer',
      capacity: 300,
    });
  } catch (err) {
    duplicatePenRejected = err.message.includes('already exists');
  }
  assert(duplicatePenRejected, 'Duplicate Pen ID rejected (case-insensitive)');

  // Prevent invalid capacity
  let invalidCapRejected = false;
  try {
    await penService.createPen({
      name: 'Negative Pen',
      type: 'Layer',
      capacity: -50,
    });
  } catch {
    invalidCapRejected = true;
  }
  assert(invalidCapRejected, 'Negative or zero pen capacity is rejected');

  // -----------------------------------------------------------------
  // TEST 3: BATCH CREATION & STRICT CAPACITY VALIDATION
  // -----------------------------------------------------------------
  console.log('\n>>> TEST 3: Batch Creation & Strict Pen Capacity Enforcement');

  // PEN-099 has capacity: 250 birds.
  // Test 3A: Attempt to create a batch of 300 birds in PEN-099 (Must fail!)
  let overCapacityRejected = false;
  try {
    await batchService.createBatch({
      name: 'Overcrowded Flock',
      birdType: 'Layer',
      breed: 'Isa Brown',
      initialCount: 300,
      currentCount: 300,
      arrivalDate: '2026-03-01',
      penId: 'PEN-099',
    });
  } catch (err) {
    overCapacityRejected = err.message.includes('Remaining available space is 250 birds, which cannot accommodate 300 birds');
  }
  assert(overCapacityRejected, 'Batch exceeding pen capacity is strictly rejected with detailed message');

  // Test 3B: Create a valid batch of 150 birds in PEN-099 (Fits within 250)
  const batchA = await batchService.createBatch({
    batchId: 'BAT-0001',
    name: 'Flock Alpha',
    birdType: 'Layer',
    breed: 'Isa Brown',
    initialCount: 150,
    currentCount: 150,
    arrivalDate: '2026-03-01',
    costPerBird: 500,
    penId: 'PEN-099',
    purpose: 'Table Egg Production',
  });
  assert(batchA.batchId === 'BAT-0001', 'Created Batch BAT-0001 (150 birds in PEN-099)');
  assert(batchA.totalCost === 75000, `Auto-calculated total cost is ₦75,000 (got: ${batchA.totalCost})`);

  // Verify PEN-099 occupancy now:
  // Capacity = 250, Occupied = 150, Available = 100
  let pen99Occupancy = await penService.calculatePenOccupancy('PEN-099');
  assert(pen99Occupancy.occupiedCount === 150, `PEN-099 occupied count is 150 (got: ${pen99Occupancy.occupiedCount})`);
  assert(pen99Occupancy.availableCapacity === 100, `PEN-099 available space is 100 (got: ${pen99Occupancy.availableCapacity})`);
  assert(pen99Occupancy.occupancyPercentage === 60, `PEN-099 occupancy is 60% (got: ${pen99Occupancy.occupancyPercentage}%)`);

  // Test 3C: Attempt to add second batch of 120 birds into PEN-099 (Available is only 100!)
  let secondBatchOverRejected = false;
  try {
    await batchService.createBatch({
      name: 'Flock Beta Over',
      birdType: 'Layer',
      breed: 'Lohmann Brown',
      initialCount: 120,
      arrivalDate: '2026-03-05',
      penId: 'PEN-099',
    });
  } catch (err) {
    secondBatchOverRejected = err.message.includes('Remaining available space is 100 birds, which cannot accommodate 120 birds');
  }
  assert(secondBatchOverRejected, 'Second batch exceeding remaining available capacity is rejected');

  // Test 3D: Add second batch of exactly 100 birds into PEN-099 (Fills pen to 100%)
  const batchB = await batchService.createBatch({
    name: 'Flock Beta Full',
    birdType: 'Layer',
    breed: 'Lohmann Brown',
    initialCount: 100,
    currentCount: 100,
    arrivalDate: '2026-03-05',
    penId: 'PEN-099',
  });
  assert(batchB.batchId === 'BAT-0002', `Auto-generated Batch ID BAT-0002 (got: ${batchB.batchId})`);

  pen99Occupancy = await penService.calculatePenOccupancy('PEN-099');
  assert(pen99Occupancy.occupiedCount === 250, 'PEN-099 occupied count is now 250');
  assert(pen99Occupancy.availableCapacity === 0, 'PEN-099 available capacity is now 0');
  assert(pen99Occupancy.isFull === true, 'PEN-099 is flagged as full (100%)');

  // -----------------------------------------------------------------
  // TEST 4: MOVING A BATCH BETWEEN PENS & CAPACITY EXCLUSION
  // -----------------------------------------------------------------
  console.log('\n>>> TEST 4: Moving Batch Between Pens & Capacity Re-calculation');

  // When updating Batch A (currently 150 birds in PEN-099):
  // If we edit Batch A's count from 150 to 160 within PEN-099:
  // Since PEN-099 has 100 birds from Batch B, available for Batch A is 250 - 100 = 150.
  // 160 exceeds 150, so it must be rejected!
  let increaseWithinPenRejected = false;
  try {
    await batchService.updateBatch(batchA.id, { currentCount: 160 });
  } catch (err) {
    increaseWithinPenRejected = true;
  }
  assert(increaseWithinPenRejected, 'Increasing batch count beyond pen capacity correctly rejected');

  // Move Batch A (150 birds) to PEN-001 (capacity: 500)
  const movedBatchA = await batchService.updateBatch(batchA.id, {
    penId: 'PEN-001',
  });
  assert(movedBatchA.penId === 'PEN-001', 'Batch A successfully moved to PEN-001');

  // Verify PEN-099 capacity was released:
  // PEN-099 now only contains Batch B (100 birds), available = 150!
  pen99Occupancy = await penService.calculatePenOccupancy('PEN-099');
  assert(pen99Occupancy.occupiedCount === 100, `PEN-099 occupied count reduced to 100 (got: ${pen99Occupancy.occupiedCount})`);
  assert(pen99Occupancy.availableCapacity === 150, `PEN-099 available capacity released to 150 (got: ${pen99Occupancy.availableCapacity})`);

  // Verify PEN-001 occupancy:
  // Capacity = 500, Occupied = 150, Available = 350
  const pen001Occupancy = await penService.calculatePenOccupancy('PEN-001');
  assert(pen001Occupancy.occupiedCount === 150, `PEN-001 occupied count increased to 150 (got: ${pen001Occupancy.occupiedCount})`);
  assert(pen001Occupancy.availableCapacity === 350, `PEN-001 available capacity is 350 (got: ${pen001Occupancy.availableCapacity})`);

  // -----------------------------------------------------------------
  // TEST 5: POPULATION INTEGRITY (INITIAL VS CURRENT COUNT)
  // -----------------------------------------------------------------
  console.log('\n>>> TEST 5: Population Tracking (Initial vs Current Count)');

  // Updating currentCount (e.g. after mortality or culling) must NOT overwrite initialCount!
  const updatedCurrent = await batchService.updateBatch(batchA.id, {
    currentCount: 142, // 8 birds lost
  });
  assert(updatedCurrent.initialCount === 150, 'initialCount remains 150 after currentCount update');
  assert(updatedCurrent.currentCount === 142, 'currentCount reflects updated 142 live birds');

  // Confirm dashboard population calculation
  const dashStats = await dbService.getDashboardStats();
  // Batch initial intakes = 150 (Batch A) + 100 (Batch B) = 250
  // Standalone birds = 0
  assert(dashStats.totalBirds === 250, `Total Birds is 250 (got: ${dashStats.totalBirds})`);
  // Active live birds = 142 (Batch A) + 100 (Batch B) = 242
  assert(dashStats.activeBirds === 242, `Active Birds is 242 (got: ${dashStats.activeBirds})`);

  // -----------------------------------------------------------------
  // TEST 6: ISOLATION WITH INDIVIDUAL BIRDS (NO DOUBLE COUNTING)
  // -----------------------------------------------------------------
  console.log('\n>>> TEST 6: Cohort Isolation with Individual Birds');

  // Register individual bird assigned to Batch A
  const assignedBird = await birdService.createBird({
    type: 'Layer',
    breed: 'Isa Brown',
    gender: 'Female',
    status: 'Active',
    houseNumber: 'Pen 1',
    batchId: batchA.id,
    tagNumber: 'TAG-COHORT-01',
  });
  assert(assignedBird.batchId === batchA.id, 'Registered individual bird assigned to Batch A');

  // Register a standalone bird without batch
  await birdService.createBird({
    type: 'Broiler',
    breed: 'Ross 308',
    gender: 'Male',
    status: 'Active',
    houseNumber: 'Pen 2',
    tagNumber: 'TAG-STANDALONE-01',
  });

  const dashStatsAfterBirds = await dbService.getDashboardStats();
  // Total Birds: 250 from batches + 1 standalone = 251 (assigned bird is NOT double-counted!)
  assert(dashStatsAfterBirds.totalBirds === 251, `Total Birds is 251 without double-counting batch bird (got: ${dashStatsAfterBirds.totalBirds})`);
  // Active Birds: 242 from batches + 1 standalone = 243
  assert(dashStatsAfterBirds.activeBirds === 243, `Active Birds is 243 without double-counting batch bird (got: ${dashStatsAfterBirds.activeBirds})`);

  // -----------------------------------------------------------------
  // TEST 7: SAFE DELETION & ARCHIVING GUARDS
  // -----------------------------------------------------------------
  console.log('\n>>> TEST 7: Deletion & Archiving Safety Guards');

  // Attempt to delete Batch A while it still has an assigned bird (assignedBird)
  let batchWithBirdDeleteRejected = false;
  try {
    await batchService.deleteBatch(batchA.id);
  } catch (err) {
    batchWithBirdDeleteRejected = err.message.includes('individual bird record(s) are currently assigned');
  }
  assert(batchWithBirdDeleteRejected, 'Deleting batch with assigned individual birds is blocked');

  // Attempt to delete PEN-001 while it houses Batch A
  let occupiedPenDeleteRejected = false;
  try {
    await penService.deletePen(movedBatchA.penId);
  } catch (err) {
    occupiedPenDeleteRejected = err.message.includes('currently houses 1 active/planned batch(es)');
  }
  assert(occupiedPenDeleteRejected, 'Deleting pen currently housing active batches is blocked');

  // Archive Batch B:
  const archivedBatchB = await batchService.archiveBatch(batchB.id, 'Harvest completed');
  assert(archivedBatchB.status === 'Archived', 'Batch B successfully archived');

  // Verify archiving Batch B released PEN-099 capacity!
  const pen99AfterArchive = await penService.calculatePenOccupancy('PEN-099');
  assert(pen99AfterArchive.occupiedCount === 0, `PEN-099 occupied count is 0 after archiving (got: ${pen99AfterArchive.occupiedCount})`);
  assert(pen99AfterArchive.availableCapacity === 250, 'PEN-099 available space restored to full 250');

  // Now PEN-099 is empty, deleting PEN-099 must succeed!
  const deletePenResult = await penService.deletePen(newPen.id);
  assert(deletePenResult === true, 'Empty pen PEN-099 deleted successfully');

  // -----------------------------------------------------------------
  // TEST 8: PERSISTENCE & SEQUENCE NON-REUSE ACROSS SESSIONS
  // -----------------------------------------------------------------
  console.log('\n>>> TEST 8: Persistence & Monotonic ID Sequence');

  // Delete Batch B (archived, no dependencies)
  await batchService.deleteBatch(batchB.id);

  // Next generated Batch ID must be BAT-0003 (NOT reusing BAT-0002!)
  const nextBatchId = await batchService.generateNextBatchId();
  assert(nextBatchId === 'BAT-0003', `Next Batch ID is BAT-0003 after deleting BAT-0002 (got: ${nextBatchId})`);

  // Close and reopen database to verify persistence across reboots
  await db.close();
  await db.open();

  const idAfterReopen = await batchService.generateNextBatchId();
  assert(idAfterReopen === 'BAT-0003', `Next Batch ID persists as BAT-0003 after database reopen (got: ${idAfterReopen})`);

  console.log('\n====================================================');
  console.log(` AUDIT COMPLETE: ${passedTests} PASSED, ${failedTests} FAILED`);
  console.log('====================================================');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runAudit().catch((err) => {
  console.error('Audit script threw uncaught exception:', err);
  process.exit(1);
});
