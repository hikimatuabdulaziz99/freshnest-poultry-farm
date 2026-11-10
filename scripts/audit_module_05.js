import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import {
  SCHEMA_V1,
  SCHEMA_V2,
  SCHEMA_V3,
  SCHEMA_V4,
  SCHEMA_V5,
  DB_NAME,
  DB_VERSION,
} from '../src/database/schema.js';
import {
  feedService,
  FEED_TYPES,
  FEED_FORMS,
  FEED_UNITS,
  FEED_STATUSES,
  computeFeedStatus,
} from '../src/services/feedService.js';
import { batchService } from '../src/services/batchService.js';
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
  console.log(' FRESHNEST POULTRY FARM: MODULE 05 AUDIT & TESTS');
  console.log('====================================================\n');

  // -----------------------------------------------------------------
  // TEST 1: DATABASE SCHEMA MIGRATION (V1 -> V2 -> V3 -> V4 -> V5)
  // -----------------------------------------------------------------
  console.log('>>> TEST 1: Database Migration & Schema V5 Preservation');
  const migDbName = 'test_freshnest_v5_migration_db';

  // Create V1 DB
  let migDb = new Dexie(migDbName);
  migDb.version(1).stores(SCHEMA_V1);
  await migDb.open();
  const v1Bird = await migDb.birds.add({ tagNumber: 'V1-BIRD', breed: 'Isa Brown', status: 'Active' });
  const v1Batch = await migDb.batches.add({ batchCode: 'V1-BATCH', initialCount: 200, status: 'Active' });
  const v1Feed = await migDb.feeds.add({ name: 'V1 Mash', type: 'Layer Mash', currentStock: 50 });
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
  const v3Bird = await migDb.birds.add({
    birdId: 'BRD-0001',
    tagNumber: 'V3-TAG',
    breed: 'Cobb 500',
    status: 'Active',
  });
  await migDb.close();

  // Upgrade to V4
  migDb = new Dexie(migDbName);
  migDb.version(1).stores(SCHEMA_V1);
  migDb.version(2).stores(SCHEMA_V2);
  migDb.version(3).stores(SCHEMA_V3);
  migDb.version(4).stores(SCHEMA_V4);
  await migDb.open();
  const v4Pen = await migDb.pens.add({ penId: 'PEN-001', name: 'Pen 1', capacity: 500 });
  await migDb.close();

  // Upgrade to V5 (Module 05 Feed Management)
  migDb = new Dexie(migDbName);
  migDb.version(1).stores(SCHEMA_V1);
  migDb.version(2).stores(SCHEMA_V2);
  migDb.version(3).stores(SCHEMA_V3);
  migDb.version(4).stores(SCHEMA_V4);
  migDb.version(5).stores(SCHEMA_V5);
  await migDb.open();

  assert(migDb.verno === 5, 'Dexie database is upgraded to Version 5');
  assert(DB_VERSION >= 5, 'schema.js DB_VERSION is 5 or higher');
  assert(Boolean(migDb.feedPurchases), 'feedPurchases table exists in Version 5');
  assert(Boolean(migDb.feeds), 'feeds table exists in Version 5');
  assert(Boolean(migDb.feedLogs), 'feedLogs table exists in Version 5');

  // Verify preservation of pre-existing records across all earlier versions
  const preservedBird = await migDb.birds.get(v1Bird);
  const preservedBatch = await migDb.batches.get(v1Batch);
  const preservedFeed = await migDb.feeds.get(v1Feed);
  const preservedAdmin = await migDb.administrators.get(v2Admin);
  const preservedV3Bird = await migDb.birds.get(v3Bird);
  const preservedPen = await migDb.pens.get(v4Pen);

  assert(preservedBird?.tagNumber === 'V1-BIRD', 'Version 1 bird record preserved intact');
  assert(preservedBatch?.batchCode === 'V1-BATCH', 'Version 1 batch record preserved intact');
  assert(preservedFeed?.name === 'V1 Mash', 'Version 1 feed record preserved intact');
  assert(preservedAdmin?.username === 'lead_admin', 'Version 2 admin record preserved intact');
  assert(preservedV3Bird?.birdId === 'BRD-0001', 'Version 3 bird record preserved intact');
  assert(preservedPen?.penId === 'PEN-001', 'Version 4 pen record preserved intact');

  // Test insert into new feedPurchases table
  const testPurchase = await migDb.feedPurchases.add({
    purchaseId: 'FPUR-0001',
    feedId: 'FEED-0001',
    quantity: 100,
    unitCost: 650,
    supplier: 'Vital Agro',
  });
  assert(Boolean(testPurchase), 'Able to insert into newly created feedPurchases table');
  await migDb.close();

  // -----------------------------------------------------------------
  // TEST 2: SEQUENTIAL ID GENERATION & SEQUENCE PERSISTENCE
  // -----------------------------------------------------------------
  console.log('\n>>> TEST 2: Sequential ID Generation & High-Water Mark Persistence');
  await db.open();
  await db.feeds.clear();
  await db.feedPurchases.clear();
  await db.feedLogs.clear();
  await db.farmSettings.clear();

  const id1 = await feedService.generateNextFeedId();
  assert(id1 === 'FEED-0001', 'First generated feed ID is FEED-0001');

  const createdFeed1 = await feedService.createFeed({
    name: 'TopFeed Broiler Starter',
    type: 'Broiler Starter',
    unit: 'kg',
    currentStock: 500,
    reorderLevel: 100,
    unitCost: 650,
  });
  assert(createdFeed1.feedId === 'FEED-0001', 'Feed created with FEED-0001');

  const id2 = await feedService.generateNextFeedId();
  assert(id2 === 'FEED-0002', 'Next generated feed ID is FEED-0002');

  const createdFeed2 = await feedService.createFeed({
    name: 'Premier Layer Mash',
    type: 'Layer Mash',
    unit: 'kg',
    currentStock: 1000,
    reorderLevel: 200,
    unitCost: 580,
  });
  assert(createdFeed2.feedId === 'FEED-0002', 'Feed created with FEED-0002');

  // Delete FEED-0002 and verify that next ID does NOT duplicate due to high-water mark sequence
  await db.feeds.delete(createdFeed2.id);
  const idAfterDelete = await feedService.generateNextFeedId();
  assert(
    idAfterDelete === 'FEED-0003',
    'Deleting a feed does not regress next feed ID (remains monotonic FEED-0003)'
  );

  // Test Purchase ID generation
  const purId1 = await feedService.generateNextPurchaseId();
  assert(purId1 === 'FPUR-0001', 'First generated purchase ID is FPUR-0001');

  // Test Feed Log ID generation
  const logId1 = await feedService.generateNextFeedLogId();
  assert(logId1 === 'FLOG-0001', 'First generated feed log ID is FLOG-0001');

  // -----------------------------------------------------------------
  // TEST 3: FEED PRODUCT CREATION & VALIDATION
  // -----------------------------------------------------------------
  console.log('\n>>> TEST 3: Feed Product Validation & Status Computation');

  // Missing name
  let errorCaught = false;
  try {
    await feedService.createFeed({ name: '', type: 'Layer Mash' });
  } catch (err) {
    errorCaught = true;
  }
  assert(errorCaught, 'Validation rejects empty feed name');

  // Negative stock
  errorCaught = false;
  try {
    await feedService.createFeed({ name: 'Bad Feed', type: 'Layer Mash', currentStock: -50 });
  } catch (err) {
    errorCaught = true;
  }
  assert(errorCaught, 'Validation rejects negative stock quantity');

  // Negative reorder level
  errorCaught = false;
  try {
    await feedService.createFeed({ name: 'Bad Feed', type: 'Layer Mash', reorderLevel: -10 });
  } catch (err) {
    errorCaught = true;
  }
  assert(errorCaught, 'Validation rejects negative reorder level');

  // Duplicate feed ID
  errorCaught = false;
  try {
    await feedService.createFeed({
      feedId: 'FEED-0001',
      name: 'Duplicate Feed',
      type: 'Layer Mash',
    });
  } catch (err) {
    errorCaught = true;
  }
  assert(errorCaught, 'Validation rejects duplicate feed ID (FEED-0001)');

  // Status computation logic
  const statusInStock = computeFeedStatus(500, 100, '2099-01-01');
  assert(statusInStock === 'In Stock', 'Status is "In Stock" when stock > reorderLevel and not expired');

  const statusLow = computeFeedStatus(80, 100, '2099-01-01');
  assert(statusLow === 'Low Stock', 'Status is "Low Stock" when stock <= reorderLevel');

  const statusOut = computeFeedStatus(0, 100, '2099-01-01');
  assert(statusOut === 'Out of Stock', 'Status is "Out of Stock" when stock <= 0');

  const statusExpired = computeFeedStatus(500, 100, '2020-01-01');
  assert(statusExpired === 'Expired', 'Status is "Expired" when expiryDate is in the past');

  // -----------------------------------------------------------------
  // TEST 4: FEED STOCK-IN (PURCHASES) & ATOMIC INVENTORY UPDATE
  // -----------------------------------------------------------------
  console.log('\n>>> TEST 4: Feed Purchases (Stock-In) & Atomic Inventory Increment');

  const initialStock = createdFeed1.currentStock; // 500
  const purchaseQty = 250;
  const purchaseUnitCost = 700;

  const purchaseResult = await feedService.recordFeedPurchase({
    feedId: createdFeed1.id,
    quantity: purchaseQty,
    unitCost: purchaseUnitCost,
    supplier: 'Agro Allied Mills Ltd',
    invoiceNumber: 'INV-TEST-001',
    purchaseDate: '2026-11-01',
    expiryDate: '2027-11-01',
  });

  assert(purchaseResult.success, 'Feed purchase recorded successfully');
  assert(purchaseResult.purchase.purchaseId === 'FPUR-0001', 'Purchase has unique ID FPUR-0001');
  assert(purchaseResult.purchase.totalCost === 175000, 'Total cost in ₦ correctly calculated (250 × ₦700 = ₦175,000)');

  // Verify stock incremented
  const refreshedFeed1 = await db.feeds.get(createdFeed1.id);
  assert(
    refreshedFeed1.currentStock === initialStock + purchaseQty,
    `Feed stock atomically incremented from ${initialStock} to ${initialStock + purchaseQty} kg`
  );
  assert(refreshedFeed1.unitCost === purchaseUnitCost, 'Feed unit cost updated with latest purchase price');

  // Duplicate invoice check from same supplier
  errorCaught = false;
  try {
    await feedService.recordFeedPurchase({
      feedId: createdFeed1.id,
      quantity: 100,
      unitCost: 700,
      supplier: 'Agro Allied Mills Ltd',
      invoiceNumber: 'INV-TEST-001',
    });
  } catch (err) {
    errorCaught = true;
  }
  assert(errorCaught, 'Duplicate invoice number from same supplier is blocked');

  // Negative purchase quantity rejected
  errorCaught = false;
  try {
    await feedService.recordFeedPurchase({
      feedId: createdFeed1.id,
      quantity: -50,
      unitCost: 700,
      supplier: 'Agro Allied Mills Ltd',
    });
  } catch (err) {
    errorCaught = true;
  }
  assert(errorCaught, 'Negative purchase quantity is rejected');

  // -----------------------------------------------------------------
  // TEST 5: FEED STOCK-OUT (FEEDING LOGS) & ATOMIC DECREMENT
  // -----------------------------------------------------------------
  console.log('\n>>> TEST 5: Feed Stock-Out (Feeding Logs) & Stock Decrement');

  // Create test pen and batch
  const testPen = await penService.createPen({
    name: 'Broiler House 1',
    type: 'Broiler',
    capacity: 1000,
  });

  const testBatch = await batchService.createBatch({
    name: 'Broiler Cohort Test',
    batchCode: 'BAT-FEED-TEST',
    birdType: 'Broiler',
    breed: 'Ross 308',
    initialCount: 500,
    currentCount: 500,
    penId: testPen.id,
    arrivalDate: '2026-10-15',
  });

  const stockBeforeFeeding = refreshedFeed1.currentStock; // 750
  const feedQty = 50; // 50kg

  const consumptionResult = await feedService.recordFeedConsumption({
    feedId: createdFeed1.id,
    batchId: testBatch.id,
    quantity: feedQty,
    session: 'Morning',
    date: '2026-11-02',
    birdsFed: 500,
  });

  assert(consumptionResult.success, 'Feed consumption logged successfully');
  assert(consumptionResult.log.logId === 'FLOG-0001', 'Feeding log has unique ID FLOG-0001');

  // Verify consumption rate per bird: (50kg * 1000g) / 500 birds = 100 g/bird
  assert(
    consumptionResult.log.consumptionPerBirdGrams === 100,
    'Consumption rate per bird correctly calculated as 100 g/bird'
  );

  // Verify stock decremented
  const feedAfterFeeding = await db.feeds.get(createdFeed1.id);
  assert(
    feedAfterFeeding.currentStock === stockBeforeFeeding - feedQty,
    `Feed stock atomically decremented from ${stockBeforeFeeding} to ${stockBeforeFeeding - feedQty} kg`
  );

  // -----------------------------------------------------------------
  // TEST 6: INSUFFICIENT STOCK & ATOMIC TRANSACTION ROLLBACK
  // -----------------------------------------------------------------
  console.log('\n>>> TEST 6: Insufficient Stock Protection & Atomic Transaction Rollback');

  const currentAvailable = feedAfterFeeding.currentStock; // 700
  const excessiveDisbursement = currentAvailable + 200; // 900 requested

  errorCaught = false;
  try {
    await feedService.recordFeedConsumption({
      feedId: createdFeed1.id,
      quantity: excessiveDisbursement,
      session: 'Evening',
    });
  } catch (err) {
    errorCaught = true;
  }
  assert(errorCaught, `Disbursement exceeding stock (${excessiveDisbursement} > ${currentAvailable}) is blocked`);

  // Verify that stock remains untouched and no partial record was inserted
  const feedAfterBlocked = await db.feeds.get(createdFeed1.id);
  assert(
    feedAfterBlocked.currentStock === currentAvailable,
    'Feed stock remained untouched after transaction failure'
  );

  const logsCount = await db.feedLogs.count();
  assert(logsCount === 1, 'No orphan feedLog record was created on transaction failure');

  // Negative feeding quantity rejected
  errorCaught = false;
  try {
    await feedService.recordFeedConsumption({
      feedId: createdFeed1.id,
      quantity: -25,
      session: 'Morning',
    });
  } catch (err) {
    errorCaught = true;
  }
  assert(errorCaught, 'Negative feeding quantity is rejected');

  // -----------------------------------------------------------------
  // TEST 7: EXPIRED FEED BIOSECURITY PROTECTION
  // -----------------------------------------------------------------
  console.log('\n>>> TEST 7: Expired Feed Biosecurity Check');

  const expiredFeed = await feedService.createFeed({
    name: 'Old Mash Past Expiry',
    type: 'Grower Mash',
    currentStock: 100,
    reorderLevel: 20,
    unitCost: 500,
    expiryDate: '2020-01-01', // definitely expired
  });

  // Attempt feeding without override
  errorCaught = false;
  try {
    await feedService.recordFeedConsumption({
      feedId: expiredFeed.id,
      quantity: 10,
      session: 'Morning',
    });
  } catch (err) {
    errorCaught = true;
  }
  assert(errorCaught, 'Dispensing expired feed without safety confirmation is strictly blocked');

  // Dispensing with explicit allowExpired override succeeds
  const overrideResult = await feedService.recordFeedConsumption(
    {
      feedId: expiredFeed.id,
      quantity: 10,
      session: 'Morning',
    },
    { allowExpired: true }
  );
  assert(overrideResult.success, 'Dispensing expired feed with explicit admin override succeeds');

  // -----------------------------------------------------------------
  // TEST 8: FEED STATISTICS & INVENTORY VALUATION IN ₦
  // -----------------------------------------------------------------
  console.log('\n>>> TEST 8: Feed Inventory Valuation & Dashboard Analytics');

  const stats = await feedService.getFeedStatistics();
  assert(stats.totalProducts > 0, `Total Feed Products reported (${stats.totalProducts})`);
  assert(stats.totalStockKg > 0, `Total Stock in kg reported (${stats.totalStockKg} kg)`);
  assert(stats.totalPurchasesSpend > 0, `Total Purchases in ₦ reported (₦${stats.totalPurchasesSpend})`);
  assert(stats.totalConsumedKg > 0, `Total Feed Consumed in kg reported (${stats.totalConsumedKg} kg)`);
  assert(stats.totalInventoryValue > 0, `Total Inventory Valuation in ₦ reported (₦${stats.totalInventoryValue})`);

  // Dashboard integration verification
  const dashboardStats = await dbService.getDashboardStats();
  assert(dashboardStats.feedStock > 0, `Dashboard feedStock metric populated (${dashboardStats.feedStock} kg)`);

  const alerts = await dbService.getAlertsAndReminders();
  const expiredAlert = alerts.find((a) => a.type === 'expired_feed');
  assert(Boolean(expiredAlert), 'Expired feed flagged in farm alerts & reminders');

  // -----------------------------------------------------------------
  // TEST 9: SAFE DELETION & AUDIT RECORD INTEGRITY
  // -----------------------------------------------------------------
  console.log('\n>>> TEST 9: Safe Deletion & Audit Integrity');

  // Try to delete createdFeed1 which has purchases and logs
  errorCaught = false;
  try {
    await feedService.deleteFeed(createdFeed1.id);
  } catch (err) {
    errorCaught = true;
  }
  assert(
    errorCaught,
    'Attempting to delete a feed with purchase or feeding history is safely prevented'
  );

  // Archive feed instead
  const archived = await feedService.updateFeed(createdFeed1.id, {
    notes: '[Archived Feed Product]',
  });
  assert(archived.notes.includes('[Archived Feed Product]'), 'Feed archived safely without breaking audit logs');

  // Clean feed with no history can be deleted
  const freshCleanFeed = await feedService.createFeed({
    name: 'Temporary Trial Ration',
    type: 'Scratch Feed',
    currentStock: 20,
    reorderLevel: 5,
    unitCost: 400,
  });
  const delResult = await feedService.deleteFeed(freshCleanFeed.id);
  assert(delResult.success, 'Unreferenced feed product without history can be deleted safely');

  // -----------------------------------------------------------------
  // SUMMARY
  // -----------------------------------------------------------------
  console.log('\n====================================================');
  console.log(` MODULE 05 AUDIT COMPLETE: ${passedTests} PASSED, ${failedTests} FAILED`);
  console.log('====================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runAudit().catch((err) => {
  console.error('Fatal audit failure:', err);
  process.exit(1);
});
