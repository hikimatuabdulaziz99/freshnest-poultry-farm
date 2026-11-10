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
  DB_VERSION,
} from '../src/database/schema.js';
import {
  salesService,
  PRODUCT_TYPES,
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
  toKobo,
  fromKobo,
  formatNaira,
  getLocalDateString,
} from '../src/services/salesService.js';
import { batchService } from '../src/services/batchService.js';
import { birdService } from '../src/services/birdService.js';
import { penService } from '../src/services/penService.js';
import { eggProductionService, EGGS_PER_CRATE } from '../src/services/eggProductionService.js';
import { mortalityService } from '../src/services/mortalityService.js';
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
  console.log(' FRESHNEST POULTRY FARM: MODULE 10 AUDIT & TESTS');
  console.log('====================================================\n');

  // -----------------------------------------------------------------
  // TEST 1: DATABASE MIGRATION & SCHEMA V10 PRESERVATION
  // -----------------------------------------------------------------
  console.log('>>> TEST 1: Database Migration & Schema V10 Preservation');
  const migDbName = 'test_freshnest_v10_migration_db';

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
  await migDb.mortalityLogs.add({ mortalityId: 'MORT-0001', cause: 'Heat stress', quantity: 2 });
  await migDb.sales.add({ invoiceNumber: 'V1-SALE', totalAmount: 10000 });
  await migDb.close();

  // Upgrade through to V10
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
  await migDb.open();

  assert(migDb.verno === 10, 'Database successfully upgrades to version 10');
  assert(DB_VERSION >= 10, 'schema.js DB_VERSION constant is set to 10 or higher');

  // Verify all historical records from Modules 01-09 are preserved
  const preservedBird = await migDb.birds.where('tagNumber').equals('V1-BIRD').first();
  const preservedBatch = await migDb.batches.where('batchCode').equals('V1-BATCH').first();
  const preservedFeed = await migDb.feeds.where('name').equals('V1 Mash').first();
  const preservedMed = await migDb.medications.where('name').equals('V1 Tylosin').first();
  const preservedVac = await migDb.vaccines.where('name').equals('V1 Marek').first();
  const preservedEgg = await migDb.eggLogs.where('logId').equals('EGG-0001').first();
  const preservedMort = await migDb.mortalityLogs.where('mortalityId').equals('MORT-0001').first();
  const preservedSale = await migDb.sales.where('invoiceNumber').equals('V1-SALE').first();

  assert(preservedBird !== undefined, 'V1 Bird record preserved in V10');
  assert(preservedBatch !== undefined, 'V1 Batch record preserved in V10');
  assert(preservedFeed !== undefined, 'V1 Feed record preserved in V10');
  assert(preservedMed !== undefined, 'V1 Medication record preserved in V10');
  assert(preservedVac !== undefined, 'V7 Vaccine record preserved in V10');
  assert(preservedEgg !== undefined, 'V8 Egg log record preserved in V10');
  assert(preservedMort !== undefined, 'V9 Mortality record preserved in V10');
  assert(preservedSale !== undefined, 'Historical Sales record preserved in V10');

  // Verify payments table is registered in V10
  assert(typeof migDb.payments !== 'undefined', 'payments table is registered in V10');

  await migDb.close();
  await Dexie.delete(migDbName);

  // -----------------------------------------------------------------
  // PREPARE ACTIVE TEST DATABASE
  // -----------------------------------------------------------------
  console.log('\n>>> Setting up active test environment');
  await db.open();
  await db.sales.clear();
  await db.payments.clear();
  await db.batches.clear();
  await db.birds.clear();
  await db.eggLogs.clear();
  await db.eggInventory.clear();
  await db.mortalityLogs.clear();
  await db.pens.clear();
  await db.farmSettings.clear();

  // Create prerequisite pen, layer batch, and individual bird
  const pen = await penService.createPen({
    name: 'Sales Layer House',
    type: 'Layer',
    capacity: 1000,
    location: 'West Zone',
  });

  const layerBatch = await batchService.createBatch({
    name: 'Commercial Layers 2026-X',
    birdType: 'Layer',
    breed: 'Isa Brown',
    initialCount: 500,
    currentCount: 500,
    arrivalDate: '2026-02-01',
    penId: pen.id,
    status: 'Active',
  });

  const testBird = await birdService.createBird({
    tagNumber: 'BRD-SALE-01',
    breed: 'Noiler',
    type: 'Cockerel',
    gender: 'Male',
    houseNumber: 'Sales Layer House',
    status: 'Active',
  });

  // Seed baseline egg collection (120 eggs total: 4 crates)
  const eggLog = await eggProductionService.createCollectionLog({
    batchId: layerBatch.id,
    collectionDate: '2026-10-01',
    morningCollection: 60,
    afternoonCollection: 30,
    eveningCollection: 30,
    crackedEggs: 0,
    dirtyEggs: 0,
    damagedEggs: 0,
    recordedBy: 'Egg Collector',
  });

  // Grade collection into 120 Grade A eggs
  await eggProductionService.gradeCollection(eggLog.logId, {
    gradeA: 120,
    gradeB: 0,
    smallEggs: 0,
  });

  const initialStock = await eggProductionService.getInventoryStock();
  assert(initialStock.byGrade['Grade A'] === 120, 'Egg inventory prepared with 120 Grade A eggs (4 crates)');

  // -----------------------------------------------------------------
  // TEST 2: SEQUENTIAL SALE ID GENERATION
  // -----------------------------------------------------------------
  console.log('\n>>> TEST 2: Monotonic Sequential Sale ID Generation');
  const firstSaleId = await salesService.generateNextSaleId();
  assert(firstSaleId === 'SALE-0001', `First Sale ID is SALE-0001 (got ${firstSaleId})`);

  // Record a temporary sale to advance sequence
  const tempSale = await salesService.recordSale({
    customerName: 'Temp Buyer',
    productType: 'OTHER',
    productDescription: 'Testing Monotonicity',
    quantity: 1,
    unitPrice: 500,
    amountPaid: 500,
  });
  assert(tempSale.saleId === 'SALE-0001', 'First recorded sale assigned SALE-0001');

  // Verify next sequence is SALE-0002
  const nextSaleId = await salesService.generateNextSaleId();
  assert(nextSaleId === 'SALE-0002', `Next sequence is SALE-0002 (got ${nextSaleId})`);

  // Cancel or delete sale: sequence must never rewind
  await salesService.cancelSale(tempSale.saleId, 'Testing sequence non-rewind');
  const persistentIdAfterCancel = await salesService.generateNextSaleId();
  assert(
    persistentIdAfterCancel === 'SALE-0002',
    `Sale ID sequence never rewinds after cancellation (got ${persistentIdAfterCancel})`
  );

  // -----------------------------------------------------------------
  // TEST 3: LIVE BIRD SALES FROM BATCHES
  // -----------------------------------------------------------------
  console.log('\n>>> TEST 3: Live Bird Sales from Batches');
  const batchBeforeSale = await batchService.getBatchById(layerBatch.id);
  const liveCountBefore = Number(batchBeforeSale.currentCount); // 500

  // Sell 20 birds from batch at ₦4,500 each, discount ₦2,000, paid in full
  // Subtotal = 20 * 4,500 = 90,000. Total = 88,000.
  const batchSale = await salesService.recordSale({
    customerName: 'Alhaji Haruna Farms',
    customerPhone: '08023456789',
    productType: 'LIVE_BIRDS',
    birdSourceType: 'BATCH',
    batchId: layerBatch.id,
    quantity: 20,
    unitPrice: 4500,
    discount: 2000,
    amountPaid: 88000,
    paymentMethod: 'Bank Transfer',
    saleDate: '2026-10-05',
    recordedBy: 'Sales Officer Amina',
  });

  assert(batchSale.saleId === 'SALE-0002', 'Assigned sequential ID SALE-0002');
  assert(batchSale.subtotal === 90000, `Subtotal is ₦90,000 (got ${batchSale.subtotal})`);
  assert(batchSale.discount === 2000, `Discount is ₦2,000 (got ${batchSale.discount})`);
  assert(batchSale.totalAmount === 88000, `Total amount is ₦88,000 (got ${batchSale.totalAmount})`);
  assert(batchSale.amountPaid === 88000, `Amount paid is ₦88,000 (got ${batchSale.amountPaid})`);
  assert(batchSale.outstandingBalance === 0, 'Outstanding balance is 0 for full payment');
  assert(batchSale.paymentStatus === 'Paid', 'Payment status is Paid');

  // Verify batch.currentCount decreases exactly once
  const batchAfterSale = await batchService.getBatchById(layerBatch.id);
  assert(
    batchAfterSale.currentCount === liveCountBefore - 20,
    `Batch currentCount decreased from ${liveCountBefore} to ${batchAfterSale.currentCount} (strictly -20)`
  );
  assert(
    batchAfterSale.initialCount === 500,
    `Batch initialCount strictly preserved at 500 (got ${batchAfterSale.initialCount})`
  );

  // Attempting to sell more birds than available living count is blocked
  let overdrawError = false;
  try {
    await salesService.recordSale({
      customerName: 'Greedy Buyer',
      productType: 'LIVE_BIRDS',
      birdSourceType: 'BATCH',
      batchId: layerBatch.id,
      quantity: 600, // available is 480
      unitPrice: 4000,
      amountPaid: 0,
    });
  } catch (err) {
    overdrawError = true;
  }
  assert(overdrawError, 'Selling more birds than living batch population is strictly blocked');

  // -----------------------------------------------------------------
  // TEST 4: INDIVIDUAL BIRD SALES AND STATUS UPDATES
  // -----------------------------------------------------------------
  console.log('\n>>> TEST 4: Individual Bird Sales & Status Updates');
  const birdBefore = await birdService.getBirdById(testBird.id);
  assert(birdBefore.status === 'Active', 'Test bird starts with status Active');

  const birdSale = await salesService.recordSale({
    customerName: 'Chief Okonkwo',
    customerPhone: '08039876543',
    productType: 'LIVE_BIRDS',
    birdSourceType: 'INDIVIDUAL',
    birdId: testBird.id,
    quantity: 1,
    unitPrice: 7500,
    amountPaid: 7500,
    paymentMethod: 'Cash',
    saleDate: '2026-10-06',
  });

  assert(birdSale.productType === 'LIVE_BIRDS', 'Sale recorded as LIVE_BIRDS');
  assert(birdSale.totalAmount === 7500, 'Total amount is ₦7,500');

  // Check bird status updated to 'Sold'
  const birdAfter = await birdService.getBirdById(testBird.id);
  assert(birdAfter.status === 'Sold', `Bird status changed to "Sold" (got "${birdAfter.status}")`);
  assert(birdAfter.soldDate === '2026-10-06', 'Bird soldDate recorded accurately');

  // Verify batch count was NOT double-decremented by individual bird sale
  const batchCheck = await batchService.getBatchById(layerBatch.id);
  assert(
    batchCheck.currentCount === 480,
    'Batch currentCount is not double-decremented by individual bird sale'
  );

  // -----------------------------------------------------------------
  // TEST 5: PREVENT SELLING DEAD OR ALREADY SOLD BIRDS
  // -----------------------------------------------------------------
  console.log('\n>>> TEST 5: Prevent Selling Dead or Sold Birds');
  // Attempting to sell the bird again should fail
  let reSellError = false;
  try {
    await salesService.recordSale({
      customerName: 'Second Buyer',
      productType: 'LIVE_BIRDS',
      birdSourceType: 'INDIVIDUAL',
      birdId: testBird.id,
      quantity: 1,
      unitPrice: 8000,
      amountPaid: 8000,
    });
  } catch {
    reSellError = true;
  }
  assert(reSellError, 'Selling an already Sold bird is strictly rejected');

  // Create a bird and mark it dead
  const deadBird = await birdService.createBird({
    tagNumber: 'BRD-DEAD-01',
    breed: 'Noiler',
    type: 'Layer',
    gender: 'Female',
    houseNumber: 'Sales Layer House',
    status: 'Dead',
  });

  let deadSellError = false;
  try {
    await salesService.recordSale({
      customerName: 'Buyer',
      productType: 'LIVE_BIRDS',
      birdSourceType: 'INDIVIDUAL',
      birdId: deadBird.id,
      quantity: 1,
      unitPrice: 5000,
      amountPaid: 5000,
    });
  } catch {
    deadSellError = true;
  }
  assert(deadSellError, 'Selling a Dead bird is strictly rejected');

  // -----------------------------------------------------------------
  // TEST 6: EGG SALES BY CRATE & LOOSE QUANTITY
  // -----------------------------------------------------------------
  console.log('\n>>> TEST 6: Egg Sales by Crate and Loose Quantity');
  // Sell 2 crates of Grade A eggs (2 * 30 = 60 eggs) at ₦3,500/crate
  const crateSale = await salesService.recordSale({
    customerName: 'Mama Blessing Bakery',
    customerPhone: '08123456789',
    productType: 'EGGS',
    eggGrade: 'Grade A',
    eggUnit: 'Crates',
    quantity: 2,
    unitPrice: 3500,
    amountPaid: 7000,
    paymentMethod: 'POS',
    saleDate: '2026-10-07',
  });

  assert(crateSale.totalAmount === 7000, 'Crate sale total is 2 × ₦3,500 = ₦7,000');
  assert(crateSale.totalEggsSold === 60, `2 crates corresponds to exactly 60 eggs (got ${crateSale.totalEggsSold})`);

  // Verify egg stock decremented from 120 to 60 eggs
  const stockAfterCrateSale = await eggProductionService.getInventoryStock();
  assert(
    stockAfterCrateSale.byGrade['Grade A'] === 60,
    `Grade A stock decremented from 120 to 60 eggs (got ${stockAfterCrateSale.byGrade['Grade A']})`
  );

  // Sell 15 loose eggs at ₦120/egg = ₦1,800
  const looseSale = await salesService.recordSale({
    customerName: 'Neighborhood Retailer',
    productType: 'EGGS',
    eggGrade: 'Grade A',
    eggUnit: 'Loose',
    quantity: 15,
    unitPrice: 120,
    amountPaid: 1800,
    paymentMethod: 'Cash',
    saleDate: '2026-10-07',
  });

  assert(looseSale.totalAmount === 1800, 'Loose sale total is 15 × ₦120 = ₦1,800');
  assert(looseSale.totalEggsSold === 15, 'Total loose eggs sold is 15');

  const stockAfterLooseSale = await eggProductionService.getInventoryStock();
  assert(
    stockAfterLooseSale.byGrade['Grade A'] === 45,
    `Grade A stock decremented by 15 to exactly 45 eggs (got ${stockAfterLooseSale.byGrade['Grade A']})`
  );

  // -----------------------------------------------------------------
  // TEST 7: CORRECT 30-EGGS-PER-CRATE CONVERSION
  // -----------------------------------------------------------------
  console.log('\n>>> TEST 7: Correct 30-Eggs-per-Crate Conversion');
  assert(EGGS_PER_CRATE === 30, 'Standard poultry industry crate size is exactly 30');
  const crates4 = 4;
  assert(crates4 * EGGS_PER_CRATE === 120, '4 crates converts to 120 eggs');

  // -----------------------------------------------------------------
  // TEST 8: PREVENTION OF NEGATIVE EGG INVENTORY
  // -----------------------------------------------------------------
  console.log('\n>>> TEST 8: Prevention of Negative Egg Inventory');
  // Stock is 45 eggs (1 crate + 15 loose). Attempting to sell 2 crates (60 eggs) should be rejected
  let overdrawEggError = false;
  try {
    await salesService.recordSale({
      customerName: 'Big Supermarket',
      productType: 'EGGS',
      eggGrade: 'Grade A',
      eggUnit: 'Crates',
      quantity: 2, // 60 eggs > 45 available
      unitPrice: 3500,
      amountPaid: 7000,
    });
  } catch (err) {
    overdrawEggError = true;
  }
  assert(overdrawEggError, 'Selling more eggs than available inventory is strictly blocked');

  const stockAfterBlocked = await eggProductionService.getInventoryStock();
  assert(
    stockAfterBlocked.byGrade['Grade A'] === 45,
    'Egg inventory remained untouched at 45 eggs after blocked overdraw transaction'
  );

  // -----------------------------------------------------------------
  // TEST 9: FULL, PARTIAL, AND UNPAID PAYMENTS
  // -----------------------------------------------------------------
  console.log('\n>>> TEST 9: Full, Partial, and Unpaid Payments');
  // Partial payment sale: 1 crate (30 eggs) at ₦3,500. Total = ₦3,500. Paid = ₦2,000. Balance = ₦1,500.
  const partialSale = await salesService.recordSale({
    customerName: 'Madam Bukola',
    productType: 'EGGS',
    eggGrade: 'Grade A',
    eggUnit: 'Crates',
    quantity: 1,
    unitPrice: 3500,
    amountPaid: 2000,
    paymentMethod: 'Bank Transfer',
    saleDate: '2026-10-08',
  });

  assert(partialSale.paymentStatus === 'Partial', 'Payment status marked as Partial');
  assert(partialSale.amountPaid === 2000, 'Amount paid is ₦2,000');
  assert(partialSale.outstandingBalance === 1500, 'Outstanding balance is ₦1,500');

  // Unpaid sale: 10 loose eggs at ₦120 = ₦1,200. Paid = ₦0. Balance = ₦1,200.
  const unpaidSale = await salesService.recordSale({
    customerName: 'Credit Customer Emeka',
    productType: 'EGGS',
    eggGrade: 'Grade A',
    eggUnit: 'Loose',
    quantity: 10,
    unitPrice: 120,
    amountPaid: 0,
    paymentMethod: 'Cash',
    saleDate: '2026-10-08',
  });

  assert(unpaidSale.paymentStatus === 'Unpaid', 'Payment status marked as Unpaid');
  assert(unpaidSale.amountPaid === 0, 'Amount paid is ₦0.00');
  assert(unpaidSale.outstandingBalance === 1200, 'Outstanding balance is full ₦1,200');

  // -----------------------------------------------------------------
  // TEST 10: OUTSTANDING BALANCE CALCULATIONS
  // -----------------------------------------------------------------
  console.log('\n>>> TEST 10: Outstanding Balance Calculations (Kobo Precision)');
  assert(toKobo(3500) - toKobo(2000) === 150000, '3500 - 2000 in kobo is 150,000 kobo (₦1,500.00)');
  assert(fromKobo(150000) === 1500, 'fromKobo(150000) produces exactly 1500');
  assert(formatNaira(1500) === '₦1,500.00', 'formatNaira(1500) outputs "₦1,500.00"');

  // -----------------------------------------------------------------
  // TEST 11: ADDITIONAL PAYMENTS AGAINST OUTSTANDING BALANCE
  // -----------------------------------------------------------------
  console.log('\n>>> TEST 11: Additional Payments Against Outstanding Balance');
  // Record additional payment of ₦1,000 against Madam Bukola (outstanding: ₦1,500 -> ₦500)
  const partPayResult1 = await salesService.recordPayment({
    saleId: partialSale.saleId,
    amount: 1000,
    paymentMethod: 'Cash',
    paymentDate: '2026-10-09',
    recordedBy: 'Cashier Fatima',
    notes: 'Part settlement',
  });

  assert(partPayResult1.payment.paymentId.startsWith('PAY-'), 'Payment generated sequential PAY- ID');
  assert(partPayResult1.updatedSale.amountPaid === 3000, `Total amount paid updated to ₦3,000 (got ${partPayResult1.updatedSale.amountPaid})`);
  assert(partPayResult1.updatedSale.outstandingBalance === 500, `Outstanding balance reduced to ₦500 (got ${partPayResult1.updatedSale.outstandingBalance})`);
  assert(partPayResult1.updatedSale.paymentStatus === 'Partial', 'Status remains Partial');

  // Settle remaining ₦500 -> status changes to Paid
  const partPayResult2 = await salesService.recordPayment({
    saleId: partialSale.saleId,
    amount: 500,
    paymentMethod: 'POS',
    paymentDate: '2026-10-10',
    recordedBy: 'Cashier Fatima',
    notes: 'Final balance settlement',
  });

  assert(partPayResult2.updatedSale.amountPaid === 3500, 'Total amount paid updated to full ₦3,500');
  assert(partPayResult2.updatedSale.outstandingBalance === 0, 'Outstanding balance is now ₦0.00');
  assert(partPayResult2.updatedSale.paymentStatus === 'Paid', 'Status automatically transitioned to Paid');

  // Overpayment attempt: attempting to pay ₦100 on a fully paid sale throws error
  let overpayError = false;
  try {
    await salesService.recordPayment({
      saleId: partialSale.saleId,
      amount: 100,
      paymentMethod: 'Cash',
    });
  } catch (err) {
    overpayError = true;
  }
  assert(overpayError, 'Payment exceeding outstanding balance is strictly blocked');

  // -----------------------------------------------------------------
  // TEST 12: DUPLICATE PAYMENT & SALE SUBMISSION PREVENTION
  // -----------------------------------------------------------------
  console.log('\n>>> TEST 12: Duplicate Submission Prevention (3-Second Window)');
  // Attempt immediate duplicate payment on unpaid sale
  await salesService.recordPayment({
    saleId: unpaidSale.saleId,
    amount: 500,
    paymentMethod: 'Cash',
  });

  let dupPayError = false;
  try {
    await salesService.recordPayment({
      saleId: unpaidSale.saleId,
      amount: 500,
      paymentMethod: 'Cash',
    });
  } catch {
    dupPayError = true;
  }
  assert(dupPayError, 'Rapid duplicate payment submission within 3-second window is rejected');

  // -----------------------------------------------------------------
  // TEST 13: ATOMIC ROLLBACK ON FAILED TRANSACTIONS
  // -----------------------------------------------------------------
  console.log('\n>>> TEST 13: Atomic Rollback on Failed Transactions');
  const salesCountBefore = await db.sales.count();
  const paymentsCountBefore = await db.payments.count();
  const batchBeforeFail = await batchService.getBatchById(layerBatch.id);
  const liveCountBeforeFail = batchBeforeFail.currentCount;

  let txFailed = false;
  try {
    // Attempt sale on non-existent batch
    await salesService.recordSale({
      customerName: 'Fail Test',
      productType: 'LIVE_BIRDS',
      birdSourceType: 'BATCH',
      batchId: 999999, // non-existent
      quantity: 5,
      unitPrice: 4000,
      amountPaid: 20000,
    });
  } catch {
    txFailed = true;
  }
  assert(txFailed, 'Invalid sale operation throws error');

  const salesCountAfter = await db.sales.count();
  const paymentsCountAfter = await db.payments.count();
  const batchAfterFail = await batchService.getBatchById(layerBatch.id);

  assert(salesCountAfter === salesCountBefore, 'No orphan sales record was created on transaction failure');
  assert(paymentsCountAfter === paymentsCountBefore, 'No orphan payment record was created on transaction failure');
  assert(batchAfterFail.currentCount === liveCountBeforeFail, 'Batch population remained completely untouched on failure');

  // -----------------------------------------------------------------
  // TEST 14: SAFE SALE CANCELLATION & STOCK RESTORATION
  // -----------------------------------------------------------------
  console.log('\n>>> TEST 14: Safe Sale Cancellation & Stock Restoration');
  // Create a batch sale of 10 birds
  const cancellableBatchSale = await salesService.recordSale({
    customerName: 'Return Customer',
    productType: 'LIVE_BIRDS',
    birdSourceType: 'BATCH',
    batchId: layerBatch.id,
    quantity: 10,
    unitPrice: 4500,
    amountPaid: 45000,
  });

  const batchBeforeCancel = await batchService.getBatchById(layerBatch.id);
  // Cancel sale
  await salesService.cancelSale(cancellableBatchSale.saleId, 'Customer truck broke down');
  const batchAfterCancel = await batchService.getBatchById(layerBatch.id);

  assert(
    batchAfterCancel.currentCount === batchBeforeCancel.currentCount + 10,
    `Cancelling batch sale restores 10 birds back to batch (from ${batchBeforeCancel.currentCount} to ${batchAfterCancel.currentCount})`
  );

  const cancelledSaleRecord = await db.sales.where('saleId').equals(cancellableBatchSale.saleId).first();
  assert(cancelledSaleRecord.status === 'Cancelled', 'Sale status marked as Cancelled');
  assert(cancelledSaleRecord.paymentStatus === 'Cancelled', 'Payment status marked as Cancelled');
  assert(cancelledSaleRecord.cancellationReason === 'Customer truck broke down', 'Cancellation reason preserved');

  // Create an egg sale of 5 eggs and cancel it
  const stockBeforeEggSale = (await eggProductionService.getInventoryStock()).byGrade['Grade A'];
  const eggSaleToCancel = await salesService.recordSale({
    customerName: 'Egg Returner',
    productType: 'EGGS',
    eggGrade: 'Grade A',
    eggUnit: 'Loose',
    quantity: 5,
    unitPrice: 120,
    amountPaid: 600,
  });

  const stockAfterEggSale = (await eggProductionService.getInventoryStock()).byGrade['Grade A'];
  assert(stockAfterEggSale === stockBeforeEggSale - 5, '5 eggs deducted upon sale');

  await salesService.cancelSale(eggSaleToCancel.saleId, 'Eggs returned intact');
  const stockAfterEggCancel = (await eggProductionService.getInventoryStock()).byGrade['Grade A'];
  assert(
    stockAfterEggCancel === stockBeforeEggSale,
    `Cancelling egg sale restores 5 eggs back to inventory (stock returned to ${stockAfterEggCancel})`
  );

  // -----------------------------------------------------------------
  // TEST 15: RECEIPT DATA ACCURACY
  // -----------------------------------------------------------------
  console.log('\n>>> TEST 15: Receipt Data Accuracy & Formatting');
  const receipt = await salesService.generateReceiptData(batchSale.saleId);
  assert(receipt !== null, 'Receipt generated successfully');
  assert(receipt.farm.name.includes('FreshNest'), 'Receipt includes farm name');
  assert(receipt.sale.saleId === 'SALE-0002', 'Receipt includes correct sale ID');
  assert(receipt.sale.customerName === 'Alhaji Haruna Farms', 'Receipt includes customer name');
  assert(receipt.sale.formattedTotalAmount === '₦88,000.00', `Receipt total formatted in ₦ (got ${receipt.sale.formattedTotalAmount})`);
  assert(receipt.sale.formattedAmountPaid === '₦88,000.00', `Receipt amount paid formatted in ₦ (got ${receipt.sale.formattedAmountPaid})`);
  assert(receipt.payments.length >= 1, 'Receipt includes linked payments history');
  assert(receipt.payments[0].formattedAmount === '₦88,000.00', 'Linked payment formatted in ₦');

  // -----------------------------------------------------------------
  // TEST 16: SALES ANALYTICS ACCURACY (INVOICED VS CASH RECEIVED)
  // -----------------------------------------------------------------
  console.log('\n>>> TEST 16: Sales Analytics Accuracy (Invoiced vs Cash Received)');
  const stats = await salesService.getSalesStats();
  assert(typeof stats.totalSalesValue === 'number', 'Stats includes totalSalesValue');
  assert(typeof stats.totalRevenueReceived === 'number', 'Stats includes totalRevenueReceived');
  assert(typeof stats.totalOutstanding === 'number', 'Stats includes totalOutstanding');
  assert(stats.transactionCount > 0, 'Transaction count reflects active sales');
  assert(stats.cancelledCount >= 2, 'Cancelled count accurately reflects cancelled transactions');
  assert(Array.isArray(stats.productBreakdown), 'Product breakdown array returned');
  assert(Array.isArray(stats.paymentMethodsBreakdown), 'Payment methods breakdown array returned');
  assert(Array.isArray(stats.trendDays), '7-day trend days array returned');

  // Verify that cancelled sales are excluded from total sales value and cash received
  const allSalesArray = await db.sales.toArray();
  const manualActiveTotal = allSalesArray
    .filter((s) => s.status !== 'Cancelled')
    .reduce((sum, s) => sum + s.totalAmount, 0);
  assert(
    stats.totalSalesValue === manualActiveTotal,
    `Total sales value strictly excludes cancelled sales (got ₦${stats.totalSalesValue})`
  );

  // -----------------------------------------------------------------
  // TEST 17: CSV EXPORT VERIFICATION
  // -----------------------------------------------------------------
  console.log('\n>>> TEST 17: CSV Export Headers & Content Verification');
  const csv = await salesService.exportSalesCSV();
  assert(csv.includes('Sale ID,Date,Customer Name'), 'CSV includes expected header columns');
  assert(csv.includes('Total Amount (NGN)'), 'CSV specifies NGN currency in headers');
  assert(csv.includes('Alhaji Haruna Farms'), 'CSV includes customer records');
  assert(csv.includes('88000.00'), 'CSV contains formatted monetary values with 2 decimals');

  // -----------------------------------------------------------------
  // TEST 18: DASHBOARD INTEGRATION
  // -----------------------------------------------------------------
  console.log('\n>>> TEST 18: Dashboard Integration & Cross-Module Integrity');
  const dashStats = await dbService.getDashboardStats();
  assert(dashStats.totalSales > 0, `Dashboard totalSales populated (got ${dashStats.totalSales})`);
  assert(dashStats.totalRevenueReceived > 0, `Dashboard totalRevenueReceived populated (got ${dashStats.totalRevenueReceived})`);
  assert(dashStats.totalTransactions > 0, `Dashboard totalTransactions populated (got ${dashStats.totalTransactions})`);

  const activities = await dbService.getRecentActivities(10);
  const salesActivity = activities.find((a) => a.module === 'sales');
  assert(salesActivity !== undefined, 'Dashboard recent activities includes sales records');
  assert(salesActivity.title.includes('₦'), 'Sales activity title formats revenue in ₦');

  // -----------------------------------------------------------------
  // AUDIT SUMMARY
  // -----------------------------------------------------------------
  console.log('\n====================================================');
  console.log(` MODULE 10 AUDIT COMPLETE: ${passedTests} passed, ${failedTests} failed`);
  console.log('====================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runAudit().catch((err) => {
  console.error('Audit execution error:', err);
  process.exit(1);
});
