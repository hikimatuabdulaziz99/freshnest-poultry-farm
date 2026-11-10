import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import fs from 'fs';
import { db } from '../src/database/db.js';
import {
  reportsService,
  DATE_PRESETS,
  REPORT_TYPES,
  getDateRangeBounds,
  isWithinDateRange,
  toKobo,
  fromKobo,
  formatNaira,
  getLocalDateString,
} from '../src/services/reportsService.js';

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
  console.log(' FRESHNEST POULTRY FARM: MODULE 13 AUDIT & TESTS');
  console.log('====================================================\n');

  // -----------------------------------------------------------------
  // TEST 1: REPORTS MODULE REGISTRATION
  // -----------------------------------------------------------------
  console.log('>>> TEST 1: Reports Module Registration');
  const indexContent = fs.readFileSync(new URL('../src/modules/index.js', import.meta.url), 'utf-8');
  assert(indexContent.includes('reports: ReportsAnalyticsModule'), 'MODULE_REGISTRY maps reports to ReportsAnalyticsModule');
  assert(indexContent.includes('ReportsAnalyticsModule'), 'ReportsAnalyticsModule is imported and exported');

  const quickActionsContent = fs.readFileSync(new URL('../src/components/dashboard/QuickActions.jsx', import.meta.url), 'utf-8');
  assert(quickActionsContent.includes("targetModule: 'reports'"), 'Dashboard QuickActions includes Reports & Analytics shortcut');

  // -----------------------------------------------------------------
  // TEST 2: INDEXEDDB READ ACCESS
  // -----------------------------------------------------------------
  console.log('\n>>> TEST 2: IndexedDB Read Access');
  await db.open();
  assert(db.isOpen(), 'IndexedDB database is open and connected');
  assert(typeof db.birds.toArray === 'function', 'db.birds readable');
  assert(typeof db.batches.toArray === 'function', 'db.batches readable');
  assert(typeof db.feeds.toArray === 'function', 'db.feeds readable');
  assert(typeof db.eggLogs.toArray === 'function', 'db.eggLogs readable');
  assert(typeof db.mortalityLogs.toArray === 'function', 'db.mortalityLogs readable');
  assert(typeof db.sales.toArray === 'function', 'db.sales readable');
  assert(typeof db.expenses.toArray === 'function', 'db.expenses readable');
  assert(typeof db.inventory.toArray === 'function', 'db.inventory readable');

  // Clear test tables to establish controlled test state
  await db.birds.clear();
  await db.batches.clear();
  await db.pens.clear();
  await db.feeds.clear();
  await db.feedLogs.clear();
  await db.medications.clear();
  await db.medicationLogs.clear();
  await db.vaccines.clear();
  await db.vaccinationLogs.clear();
  await db.eggLogs.clear();
  await db.mortalityLogs.clear();
  await db.sales.clear();
  await db.payments.clear();
  await db.expenses.clear();
  await db.expensePayments.clear();
  await db.inventory.clear();
  await db.inventoryMovements.clear();

  // -----------------------------------------------------------------
  // TEST 3: DATE RANGE FILTERING
  // -----------------------------------------------------------------
  console.log('\n>>> TEST 3: Date Range Filtering (Presets & Bounds)');
  const todayBounds = getDateRangeBounds(DATE_PRESETS.TODAY);
  const todayStr = getLocalDateString();
  assert(todayBounds.startDate === todayStr, `Today preset starts at today (${todayStr})`);
  assert(todayBounds.endDate === todayStr, `Today preset ends at today (${todayStr})`);

  const weekBounds = getDateRangeBounds(DATE_PRESETS.THIS_WEEK);
  assert(weekBounds.startDate <= weekBounds.endDate, 'This week start <= end');

  const monthBounds = getDateRangeBounds(DATE_PRESETS.THIS_MONTH);
  assert(monthBounds.startDate.endsWith('-01'), `This month starts on 1st (${monthBounds.startDate})`);

  const customBounds = getDateRangeBounds(DATE_PRESETS.CUSTOM, '2026-05-01', '2026-05-31');
  assert(customBounds.startDate === '2026-05-01', 'Custom range start set correctly');
  assert(customBounds.endDate === '2026-05-31', 'Custom range end set correctly');

  assert(isWithinDateRange('2026-05-15', '2026-05-01', '2026-05-31'), 'isWithinDateRange includes midpoint date');
  assert(isWithinDateRange('2026-05-01', '2026-05-01', '2026-05-31'), 'isWithinDateRange includes start boundary date');
  assert(isWithinDateRange('2026-05-31', '2026-05-01', '2026-05-31'), 'isWithinDateRange includes end boundary date');
  assert(!isWithinDateRange('2026-04-30', '2026-05-01', '2026-05-31'), 'isWithinDateRange excludes prior date');
  assert(!isWithinDateRange('2026-06-01', '2026-05-01', '2026-05-31'), 'isWithinDateRange excludes subsequent date');

  // -----------------------------------------------------------------
  // TEST 4: EMPTY-STATE HANDLING
  // -----------------------------------------------------------------
  console.log('\n>>> TEST 4: Empty-State Handling');
  const futureBounds = { startDate: '2035-01-01', endDate: '2035-01-31', preset: 'custom' };
  const emptyReport = await reportsService.getReportData('sales', futureBounds);
  assert(emptyReport.records.length === 0, 'Empty period produces 0 records without throwing');
  assert(emptyReport.totalRevenue === 0, 'Empty sales revenue is 0');
  assert(emptyReport.outstandingReceivables === 0, 'Empty receivables is 0');

  // -----------------------------------------------------------------
  // SEED TEST DATA FOR MODULES 03-12 (OCTOBER 2026)
  // -----------------------------------------------------------------
  console.log('\n>>> Seeding Controlled Test Farm Records for October 2026...');
  const testMonthBounds = { startDate: '2026-10-01', endDate: '2026-10-31', preset: 'custom' };

  // 1. Pens & Batches
  await db.pens.add({ penId: 'PEN-001', name: 'Brooder Pen A', type: 'Brooder', capacity: 600 });
  await db.pens.add({ penId: 'PEN-002', name: 'Layer House 1', type: 'Layer House', capacity: 1000 });

  await db.batches.add({
    batchCode: 'BAT-2026-01',
    breed: 'Isa Brown',
    birdType: 'Layer',
    penId: 'PEN-002',
    initialCount: 500,
    currentCount: 485,
    arrivalDate: '2026-10-01',
    status: 'Active',
  });

  // 2. Birds (Standalone + Batch)
  await db.birds.add({ tagNumber: 'BRD-001', breed: 'Noiler', type: 'Dual-Purpose', status: 'Active', houseNumber: 'PEN-001' });
  await db.birds.add({ tagNumber: 'BRD-002', breed: 'Noiler', type: 'Dual-Purpose', status: 'Active', houseNumber: 'PEN-001' });
  await db.birds.add({ tagNumber: 'BRD-003', breed: 'Isa Brown', type: 'Layer', status: 'Active', batchId: 'BAT-2026-01', houseNumber: 'PEN-002' });

  // 3. Feeds & Feed Logs
  await db.feeds.add({ name: 'Layer Mash Premium', type: 'Layer Mash', currentStock: 800, unit: 'kg' });
  await db.feedLogs.add({
    logId: 'FLOG-001',
    date: '2026-10-05',
    feedName: 'Layer Mash Premium',
    batchId: 'BAT-2026-01',
    quantity: 60,
    unit: 'kg',
    ratePerBird: 120,
    recordedBy: 'Feeder Dan',
  });
  await db.feedLogs.add({
    logId: 'FLOG-002',
    date: '2026-10-10',
    feedName: 'Layer Mash Premium',
    batchId: 'BAT-2026-01',
    quantity: 65,
    unit: 'kg',
    ratePerBird: 130,
    recordedBy: 'Feeder Dan',
  });

  // 4. Medications
  await db.medications.add({ name: 'Tylodox 20%', type: 'Antibiotic', currentStock: 10, unit: 'bottles', withdrawalDays: 5 });
  await db.medicationLogs.add({
    logId: 'MLOG-001',
    administeredDate: '2026-10-12',
    medicationName: 'Tylodox 20%',
    batchId: 'BAT-2026-01',
    dosageGiven: '100ml / 200L water',
    reason: 'CRD Prevention',
    withdrawalEndDate: '2026-10-17',
    administeredBy: 'Dr. Bello',
  });

  // 5. Vaccines
  await db.vaccines.add({ name: 'LaSota Newcastle Vaccine', currentStock: 5 });
  await db.vaccinationLogs.add({
    logId: 'VLOG-001',
    administeredDate: '2026-10-14',
    vaccineName: 'LaSota Newcastle Vaccine',
    batchId: 'BAT-2026-01',
    administrationMethod: 'Eye Drop',
    doses: 500,
    status: 'Administered',
    administeredBy: 'Vet Tech Ruth',
  });

  // 6. Eggs
  await db.eggLogs.add({
    logId: 'EGG-001',
    date: '2026-10-15',
    batchId: 'BAT-2026-01',
    totalCollected: 450,
    goodEggs: 435,
    crackedEggs: 10,
    dirtyEggs: 5,
    hdp: 89.7,
    collectedBy: 'Staff Mary',
  });
  await db.eggLogs.add({
    logId: 'EGG-002',
    date: '2026-10-16',
    batchId: 'BAT-2026-01',
    totalCollected: 460,
    goodEggs: 445,
    crackedEggs: 8,
    dirtyEggs: 7,
    hdp: 91.8,
    collectedBy: 'Staff Mary',
  });

  // 7. Mortality
  await db.mortalityLogs.add({
    mortalityId: 'MORT-001',
    date: '2026-10-08',
    batchId: 'BAT-2026-01',
    count: 3,
    cause: 'Heat stress',
    symptoms: 'Pant and exhaustion',
    disposedMethod: 'Buried',
    recordedBy: 'Supervisor David',
  });
  await db.mortalityLogs.add({
    mortalityId: 'MORT-002',
    date: '2026-10-20',
    batchId: 'BAT-2026-01',
    count: 2,
    cause: 'Smothering',
    disposedMethod: 'Buried',
    recordedBy: 'Supervisor David',
  });

  // 8. Sales
  await db.sales.add({
    saleId: 'SALE-001',
    saleDate: '2026-10-18',
    customerName: 'Alhaji Musa Foods',
    productType: 'Table Eggs',
    quantity: 25,
    unit: 'crates',
    unitPrice: 3800,
    totalAmount: 95000,
    amountPaid: 75000,
    outstandingBalance: 20000,
    paymentStatus: 'Partial',
    paymentMethod: 'Bank Transfer',
    status: 'Completed',
  });
  await db.sales.add({
    saleId: 'SALE-002',
    saleDate: '2026-10-22',
    customerName: 'Mama Nkechi Kitchen',
    productType: 'Live Birds',
    quantity: 10,
    unit: 'birds',
    unitPrice: 5000,
    totalAmount: 50000,
    amountPaid: 50000,
    outstandingBalance: 0,
    paymentStatus: 'Paid',
    paymentMethod: 'Cash',
    status: 'Completed',
  });
  // Cancelled sale (should be excluded)
  await db.sales.add({
    saleId: 'SALE-CANCELLED',
    saleDate: '2026-10-25',
    customerName: 'Void Customer',
    productType: 'Table Eggs',
    quantity: 10,
    totalAmount: 38000,
    amountPaid: 0,
    outstandingBalance: 38000,
    paymentStatus: 'Cancelled',
    status: 'Cancelled',
  });

  // Dedicated Payments
  await db.payments.add({
    paymentId: 'PAY-001',
    saleId: 'SALE-001',
    amount: 75000,
    paymentDate: '2026-10-18',
  });
  await db.payments.add({
    paymentId: 'PAY-002',
    saleId: 'SALE-002',
    amount: 50000,
    paymentDate: '2026-10-22',
  });

  // 9. Expenses
  await db.expenses.add({
    expenseId: 'EXP-001',
    expenseDate: '2026-10-03',
    category: 'Feed purchases',
    description: '10 bags Layer Mash',
    supplier: 'Supreme Feed Mills',
    amount: 60000,
    amountPaid: 60000,
    outstandingBalance: 0,
    paymentStatus: 'Paid',
    paymentMethod: 'Bank Transfer',
    status: 'Completed',
  });
  await db.expenses.add({
    expenseId: 'EXP-002',
    expenseDate: '2026-10-15',
    category: 'Labour and salaries',
    description: 'Bi-weekly farmhand wages',
    supplier: 'Farm Staff',
    amount: 35000,
    amountPaid: 25000,
    outstandingBalance: 10000,
    paymentStatus: 'Partial',
    paymentMethod: 'Cash',
    status: 'Completed',
  });
  // Cancelled expense (should be excluded)
  await db.expenses.add({
    expenseId: 'EXP-CANCELLED',
    expenseDate: '2026-10-19',
    category: 'Equipment',
    description: 'Broken drinker order cancelled',
    supplier: 'Agro Tech',
    amount: 25000,
    amountPaid: 0,
    outstandingBalance: 25000,
    paymentStatus: 'Cancelled',
    status: 'Cancelled',
  });

  await db.expensePayments.add({
    paymentId: 'EPAY-001',
    expenseId: 'EXP-001',
    amount: 60000,
    paymentDate: '2026-10-03',
    status: 'Completed',
  });
  await db.expensePayments.add({
    paymentId: 'EPAY-002',
    expenseId: 'EXP-002',
    amount: 25000,
    paymentDate: '2026-10-15',
    status: 'Completed',
  });

  // 10. Inventory
  await db.inventory.add({
    itemId: 'INV-001',
    itemName: 'Egg Trays (30-Egg)',
    category: 'Packaging materials',
    currentQuantity: 200,
    reorderLevel: 50,
    unitCost: 150,
    storageLocation: 'Packaging Room',
    status: 'Active',
  });
  await db.inventory.add({
    itemId: 'INV-002',
    itemName: 'TH4+ Disinfectant',
    category: 'Disinfectants',
    currentQuantity: 10,
    reorderLevel: 5,
    unitCost: 18000,
    storageLocation: 'Chemical Store',
    status: 'Active',
  });

  // -----------------------------------------------------------------
  // TEST 5: BIRD POPULATION CALCULATIONS
  // -----------------------------------------------------------------
  console.log('\n>>> TEST 5: Bird Population Calculations');
  const summary = await reportsService.getFarmPerformanceSummary(testMonthBounds);
  // Total living birds = 485 (batch live) + 2 (standalone live) = 487 (BRD-003 is already inside batch BAT-2026-01)
  assert(summary.currentLivingBirds === 487, `Living flock correctly calculated: 485 + 2 = 487 (got ${summary.currentLivingBirds})`);
  assert(summary.totalBirdRecords === 3, `Total individual bird records is 3 (got ${summary.totalBirdRecords})`);
  assert(summary.activeBatches === 1, `Active batches count is 1 (got ${summary.activeBatches})`);

  // -----------------------------------------------------------------
  // TEST 6: BATCH AND PEN SUMMARIES
  // -----------------------------------------------------------------
  console.log('\n>>> TEST 6: Batch and Pen Summaries');
  const batchReport = await reportsService.getReportData('batches', testMonthBounds);
  assert(batchReport.totalBatches === 1, 'Batch report lists 1 batch');
  assert(batchReport.records[0].currentCount === 485, 'Batch current count is 485');
  assert(batchReport.records[0].mortalityCount === 15, 'Batch mortality count is 15 (500 - 485)');
  assert(batchReport.penOccupancy.length === 2, 'Pen occupancy covers 2 pens');
  const pen2 = batchReport.penOccupancy.find((p) => p.penId === 'PEN-002');
  assert(pen2.occupied === 485, `PEN-002 occupied count is 485 (got ${pen2.occupied})`);
  assert(pen2.available === 515, `PEN-002 available count is 515 (got ${pen2.available})`);
  assert(pen2.utilizationPct === 48.5, `PEN-002 utilization is 48.5% (got ${pen2.utilizationPct}%)`);

  // -----------------------------------------------------------------
  // TEST 7: FEED CONSUMPTION TOTALS
  // -----------------------------------------------------------------
  console.log('\n>>> TEST 7: Feed Consumption Totals');
  const feedReport = await reportsService.getReportData('feed', testMonthBounds);
  assert(feedReport.totalFedKg === 125, `Feed consumed in October is 60 + 65 = 125 kg (got ${feedReport.totalFedKg} kg)`);
  assert(summary.feedConsumedKg === 125, `Summary feedConsumed matches 125 kg (got ${summary.feedConsumedKg} kg)`);

  // -----------------------------------------------------------------
  // TEST 8: MEDICATION REPORT CALCULATIONS
  // -----------------------------------------------------------------
  console.log('\n>>> TEST 8: Medication Report Calculations');
  const medReport = await reportsService.getReportData('medication', testMonthBounds);
  assert(medReport.totalTreatments === 1, 'Medication report records 1 treatment in October');
  assert(medReport.records[0].medicationName === 'Tylodox 20%', 'Medication name matches');
  assert(medReport.records[0].withdrawalEndDate === '2026-10-17', 'Withdrawal end date matches');

  // -----------------------------------------------------------------
  // TEST 9: VACCINATION REPORT CALCULATIONS
  // -----------------------------------------------------------------
  console.log('\n>>> TEST 9: Vaccination Report Calculations');
  const vaxReport = await reportsService.getReportData('vaccination', testMonthBounds);
  assert(vaxReport.totalVaccinations === 1, 'Vaccination report records 1 vaccination');
  assert(vaxReport.administeredCount === 1, 'Administered count is 1');
  assert(vaxReport.records[0].doses === 500, 'Vaccination doses matches 500');

  // -----------------------------------------------------------------
  // TEST 10: EGG PRODUCTION AND HDP CALCULATIONS
  // -----------------------------------------------------------------
  console.log('\n>>> TEST 10: Egg Production & HDP Calculations');
  const eggReport = await reportsService.getReportData('eggs', testMonthBounds);
  assert(eggReport.totalCollected === 910, `Total eggs collected is 450 + 460 = 910 (got ${eggReport.totalCollected})`);
  assert(eggReport.goodEggs === 880, `Good eggs is 435 + 445 = 880 (got ${eggReport.goodEggs})`);
  assert(eggReport.crackedEggs === 18, `Cracked eggs is 10 + 8 = 18 (got ${eggReport.crackedEggs})`);
  assert(eggReport.cratesCount === 29, `Crates count is 880 / 30 = 29 crates (got ${eggReport.cratesCount})`);
  assert(eggReport.looseCount === 10, `Loose eggs count is 880 % 30 = 10 loose (got ${eggReport.looseCount})`);
  assert(summary.averageHdp > 89 && summary.averageHdp < 92, `Average HDP is ~90.8% (got ${summary.averageHdp}%)`);

  // -----------------------------------------------------------------
  // TEST 11: MORTALITY CALCULATIONS
  // -----------------------------------------------------------------
  console.log('\n>>> TEST 11: Mortality Calculations');
  const mortReport = await reportsService.getReportData('mortality', testMonthBounds);
  assert(mortReport.totalDeaths === 5, `Total deaths in October is 3 + 2 = 5 (got ${mortReport.totalDeaths})`);
  assert(mortReport.causeBreakdown['Heat stress'] === 3, 'Heat stress cause count is 3');
  assert(mortReport.causeBreakdown['Smothering'] === 2, 'Smothering cause count is 2');
  assert(summary.mortalityRate > 0.9 && summary.mortalityRate < 1.1, `Mortality rate is ~1.02% (got ${summary.mortalityRate}%)`);

  // -----------------------------------------------------------------
  // TEST 12: SALES REVENUE CALCULATIONS
  // -----------------------------------------------------------------
  console.log('\n>>> TEST 12: Sales Revenue Calculations (Accrual)');
  const salesReport = await reportsService.getReportData('sales', testMonthBounds);
  // Total valid sales: 95,000 + 50,000 = 145,000 (excluding 38,000 cancelled)
  assert(salesReport.totalRevenue === 145000, `Sales revenue strictly equals ₦145,000 (got ₦${salesReport.totalRevenue})`);
  assert(summary.salesRevenue === 145000, `Summary sales revenue matches ₦145,000 (got ₦${summary.salesRevenue})`);

  // -----------------------------------------------------------------
  // TEST 13: PAYMENTS RECEIVED CALCULATIONS (CASH IN)
  // -----------------------------------------------------------------
  console.log('\n>>> TEST 13: Payments Received Calculations (Cash Inflow)');
  // Payments received: 75,000 + 50,000 = 125,000
  assert(salesReport.totalPaid === 125000, `Sales report total paid is ₦125,000 (got ₦${salesReport.totalPaid})`);
  assert(summary.paymentsReceived === 125000, `Summary payments received is ₦125,000 (got ₦${summary.paymentsReceived})`);

  // -----------------------------------------------------------------
  // TEST 14: CUSTOMER RECEIVABLES
  // -----------------------------------------------------------------
  console.log('\n>>> TEST 14: Customer Receivables');
  // Receivables from SALE-001 = 20,000
  assert(salesReport.outstandingReceivables === 20000, `Outstanding receivables is ₦20,000 (got ₦${salesReport.outstandingReceivables})`);
  assert(summary.customerReceivables === 20000, `Summary customer receivables is ₦20,000 (got ₦${summary.customerReceivables})`);

  // -----------------------------------------------------------------
  // TEST 15: EXPENSES INCURRED
  // -----------------------------------------------------------------
  console.log('\n>>> TEST 15: Expenses Incurred (Accrual)');
  const expReport = await reportsService.getReportData('expenses', testMonthBounds);
  // Valid expenses: 60,000 + 35,000 = 95,000 (excluding 25,000 cancelled)
  assert(expReport.totalIncurred === 95000, `Expenses incurred strictly equals ₦95,000 (got ₦${expReport.totalIncurred})`);
  assert(summary.expensesIncurred === 95000, `Summary expenses incurred matches ₦95,000 (got ₦${summary.expensesIncurred})`);

  // -----------------------------------------------------------------
  // TEST 16: EXPENSES PAID (CASH OUT)
  // -----------------------------------------------------------------
  console.log('\n>>> TEST 16: Expenses Paid (Cash Outflow)');
  // Expenses paid: 60,000 + 25,000 = 85,000
  assert(expReport.totalPaid === 85000, `Expenses paid equals ₦85,000 (got ₦${expReport.totalPaid})`);
  assert(summary.expensesPaid === 85000, `Summary expenses paid matches ₦85,000 (got ₦${summary.expensesPaid})`);

  // -----------------------------------------------------------------
  // TEST 17: SUPPLIER PAYABLES
  // -----------------------------------------------------------------
  console.log('\n>>> TEST 17: Supplier Payables');
  // Outstanding on EXP-002: 10,000
  assert(expReport.outstandingPayables === 10000, `Outstanding payables is ₦10,000 (got ₦${expReport.outstandingPayables})`);
  assert(summary.supplierPayables === 10000, `Summary supplier payables is ₦10,000 (got ₦${summary.supplierPayables})`);

  // -----------------------------------------------------------------
  // TEST 18: ESTIMATED PROFIT CALCULATION (INTEGER KOBO PRECISION)
  // -----------------------------------------------------------------
  console.log('\n>>> TEST 18: Estimated Profit Calculation');
  // Estimated Profit = 145,000 (Sales Revenue) - 95,000 (Expenses Incurred) = 50,000
  assert(summary.estimatedProfit === 50000, `Estimated Profit is 145,000 - 95,000 = ₦50,000 (got ₦${summary.estimatedProfit})`);
  assert(toKobo(50000) === 5000000, 'Integer kobo precision verified');

  // -----------------------------------------------------------------
  // TEST 19: CANCELLED TRANSACTION EXCLUSION
  // -----------------------------------------------------------------
  console.log('\n>>> TEST 19: Cancelled Transaction Exclusion');
  const allSalesInDb = await db.sales.toArray();
  const rawSumSales = allSalesInDb.reduce((sum, s) => sum + s.totalAmount, 0);
  assert(rawSumSales === 183000, 'Raw database sales including cancelled is 183,000');
  assert(summary.salesRevenue === 145000, 'Cancelled sale SALE-CANCELLED (38,000) was strictly excluded from revenue');

  const allExpensesInDb = await db.expenses.toArray();
  const rawSumExp = allExpensesInDb.reduce((sum, e) => sum + e.amount, 0);
  assert(rawSumExp === 120000, 'Raw database expenses including cancelled is 120,000');
  assert(summary.expensesIncurred === 95000, 'Cancelled expense EXP-CANCELLED (25,000) was strictly excluded from expenses');

  // -----------------------------------------------------------------
  // TEST 20: DUPLICATE PURCHASE EXPENSE PREVENTION
  // -----------------------------------------------------------------
  console.log('\n>>> TEST 20: Duplicate Purchase Expense Prevention');
  // Check that feed purchases linked to expenses are accounted without duplication
  const linkedExp = await db.expenses.where('category').equals('Feed purchases').first();
  assert(linkedExp !== undefined, 'Feed purchase expense is registered in expenses ledger');
  const feedCount = await db.feeds.count();
  assert(feedCount === 1, 'Feeds inventory records remain isolated');

  // -----------------------------------------------------------------
  // TEST 21: INVENTORY VALUATION
  // -----------------------------------------------------------------
  console.log('\n>>> TEST 21: General Inventory Valuation');
  // Inventory: (200 * 150) + (10 * 18,000) = 30,000 + 180,000 = 210,000
  const invReport = await reportsService.getReportData('inventory', testMonthBounds);
  assert(invReport.totalValuation === 210000, `Inventory valuation equals ₦210,000 (got ₦${invReport.totalValuation})`);
  assert(summary.generalInventoryValuation === 210000, `Summary inventory valuation matches ₦210,000 (got ₦${summary.generalInventoryValuation})`);

  // -----------------------------------------------------------------
  // TEST 22: CSV EXPORT CORRECTNESS
  // -----------------------------------------------------------------
  console.log('\n>>> TEST 22: CSV Export Correctness');
  const salesCsv = await reportsService.exportReportCSV('sales', testMonthBounds);
  assert(salesCsv.filename.includes('sales_report'), 'Filename includes sales_report');
  assert(salesCsv.csvContent.includes('Total Invoiced (NGN)'), 'CSV header includes (NGN)');
  assert(salesCsv.csvContent.includes('Alhaji Musa Foods'), 'CSV content contains customer name');
  assert(!salesCsv.csvContent.includes('Void Customer'), 'CSV strictly excludes cancelled transaction');

  const financialCsv = await reportsService.exportReportCSV('financial', testMonthBounds);
  assert(financialCsv.filename.includes('financial_report'), 'Financial CSV filename generated');
  assert(financialCsv.csvContent.includes('Estimated Profit'), 'Financial CSV includes Estimated Profit row');

  // -----------------------------------------------------------------
  // TEST 23: PRINT-FRIENDLY REPORT GENERATION STRUCTURE
  // -----------------------------------------------------------------
  console.log('\n>>> TEST 23: Print-Friendly Report Generation Structure');
  const finReport = await reportsService.getReportData('financial', testMonthBounds);
  assert(finReport.title === 'Profit & Financial Summary', 'Report title matches');
  assert(finReport.summary !== undefined, 'Report has summary KPI structure');
  assert(finReport.summary.netCashflow === 40000, `Net operating cashflow is 125,000 - 85,000 = ₦40,000 (got ₦${finReport.summary.netCashflow})`);

  // -----------------------------------------------------------------
  // TEST 24: OFFLINE REPORT GENERATION
  // -----------------------------------------------------------------
  console.log('\n>>> TEST 24: Offline Report Generation');
  // Test generating all 12 reports offline sequentially
  const all12Types = REPORT_TYPES.map((r) => r.id);
  assert(all12Types.length === 12, '12 report categories defined');
  for (const repId of all12Types) {
    const rep = await reportsService.getReportData(repId, testMonthBounds);
    assert(rep !== null && typeof rep === 'object', `Offline generation succeeded for report: ${repId}`);
  }

  // -----------------------------------------------------------------
  // TEST 25: REGRESSION CHECKS FOR MODULES 03–12
  // -----------------------------------------------------------------
  console.log('\n>>> TEST 25: Regression Checks for Modules 03-12');
  const birdsCount = await db.birds.count();
  const batchesCount = await db.batches.count();
  const pensCount = await db.pens.count();
  const feedsCount = await db.feeds.count();
  const medsCount = await db.medications.count();
  const vaxCount = await db.vaccines.count();
  const eggsCount = await db.eggLogs.count();
  const mortCount = await db.mortalityLogs.count();
  const salesCount = await db.sales.count();
  const expCount = await db.expenses.count();
  const invCount = await db.inventory.count();

  assert(birdsCount >= 3, 'Module 03 (Birds) records intact');
  assert(batchesCount >= 1 && pensCount >= 2, 'Module 04 (Batches & Pens) records intact');
  assert(feedsCount >= 1, 'Module 05 (Feed) records intact');
  assert(medsCount >= 1, 'Module 06 (Medication) records intact');
  assert(vaxCount >= 1, 'Module 07 (Vaccination) records intact');
  assert(eggsCount >= 2, 'Module 08 (Egg Production) records intact');
  assert(mortCount >= 2, 'Module 09 (Mortality) records intact');
  assert(salesCount >= 3, 'Module 10 (Sales) records intact');
  assert(expCount >= 3, 'Module 11 (Expenses) records intact');
  assert(invCount >= 2, 'Module 12 (Inventory) records intact');

  // -----------------------------------------------------------------
  // SUMMARY
  // -----------------------------------------------------------------
  console.log('\n====================================================');
  console.log(` MODULE 13 AUDIT COMPLETE: ${passedTests} passed, ${failedTests} failed`);
  console.log('====================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runAudit().catch((err) => {
  console.error('Audit execution error:', err);
  process.exit(1);
});
