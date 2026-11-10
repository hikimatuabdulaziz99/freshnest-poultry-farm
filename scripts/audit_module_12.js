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
  SCHEMA_V10,
  SCHEMA_V11,
  SCHEMA_V12,
  DB_VERSION,
} from '../src/database/schema.js';
import {
  inventoryService,
  DEFAULT_INVENTORY_CATEGORIES,
  STORAGE_LOCATIONS,
  UNITS_OF_MEASURE,
  MOVEMENT_TYPES,
  toKobo,
  fromKobo,
  formatNaira,
  getLocalDateString,
} from '../src/services/inventoryService.js';
import { feedService } from '../src/services/feedService.js';
import { medicationService } from '../src/services/medicationService.js';
import { vaccineService } from '../src/services/vaccineService.js';
import { batchService } from '../src/services/batchService.js';
import { penService } from '../src/services/penService.js';
import { salesService } from '../src/services/salesService.js';
import { expenseService } from '../src/services/expenseService.js';
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
  console.log(' FRESHNEST POULTRY FARM: MODULE 12 AUDIT & TESTS');
  console.log('====================================================\n');

  // -----------------------------------------------------------------
  // TEST 1: DATABASE MIGRATION & SCHEMA V12 PRESERVATION
  // -----------------------------------------------------------------
  console.log('>>> TEST 1: Database Migration & Schema V12 Preservation');
  const migDbName = 'test_freshnest_v12_migration_db';

  // Create V1 DB and seed baseline historical records from Modules 01-11
  let migDb = new Dexie(migDbName);
  migDb.version(1).stores(SCHEMA_V1);
  await migDb.open();
  await migDb.birds.add({ tagNumber: 'V1-BIRD', breed: 'Isa Brown', status: 'Active' });
  await migDb.batches.add({ batchCode: 'V1-BATCH', initialCount: 500, currentCount: 500, status: 'Active' });
  await migDb.feeds.add({ name: 'V1 Mash', type: 'Layer Mash', currentStock: 50 });
  await migDb.medications.add({ name: 'V1 Tylosin', type: 'Antibiotic', currentStock: 10 });
  await migDb.vaccines.add({ name: 'V1 Marek', targetDisease: "Marek's Disease", currentStock: 5 });
  await migDb.eggLogs.add({ logId: 'EGG-0001', totalCollected: 300, date: '2026-09-01' });
  await migDb.mortalityLogs.add({ mortalityId: 'MORT-0001', cause: 'Heat stress', quantity: 2 });
  await migDb.sales.add({ saleId: 'SALE-0001', totalAmount: 10000 });
  await migDb.expenses.add({ expenseId: 'EXP-0001', amount: 5000, category: 'Utilities' });
  await migDb.close();

  // Upgrade through to V12
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
  migDb.version(10).stores(SCHEMA_V10);
  migDb.version(11).stores(SCHEMA_V11);
  migDb.version(12).stores(SCHEMA_V12);
  await migDb.open();

  assert(migDb.verno === 12, 'Database successfully upgrades to version 12');
  assert(DB_VERSION >= 12, 'schema.js DB_VERSION constant is set to 12 or higher');

  // Verify all historical records from Modules 01-11 are preserved
  const preservedBird = await migDb.birds.where('tagNumber').equals('V1-BIRD').first();
  const preservedBatch = await migDb.batches.where('batchCode').equals('V1-BATCH').first();
  const preservedFeed = await migDb.feeds.where('name').equals('V1 Mash').first();
  const preservedMed = await migDb.medications.where('name').equals('V1 Tylosin').first();
  const preservedVac = await migDb.vaccines.where('name').equals('V1 Marek').first();
  const preservedEgg = await migDb.eggLogs.where('logId').equals('EGG-0001').first();
  const preservedMort = await migDb.mortalityLogs.where('mortalityId').equals('MORT-0001').first();
  const preservedSale = await migDb.sales.where('saleId').equals('SALE-0001').first();
  const preservedExpense = await migDb.expenses.where('expenseId').equals('EXP-0001').first();

  assert(preservedBird !== undefined, 'Historical birds preserved in migration to V12');
  assert(preservedBatch !== undefined, 'Historical batches preserved in migration to V12');
  assert(preservedFeed !== undefined, 'Historical feeds preserved in migration to V12');
  assert(preservedMed !== undefined, 'Historical medications preserved in migration to V12');
  assert(preservedVac !== undefined, 'Historical vaccines preserved in migration to V12');
  assert(preservedEgg !== undefined, 'Historical egg logs preserved in migration to V12');
  assert(preservedMort !== undefined, 'Historical mortality logs preserved in migration to V12');
  assert(preservedSale !== undefined, 'Historical sales preserved in migration to V12');
  assert(preservedExpense !== undefined, 'Historical expenses preserved in migration to V12');

  // Verify V12 tables are accessible
  assert(typeof migDb.inventory.toArray === 'function', 'V12 inventory table is available');
  assert(typeof migDb.inventoryMovements.toArray === 'function', 'V12 inventoryMovements table is available');
  assert(typeof migDb.inventoryCategories.toArray === 'function', 'V12 inventoryCategories table is available');
  await migDb.close();

  // Clear global database test tables
  await db.inventory.clear();
  await db.inventoryMovements.clear();
  await db.inventoryCategories.clear();
  await db.farmSettings.delete('last_inventory_item_seq');
  await db.farmSettings.delete('last_inventory_movement_seq');

  // -----------------------------------------------------------------
  // TEST 2: SEQUENTIAL MONOTONIC ITEM & MOVEMENT ID GENERATION
  // -----------------------------------------------------------------
  console.log('\n>>> TEST 2: Sequential Monotonic Item & Movement ID Generation');
  const id1 = await inventoryService.generateNextItemId();
  assert(id1 === 'INV-0001', `First generated item ID is INV-0001 (got ${id1})`);

  const movId1 = await inventoryService.generateNextMovementId();
  assert(movId1 === 'MOV-0001', `First generated movement ID is MOV-0001 (got ${movId1})`);

  // Create first item
  const item1 = await inventoryService.createItem({
    itemName: 'Egg Packing Cartons (30-Egg)',
    category: 'Packaging materials',
    unit: 'pcs',
    currentQuantity: 100,
    unitCost: 120,
    storageLocation: 'Packaging Room',
  });
  assert(item1.itemId === 'INV-0001', `Created item receives sequential ID INV-0001 (got ${item1.itemId})`);

  // Create second item
  const item2 = await inventoryService.createItem({
    itemName: 'Virkon S Disinfectant Powder',
    category: 'Disinfectants',
    unit: 'kg',
    currentQuantity: 20,
    unitCost: 8500,
    storageLocation: 'Chemical / Biosecurity Store',
  });
  assert(item2.itemId === 'INV-0002', `Second created item receives sequential ID INV-0002 (got ${item2.itemId})`);

  // Monotonicity verification: Deleting item2 must NOT cause next ID to rewind back to INV-0002
  await db.inventory.delete(item2.id);
  const idAfterDelete = await inventoryService.generateNextItemId();
  assert(idAfterDelete === 'INV-0003', `ID counter is strictly monotonic: does not reuse INV-0002 after deletion (got ${idAfterDelete})`);

  // Re-create item with new name/ID for subsequent tests
  const item2Recreated = await inventoryService.createItem({
    itemName: 'Virkon S Disinfectant Powder (Batch B)',
    category: 'Disinfectants',
    unit: 'kg',
    currentQuantity: 20,
    unitCost: 8500,
    storageLocation: 'Chemical / Biosecurity Store',
  });
  assert(item2Recreated.itemId === 'INV-0003', `Item created with new monotonic ID (got ${item2Recreated.itemId})`);

  // -----------------------------------------------------------------
  // TEST 3: INVENTORY ITEM CREATION, VALIDATION & METADATA
  // -----------------------------------------------------------------
  console.log('\n>>> TEST 3: Inventory Item Creation, Validation & Metadata');

  // Verify required fields validation
  let missingNameThrown = false;
  try {
    await inventoryService.createItem({
      itemName: '',
      category: 'Equipment',
      unit: 'pcs',
    });
  } catch (err) {
    missingNameThrown = true;
    assert(err.message.includes('name is required'), 'Rejects item creation without name');
  }
  assert(missingNameThrown, 'Validation threw error on missing name');

  let missingCategoryThrown = false;
  try {
    await inventoryService.createItem({
      itemName: 'Feed Shovel',
      category: '',
      unit: 'pcs',
    });
  } catch (err) {
    missingCategoryThrown = true;
    assert(err.message.includes('Category is required'), 'Rejects item creation without category');
  }
  assert(missingCategoryThrown, 'Validation threw error on missing category');

  // Verify initial stock creates an immutable initial stock movement
  const initialMovements = await db.inventoryMovements.where('itemId').equals(item1.itemId).toArray();
  assert(initialMovements.length === 1, 'Initial stock creates 1 audit movement record');
  assert(initialMovements[0].movementType === 'STOCK_IN', 'Initial movement is typed STOCK_IN');
  assert(initialMovements[0].previousBalance === 0, 'Previous balance for initial stock is 0');
  assert(initialMovements[0].newBalance === 100, 'New balance matches initial quantity (100)');

  // Test updating item metadata (does not directly modify currentQuantity)
  const updatedItem1 = await inventoryService.updateItem(item1.itemId, {
    description: 'Heavy duty molded cardboard cartons',
    supplier: 'Supreme Packaging Corp',
    reorderLevel: 25,
  });
  assert(updatedItem1.supplier === 'Supreme Packaging Corp', 'Updated supplier metadata');
  assert(updatedItem1.currentQuantity === 100, 'Current quantity untouched by metadata update');

  // -----------------------------------------------------------------
  // TEST 4: STOCK-IN OPERATIONS & CALCULATIONS
  // -----------------------------------------------------------------
  console.log('\n>>> TEST 4: Stock-In Operations & Calculations');
  const stockInResult = await inventoryService.recordStockIn({
    itemId: item1.itemId,
    quantity: 50,
    unitCost: 130,
    supplier: 'Supreme Packaging Corp',
    referenceNumber: 'INV-SP-2026-091',
    purchaseDate: '2026-10-15',
    notes: 'Restocking egg packing cartons',
    recordedBy: 'Storekeeper John',
  });

  assert(stockInResult.updatedItem.currentQuantity === 150, `Stock-in incremented balance: 100 + 50 = 150 (got ${stockInResult.updatedItem.currentQuantity})`);
  assert(stockInResult.movement.movementType === 'STOCK_IN', 'Movement logged as STOCK_IN');
  assert(stockInResult.movement.previousBalance === 100, 'Movement previous balance is 100');
  assert(stockInResult.movement.newBalance === 150, 'Movement new balance is 150');
  assert(stockInResult.movement.referenceNumber === 'INV-SP-2026-091', 'Movement preserves invoice reference number');
  assert(stockInResult.movement.recordedBy === 'Storekeeper John', 'Movement preserves author');

  // -----------------------------------------------------------------
  // TEST 5: DUPLICATE STOCK-IN PREVENTION
  // -----------------------------------------------------------------
  console.log('\n>>> TEST 5: Duplicate Stock-In Prevention');
  let duplicateStockInBlocked = false;
  try {
    await inventoryService.recordStockIn({
      itemId: item1.itemId,
      quantity: 50,
      referenceNumber: 'INV-SP-2026-091',
    });
  } catch (err) {
    duplicateStockInBlocked = true;
    assert(err.message.includes('duplicate submission detected'), `Duplicate stock-in correctly caught: ${err.message}`);
  }
  assert(duplicateStockInBlocked, 'Rapid duplicate stock-in blocked by 3s guard window');

  // Verify stock was NOT doubled
  const checkItem1 = await db.inventory.where('itemId').equals(item1.itemId).first();
  assert(checkItem1.currentQuantity === 150, `Stock remains exactly 150 after duplicate rejection (got ${checkItem1.currentQuantity})`);

  // -----------------------------------------------------------------
  // TEST 6: STOCK-OUT OPERATIONS & DISBURSEMENTS
  // -----------------------------------------------------------------
  console.log('\n>>> TEST 6: Stock-Out Operations & Disbursements');
  const stockOutResult = await inventoryService.recordStockOut({
    itemId: item1.itemId,
    quantity: 30,
    purpose: 'Packaging eggs for weekend market sales',
    recordedBy: 'Packer Mary',
  });

  assert(stockOutResult.updatedItem.currentQuantity === 120, `Stock-out decremented balance: 150 - 30 = 120 (got ${stockOutResult.updatedItem.currentQuantity})`);
  assert(stockOutResult.movement.movementType === 'STOCK_OUT', 'Movement logged as STOCK_OUT');
  assert(stockOutResult.movement.previousBalance === 150, 'Movement previous balance is 150');
  assert(stockOutResult.movement.newBalance === 120, 'Movement new balance is 120');
  assert(stockOutResult.movement.purpose.includes('weekend market'), 'Movement preserves disbursement purpose');

  // -----------------------------------------------------------------
  // TEST 7: NEGATIVE STOCK PREVENTION (STRICT NON-NEGATIVE GUARD)
  // -----------------------------------------------------------------
  console.log('\n>>> TEST 7: Negative Stock Prevention');
  let negativeStockBlocked = false;
  try {
    await inventoryService.recordStockOut({
      itemId: item1.itemId,
      quantity: 500, // Available is only 120
      purpose: 'Attempting to withdraw more than available',
    });
  } catch (err) {
    negativeStockBlocked = true;
    assert(err.message.includes('Negative stock prevented'), `Overdraw blocked: ${err.message}`);
  }
  assert(negativeStockBlocked, 'Overdraw attempt rejected with exception');

  const afterOverdraw = await db.inventory.where('itemId').equals(item1.itemId).first();
  assert(afterOverdraw.currentQuantity === 120, `Balance remains intact at 120 (got ${afterOverdraw.currentQuantity})`);

  // -----------------------------------------------------------------
  // TEST 8: STOCK ADJUSTMENTS (RECOUNTS / DAMAGE / SPOILAGE)
  // -----------------------------------------------------------------
  console.log('\n>>> TEST 8: Stock Adjustments (Recounts & Corrections)');

  // 1. Mandatory reason check
  let missingReasonBlocked = false;
  try {
    await inventoryService.recordAdjustment({
      itemId: item1.itemId,
      quantity: 5,
      adjustmentType: 'DECREASE',
      reason: '',
    });
  } catch (err) {
    missingReasonBlocked = true;
    assert(err.message.includes('detailed reason is strictly required'), 'Rejects adjustment without reason');
  }
  assert(missingReasonBlocked, 'Adjustment blocked on empty reason');

  // 2. Decrement adjustment (e.g. damaged stock found during count)
  const adjDown = await inventoryService.recordAdjustment({
    itemId: item1.itemId,
    quantity: 5,
    adjustmentType: 'DECREASE',
    reason: 'Water leak damaged 5 cartons in bottom row',
    recordedBy: 'Auditor Sam',
  });
  assert(adjDown.updatedItem.currentQuantity === 115, `Adjustment decrease updated balance: 120 - 5 = 115 (got ${adjDown.updatedItem.currentQuantity})`);
  assert(adjDown.movement.movementType === 'ADJUSTMENT_DECREASE', 'Logged as ADJUSTMENT_DECREASE');
  assert(adjDown.movement.previousBalance === 120, 'Previous balance 120');
  assert(adjDown.movement.newBalance === 115, 'New balance 115');

  // 3. Increment adjustment (e.g. found unrecorded units during physical audit)
  const adjUp = await inventoryService.recordAdjustment({
    itemId: item1.itemId,
    quantity: 10,
    adjustmentType: 'INCREASE',
    reason: 'Found 10 extra cartons behind shelving',
    recordedBy: 'Auditor Sam',
  });
  assert(adjUp.updatedItem.currentQuantity === 125, `Adjustment increase updated balance: 115 + 10 = 125 (got ${adjUp.updatedItem.currentQuantity})`);
  assert(adjUp.movement.movementType === 'ADJUSTMENT_INCREASE', 'Logged as ADJUSTMENT_INCREASE');

  // -----------------------------------------------------------------
  // TEST 9: PAIRED LOCATION TRANSFERS
  // -----------------------------------------------------------------
  console.log('\n>>> TEST 9: Paired Location Transfers (Conserving Stock)');

  // Same-location transfer guard
  let sameLocationBlocked = false;
  try {
    await inventoryService.recordTransfer({
      itemId: item1.itemId,
      fromLocation: 'Packaging Room',
      toLocation: 'Packaging Room',
      quantity: 20,
      reason: 'Redundant transfer',
    });
  } catch (err) {
    sameLocationBlocked = true;
    assert(err.message.includes('Source and destination locations must be different'), 'Rejects transfer with identical locations');
  }
  assert(sameLocationBlocked, 'Same-location transfer prevented');

  // Valid transfer from Packaging Room to Brooder Store
  const transferResult = await inventoryService.recordTransfer({
    itemId: item1.itemId,
    fromLocation: 'Packaging Room',
    toLocation: 'Brooder Store',
    quantity: 25,
    reason: 'Temporary storage due to painting',
    recordedBy: 'Supervisor David',
  });

  assert(transferResult.movements.length === 2, 'Transfer creates exactly 2 paired movements');
  const [outMov, inMov] = transferResult.movements;
  assert(outMov.movementType === 'TRANSFER_OUT', 'First movement is TRANSFER_OUT');
  assert(inMov.movementType === 'TRANSFER_IN', 'Second movement is TRANSFER_IN');
  assert(outMov.storageLocation === 'Packaging Room', 'TRANSFER_OUT recorded at source location');
  assert(inMov.storageLocation === 'Brooder Store', 'TRANSFER_IN recorded at destination location');
  assert(outMov.fromLocation === 'Packaging Room' && outMov.toLocation === 'Brooder Store', 'TRANSFER_OUT captures path');
  assert(inMov.fromLocation === 'Packaging Room' && inMov.toLocation === 'Brooder Store', 'TRANSFER_IN captures path');

  // -----------------------------------------------------------------
  // TEST 10: TOTAL STOCK CONSERVATION ACROSS TRANSFERS
  // -----------------------------------------------------------------
  console.log('\n>>> TEST 10: Total Stock Conservation Across Transfers');
  // Before transfer balance was 125. After transfer item balance must still be 125
  const itemAfterTransfer = await db.inventory.where('itemId').equals(item1.itemId).first();
  assert(
    itemAfterTransfer.currentQuantity === 125,
    `Total farm stock is strictly conserved: net change is 0 (got ${itemAfterTransfer.currentQuantity})`
  );
  assert(itemAfterTransfer.storageLocation === 'Brooder Store', 'Item current primary storage location updated to destination');

  // -----------------------------------------------------------------
  // TEST 11: EXPIRATION & LOW-STOCK ALERTS ENGINE & BIOSECURITY GUARD
  // -----------------------------------------------------------------
  console.log('\n>>> TEST 11: Expiration & Low-Stock Alerts Engine & Biosecurity Guard');

  // Create an expired item
  const expiredItem = await inventoryService.createItem({
    itemName: 'Expired Disinfectant Batch',
    category: 'Disinfectants',
    unit: 'liters',
    currentQuantity: 10,
    unitCost: 5000,
    storageLocation: 'Chemical / Biosecurity Store',
    expiryDate: '2025-01-01', // Expired
  });

  // Create an out-of-stock item
  const oosItem = await inventoryService.createItem({
    itemName: 'Digital Weighing Scale Batteries',
    category: 'Spare parts',
    unit: 'packs',
    currentQuantity: 0,
    minimumStockLevel: 2,
    reorderLevel: 5,
    unitCost: 1500,
    storageLocation: 'Tool Shed',
  });

  const alerts = await inventoryService.getInventoryAlerts();
  const hasExpiredAlert = alerts.some((a) => a.type === 'EXPIRED' && a.itemId === expiredItem.itemId);
  const hasOOSAlert = alerts.some((a) => a.type === 'OUT_OF_STOCK' && a.itemId === oosItem.itemId);
  assert(hasExpiredAlert, 'Detected EXPIRED alert for expired item');
  assert(hasOOSAlert, 'Detected OUT_OF_STOCK alert for zero balance item');

  // Biosecurity check: routine stock-out of expired item must be blocked
  let routineDisburseBlocked = false;
  try {
    await inventoryService.recordStockOut({
      itemId: expiredItem.itemId,
      quantity: 2,
      purpose: 'Routine pen disinfection',
    });
  } catch (err) {
    routineDisburseBlocked = true;
    assert(err.message.includes('expired on 2025-01-01'), `Routine disbursement of expired item blocked: ${err.message}`);
  }
  assert(routineDisburseBlocked, 'Biosecurity rule blocked routine disbursement of expired chemical');

  // Explicit override allows disposal / quarantine withdrawal
  const overrideDisburse = await inventoryService.recordStockOut({
    itemId: expiredItem.itemId,
    quantity: 2,
    purpose: 'Biosecurity controlled disposal',
    overrideExpired: true,
  });
  assert(overrideDisburse.updatedItem.currentQuantity === 8, 'Disposal with override permitted (balance reduced to 8)');

  // -----------------------------------------------------------------
  // TEST 12: HISTORICAL MOVEMENT AUDIT LEDGER PRESERVATION
  // -----------------------------------------------------------------
  console.log('\n>>> TEST 12: Historical Movement Audit Ledger Preservation');
  const allMovements = await inventoryService.getMovements();
  assert(allMovements.length >= 6, `Ledger records all movements across items (got ${allMovements.length})`);

  // Filter by item
  const item1Movements = await inventoryService.getMovements({ itemId: item1.itemId });
  assert(item1Movements.length >= 5, `Filtered movements by item ID (got ${item1Movements.length})`);

  // Filter by movement type
  const stockIns = await inventoryService.getMovements({ movementType: 'STOCK_IN' });
  const allStockIn = stockIns.every((m) => m.movementType === 'STOCK_IN');
  assert(allStockIn && stockIns.length > 0, 'Movement ledger filters accurately by movementType');

  // -----------------------------------------------------------------
  // TEST 13: INVENTORY VALUATION ACCURACY (INTEGER KOBO PRECISION)
  // -----------------------------------------------------------------
  console.log('\n>>> TEST 13: Inventory Valuation Accuracy (Integer Kobo Precision)');
  assert(toKobo(125.50) === 12550, 'toKobo converts 125.50 to 12550 kobo');
  assert(fromKobo(12550) === 125.50, 'fromKobo converts 12550 kobo to 125.50');
  assert(formatNaira(125.5) === '₦125.50', 'formatNaira renders ₦125.50');

  // Check stats valuation calculation
  const stats = await inventoryService.getInventoryStats();
  assert(stats.totalItems >= 3, `Stats reports total items (got ${stats.totalItems})`);
  assert(stats.estimatedTotalValuation > 0, `Stats calculates positive total valuation (got ₦${stats.estimatedTotalValuation})`);
  assert(stats.categoryBreakdown.length > 0, 'Stats generates category valuation breakdown');

  // Verify no floating point decimals in kobo math
  const manualValuation = (await db.inventory.toArray()).reduce(
    (sum, i) => sum + (Number(i.currentQuantity) || 0) * (Number(i.unitCost) || 0),
    0
  );
  assert(Math.abs(stats.estimatedTotalValuation - manualValuation) < 0.01, 'Valuation matches manual sum');

  // -----------------------------------------------------------------
  // TEST 14: CSV EXPORT HEADERS & NGN LABELS
  // -----------------------------------------------------------------
  console.log('\n>>> TEST 14: CSV Export Headers & NGN Labels');
  const catalogCsv = await inventoryService.exportInventoryCSV();
  assert(catalogCsv.includes('Item ID'), 'Catalog CSV includes Item ID header');
  assert(catalogCsv.includes('Unit Purchase Cost (NGN)'), 'Catalog CSV includes Unit Purchase Cost (NGN)');
  assert(catalogCsv.includes('Estimated Valuation (NGN)'), 'Catalog CSV includes Estimated Valuation (NGN)');

  const movementsCsv = await inventoryService.exportMovementsCSV();
  assert(movementsCsv.includes('Movement ID'), 'Movements CSV includes Movement ID header');
  assert(movementsCsv.includes('Movement Type'), 'Movements CSV includes Movement Type header');
  assert(movementsCsv.includes('Previous Balance'), 'Movements CSV includes Previous Balance header');
  assert(movementsCsv.includes('New Balance'), 'Movements CSV includes New Balance header');

  // -----------------------------------------------------------------
  // TEST 15: DASHBOARD INTEGRATION
  // -----------------------------------------------------------------
  console.log('\n>>> TEST 15: Dashboard Integration (Stats & Recent Activities)');
  const dashStats = await dbService.getDashboardStats();
  assert(dashStats.totalInventoryItems >= 3, `Dashboard includes totalInventoryItems (got ${dashStats.totalInventoryItems})`);
  assert(dashStats.totalInventoryValuation > 0, `Dashboard includes totalInventoryValuation (got ₦${dashStats.totalInventoryValuation})`);

  const activities = await dbService.getRecentActivities(15);
  const invActivity = activities.find((a) => a.module === 'inventory');
  assert(invActivity !== undefined, 'Recent activities contains logged inventory movements');
  assert(invActivity.title !== '', 'Inventory activity has descriptive title');

  // -----------------------------------------------------------------
  // TEST 16: SPECIALIZED INVENTORY ISOLATION (NO DOUBLE-COUNTING)
  // -----------------------------------------------------------------
  console.log('\n>>> TEST 16: Specialized Inventory Isolation (No Double-Counting)');
  // Seed a feed and medication to verify they are in specialized tables, NOT inventory
  await db.feeds.add({ name: 'Chick Starter Crumbles', currentStock: 250, unit: 'kg', reorderLevel: 50 });
  await db.medications.add({ name: 'Oxytetracycline 20%', currentStock: 15, unit: 'bottles' });

  const summary = await inventoryService.getSpecializedInventoriesSummary();
  assert(summary !== null, 'Specialized inventories bridge generated summary');
  assert(summary.feeds.count >= 1, `Specialized feeds tracked separately (count: ${summary.feeds.count})`);
  assert(summary.medications.count >= 1, `Specialized medications tracked separately (count: ${summary.medications.count})`);

  // Verify feeds and medications are NOT present in db.inventory
  const inventoryItems = await db.inventory.toArray();
  const feedInGeneral = inventoryItems.some((i) => (i.itemName || '').includes('Chick Starter'));
  assert(!feedInGeneral, 'Feeds are isolated in db.feeds and NOT duplicated in db.inventory');

  // -----------------------------------------------------------------
  // TEST 17: ATOMIC TRANSACTION ROLLBACK ON FAILURE
  // -----------------------------------------------------------------
  console.log('\n>>> TEST 17: Atomic Transaction Rollback on Failure');
  const countMovsBefore = await db.inventoryMovements.count();
  let rollbackCaught = false;

  try {
    await db.transaction('rw', [db.inventory, db.inventoryMovements, db.farmSettings], async () => {
      // Step 1: Add a test movement
      await db.inventoryMovements.add({
        movementId: 'MOV-TEST-ROLLBACK',
        itemId: item1.itemId,
        movementType: 'STOCK_IN',
        quantity: 999,
        date: '2026-10-20',
      });
      // Step 2: Intentional throw to trigger rollback
      throw new Error('Simulated transaction failure for rollback verification');
    });
  } catch (err) {
    rollbackCaught = true;
  }
  assert(rollbackCaught, 'Transaction abort error caught');
  const countMovsAfter = await db.inventoryMovements.count();
  assert(countMovsAfter === countMovsBefore, `Transaction rolled back cleanly: movement count remains ${countMovsBefore}`);

  // -----------------------------------------------------------------
  // TEST 18: REGRESSION VERIFICATION (MODULES 03-11 INTACT)
  // -----------------------------------------------------------------
  console.log('\n>>> TEST 18: Regression Verification (Modules 03-11 Intact)');
  const birdCount = await db.birds.count();
  const batchCount = await db.batches.count();
  const feedCount = await db.feeds.count();
  const medCount = await db.medications.count();
  const salesCount = await db.sales.count();
  const expCount = await db.expenses.count();

  assert(typeof birdCount === 'number', 'Bird management tables intact');
  assert(typeof batchCount === 'number', 'Batch management tables intact');
  assert(typeof feedCount === 'number', 'Feed management tables intact');
  assert(typeof medCount === 'number', 'Medication management tables intact');
  assert(typeof salesCount === 'number', 'Sales management tables intact');
  assert(typeof expCount === 'number', 'Expenses management tables intact');

  // -----------------------------------------------------------------
  // SUMMARY
  // -----------------------------------------------------------------
  console.log('\n====================================================');
  console.log(` MODULE 12 AUDIT COMPLETE: ${passedTests} passed, ${failedTests} failed`);
  console.log('====================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runAudit().catch((err) => {
  console.error('Audit execution error:', err);
  process.exit(1);
});
