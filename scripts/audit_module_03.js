import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { SCHEMA_V1, SCHEMA_V2, SCHEMA_V3, DB_NAME, DB_VERSION } from '../src/database/schema.js';
import { birdService, BIRD_TYPES, BIRD_GENDERS, BIRD_STATUSES } from '../src/services/birdService.js';
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
  console.log(' FRESHNEST POULTRY FARM: MODULE 03 QUALITY AUDIT');
  console.log('====================================================\n');

  // -----------------------------------------------------------------
  // CHECK 1: DATABASE MIGRATION (V1 -> V2 -> V3)
  // -----------------------------------------------------------------
  console.log('>>> CHECK 1: Database Migration & Schema Preservation');
  const migrationDbName = 'test_freshnest_migration_db';
  
  // 1A: Setup V1 database with pre-existing records
  let migDb = new Dexie(migrationDbName);
  migDb.version(1).stores(SCHEMA_V1);
  await migDb.open();
  
  const v1BatchId = await migDb.batches.add({
    batchCode: 'BATCH-2026-001',
    birdType: 'Layer',
    breed: 'Isa Brown',
    initialCount: 500,
    currentCount: 490,
    status: 'Active',
    houseId: 'House A',
  });

  const v1FeedId = await migDb.feeds.add({
    name: 'Grower Mash',
    currentStock: 1200,
    unit: 'kg',
  });

  const v1BirdId = await migDb.birds.add({
    tagNumber: 'V1-TAG-001',
    breed: 'Cobb 500',
    type: 'Broiler',
    houseNumber: 'Pen 1',
    status: 'Active',
  });

  assert(v1BatchId > 0 && v1FeedId > 0 && v1BirdId > 0, 'Version 1 database populated with baseline records');
  await migDb.close();

  // 1B: Upgrade to V2 (Auth addition)
  migDb = new Dexie(migrationDbName);
  migDb.version(1).stores(SCHEMA_V1);
  migDb.version(2).stores(SCHEMA_V2);
  await migDb.open();

  const v2AdminId = await migDb.administrators.add({
    username: 'farm_lead',
    fullName: 'Chief Farmer',
    status: 'active',
  });
  assert(v2AdminId > 0, 'Version 2 migration adds administrators table');

  // Verify V1 records still exist in V2
  const v1BatchInV2 = await migDb.batches.get(v1BatchId);
  const v1BirdInV2 = await migDb.birds.get(v1BirdId);
  assert(v1BatchInV2?.batchCode === 'BATCH-2026-001', 'V1 batch preserved in V2');
  assert(v1BirdInV2?.tagNumber === 'V1-TAG-001', 'V1 bird record preserved in V2');
  await migDb.close();

  // 1C: Upgrade to V3 (Module 03 Bird Management)
  migDb = new Dexie(migrationDbName);
  migDb.version(1).stores(SCHEMA_V1);
  migDb.version(2).stores(SCHEMA_V2);
  migDb.version(3).stores(SCHEMA_V3);
  await migDb.open();

  // Verify all V1 & V2 records preserved without data loss
  const v1BatchInV3 = await migDb.batches.get(v1BatchId);
  const v1FeedInV3 = await migDb.feeds.get(v1FeedId);
  const v1BirdInV3 = await migDb.birds.get(v1BirdId);
  const v2AdminInV3 = await migDb.administrators.get(v2AdminId);

  assert(v1BatchInV3?.initialCount === 500, 'Version 3 preserves batches table');
  assert(v1FeedInV3?.name === 'Grower Mash', 'Version 3 preserves feeds table');
  assert(v1BirdInV3?.tagNumber === 'V1-TAG-001', 'Version 3 preserves existing birds table records');
  assert(v2AdminInV3?.username === 'farm_lead', 'Version 3 preserves administrators table');
  assert(migDb.verno === 3, `Database version is strictly 3 (actual: ${migDb.verno})`);
  
  // Verify V3 schema indexes on birds table
  const birdTable = migDb.birds;
  const indexNames = birdTable.schema.indexes.map((idx) => idx.name);
  assert(indexNames.includes('birdId'), 'Birds table includes "birdId" index');
  assert(indexNames.includes('tagNumber'), 'Birds table includes "tagNumber" index');
  assert(indexNames.includes('batchId'), 'Birds table includes "batchId" index');
  assert(indexNames.includes('gender'), 'Birds table includes "gender" index');
  await migDb.close();

  console.log('\n>>> CHECK 2: Bird ID Generation & Persistent Sequence');
  // Clear test db tables
  await db.open();
  await db.birds.clear();
  await db.farmSettings.clear();
  await db.batches.clear();
  await db.mortalityLogs.clear();
  await db.sales.clear();

  // Generate initial ID
  const firstId = await birdService.generateNextBirdId();
  assert(firstId === 'BRD-0001', `Initial Bird ID is BRD-0001 (got: ${firstId})`);

  // Register bird 1 and 2
  const b1 = await birdService.createBird({
    type: 'Layer',
    breed: 'Isa Brown',
    gender: 'Female',
    status: 'Active',
    houseNumber: 'Pen 1',
    tagNumber: 'TAG-101',
  });
  assert(b1.birdId === 'BRD-0001', 'Created first bird with ID BRD-0001');

  const b2 = await birdService.createBird({
    type: 'Layer',
    breed: 'Lohmann Brown',
    gender: 'Female',
    status: 'Active',
    houseNumber: 'Pen 1',
    tagNumber: 'TAG-102',
  });
  assert(b2.birdId === 'BRD-0002', 'Created second bird with ID BRD-0002');

  // Check persistent sequence in farmSettings
  const seqRecord = await db.farmSettings.get('last_bird_seq');
  assert(seqRecord?.value === 2, `Persistent sequence counter recorded in farmSettings (value: ${seqRecord?.value})`);

  // Test deletion of the most recent bird (b2: BRD-0002)
  await birdService.deleteBird(b2.id);
  const remainingBirds = await db.birds.toArray();
  assert(remainingBirds.length === 1, 'Bird BRD-0002 deleted, 1 bird remains');

  // Verify next ID generated is BRD-0003 (NOT reusing BRD-0002!)
  const idAfterDelete = await birdService.generateNextBirdId();
  assert(idAfterDelete === 'BRD-0003', `Next Bird ID is BRD-0003 after deletion of BRD-0002 (got: ${idAfterDelete})`);

  // Simulate refresh / reopening database
  await db.close();
  await db.open();

  const idAfterReopen = await birdService.generateNextBirdId();
  assert(idAfterReopen === 'BRD-0003', `Next Bird ID remains BRD-0003 after database reopen/refresh (got: ${idAfterReopen})`);

  // Create third bird with next generated ID
  const b3 = await birdService.createBird({
    type: 'Cockerel',
    breed: 'Noiler',
    gender: 'Male',
    status: 'Active',
    houseNumber: 'Pen 2',
    tagNumber: 'TAG-103',
  });
  assert(b3.birdId === 'BRD-0003', `New bird created as BRD-0003 (got: ${b3.birdId})`);

  // Confirm duplicate Bird ID is strictly rejected
  let duplicateIdRejected = false;
  try {
    await birdService.createBird({
      birdId: 'BRD-0001',
      type: 'Broiler',
      breed: 'Ross 308',
      gender: 'Male',
      status: 'Active',
      houseNumber: 'Pen 3',
    });
  } catch (err) {
    duplicateIdRejected = true;
  }
  assert(duplicateIdRejected, 'Attempting to create bird with duplicate Bird ID is rejected');

  console.log('\n>>> CHECK 3: Bird Registration, Validation & Case-Insensitive Tag Uniqueness');

  // Validation: Missing type
  let missingTypeRejected = false;
  try {
    await birdService.createBird({
      breed: 'Cobb 500',
      gender: 'Male',
      status: 'Active',
      houseNumber: 'Pen 1',
    });
  } catch {
    missingTypeRejected = true;
  }
  assert(missingTypeRejected, 'Bird registration requires valid Bird Type');

  // Validation: Missing breed
  let missingBreedRejected = false;
  try {
    await birdService.createBird({
      type: 'Broiler',
      breed: '',
      gender: 'Male',
      status: 'Active',
      houseNumber: 'Pen 1',
    });
  } catch {
    missingBreedRejected = true;
  }
  assert(missingBreedRejected, 'Bird registration requires Breed');

  // Tag uniqueness check: exact duplicate
  let exactTagRejected = false;
  try {
    await birdService.createBird({
      type: 'Layer',
      breed: 'Isa Brown',
      gender: 'Female',
      status: 'Active',
      houseNumber: 'Pen 1',
      tagNumber: 'TAG-101', // already used on b1
    });
  } catch (err) {
    exactTagRejected = err.message.includes('already assigned');
  }
  assert(exactTagRejected, 'Exact duplicate tag number rejected');

  // Tag uniqueness check: case-insensitive ("tag-101" vs "TAG-101")
  let lowerTagRejected = false;
  try {
    await birdService.createBird({
      type: 'Layer',
      breed: 'Isa Brown',
      gender: 'Female',
      status: 'Active',
      houseNumber: 'Pen 1',
      tagNumber: 'tag-101',
    });
  } catch (err) {
    lowerTagRejected = err.message.includes('already assigned');
  }
  assert(lowerTagRejected, 'Case-insensitive duplicate tag number rejected ("tag-101")');

  // Tag uniqueness check: whitespace padded ("  TAG-101  ")
  let spaceTagRejected = false;
  try {
    await birdService.createBird({
      type: 'Layer',
      breed: 'Isa Brown',
      gender: 'Female',
      status: 'Active',
      houseNumber: 'Pen 1',
      tagNumber: '   TAG-101   ',
    });
  } catch (err) {
    spaceTagRejected = err.message.includes('already assigned');
  }
  assert(spaceTagRejected, 'Whitespace padded duplicate tag number rejected ("   TAG-101   ")');

  // Untagged bird creation: null tag allowed
  const untagged1 = await birdService.createBird({
    type: 'Broiler',
    breed: 'Ross 308',
    gender: 'Unknown',
    status: 'Active',
    houseNumber: 'Pen 2',
    tagNumber: '',
  });
  const untagged2 = await birdService.createBird({
    type: 'Broiler',
    breed: 'Ross 308',
    gender: 'Unknown',
    status: 'Active',
    houseNumber: 'Pen 2',
    tagNumber: null,
  });
  assert(untagged1.tagNumber === null && untagged2.tagNumber === null, 'Untagged birds allow null/empty tags');

  // Editing bird: preserving its own tag number must succeed
  let selfTagSuccess = false;
  try {
    await birdService.updateBird(b1.id, {
      tagNumber: 'TAG-101',
      notes: 'Updated observation notes',
    });
    selfTagSuccess = true;
  } catch {
    selfTagSuccess = false;
  }
  assert(selfTagSuccess, 'Editing bird retaining its own tag number succeeds');

  // Editing bird: assigning another bird\'s tag must fail
  let editTagConflictRejected = false;
  try {
    await birdService.updateBird(b3.id, {
      tagNumber: 'TAG-101', // b1's tag
    });
  } catch {
    editTagConflictRejected = true;
  }
  assert(editTagConflictRejected, 'Editing bird to take another bird\'s tag number is rejected');

  // Read / Search / Filter / Pagination check
  const searchResult = await birdService.getBirds({ search: 'Noiler' });
  assert(searchResult.total === 1 && searchResult.items[0].breed === 'Noiler', 'Search by breed ("Noiler") works');

  const filterResult = await birdService.getBirds({ gender: 'Male' });
  assert(filterResult.items.every((b) => b.gender === 'Male'), 'Filter by gender ("Male") works');

  console.log('\n>>> CHECK 4: Population Accuracy & Cohort Isolation');

  // Reset birds & batches for strict headcount isolation verification
  await db.birds.clear();
  await db.batches.clear();
  await db.mortalityLogs.clear();
  await db.sales.clear();

  // Create Batch A: 100 birds, 95 current live
  const batchA = await db.batches.add({
    batchCode: 'FLOCK-2026-A',
    birdType: 'Layer',
    breed: 'Isa Brown',
    initialCount: 100,
    currentCount: 95,
    status: 'Active',
    houseId: 'House 1',
  });

  // Create 3 standalone birds: 2 Active, 1 Sick
  await birdService.createBird({
    type: 'Layer',
    breed: 'Isa Brown',
    gender: 'Female',
    status: 'Active',
    houseNumber: 'Pen 1',
    tagNumber: 'IND-001',
  });
  await birdService.createBird({
    type: 'Layer',
    breed: 'Isa Brown',
    gender: 'Female',
    status: 'Active',
    houseNumber: 'Pen 1',
    tagNumber: 'IND-002',
  });
  await birdService.createBird({
    type: 'Layer',
    breed: 'Isa Brown',
    gender: 'Female',
    status: 'Sick',
    houseNumber: 'Quarantine Bay',
    tagNumber: 'IND-003',
  });

  // Create 2 birds assigned to Batch A
  const batchBird1 = await birdService.createBird({
    type: 'Layer',
    breed: 'Isa Brown',
    gender: 'Female',
    status: 'Active',
    houseNumber: 'House 1',
    tagNumber: 'BATCH-BIRD-01',
    batchId: batchA,
  });
  const batchBird2 = await birdService.createBird({
    type: 'Layer',
    breed: 'Isa Brown',
    gender: 'Female',
    status: 'Active',
    houseNumber: 'House 1',
    tagNumber: 'BATCH-BIRD-02',
    batchId: batchA,
  });

  // Test dashboard stats
  const dashStats = await dbService.getDashboardStats();
  
  // Total Birds strategy: Batch initial (100) + Standalone birds (3) = 103
  // Birds assigned to batchA (batchBird1, batchBird2) must NOT be added again to totalBirds!
  assert(dashStats.totalBirds === 103, `Total Birds is 103 without double counting batch birds (got: ${dashStats.totalBirds})`);

  // Active Birds strategy: Batch live (95) + Standalone live [Active + Sick] (3) = 98
  assert(dashStats.activeBirds === 98, `Active Birds is 98 without double counting batch birds (got: ${dashStats.activeBirds})`);

  // Bird Module distinct stats
  const birdStats = await birdService.getBirdStats();
  assert(birdStats.total === 5, `Total bird records is 5 (got: ${birdStats.total})`);
  assert(birdStats.standalone === 3, `Standalone birds count is 3 (got: ${birdStats.standalone})`);
  assert(birdStats.batchAssigned === 2, `Batch assigned birds count is 2 (got: ${birdStats.batchAssigned})`);
  assert(birdStats.active === 4, `Active bird records is 4 (got: ${birdStats.active})`);
  assert(birdStats.sick === 1, `Sick bird records is 1 (got: ${birdStats.sick})`);

  // Status transitions: changing bird to 'Dead' or 'Sold'
  await birdService.updateBird(batchBird1.id, { status: 'Dead' });
  await birdService.updateBird(batchBird2.id, { status: 'Sold' });

  // Confirm NO ghost rows created in mortalityLogs or sales
  const mortalityCount = await db.mortalityLogs.count();
  const salesCount = await db.sales.count();
  assert(mortalityCount === 0, 'Status change to "Dead" does not inject premature ghost mortality logs');
  assert(salesCount === 0, 'Status change to "Sold" does not inject premature ghost sales transactions');

  console.log('\n>>> CHECK 5: Batch Integration & Immutability');
  // Confirm changing a bird's batch assignment does not alter batch record
  const initialBatch = await db.batches.get(batchA);
  const initialBatchCount = initialBatch.currentCount;

  // Reassign batchBird1 to standalone
  await birdService.updateBird(batchBird1.id, { batchId: null });
  const batchAfterBirdReassign = await db.batches.get(batchA);
  assert(
    batchAfterBirdReassign.currentCount === initialBatchCount,
    `Batch currentCount remained unchanged at ${initialBatchCount} after bird reassignment`
  );

  // Link back to batch
  await birdService.updateBird(batchBird1.id, { batchId: batchA });
  const batchAfterLink = await db.batches.get(batchA);
  assert(
    batchAfterLink.currentCount === initialBatchCount,
    'Batch currentCount remained intact after relinking bird'
  );

  console.log('\n>>> CHECK 6: Backup & Offline Health');
  const health = await dbService.getHealthStatus();
  assert(health.connected === true, 'Database reports connected state');
  assert(health.version === DB_VERSION, `Health reports Dexie version ${DB_VERSION} (actual: ${health.version})`);

  const backup = await dbService.exportBackup();
  assert(backup.schemaVersion === DB_VERSION, `Exported offline backup schemaVersion is ${DB_VERSION}`);
  assert(Array.isArray(backup.data.birds) && backup.data.birds.length === 5, 'Backup contains all 5 bird records');

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
