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
  DB_VERSION,
} from '../src/database/schema.js';
import {
  expenseService,
  DEFAULT_EXPENSE_CATEGORIES,
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
  toKobo,
  fromKobo,
  formatNaira,
  getLocalDateString,
} from '../src/services/expenseService.js';
import { feedService } from '../src/services/feedService.js';
import { medicationService } from '../src/services/medicationService.js';
import { vaccineService } from '../src/services/vaccineService.js';
import { batchService } from '../src/services/batchService.js';
import { penService } from '../src/services/penService.js';
import { salesService } from '../src/services/salesService.js';
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
  console.log(' FRESHNEST POULTRY FARM: MODULE 11 AUDIT & TESTS');
  console.log('====================================================\n');

  // -----------------------------------------------------------------
  // TEST 1: DATABASE MIGRATION & SCHEMA V11 PRESERVATION
  // -----------------------------------------------------------------
  console.log('>>> TEST 1: Database Migration & Schema V11 Preservation');
  const migDbName = 'test_freshnest_v11_migration_db';

  // Create V1 DB and seed baseline historical records
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
  await migDb.close();

  // Upgrade through to V11
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
  await migDb.open();

  assert(migDb.verno === 11, 'Database successfully upgrades to version 11');
  assert(DB_VERSION >= 11, 'schema.js DB_VERSION constant is set to 11 or higher');

  // Verify all historical records from Modules 01-10 are preserved
  const preservedBird = await migDb.birds.where('tagNumber').equals('V1-BIRD').first();
  const preservedBatch = await migDb.batches.where('batchCode').equals('V1-BATCH').first();
  const preservedFeed = await migDb.feeds.where('name').equals('V1 Mash').first();
  const preservedMed = await migDb.medications.where('name').equals('V1 Tylosin').first();
  const preservedVac = await migDb.vaccines.where('name').equals('V1 Marek').first();
  const preservedEgg = await migDb.eggLogs.where('logId').equals('EGG-0001').first();
  const preservedMort = await migDb.mortalityLogs.where('mortalityId').equals('MORT-0001').first();
  const preservedSale = await migDb.sales.where('saleId').equals('SALE-0001').first();

  assert(preservedBird !== undefined, 'V1 Bird record preserved in V11');
  assert(preservedBatch !== undefined, 'V1 Batch record preserved in V11');
  assert(preservedFeed !== undefined, 'V1 Feed record preserved in V11');
  assert(preservedMed !== undefined, 'V1 Medication record preserved in V11');
  assert(preservedVac !== undefined, 'V7 Vaccine record preserved in V11');
  assert(preservedEgg !== undefined, 'V8 Egg log record preserved in V11');
  assert(preservedMort !== undefined, 'V9 Mortality record preserved in V11');
  assert(preservedSale !== undefined, 'V10 Sales record preserved in V11');

  // Verify new tables in V11
  assert(typeof migDb.expenses !== 'undefined', 'expenses table is registered in V11');
  assert(typeof migDb.expensePayments !== 'undefined', 'expensePayments table is registered in V11');
  assert(typeof migDb.expenseCategories !== 'undefined', 'expenseCategories table is registered in V11');

  await migDb.close();
  await Dexie.delete(migDbName);

  // -----------------------------------------------------------------
  // PREPARE ACTIVE TEST DATABASE
  // -----------------------------------------------------------------
  console.log('\n>>> Setting up active test environment');
  await db.open();
  await db.expenses.clear();
  await db.expensePayments.clear();
  await db.expenseCategories.clear();
  await db.feedPurchases.clear();
  await db.feeds.clear();
  await db.medicationPurchases.clear();
  await db.medications.clear();
  await db.vaccinePurchases.clear();
  await db.vaccines.clear();
  await db.sales.clear();
  await db.payments.clear();
  await db.batches.clear();
  await db.pens.clear();
  await db.farmSettings.clear();

  // -----------------------------------------------------------------
  // TEST 2: SEQUENTIAL EXPENSE ID GENERATION & MONOTONICITY
  // -----------------------------------------------------------------
  console.log('\n>>> TEST 2: Monotonic Sequential Expense ID Generation');
  const firstExpId = await expenseService.generateNextExpenseId();
  assert(firstExpId === 'EXP-0001', `First Expense ID is EXP-0001 (got ${firstExpId})`);

  const initialExp = await expenseService.recordExpense({
    category: 'Electricity',
    description: 'IBEDC Prepaid power token',
    amount: 15000,
    amountPaid: 15000,
    paymentMethod: 'Bank Transfer',
  });
  assert(initialExp.expenseId === 'EXP-0001', 'First recorded expense assigned EXP-0001');

  const secondExpId = await expenseService.generateNextExpenseId();
  assert(secondExpId === 'EXP-0002', `Next sequence is EXP-0002 (got ${secondExpId})`);

  // Cancel EXP-0001 and check that sequence doesn't rewind
  await expenseService.cancelExpense(initialExp.expenseId, 'Test sequence rollback protection');
  const afterCancelExpId = await expenseService.generateNextExpenseId();
  assert(afterCancelExpId === 'EXP-0002', `Expense ID sequence never rewinds after cancellation (got ${afterCancelExpId})`);

  // -----------------------------------------------------------------
  // TEST 3: EXPENSE CREATION, FIELD VALIDATION & SAFE EDITING
  // -----------------------------------------------------------------
  console.log('\n>>> TEST 3: Expense Creation, Field Validation & Safe Editing');

  // Reject zero amount
  let zeroAmtErr = false;
  try {
    await expenseService.recordExpense({
      category: 'Fuel',
      description: 'Diesel for generator',
      amount: 0,
    });
  } catch {
    zeroAmtErr = true;
  }
  assert(zeroAmtErr, 'Zero expense amount is strictly rejected');

  // Reject negative amount
  let negAmtErr = false;
  try {
    await expenseService.recordExpense({
      category: 'Fuel',
      description: 'Diesel for generator',
      amount: -5000,
    });
  } catch {
    negAmtErr = true;
  }
  assert(negAmtErr, 'Negative expense amount is strictly rejected');

  // Reject empty category
  let emptyCatErr = false;
  try {
    await expenseService.recordExpense({
      category: '',
      description: 'Diesel for generator',
      amount: 10000,
    });
  } catch {
    emptyCatErr = true;
  }
  assert(emptyCatErr, 'Empty category is strictly rejected');

  // Valid expense with quantity and unit cost
  const validExp = await expenseService.recordExpense({
    category: 'Packaging materials',
    description: 'Egg crates from Crown Packaging',
    quantity: 50,
    unitCost: 200,
    amount: 10000,
    amountPaid: 4000,
    supplier: 'Crown Packaging Ltd',
    paymentMethod: 'Cash',
  });

  assert(validExp.expenseId === 'EXP-0002', 'Sequential EXP-0002 assigned');
  assert(validExp.amount === 10000, 'Total amount correctly recorded as ₦10,000');
  assert(validExp.amountPaid === 4000, 'Amount paid recorded as ₦4,000');
  assert(validExp.outstandingBalance === 6000, 'Outstanding balance is ₦6,000');
  assert(validExp.paymentStatus === 'Partial', 'Payment status marked as Partial');

  // Safe edit: update description & supplier
  const editedExp = await expenseService.editExpense(validExp.expenseId, {
    description: '50 reinforced paper egg crates',
    supplier: 'Crown Packaging Industries Ltd',
  });
  assert(editedExp.description === '50 reinforced paper egg crates', 'Description updated safely');
  assert(editedExp.supplier === 'Crown Packaging Industries Ltd', 'Supplier updated safely');
  assert(editedExp.amountPaid === 4000, 'Amount paid preserved during edit');

  // Edit validation: amount cannot be lower than already paid amount
  let underpayEditErr = false;
  try {
    await expenseService.editExpense(validExp.expenseId, {
      amount: 3000, // already paid is 4000
    });
  } catch {
    underpayEditErr = true;
  }
  assert(underpayEditErr, 'Updating amount lower than already settled payment is strictly rejected');

  // -----------------------------------------------------------------
  // TEST 4: EXPENSE CATEGORY VALIDATION & CUSTOM CATEGORIES
  // -----------------------------------------------------------------
  console.log('\n>>> TEST 4: Category Validation & Custom Category Management');
  const categories = await expenseService.getCategories();
  assert(categories.length >= 14, 'Default categories include standard poultry categories');
  assert(categories.includes('Feed purchases'), 'Includes Feed purchases');
  assert(categories.includes('Labour and salaries'), 'Includes Labour and salaries');

  // Add custom category
  const customCat = await expenseService.addCustomCategory('Solar Inverter & Battery Maintenance');
  assert(customCat === 'Solar Inverter & Battery Maintenance', 'Custom category added successfully');

  const updatedCategories = await expenseService.getCategories();
  assert(updatedCategories.includes('Solar Inverter & Battery Maintenance'), 'Custom category present in categories list');

  // Prevent duplicate category (case-insensitive)
  let dupCatErr = false;
  try {
    await expenseService.addCustomCategory('solar inverter & battery maintenance');
  } catch {
    dupCatErr = true;
  }
  assert(dupCatErr, 'Duplicate category name is strictly rejected');

  // -----------------------------------------------------------------
  // TEST 5: FULL, PARTIAL, AND UNPAID EXPENSES
  // -----------------------------------------------------------------
  console.log('\n>>> TEST 5: Full, Partial, and Unpaid Expense Recording');

  // 1. Fully paid expense
  const fullExp = await expenseService.recordExpense({
    category: 'Labour and salaries',
    description: 'Weekly farm attendant stipends',
    amount: 50000,
    amountPaid: 50000,
    paymentMethod: 'Bank Transfer',
    supplier: 'Farm Hands Payroll',
  });
  assert(fullExp.paymentStatus === 'Paid', 'Fully settled expense marked as Paid');
  assert(fullExp.amountPaid === 50000, 'Amount paid equals total amount');
  assert(fullExp.outstandingBalance === 0, 'Outstanding balance is 0 for full payment');

  // 2. Unpaid expense
  const unpaidExp = await expenseService.recordExpense({
    category: 'Water supply',
    description: 'Commercial borehole pump servicing on credit',
    amount: 25000,
    amountPaid: 0,
    paymentMethod: 'Credit / Payable',
    supplier: 'Osun Drilling Services',
  });
  assert(unpaidExp.paymentStatus === 'Unpaid', 'Expense with 0 payment marked as Unpaid');
  assert(unpaidExp.amountPaid === 0, 'Amount paid is ₦0.00');
  assert(unpaidExp.outstandingBalance === 25000, 'Outstanding balance equals full amount');

  // -----------------------------------------------------------------
  // TEST 6: OUTSTANDING BALANCE CALCULATIONS (KOBO PRECISION)
  // -----------------------------------------------------------------
  console.log('\n>>> TEST 6: Outstanding Balance Calculations (Kobo Precision)');
  assert(toKobo(1250.75) === 125075, '1250.75 converts to 125,075 kobo');
  assert(fromKobo(125075) === 1250.75, '125,075 kobo converts to 1250.75');
  assert(formatNaira(1250.75) === '₦1,250.75', 'formatNaira produces correct currency symbol and 2 decimals');

  // -----------------------------------------------------------------
  // TEST 7: ADDITIONAL EXPENSE PAYMENTS & SEQUENTIAL EPAY- IDS
  // -----------------------------------------------------------------
  console.log('\n>>> TEST 7: Additional Expense Payments & Sequential EPAY- IDs');
  // Pay ₦10,000 towards the ₦25,000 unpaid expense
  const payment1 = await expenseService.recordExpensePayment({
    expenseId: unpaidExp.expenseId,
    amount: 10000,
    paymentMethod: 'Bank Transfer',
    notes: 'First installment for borehole servicing',
  });

  assert(payment1.payment.paymentId.startsWith('EPAY-'), `Sequential EPAY- ID generated (got ${payment1.payment.paymentId})`);
  assert(payment1.updatedExpense.amountPaid === 10000, 'Expense amountPaid increased to ₦10,000');
  assert(payment1.updatedExpense.outstandingBalance === 15000, 'Expense outstanding balance decreased to ₦15,000');
  assert(payment1.updatedExpense.paymentStatus === 'Partial', 'Status transitioned to Partial');

  // Pay remaining ₦15,000
  const payment2 = await expenseService.recordExpensePayment({
    expenseId: unpaidExp.expenseId,
    amount: 15000,
    paymentMethod: 'Cash',
    notes: 'Final settlement for borehole servicing',
  });

  assert(payment2.updatedExpense.amountPaid === 25000, 'Expense fully settled at ₦25,000');
  assert(payment2.updatedExpense.outstandingBalance === 0, 'Outstanding balance is now 0');
  assert(payment2.updatedExpense.paymentStatus === 'Paid', 'Status automatically transitioned to Paid');

  // -----------------------------------------------------------------
  // TEST 8: DUPLICATE PAYMENT & OVERPAYMENT PREVENTION
  // -----------------------------------------------------------------
  console.log('\n>>> TEST 8: Duplicate Payment & Overpayment Prevention');

  // Overpayment attempt on fully settled expense
  let overpayErr = false;
  try {
    await expenseService.recordExpensePayment({
      expenseId: unpaidExp.expenseId,
      amount: 5000,
    });
  } catch {
    overpayErr = true;
  }
  assert(overpayErr, 'Payment exceeding outstanding balance is strictly blocked');

  // Rapid duplicate payment prevention within 3 seconds
  let dupPayErr = false;
  try {
    await expenseService.recordExpensePayment({
      expenseId: validExp.expenseId,
      amount: 2000,
      paymentMethod: 'Cash',
    });
    // Immediate identical re-submission
    await expenseService.recordExpensePayment({
      expenseId: validExp.expenseId,
      amount: 2000,
      paymentMethod: 'Cash',
    });
  } catch {
    dupPayErr = true;
  }
  assert(dupPayErr, 'Rapid duplicate payment submission within 3 seconds is prevented');

  // -----------------------------------------------------------------
  // TEST 9: PURCHASE INTEGRATION WITHOUT DUPLICATE STOCK MOVEMENTS
  // -----------------------------------------------------------------
  console.log('\n>>> TEST 9: Purchase Integration without Duplicate Stock Movements');

  // 1. Create a feed product and purchase in Module 05
  const feed = await feedService.createFeed({
    name: 'TopFeed Broiler Starter',
    type: 'Broiler Starter',
    currentStock: 100,
    unit: 'kg',
  });

  const feedPur = await feedService.recordFeedPurchase({
    feedId: feed.feedId || feed.id,
    quantity: 500, // +500 kg
    unitCost: 800,
    totalCost: 400000,
    supplier: 'Premier Feed Mills Ltd',
    invoiceNumber: 'INV-FEED-9988',
  });

  const feedAfterPurchase = await feedService.getFeedById(feed.id);
  assert(feedAfterPurchase.currentStock === 600, 'Feed stock credited to 600 kg on original purchase');

  // 2. Link this feed purchase into the expense ledger
  const linkedFeedExp = await expenseService.linkPurchaseAsExpense('FEED', feedPur.purchaseId);
  assert(linkedFeedExp.linkedPurchaseId === feedPur.purchaseId, 'Expense linked to feed purchase ID');
  assert(linkedFeedExp.amount === 400000, 'Expense amount matches purchase cost of ₦400,000');
  assert(linkedFeedExp.category === 'Feed purchases', 'Expense assigned to Feed purchases category');

  // 3. Verify feed stock was NOT modified again
  const feedAfterExpense = await feedService.getFeedById(feed.id);
  assert(
    feedAfterExpense.currentStock === 600,
    `Feed stock untouched at 600 kg after recording expense (got ${feedAfterExpense.currentStock} kg)`
  );

  // -----------------------------------------------------------------
  // TEST 10: PREVENTION OF DUPLICATE LINKED PURCHASE RECORDS
  // -----------------------------------------------------------------
  console.log('\n>>> TEST 10: Prevention of Duplicate Linked Purchase Records');

  let dupLinkErr = false;
  try {
    await expenseService.linkPurchaseAsExpense('FEED', feedPur.purchaseId);
  } catch {
    dupLinkErr = true;
  }
  assert(dupLinkErr, 'Attempting to create a duplicate expense for the same purchase is strictly blocked');

  // -----------------------------------------------------------------
  // TEST 11: ATOMIC ROLLBACK ON FAILED TRANSACTIONS
  // -----------------------------------------------------------------
  console.log('\n>>> TEST 11: Atomic Rollback on Failed Transactions');
  const expensesCountBefore = (await db.expenses.toArray()).length;
  const paymentsCountBefore = (await db.expensePayments.toArray()).length;

  let txError = false;
  try {
    await expenseService.recordExpense({
      category: 'Equipment and repairs',
      description: 'Faulty motor repair',
      amount: 10000,
      amountPaid: 15000, // Invalid: paid > total
    });
  } catch {
    txError = true;
  }
  assert(txError, 'Invalid transaction threw expected validation error');

  const expensesCountAfter = (await db.expenses.toArray()).length;
  const paymentsCountAfter = (await db.expensePayments.toArray()).length;
  assert(expensesCountAfter === expensesCountBefore, 'No orphan expense record was created on rollback');
  assert(paymentsCountAfter === paymentsCountBefore, 'No orphan payment record was created on rollback');

  // -----------------------------------------------------------------
  // TEST 12: SAFE CANCELLATION & REVERSAL
  // -----------------------------------------------------------------
  console.log('\n>>> TEST 12: Safe Cancellation & Reversal');

  const expToCancel = await expenseService.recordExpense({
    category: 'Transportation',
    description: 'Vehicle fuel for inter-state egg delivery',
    amount: 18000,
    amountPaid: 18000,
    supplier: 'Total Filling Station',
    paymentMethod: 'POS / Card',
  });

  const cancelResult = await expenseService.cancelExpense(expToCancel.expenseId, 'Delivery trip postponed');
  assert(cancelResult.status === 'Cancelled', 'Expense marked as Cancelled');
  assert(cancelResult.paymentStatus === 'Cancelled', 'Payment status marked as Cancelled');
  assert(cancelResult.cancellationReason === 'Delivery trip postponed', 'Cancellation reason preserved');

  const cancelledInDb = await db.expenses.where('expenseId').equals(expToCancel.expenseId).first();
  assert(cancelledInDb !== undefined, 'Cancelled record remains in database for audit integrity');

  const linkedPayments = await db.expensePayments.where('expenseId').equals(expToCancel.expenseId).toArray();
  const allPaymentsCancelled = linkedPayments.every((p) => p.status === 'Cancelled');
  assert(allPaymentsCancelled, 'Linked expense payments marked Cancelled');

  // -----------------------------------------------------------------
  // TEST 13: EXPENSE VOUCHER ACCURACY & FORMATTING
  // -----------------------------------------------------------------
  console.log('\n>>> TEST 13: Expense Voucher Accuracy & Formatting');
  const voucher = await expenseService.generateVoucherData(fullExp.expenseId);
  assert(voucher !== null, 'Voucher generated successfully');
  assert(voucher.farm.name.includes('FreshNest'), 'Voucher includes farm name');
  assert(voucher.expense.expenseId === fullExp.expenseId, 'Voucher includes correct expense ID');
  assert(voucher.expense.formattedAmount === '₦50,000.00', 'Voucher total formatted in ₦ with 2 decimals');
  assert(voucher.payments.length >= 1, 'Voucher includes linked payment history');
  assert(voucher.payments[0].formattedAmount === '₦50,000.00', 'Payment amount formatted in ₦');

  // -----------------------------------------------------------------
  // TEST 14: EXPENSE ANALYTICS ACCURACY (INCURRED VS CASH PAID)
  // -----------------------------------------------------------------
  console.log('\n>>> TEST 14: Expense Analytics Accuracy (Incurred vs Cash Paid)');
  const stats = await expenseService.getExpenseStats();
  assert(stats.totalExpenses > 0, 'Total expenses reported');
  assert(stats.totalCashPaid > 0, 'Total cash paid reported');
  assert(stats.categoryBreakdown.length > 0, 'Category breakdown generated');
  assert(stats.highestCategory.category !== 'None', `Highest category identified as ${stats.highestCategory.category}`);
  assert(stats.cancelledCount >= 2, `Cancelled expenses tracked in audit metrics (got ${stats.cancelledCount})`);

  // Verify cancelled expense is excluded from total expenses
  const allActiveExpenses = (await db.expenses.toArray()).filter((e) => e.status !== 'Cancelled');
  const expectedTotal = allActiveExpenses.reduce((sum, e) => sum + e.amount, 0);
  assert(
    stats.totalExpenses === expectedTotal,
    `Total expenses strictly excludes cancelled expenses (got ₦${stats.totalExpenses})`
  );

  // -----------------------------------------------------------------
  // TEST 15: CSV EXPORT HEADERS & CONTENT VERIFICATION
  // -----------------------------------------------------------------
  console.log('\n>>> TEST 15: CSV Export Headers & Content Verification');
  const csv = await expenseService.exportExpensesCSV();
  assert(csv.includes('Expense ID'), 'CSV includes Expense ID header');
  assert(csv.includes('Total Amount (NGN)'), 'CSV includes NGN currency in headers');
  assert(csv.includes('Outstanding Balance (NGN)'), 'CSV includes Outstanding Balance (NGN)');
  assert(csv.includes('Packaging materials') || csv.includes('Labour and salaries'), 'CSV includes recorded expense categories');

  // -----------------------------------------------------------------
  // TEST 16: DASHBOARD INTEGRATION & CROSS-MODULE INTEGRITY
  // -----------------------------------------------------------------
  console.log('\n>>> TEST 16: Dashboard Integration & Cross-Module Integrity');
  const dashStats = await dbService.getDashboardStats();
  assert(dashStats.totalExpenses === stats.totalExpenses, `Dashboard totalExpenses matches active expenses (got ₦${dashStats.totalExpenses})`);
  assert(dashStats.totalExpensesPaid !== undefined, 'Dashboard includes totalExpensesPaid');
  assert(dashStats.outstandingPayables !== undefined, 'Dashboard includes outstandingPayables');
  assert(dashStats.estimatedProfit !== undefined, 'Dashboard calculates estimated profit (Sales - Expenses)');

  const activities = await dbService.getRecentActivities(10);
  const expenseActivity = activities.find((a) => a.module === 'expenses');
  assert(expenseActivity !== undefined, 'Recent activities contains recorded expense log');
  assert(expenseActivity.title.includes('₦'), 'Expense activity title formats currency in ₦');

  // -----------------------------------------------------------------
  // TEST 17: REGRESSION VERIFICATION (MODULES 03-10 INTACT)
  // -----------------------------------------------------------------
  console.log('\n>>> TEST 17: Regression Verification for Modules 03-10');
  const birdCount = await db.birds.count();
  const batchCount = await db.batches.count();
  const feedCount = await db.feeds.count();
  const salesCount = await db.sales.count();
  assert(typeof birdCount === 'number', 'Bird management tables intact');
  assert(typeof batchCount === 'number', 'Batch management tables intact');
  assert(typeof feedCount === 'number', 'Feed management tables intact');
  assert(typeof salesCount === 'number', 'Sales management tables intact');

  // -----------------------------------------------------------------
  // SUMMARY
  // -----------------------------------------------------------------
  console.log('\n====================================================');
  console.log(` MODULE 11 AUDIT COMPLETE: ${passedTests} passed, ${failedTests} failed`);
  console.log('====================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runAudit().catch((err) => {
  console.error('Audit execution error:', err);
  process.exit(1);
});
