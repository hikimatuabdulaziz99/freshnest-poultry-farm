import { db } from '../database/db.js';

/**
 * FreshNest Poultry Farm - Module 13: Reports & Analytics Service
 * Pure offline-first architecture using Dexie.js and IndexedDB.
 * Reads actual historical data from Modules 03-12 without modifying original records.
 * Supports:
 * - Precise date range filtering (local farm dates YYYY-MM-DD)
 * - Integer kobo calculations for financial precision
 * - 12 Specialized report categories
 * - KPI farm performance aggregations
 * - Interactive analytics chart data
 * - CSV export generation
 */

// Preset date ranges
export const DATE_PRESETS = {
  TODAY: 'today',
  THIS_WEEK: 'thisWeek',
  THIS_MONTH: 'thisMonth',
  LAST_MONTH: 'lastMonth',
  THIS_YEAR: 'thisYear',
  CUSTOM: 'custom',
};

export const REPORT_TYPES = [
  { id: 'overview', label: 'Farm Overview Report', icon: 'LayoutDashboard' },
  { id: 'birds', label: 'Bird Population Report', icon: 'Bird' },
  { id: 'batches', label: 'Batch & Pen Report', icon: 'Layers' },
  { id: 'feed', label: 'Feed Consumption Report', icon: 'Wheat' },
  { id: 'medication', label: 'Medication Report', icon: 'Pill' },
  { id: 'vaccination', label: 'Vaccination Report', icon: 'Syringe' },
  { id: 'eggs', label: 'Egg Production Report', icon: 'Egg' },
  { id: 'mortality', label: 'Mortality Report', icon: 'Activity' },
  { id: 'sales', label: 'Sales & Revenue Report', icon: 'ShoppingBag' },
  { id: 'expenses', label: 'Expenses Report', icon: 'Receipt' },
  { id: 'inventory', label: 'Inventory Report', icon: 'Boxes' },
  { id: 'financial', label: 'Profit & Financial Summary', icon: 'FileBarChart' },
];

/**
 * Format local date as YYYY-MM-DD
 */
export function getLocalDateString(dateInput = new Date()) {
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Helper: Convert Naira to integer kobo
 */
export function toKobo(naira) {
  const num = Number(naira);
  if (isNaN(num)) return 0;
  return Math.round(num * 100);
}

/**
 * Helper: Convert kobo to Naira decimal
 */
export function fromKobo(kobo) {
  const num = Number(kobo);
  if (isNaN(num)) return 0;
  return Number((num / 100).toFixed(2));
}

/**
 * Helper: Format amount in Nigerian Naira with 2 decimal places
 */
export function formatNaira(amount) {
  const safe = fromKobo(toKobo(amount));
  return '₦' + safe.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Calculate start and end bounds based on preset
 */
export function getDateRangeBounds(preset = DATE_PRESETS.THIS_MONTH, customStart = '', customEnd = '') {
  const now = new Date();
  const todayStr = getLocalDateString(now);

  switch (preset) {
    case DATE_PRESETS.TODAY:
      return { startDate: todayStr, endDate: todayStr, preset };

    case DATE_PRESETS.THIS_WEEK: {
      // Monday to Sunday of current week
      const dayOfWeek = now.getDay(); // 0 is Sunday, 1 is Monday
      const diffToMonday = (dayOfWeek === 0 ? -6 : 1) - dayOfWeek;
      const monday = new Date(now);
      monday.setDate(now.getDate() + diffToMonday);

      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);

      return {
        startDate: getLocalDateString(monday),
        endDate: getLocalDateString(sunday),
        preset,
      };
    }

    case DATE_PRESETS.THIS_MONTH: {
      const year = now.getFullYear();
      const month = now.getMonth();
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);

      return {
        startDate: getLocalDateString(firstDay),
        endDate: getLocalDateString(lastDay),
        preset,
      };
    }

    case DATE_PRESETS.LAST_MONTH: {
      const year = now.getFullYear();
      const month = now.getMonth() - 1;
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);

      return {
        startDate: getLocalDateString(firstDay),
        endDate: getLocalDateString(lastDay),
        preset,
      };
    }

    case DATE_PRESETS.THIS_YEAR: {
      const year = now.getFullYear();
      return {
        startDate: `${year}-01-01`,
        endDate: `${year}-12-31`,
        preset,
      };
    }

    case DATE_PRESETS.CUSTOM:
    default: {
      return {
        startDate: customStart || '2000-01-01',
        endDate: customEnd || todayStr,
        preset: DATE_PRESETS.CUSTOM,
      };
    }
  }
}

/**
 * Check if a date string falls within [startDate, endDate] (inclusive)
 */
export function isWithinDateRange(dateInput, startDate, endDate) {
  if (!dateInput) return false;
  const dStr = String(dateInput).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dStr)) return false;
  return dStr >= startDate && dStr <= endDate;
}

export const reportsService = {
  /**
   * Load Farm Performance Summary KPIs for the chosen date range
   */
  async getFarmPerformanceSummary(dateRange) {
    const { startDate, endDate } = dateRange;

    try {
      const [
        birds,
        batches,
        eggLogs,
        feedLogs,
        mortalityLogs,
        sales,
        payments,
        expenses,
        expensePayments,
        inventory,
      ] = await Promise.all([
        db.birds.toArray(),
        db.batches.toArray(),
        db.eggLogs.toArray(),
        db.feedLogs.toArray(),
        db.mortalityLogs.toArray(),
        db.sales.toArray(),
        db.payments.toArray(),
        db.expenses.toArray(),
        db.expensePayments.toArray(),
        db.inventory.toArray(),
      ]);

      // 1. Bird Population
      const totalBirdRecords = birds.length;
      const batchInitialSum = batches.reduce((sum, b) => sum + (Math.max(0, Number(b.initialCount)) || 0), 0);
      const standaloneBirds = birds.filter((b) => !b.batchId);
      const totalBirdsCumulative = batchInitialSum + standaloneBirds.length;

      // Active live bird population
      const activeBatchesList = batches.filter(
        (b) => b.status !== 'Closed' && b.status !== 'Harvested' && b.status !== 'Sold'
      );
      const activeBatchLiveSum = activeBatchesList.reduce(
        (sum, b) => sum + (Math.max(0, Number(b.currentCount !== undefined ? b.currentCount : b.initialCount)) || 0),
        0
      );
      const activeStandaloneLive = standaloneBirds.filter(
        (b) => b.status !== 'Dead' && b.status !== 'Sold' && b.status !== 'Culled'
      ).length;
      const currentLivingBirds = activeBatchLiveSum + activeStandaloneLive;

      // 2. Eggs Collected in period
      const periodEggLogs = eggLogs.filter((log) => {
        const d = log.date || (log.createdAt ? log.createdAt.slice(0, 10) : '');
        return isWithinDateRange(d, startDate, endDate);
      });
      const eggsCollected = periodEggLogs.reduce(
        (sum, log) => sum + (Number(log.totalCollected || log.totalEggs || log.goodEggs) || 0),
        0
      );

      // Average HDP % in period
      let averageHdp = 0;
      if (periodEggLogs.length > 0) {
        const hdpLogs = periodEggLogs.filter((l) => l.hdp !== undefined && l.hdp !== null && !isNaN(Number(l.hdp)));
        if (hdpLogs.length > 0) {
          const sumHdp = hdpLogs.reduce((sum, l) => sum + Number(l.hdp), 0);
          averageHdp = Number((sumHdp / hdpLogs.length).toFixed(1));
        } else if (currentLivingBirds > 0) {
          averageHdp = Number(((eggsCollected / (currentLivingBirds * Math.max(1, periodEggLogs.length))) * 100).toFixed(1));
        }
      }

      // 3. Feed Consumed in period (kg)
      const periodFeedLogs = feedLogs.filter((log) => {
        const d = log.date || (log.createdAt ? log.createdAt.slice(0, 10) : '');
        return isWithinDateRange(d, startDate, endDate);
      });
      const feedConsumedKg = periodFeedLogs.reduce((sum, log) => sum + (Number(log.quantity) || 0), 0);

      // 4. Mortality in period
      const periodMortalityLogs = mortalityLogs.filter((log) => {
        const d = log.date || log.mortalityDate || (log.createdAt ? log.createdAt.slice(0, 10) : '');
        return isWithinDateRange(d, startDate, endDate);
      });
      const mortalityCount = periodMortalityLogs.reduce((sum, log) => sum + (Number(log.count || log.quantity) || 1), 0);

      // Period mortality rate calculation
      const openingPop = Math.max(1, currentLivingBirds + mortalityCount);
      const mortalityRate = Number(((mortalityCount / openingPop) * 100).toFixed(2));

      // 5. Sales & Customer Balances in period
      const activeSales = sales.filter((s) => s.status !== 'Cancelled');
      const periodSales = activeSales.filter((s) => {
        const d = s.saleDate || s.date || (s.createdAt ? s.createdAt.slice(0, 10) : '');
        return isWithinDateRange(d, startDate, endDate);
      });

      // Sales Revenue: Value of valid completed sales
      const salesRevenueKobo = periodSales.reduce((sum, s) => {
        const directTotal = Number(s.totalAmount);
        if (!isNaN(directTotal) && directTotal >= 0) return sum + toKobo(directTotal);
        const qty = Number(s.quantity) || 0;
        const price = Number(s.unitPrice) || 0;
        return sum + toKobo(qty * price);
      }, 0);
      const salesRevenue = fromKobo(salesRevenueKobo);

      // Payments Received in period (from dedicated payments table or sale amountPaid)
      const validSaleIds = new Set(activeSales.map((s) => s.saleId));
      const periodPayments = payments.filter((p) => {
        const d = p.paymentDate || p.date || (p.createdAt ? p.createdAt.slice(0, 10) : '');
        return isWithinDateRange(d, startDate, endDate) && (p.saleId ? validSaleIds.has(p.saleId) : true);
      });

      let paymentsReceivedKobo = periodPayments.reduce((sum, p) => sum + toKobo(p.amount || 0), 0);
      // Fallback: If payments table was not populated separately, sum amountPaid from period sales
      if (paymentsReceivedKobo === 0 && periodSales.length > 0) {
        paymentsReceivedKobo = periodSales.reduce((sum, s) => sum + toKobo(s.amountPaid || 0), 0);
      }
      const paymentsReceived = fromKobo(paymentsReceivedKobo);

      // Customer Receivables (Total outstanding balances from all active valid sales up to end date)
      const customerReceivablesKobo = activeSales
        .filter((s) => {
          const d = s.saleDate || s.date || (s.createdAt ? s.createdAt.slice(0, 10) : '');
          return d <= endDate;
        })
        .reduce((sum, s) => sum + toKobo(s.outstandingBalance || 0), 0);
      const customerReceivables = fromKobo(customerReceivablesKobo);

      // 6. Expenses & Supplier Payables in period
      const activeExpenses = expenses.filter((ex) => ex.status !== 'Cancelled');
      const periodExpenses = activeExpenses.filter((ex) => {
        const d = ex.expenseDate || ex.date || (ex.createdAt ? ex.createdAt.slice(0, 10) : '');
        return isWithinDateRange(d, startDate, endDate);
      });

      // Expenses Incurred: Valid expenses recorded
      const expensesIncurredKobo = periodExpenses.reduce((sum, ex) => sum + toKobo(ex.amount || 0), 0);
      const expensesIncurred = fromKobo(expensesIncurredKobo);

      // Expenses Paid in period (from expensePayments table or expense amountPaid)
      const validExpenseIds = new Set(activeExpenses.map((e) => e.expenseId));
      const periodExpensePayments = expensePayments.filter((ep) => {
        const d = ep.paymentDate || ep.date || (ep.createdAt ? ep.createdAt.slice(0, 10) : '');
        return (
          isWithinDateRange(d, startDate, endDate) &&
          ep.status !== 'Cancelled' &&
          (ep.expenseId ? validExpenseIds.has(ep.expenseId) : true)
        );
      });

      let expensesPaidKobo = periodExpensePayments.reduce((sum, ep) => sum + toKobo(ep.amount || 0), 0);
      if (expensesPaidKobo === 0 && periodExpenses.length > 0) {
        expensesPaidKobo = periodExpenses.reduce((sum, ex) => sum + toKobo(ex.amountPaid || 0), 0);
      }
      const expensesPaid = fromKobo(expensesPaidKobo);

      // Supplier Payables (Outstanding expense balances up to end date)
      const supplierPayablesKobo = activeExpenses
        .filter((ex) => {
          const d = ex.expenseDate || ex.date || (ex.createdAt ? ex.createdAt.slice(0, 10) : '');
          return d <= endDate;
        })
        .reduce((sum, ex) => sum + toKobo(ex.outstandingBalance || 0), 0);
      const supplierPayables = fromKobo(supplierPayablesKobo);

      // 7. Estimated Profit = Sales Revenue - Expenses Incurred (integer kobo precision)
      const estimatedProfitKobo = salesRevenueKobo - expensesIncurredKobo;
      const estimatedProfit = fromKobo(estimatedProfitKobo);

      // 8. General Inventory Valuation
      const inventoryValuationKobo = inventory.reduce(
        (sum, item) => sum + toKobo((Number(item.currentQuantity) || 0) * (Number(item.unitCost) || 0)),
        0
      );
      const generalInventoryValuation = fromKobo(inventoryValuationKobo);

      return {
        totalBirdRecords,
        totalBirdsCumulative,
        currentLivingBirds,
        activeBatches: activeBatchesList.length,
        eggsCollected,
        averageHdp,
        feedConsumedKg,
        mortalityCount,
        mortalityRate,
        salesRevenue,
        paymentsReceived,
        customerReceivables,
        expensesIncurred,
        expensesPaid,
        supplierPayables,
        estimatedProfit,
        generalInventoryValuation,
        startDate,
        endDate,
        preset: dateRange.preset,
      };
    } catch (err) {
      console.error('Error generating farm performance summary:', err);
      return {
        totalBirdRecords: 0,
        totalBirdsCumulative: 0,
        currentLivingBirds: 0,
        activeBatches: 0,
        eggsCollected: 0,
        averageHdp: 0,
        feedConsumedKg: 0,
        mortalityCount: 0,
        mortalityRate: 0,
        salesRevenue: 0,
        paymentsReceived: 0,
        customerReceivables: 0,
        expensesIncurred: 0,
        expensesPaid: 0,
        supplierPayables: 0,
        estimatedProfit: 0,
        generalInventoryValuation: 0,
        startDate,
        endDate,
        preset: dateRange.preset,
      };
    }
  },

  /**
   * Load detailed records and metrics for specific report type
   */
  async getReportData(reportType, dateRange) {
    const { startDate, endDate } = dateRange;

    switch (reportType) {
      // 1. Farm Overview Report
      case 'overview': {
        const summary = await this.getFarmPerformanceSummary(dateRange);
        const charts = await this.getAnalyticsChartsData(dateRange);
        return {
          reportType: 'overview',
          title: 'Farm Overview Report',
          summary,
          charts,
        };
      }

      // 2. Bird Population Report
      case 'birds': {
        const [birds, pens] = await Promise.all([
          db.birds.toArray(),
          db.pens.toArray(),
        ]);

        const penMap = {};
        pens.forEach((p) => {
          penMap[p.penId] = p.name || p.penId;
        });

        // Filter birds by creation date if available, or list all
        const periodBirds = birds.filter((b) => {
          const d = b.createdAt ? b.createdAt.slice(0, 10) : (b.hatchDate || '');
          if (!d) return true; // Include if untimed
          return isWithinDateRange(d, startDate, endDate);
        });

        // Grouping by breed and status
        const breedDistribution = {};
        const statusDistribution = {};
        birds.forEach((b) => {
          const br = b.breed || 'Standard';
          breedDistribution[br] = (breedDistribution[br] || 0) + 1;
          const st = b.status || 'Active';
          statusDistribution[st] = (statusDistribution[st] || 0) + 1;
        });

        return {
          reportType: 'birds',
          title: 'Bird Population Report',
          totalRecords: birds.length,
          periodRecordsCount: periodBirds.length,
          breedDistribution,
          statusDistribution,
          records: periodBirds.map((b) => ({
            id: b.id,
            tagNumber: b.tagNumber || `BRD-${b.id}`,
            breed: b.breed || 'Standard',
            type: b.type || b.birdType || 'Layer',
            batchId: b.batchId || 'Standalone',
            houseNumber: penMap[b.houseNumber] || b.houseNumber || 'Pen 1',
            status: b.status || 'Active',
            hatchDate: b.hatchDate || '—',
            createdAt: b.createdAt ? b.createdAt.slice(0, 10) : '—',
          })),
        };
      }

      // 3. Batch & Pen Report
      case 'batches': {
        const [batches, pens] = await Promise.all([
          db.batches.toArray(),
          db.pens.toArray(),
        ]);

        const periodBatches = batches.filter((b) => {
          const d = b.arrivalDate || (b.createdAt ? b.createdAt.slice(0, 10) : '');
          if (!d) return true;
          return isWithinDateRange(d, startDate, endDate);
        });

        const penOccupancy = pens.map((p) => {
          const assignedBatches = batches.filter(
            (b) => (b.penId === p.penId || b.houseId === p.penId) && b.status !== 'Closed' && b.status !== 'Harvested'
          );
          const occupied = assignedBatches.reduce(
            (sum, b) => sum + (Number(b.currentCount !== undefined ? b.currentCount : b.initialCount) || 0),
            0
          );
          const capacity = Number(p.capacity) || 500;
          const utilizationPct = capacity > 0 ? Number(((occupied / capacity) * 100).toFixed(1)) : 0;

          return {
            penId: p.penId,
            name: p.name || p.penId,
            type: p.type || 'Standard',
            capacity,
            occupied,
            available: Math.max(0, capacity - occupied),
            utilizationPct,
            status: utilizationPct >= 100 ? 'Full' : utilizationPct > 80 ? 'Near Capacity' : 'Available',
          };
        });

        return {
          reportType: 'batches',
          title: 'Batch & Pen Report',
          totalBatches: batches.length,
          periodBatchesCount: periodBatches.length,
          penOccupancy,
          records: periodBatches.map((b) => ({
            id: b.id,
            batchCode: b.batchCode || `BAT-${b.id}`,
            breed: b.breed || 'Standard',
            birdType: b.birdType || 'Layer',
            penId: b.penId || b.houseId || 'Pen 1',
            initialCount: b.initialCount || 0,
            currentCount: b.currentCount !== undefined ? b.currentCount : b.initialCount,
            arrivalDate: b.arrivalDate || (b.createdAt ? b.createdAt.slice(0, 10) : '—'),
            status: b.status || 'Active',
            mortalityCount: Math.max(0, (b.initialCount || 0) - (b.currentCount || 0)),
          })),
        };
      }

      // 4. Feed Consumption Report
      case 'feed': {
        const [feeds, feedLogs, feedPurchases] = await Promise.all([
          db.feeds.toArray(),
          db.feedLogs.toArray(),
          db.feedPurchases.toArray(),
        ]);

        const periodLogs = feedLogs.filter((l) => {
          const d = l.date || (l.createdAt ? l.createdAt.slice(0, 10) : '');
          return isWithinDateRange(d, startDate, endDate);
        });

        const periodPurchases = feedPurchases.filter((p) => {
          const d = p.purchaseDate || p.date || (p.createdAt ? p.createdAt.slice(0, 10) : '');
          return isWithinDateRange(d, startDate, endDate);
        });

        const totalFedKg = periodLogs.reduce((sum, l) => sum + (Number(l.quantity) || 0), 0);
        const totalPurchasedKg = periodPurchases.reduce((sum, p) => sum + (Number(p.quantityKg || p.quantity) || 0), 0);
        const totalCostKobo = periodPurchases.reduce((sum, p) => sum + toKobo(p.totalCost || p.amount || 0), 0);

        return {
          reportType: 'feed',
          title: 'Feed Consumption Report',
          totalFedKg,
          totalPurchasedKg,
          totalPurchaseCost: fromKobo(totalCostKobo),
          feedInventory: feeds.map((f) => ({
            id: f.id,
            name: f.name,
            type: f.type || 'Feed',
            currentStock: f.currentStock || 0,
            unit: f.unit || 'kg',
            reorderLevel: f.reorderLevel || 50,
          })),
          records: periodLogs.map((l) => ({
            id: l.id,
            logId: l.logId || `FLOG-${l.id}`,
            date: l.date || (l.createdAt ? l.createdAt.slice(0, 10) : '—'),
            feedName: l.feedName || 'Standard Mash',
            batchId: l.batchId || 'All Flocks',
            quantity: Number(l.quantity) || 0,
            unit: l.unit || 'kg',
            consumptionRate: l.ratePerBird ? `${l.ratePerBird} g/bird` : '—',
            recordedBy: l.recordedBy || 'Farm Staff',
          })),
        };
      }

      // 5. Medication Report
      case 'medication': {
        const [medications, medicationLogs] = await Promise.all([
          db.medications.toArray(),
          db.medicationLogs.toArray(),
        ]);

        const periodLogs = medicationLogs.filter((l) => {
          const d = l.administeredDate || l.date || (l.createdAt ? l.createdAt.slice(0, 10) : '');
          return isWithinDateRange(d, startDate, endDate);
        });

        const today = getLocalDateString();
        const activeWithdrawals = periodLogs.filter(
          (l) => l.withdrawalEndDate && l.withdrawalEndDate >= today
        );

        return {
          reportType: 'medication',
          title: 'Medication Report',
          totalTreatments: periodLogs.length,
          activeWithdrawalsCount: activeWithdrawals.length,
          drugInventory: medications.map((m) => ({
            id: m.id,
            name: m.name,
            type: m.type || 'Antibiotic',
            currentStock: m.currentStock || 0,
            unit: m.unit || 'bottles',
            withdrawalDays: m.withdrawalDays || 0,
          })),
          records: periodLogs.map((l) => ({
            id: l.id,
            logId: l.logId || `MLOG-${l.id}`,
            date: l.administeredDate || l.date || (l.createdAt ? l.createdAt.slice(0, 10) : '—'),
            medicationName: l.medicationName || 'Medication',
            target: l.batchId ? `Batch ${l.batchId}` : (l.birdTag ? `Bird ${l.birdTag}` : 'Flock'),
            dosage: l.dosageGiven || `${l.quantity || ''} ${l.unit || ''}`,
            reason: l.reason || l.targetDisease || 'Treatment',
            withdrawalEndDate: l.withdrawalEndDate || 'None',
            isWithdrawalActive: l.withdrawalEndDate ? l.withdrawalEndDate >= today : false,
            administeredBy: l.administeredBy || 'Veterinarian',
          })),
        };
      }

      // 6. Vaccination Report
      case 'vaccination': {
        const [vaccines, vaccinationLogs] = await Promise.all([
          db.vaccines.toArray(),
          db.vaccinationLogs.toArray(),
        ]);

        const periodLogs = vaccinationLogs.filter((l) => {
          const d = l.administeredDate || l.scheduledDate || (l.createdAt ? l.createdAt.slice(0, 10) : '');
          return isWithinDateRange(d, startDate, endDate);
        });

        const administeredCount = periodLogs.filter((l) => l.status === 'Administered' || l.status === 'Completed').length;
        const pendingCount = periodLogs.filter((l) => l.status === 'Pending' || l.status === 'Scheduled').length;

        return {
          reportType: 'vaccination',
          title: 'Vaccination Report',
          totalVaccinations: periodLogs.length,
          administeredCount,
          pendingCount,
          vaccinesList: vaccines.map((v) => ({
            id: v.id,
            name: v.name,
            targetDisease: v.targetDisease || 'Viral',
            stock: v.currentStock || 0,
            expiryDate: v.expiryDate || '—',
          })),
          records: periodLogs.map((l) => ({
            id: l.id,
            logId: l.logId || `VLOG-${l.id}`,
            date: l.administeredDate || l.scheduledDate || (l.createdAt ? l.createdAt.slice(0, 10) : '—'),
            vaccineName: l.vaccineName || 'Vaccine',
            batchId: l.batchId || 'All Flocks',
            method: l.administrationMethod || 'Drinking Water',
            doses: l.quantity || l.doses || 0,
            status: l.status || 'Administered',
            administeredBy: l.administeredBy || 'Livestock Officer',
          })),
        };
      }

      // 7. Egg Production Report
      case 'eggs': {
        const eggLogs = await db.eggLogs.toArray();

        const periodLogs = eggLogs.filter((l) => {
          const d = l.date || (l.createdAt ? l.createdAt.slice(0, 10) : '');
          return isWithinDateRange(d, startDate, endDate);
        });

        const totalCollected = periodLogs.reduce(
          (sum, l) => sum + (Number(l.totalCollected || l.totalEggs || l.goodEggs) || 0),
          0
        );
        const goodEggs = periodLogs.reduce((sum, l) => sum + (Number(l.goodEggs) || 0), 0);
        const crackedEggs = periodLogs.reduce((sum, l) => sum + (Number(l.crackedEggs) || 0), 0);
        const dirtyEggs = periodLogs.reduce((sum, l) => sum + (Number(l.dirtyEggs) || 0), 0);

        const totalCrates = Math.floor(goodEggs / 30);
        const looseEggs = goodEggs % 30;

        return {
          reportType: 'eggs',
          title: 'Egg Production Report',
          totalCollected,
          goodEggs,
          crackedEggs,
          dirtyEggs,
          defectRate: totalCollected > 0 ? Number((((crackedEggs + dirtyEggs) / totalCollected) * 100).toFixed(2)) : 0,
          cratesCount: totalCrates,
          looseCount: looseEggs,
          records: periodLogs.map((l) => ({
            id: l.id,
            logId: l.logId || `EGG-${l.id}`,
            date: l.date || (l.createdAt ? l.createdAt.slice(0, 10) : '—'),
            batchId: l.batchId || 'Layer Cohort',
            totalCollected: Number(l.totalCollected || l.totalEggs || l.goodEggs) || 0,
            goodEggs: Number(l.goodEggs) || 0,
            crackedEggs: Number(l.crackedEggs) || 0,
            dirtyEggs: Number(l.dirtyEggs) || 0,
            hdp: l.hdp !== undefined && l.hdp !== null ? `${l.hdp}%` : '—',
            collectedBy: l.collectedBy || l.recordedBy || 'Farm Staff',
          })),
        };
      }

      // 8. Mortality Report
      case 'mortality': {
        const mortalityLogs = await db.mortalityLogs.toArray();

        const periodLogs = mortalityLogs.filter((l) => {
          const d = l.date || l.mortalityDate || (l.createdAt ? l.createdAt.slice(0, 10) : '');
          return isWithinDateRange(d, startDate, endDate);
        });

        const totalDeaths = periodLogs.reduce(
          (sum, l) => sum + (Number(l.count || l.quantity) || 1),
          0
        );

        // Group by cause
        const causeBreakdown = {};
        periodLogs.forEach((l) => {
          const c = l.cause || 'Unspecified';
          const qty = Number(l.count || l.quantity) || 1;
          causeBreakdown[c] = (causeBreakdown[c] || 0) + qty;
        });

        return {
          reportType: 'mortality',
          title: 'Mortality Report',
          totalDeaths,
          causeBreakdown,
          records: periodLogs.map((l) => ({
            id: l.id,
            mortalityId: l.mortalityId || `MORT-${l.id}`,
            date: l.date || l.mortalityDate || (l.createdAt ? l.createdAt.slice(0, 10) : '—'),
            batchId: l.batchId ? `Batch ${l.batchId}` : (l.birdTag || 'Individual Bird'),
            count: Number(l.count || l.quantity) || 1,
            cause: l.cause || 'Unknown',
            symptoms: l.symptoms || '—',
            suspectedDisease: l.suspectedDisease || 'None',
            disposalMethod: l.disposedMethod || l.disposalMethod || 'Buried',
            recordedBy: l.recordedBy || 'Livestock Officer',
          })),
        };
      }

      // 9. Sales & Revenue Report
      case 'sales': {
        const sales = await db.sales.toArray();
        const activeSales = sales.filter((s) => s.status !== 'Cancelled');

        const periodSales = activeSales.filter((s) => {
          const d = s.saleDate || s.date || (s.createdAt ? s.createdAt.slice(0, 10) : '');
          return isWithinDateRange(d, startDate, endDate);
        });

        const totalRevenueKobo = periodSales.reduce((sum, s) => {
          const amt = Number(s.totalAmount);
          if (!isNaN(amt) && amt >= 0) return sum + toKobo(amt);
          return sum + toKobo((Number(s.quantity) || 0) * (Number(s.unitPrice) || 0));
        }, 0);

        const totalPaidKobo = periodSales.reduce((sum, s) => sum + toKobo(s.amountPaid || 0), 0);
        const totalReceivablesKobo = periodSales.reduce((sum, s) => sum + toKobo(s.outstandingBalance || 0), 0);

        return {
          reportType: 'sales',
          title: 'Sales & Revenue Report',
          totalTransactions: periodSales.length,
          totalRevenue: fromKobo(totalRevenueKobo),
          totalPaid: fromKobo(totalPaidKobo),
          outstandingReceivables: fromKobo(totalReceivablesKobo),
          records: periodSales.map((s) => ({
            id: s.id,
            saleId: s.saleId || `SALE-${s.id}`,
            date: s.saleDate || s.date || (s.createdAt ? s.createdAt.slice(0, 10) : '—'),
            customerName: s.customerName || 'Walk-in Customer',
            productType: s.productType || s.itemType || 'Poultry Produce',
            quantity: `${s.quantity || 1} ${s.unit || 'units'}`,
            unitPrice: formatNaira(s.unitPrice || 0),
            totalAmount: formatNaira(s.totalAmount || 0),
            amountPaid: formatNaira(s.amountPaid || 0),
            outstandingBalance: formatNaira(s.outstandingBalance || 0),
            paymentStatus: s.paymentStatus || 'Paid',
            paymentMethod: s.paymentMethod || 'Cash',
          })),
        };
      }

      // 10. Expenses Report
      case 'expenses': {
        const expenses = await db.expenses.toArray();
        const activeExpenses = expenses.filter((e) => e.status !== 'Cancelled');

        const periodExpenses = activeExpenses.filter((e) => {
          const d = e.expenseDate || e.date || (e.createdAt ? e.createdAt.slice(0, 10) : '');
          return isWithinDateRange(d, startDate, endDate);
        });

        const totalIncurredKobo = periodExpenses.reduce((sum, e) => sum + toKobo(e.amount || 0), 0);
        const totalPaidKobo = periodExpenses.reduce((sum, e) => sum + toKobo(e.amountPaid || 0), 0);
        const totalPayablesKobo = periodExpenses.reduce((sum, e) => sum + toKobo(e.outstandingBalance || 0), 0);

        // Group by category
        const categoryMap = {};
        periodExpenses.forEach((e) => {
          const c = e.category || 'General';
          categoryMap[c] = (categoryMap[c] || 0) + toKobo(e.amount || 0);
        });
        const categoryBreakdown = Object.entries(categoryMap).map(([cat, kobo]) => ({
          category: cat,
          amount: fromKobo(kobo),
        }));

        return {
          reportType: 'expenses',
          title: 'Expenses Report',
          totalExpensesCount: periodExpenses.length,
          totalIncurred: fromKobo(totalIncurredKobo),
          totalPaid: fromKobo(totalPaidKobo),
          outstandingPayables: fromKobo(totalPayablesKobo),
          categoryBreakdown,
          records: periodExpenses.map((e) => ({
            id: e.id,
            expenseId: e.expenseId || `EXP-${e.id}`,
            date: e.expenseDate || e.date || (e.createdAt ? e.createdAt.slice(0, 10) : '—'),
            category: e.category || 'General',
            description: e.description || e.itemDescription || 'Operational expenditure',
            supplier: e.supplier || e.paidTo || 'Supplier',
            amount: formatNaira(e.amount || 0),
            amountPaid: formatNaira(e.amountPaid || 0),
            outstandingBalance: formatNaira(e.outstandingBalance || 0),
            paymentStatus: e.paymentStatus || 'Paid',
            paymentMethod: e.paymentMethod || 'Cash',
          })),
        };
      }

      // 11. Inventory Report
      case 'inventory': {
        const [inventory, movements] = await Promise.all([
          db.inventory.toArray(),
          db.inventoryMovements.toArray(),
        ]);

        const periodMovements = movements.filter((m) => {
          const d = m.date || m.movementDate || (m.createdAt ? m.createdAt.slice(0, 10) : '');
          return isWithinDateRange(d, startDate, endDate);
        });

        const totalValuationKobo = inventory.reduce(
          (sum, i) => sum + toKobo((Number(i.currentQuantity) || 0) * (Number(i.unitCost) || 0)),
          0
        );

        return {
          reportType: 'inventory',
          title: 'Inventory Report',
          totalItems: inventory.length,
          totalValuation: fromKobo(totalValuationKobo),
          totalMovementsCount: periodMovements.length,
          records: inventory.map((i) => ({
            id: i.id,
            itemId: i.itemId || `INV-${i.id}`,
            name: i.itemName || i.name || 'Item',
            category: i.category || 'General',
            currentQuantity: `${i.currentQuantity || 0} ${i.unit || 'pcs'}`,
            reorderLevel: `${i.reorderLevel || 10} ${i.unit || 'pcs'}`,
            unitCost: formatNaira(i.unitCost || 0),
            valuation: formatNaira((Number(i.currentQuantity) || 0) * (Number(i.unitCost) || 0)),
            location: i.storageLocation || i.location || 'Main Store',
            status: i.status || 'Active',
            expiryDate: i.expiryDate || '—',
          })),
          recentMovements: periodMovements.slice(0, 15).map((m) => ({
            id: m.id,
            movementId: m.movementId || `MOV-${m.id}`,
            date: m.date || m.movementDate || '—',
            itemId: m.itemId,
            itemName: m.itemName,
            movementType: m.movementType,
            quantity: m.quantity,
            newBalance: m.newBalance,
            location: m.storageLocation,
            reason: m.reason || 'General movement',
          })),
        };
      }

      // 12. Profit & Financial Summary
      case 'financial':
      default: {
        const summary = await this.getFarmPerformanceSummary(dateRange);
        const charts = await this.getAnalyticsChartsData(dateRange);

        // Net operating cashflow: Cash in (payments received) - Cash out (expenses paid)
        const netCashflowKobo = toKobo(summary.paymentsReceived) - toKobo(summary.expensesPaid);
        const netCashflow = fromKobo(netCashflowKobo);

        return {
          reportType: 'financial',
          title: 'Profit & Financial Summary',
          summary: {
            ...summary,
            netCashflow,
          },
          charts,
        };
      }
    }
  },

  /**
   * Aggregate chart datasets responding to date range
   */
  async getAnalyticsChartsData(dateRange) {
    const { startDate, endDate } = dateRange;

    try {
      const [sales, expenses, eggLogs, feedLogs, mortalityLogs, birds, inventory] = await Promise.all([
        db.sales.toArray(),
        db.expenses.toArray(),
        db.eggLogs.toArray(),
        db.feedLogs.toArray(),
        db.mortalityLogs.toArray(),
        db.birds.toArray(),
        db.inventory.toArray(),
      ]);

      // 1. Sales vs Expenses by Day / Month
      const financeMap = {};
      const activeSales = sales.filter((s) => s.status !== 'Cancelled');
      const activeExpenses = expenses.filter((e) => e.status !== 'Cancelled');

      activeSales.forEach((s) => {
        const d = s.saleDate || s.date || (s.createdAt ? s.createdAt.slice(0, 10) : '');
        if (isWithinDateRange(d, startDate, endDate)) {
          const key = d;
          if (!financeMap[key]) financeMap[key] = { date: key, sales: 0, expenses: 0 };
          financeMap[key].sales += Number(s.totalAmount) || 0;
        }
      });

      activeExpenses.forEach((e) => {
        const d = e.expenseDate || e.date || (e.createdAt ? e.createdAt.slice(0, 10) : '');
        if (isWithinDateRange(d, startDate, endDate)) {
          const key = d;
          if (!financeMap[key]) financeMap[key] = { date: key, sales: 0, expenses: 0 };
          financeMap[key].expenses += Number(e.amount) || 0;
        }
      });

      const financeTrends = Object.values(financeMap).sort((a, b) => a.date.localeCompare(b.date));

      // 2. Egg production trend
      const eggMap = {};
      eggLogs.forEach((l) => {
        const d = l.date || (l.createdAt ? l.createdAt.slice(0, 10) : '');
        if (isWithinDateRange(d, startDate, endDate)) {
          eggMap[d] = (eggMap[d] || 0) + (Number(l.totalCollected || l.totalEggs || l.goodEggs) || 0);
        }
      });
      const eggTrends = Object.entries(eggMap)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date));

      // 3. Mortality trend
      const mortMap = {};
      mortalityLogs.forEach((l) => {
        const d = l.date || l.mortalityDate || (l.createdAt ? l.createdAt.slice(0, 10) : '');
        if (isWithinDateRange(d, startDate, endDate)) {
          mortMap[d] = (mortMap[d] || 0) + (Number(l.count || l.quantity) || 1);
        }
      });
      const mortalityTrends = Object.entries(mortMap)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date));

      // 4. Feed consumption trend
      const feedMap = {};
      feedLogs.forEach((l) => {
        const d = l.date || (l.createdAt ? l.createdAt.slice(0, 10) : '');
        if (isWithinDateRange(d, startDate, endDate)) {
          feedMap[d] = (feedMap[d] || 0) + (Number(l.quantity) || 0);
        }
      });
      const feedTrends = Object.entries(feedMap)
        .map(([date, kg]) => ({ date, kg }))
        .sort((a, b) => a.date.localeCompare(b.date));

      // 5. Bird population by breed/type
      const birdTypeMap = {};
      birds.forEach((b) => {
        const t = b.breed || b.type || 'Standard';
        birdTypeMap[t] = (birdTypeMap[t] || 0) + 1;
      });
      const birdDistribution = Object.entries(birdTypeMap).map(([type, count]) => ({ type, count }));

      // 6. Revenue by sales category
      const salesCatMap = {};
      activeSales.forEach((s) => {
        const d = s.saleDate || s.date || (s.createdAt ? s.createdAt.slice(0, 10) : '');
        if (isWithinDateRange(d, startDate, endDate)) {
          const cat = s.productType || s.itemType || 'Other Produce';
          salesCatMap[cat] = (salesCatMap[cat] || 0) + (Number(s.totalAmount) || 0);
        }
      });
      const revenueByCategory = Object.entries(salesCatMap).map(([category, amount]) => ({
        category,
        amount,
      }));

      // 7. Expenses by category
      const expCatMap = {};
      activeExpenses.forEach((e) => {
        const d = e.expenseDate || e.date || (e.createdAt ? e.createdAt.slice(0, 10) : '');
        if (isWithinDateRange(d, startDate, endDate)) {
          const cat = e.category || 'General';
          expCatMap[cat] = (expCatMap[cat] || 0) + (Number(e.amount) || 0);
        }
      });
      const expensesByCategory = Object.entries(expCatMap).map(([category, amount]) => ({
        category,
        amount,
      }));

      // 8. Inventory value by category
      const invCatMap = {};
      inventory.forEach((i) => {
        const cat = i.category || 'General Supplies';
        const val = (Number(i.currentQuantity) || 0) * (Number(i.unitCost) || 0);
        invCatMap[cat] = (invCatMap[cat] || 0) + val;
      });
      const inventoryByCategory = Object.entries(invCatMap).map(([category, amount]) => ({
        category,
        amount,
      }));

      return {
        financeTrends,
        eggTrends,
        mortalityTrends,
        feedTrends,
        birdDistribution,
        revenueByCategory,
        expensesByCategory,
        inventoryByCategory,
      };
    } catch (err) {
      console.error('Error generating analytics charts data:', err);
      return {
        financeTrends: [],
        eggTrends: [],
        mortalityTrends: [],
        feedTrends: [],
        birdDistribution: [],
        revenueByCategory: [],
        expensesByCategory: [],
        inventoryByCategory: [],
      };
    }
  },

  /**
   * Export report records to clean, formatted CSV
   */
  async exportReportCSV(reportType, dateRange) {
    const data = await this.getReportData(reportType, dateRange);
    const { startDate, endDate } = dateRange;

    const escapeCsv = (str) => {
      if (str === null || str === undefined) return '""';
      const s = String(str).replace(/"/g, '""');
      return `"${s}"`;
    };

    let headers = [];
    let rows = [];

    switch (reportType) {
      case 'overview':
      case 'financial': {
        const s = data.summary;
        headers = ['Metric', 'Value', 'Unit / Currency'];
        rows = [
          ['Report Title', data.title, ''],
          ['Date Range', `${startDate} to ${endDate}`, ''],
          ['Living Bird Population', s.currentLivingBirds, 'birds'],
          ['Active Flock Batches', s.activeBatches, 'batches'],
          ['Total Eggs Collected', s.eggsCollected, 'eggs'],
          ['Average Laying HDP', `${s.averageHdp}%`, '%'],
          ['Feed Consumed', s.feedConsumedKg, 'kg'],
          ['Mortality Rate', `${s.mortalityRate}%`, '%'],
          ['Sales Revenue (Accrual)', s.salesRevenue.toFixed(2), 'NGN (₦)'],
          ['Payments Received (Cash In)', s.paymentsReceived.toFixed(2), 'NGN (₦)'],
          ['Customer Receivables', s.customerReceivables.toFixed(2), 'NGN (₦)'],
          ['Expenses Incurred (Accrual)', s.expensesIncurred.toFixed(2), 'NGN (₦)'],
          ['Expenses Paid (Cash Out)', s.expensesPaid.toFixed(2), 'NGN (₦)'],
          ['Supplier Payables', s.supplierPayables.toFixed(2), 'NGN (₦)'],
          ['Estimated Profit (Sales - Expenses)', s.estimatedProfit.toFixed(2), 'NGN (₦)'],
          ['General Inventory Valuation', s.generalInventoryValuation.toFixed(2), 'NGN (₦)'],
        ];
        break;
      }

      case 'birds': {
        headers = ['Tag Number', 'Breed', 'Bird Type', 'Batch ID', 'Housing Pen', 'Status', 'Hatch Date', 'Registration Date'];
        rows = (data.records || []).map((r) => [
          escapeCsv(r.tagNumber),
          escapeCsv(r.breed),
          escapeCsv(r.type),
          escapeCsv(r.batchId),
          escapeCsv(r.houseNumber),
          escapeCsv(r.status),
          escapeCsv(r.hatchDate),
          escapeCsv(r.createdAt),
        ]);
        break;
      }

      case 'batches': {
        headers = ['Batch Code', 'Breed', 'Bird Type', 'Pen Location', 'Initial Count', 'Current Count', 'Mortality', 'Arrival Date', 'Status'];
        rows = (data.records || []).map((r) => [
          escapeCsv(r.batchCode),
          escapeCsv(r.breed),
          escapeCsv(r.birdType),
          escapeCsv(r.penId),
          r.initialCount,
          r.currentCount,
          r.mortalityCount,
          escapeCsv(r.arrivalDate),
          escapeCsv(r.status),
        ]);
        break;
      }

      case 'feed': {
        headers = ['Log ID', 'Date', 'Feed Name', 'Flock Batch', 'Quantity Fed (kg)', 'Rate (g/bird)', 'Recorded By'];
        rows = (data.records || []).map((r) => [
          escapeCsv(r.logId),
          escapeCsv(r.date),
          escapeCsv(r.feedName),
          escapeCsv(r.batchId),
          r.quantity,
          escapeCsv(r.consumptionRate),
          escapeCsv(r.recordedBy),
        ]);
        break;
      }

      case 'medication': {
        headers = ['Log ID', 'Date', 'Medication Name', 'Target Flock/Bird', 'Dosage Given', 'Reason / Diagnosis', 'Withdrawal End Date', 'Administered By'];
        rows = (data.records || []).map((r) => [
          escapeCsv(r.logId),
          escapeCsv(r.date),
          escapeCsv(r.medicationName),
          escapeCsv(r.target),
          escapeCsv(r.dosage),
          escapeCsv(r.reason),
          escapeCsv(r.withdrawalEndDate),
          escapeCsv(r.administeredBy),
        ]);
        break;
      }

      case 'vaccination': {
        headers = ['Log ID', 'Date', 'Vaccine Name', 'Target Batch', 'Administration Method', 'Doses Given', 'Status', 'Administered By'];
        rows = (data.records || []).map((r) => [
          escapeCsv(r.logId),
          escapeCsv(r.date),
          escapeCsv(r.vaccineName),
          escapeCsv(r.batchId),
          escapeCsv(r.method),
          r.doses,
          escapeCsv(r.status),
          escapeCsv(r.administeredBy),
        ]);
        break;
      }

      case 'eggs': {
        headers = ['Log ID', 'Date', 'Cohort Batch', 'Total Collected', 'Good Eggs', 'Cracked Eggs', 'Dirty Eggs', 'Hen-Day Laying %', 'Recorded By'];
        rows = (data.records || []).map((r) => [
          escapeCsv(r.logId),
          escapeCsv(r.date),
          escapeCsv(r.batchId),
          r.totalCollected,
          r.goodEggs,
          r.crackedEggs,
          r.dirtyEggs,
          escapeCsv(r.hdp),
          escapeCsv(r.collectedBy),
        ]);
        break;
      }

      case 'mortality': {
        headers = ['Mortality ID', 'Date', 'Affected Batch / Bird', 'Deaths Count', 'Cause of Death', 'Symptoms Observed', 'Suspected Disease', 'Disposal Method', 'Recorded By'];
        rows = (data.records || []).map((r) => [
          escapeCsv(r.mortalityId),
          escapeCsv(r.date),
          escapeCsv(r.batchId),
          r.count,
          escapeCsv(r.cause),
          escapeCsv(r.symptoms),
          escapeCsv(r.suspectedDisease),
          escapeCsv(r.disposalMethod),
          escapeCsv(r.recordedBy),
        ]);
        break;
      }

      case 'sales': {
        headers = ['Sale ID', 'Date', 'Customer Name', 'Product Type', 'Quantity', 'Unit Price (NGN)', 'Total Invoiced (NGN)', 'Amount Paid (NGN)', 'Outstanding Receivables (NGN)', 'Payment Status', 'Payment Method'];
        rows = (data.records || []).map((r) => [
          escapeCsv(r.saleId),
          escapeCsv(r.date),
          escapeCsv(r.customerName),
          escapeCsv(r.productType),
          escapeCsv(r.quantity),
          escapeCsv(r.unitPrice),
          escapeCsv(r.totalAmount),
          escapeCsv(r.amountPaid),
          escapeCsv(r.outstandingBalance),
          escapeCsv(r.paymentStatus),
          escapeCsv(r.paymentMethod),
        ]);
        break;
      }

      case 'expenses': {
        headers = ['Expense ID', 'Date', 'Category', 'Description', 'Payee / Supplier', 'Total Amount (NGN)', 'Amount Paid (NGN)', 'Outstanding Payables (NGN)', 'Payment Status', 'Payment Method'];
        rows = (data.records || []).map((r) => [
          escapeCsv(r.expenseId),
          escapeCsv(r.date),
          escapeCsv(r.category),
          escapeCsv(r.description),
          escapeCsv(r.supplier),
          escapeCsv(r.amount),
          escapeCsv(r.amountPaid),
          escapeCsv(r.outstandingBalance),
          escapeCsv(r.paymentStatus),
          escapeCsv(r.paymentMethod),
        ]);
        break;
      }

      case 'inventory': {
        headers = ['Item ID', 'Item Name', 'Category', 'Current Stock', 'Reorder Level', 'Unit Cost (NGN)', 'Valuation (NGN)', 'Storage Location', 'Status', 'Expiry Date'];
        rows = (data.records || []).map((r) => [
          escapeCsv(r.itemId),
          escapeCsv(r.name),
          escapeCsv(r.category),
          escapeCsv(r.currentQuantity),
          escapeCsv(r.reorderLevel),
          escapeCsv(r.unitCost),
          escapeCsv(r.valuation),
          escapeCsv(r.location),
          escapeCsv(r.status),
          escapeCsv(r.expiryDate),
        ]);
        break;
      }
    }

    const fileHeaderLines = [
      `"FreshNest Poultry Farm - ${data.title}"`,
      `"Period: ${startDate} to ${endDate} | Generated: ${getLocalDateString()}"`,
      '',
    ];

    const csvContent = [
      ...fileHeaderLines,
      headers.join(','),
      ...rows.map((row) => (Array.isArray(row) ? row.join(',') : row)),
    ].join('\n');

    return {
      filename: `freshnest_${reportType}_report_${startDate}_to_${endDate}.csv`,
      csvContent,
    };
  },
};
