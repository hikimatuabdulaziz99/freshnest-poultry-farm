import { db } from '../database/db.js';

/**
 * FreshNest Database Service
 * Provides abstraction for data access, schema introspection, backup, and health checks
 */
export const dbService = {
  /**
   * Get storage health and estimate
   */
  async getHealthStatus() {
    try {
      const isAvailable = typeof window !== 'undefined' && 'indexedDB' in window;
      let storageEstimate = { quota: 0, usage: 0, percentage: 0 };

      if (navigator.storage && navigator.storage.estimate) {
        const est = await navigator.storage.estimate();
        const usageMb = (est.usage || 0) / (1024 * 1024);
        const quotaMb = (est.quota || 0) / (1024 * 1024);
        storageEstimate = {
          usageMb: Number(usageMb.toFixed(2)),
          quotaMb: Number(quotaMb.toFixed(2)),
          percentage: quotaMb > 0 ? Number(((usageMb / quotaMb) * 100).toFixed(2)) : 0,
        };
      }

      const tableCounts = {};
      for (const table of db.tables) {
        tableCounts[table.name] = await table.count();
      }

      return {
        connected: db.isOpen(),
        indexedDbAvailable: isAvailable,
        databaseName: db.name,
        version: db.verno,
        storageEstimate,
        tableCounts,
        totalRecords: Object.values(tableCounts).reduce((a, b) => a + b, 0),
      };
    } catch (err) {
      console.error('Error fetching database health:', err);
      return {
        connected: false,
        error: err.message,
        tableCounts: {},
        totalRecords: 0,
      };
    }
  },

  /**
   * Generic repository methods for any registered table
   */
  async getAll(tableName) {
    if (!db[tableName]) throw new Error(`Table ${tableName} does not exist in schema`);
    return await db[tableName].toArray();
  },

  async getById(tableName, id) {
    if (!db[tableName]) throw new Error(`Table ${tableName} does not exist in schema`);
    return await db[tableName].get(Number(id));
  },

  async add(tableName, record) {
    if (!db[tableName]) throw new Error(`Table ${tableName} does not exist in schema`);
    return await db[tableName].add(record);
  },

  async update(tableName, id, updates) {
    if (!db[tableName]) throw new Error(`Table ${tableName} does not exist in schema`);
    return await db[tableName].update(Number(id), updates);
  },

  async remove(tableName, id) {
    if (!db[tableName]) throw new Error(`Table ${tableName} does not exist in schema`);
    return await db[tableName].delete(Number(id));
  },

  async count(tableName) {
    if (!db[tableName]) return 0;
    return await db[tableName].count();
  },

  /**
   * Calculate all 10 core statistics dynamically from IndexedDB
   * 
   * Authoritative Population Calculation Strategy:
   * 1. Total Birds: Sum of initialCount across all cohort batches + standalone birds without batchId.
   *    (Avoids double-counting individually tagged birds that are already part of a cohort batch).
   * 2. Active Birds: Sum of live birds across active batches (status !== 'Closed'/'Harvested'/'Sold')
   *    + active standalone birds without batchId.
   *    Ensures: 0 <= activeBirds <= totalBirds at all times.
   */
  async getDashboardStats() {
    try {
      const todayStr = new Date().toISOString().slice(0, 10);

      // Fetch required table arrays
      const [
        batches,
        birds,
        mortalityLogs,
        eggLogs,
        feeds,
        medications,
        sales,
        expenses,
        inventory,
      ] = await Promise.all([
        db.batches.toArray(),
        db.birds.toArray(),
        db.mortalityLogs.toArray(),
        db.eggLogs.toArray(),
        db.feeds.toArray(),
        db.medications.toArray(),
        db.sales.toArray(),
        db.expenses.toArray(),
        db.inventory.toArray(),
      ]);

      // Map mortality counts per batch for accurate fallback live headcount
      const batchMortalityMap = {};
      mortalityLogs.forEach((m) => {
        if (m.batchId) {
          batchMortalityMap[m.batchId] = (batchMortalityMap[m.batchId] || 0) + (Number(m.count) || 0);
        }
      });

      // 1. Total Birds (Cumulative farm intake)
      // Batch initial intakes:
      const batchInitialSum = batches.reduce((sum, b) => sum + (Math.max(0, Number(b.initialCount)) || 0), 0);
      // Standalone individual birds registered without an enclosing batch:
      const standaloneBirdsCount = birds.filter((b) => !b.batchId).length;
      const totalBirds = batchInitialSum + standaloneBirdsCount;

      // 2. Active Birds (Current live flock headcount)
      // Live count across active (non-closed) batches:
      const activeBatchSum = batches
        .filter((b) => b.status !== 'Closed' && b.status !== 'Harvested' && b.status !== 'Sold')
        .reduce((sum, b) => {
          if (b.currentCount !== undefined && b.currentCount !== null && !isNaN(Number(b.currentCount))) {
            return sum + Math.max(0, Number(b.currentCount));
          }
          // Fallback if currentCount was not updated: initialCount minus batch mortality
          const batchLosses = batchMortalityMap[b.id] || batchMortalityMap[b.batchCode] || 0;
          const estimatedLive = Math.max(0, (Number(b.initialCount) || 0) - batchLosses);
          return sum + estimatedLive;
        }, 0);

      // Standalone active individual birds not associated with any batch:
      // Includes Active, Sick, and Quarantined living birds; excludes Dead and Sold birds
      const standaloneActiveBirds = birds.filter(
        (b) => !b.batchId && b.status !== 'Dead' && b.status !== 'Sold'
      ).length;

      // Bound active birds cleanly: never negative and never exceeding total cumulative birds
      const calculatedActive = activeBatchSum + standaloneActiveBirds;
      const activeBirds = Math.max(0, totalBirds > 0 ? Math.min(calculatedActive, totalBirds) : 0);

      // 3. Total Batches
      const totalBatches = batches.length;

      // 4. Dead Birds (sum from all recorded mortality logs)
      const deadBirds = mortalityLogs.reduce(
        (sum, m) => sum + (Math.max(0, Number(m.quantity ?? m.count ?? 0))),
        0
      );

      // 5. Eggs Collected Today
      const eggsToday = eggLogs
        .filter((e) => e.date && e.date.startsWith(todayStr))
        .reduce((sum, e) => {
          const total = Number(e.totalEggs);
          if (!isNaN(total) && total > 0) return sum + total;
          const good = Number(e.goodEggs) || 0;
          const cracked = Number(e.crackedEggs) || 0;
          const dirty = Number(e.dirtyEggs) || 0;
          return sum + good + cracked + dirty;
        }, 0);

      // 6. Available Feed Stock (total kg across all feed catalog items)
      const feedStock = feeds.reduce((sum, f) => sum + (Math.max(0, Number(f.currentStock)) || 0), 0);

      // 7. Medication Stock (total units/items in inventory)
      const medicationStock = medications.reduce((sum, m) => sum + (Math.max(0, Number(m.currentStock)) || 0), 0);

      // 8. Total Sales & Revenue (sum of sales in Nigerian Naira)
      const activeSales = sales.filter((s) => s.status !== 'Cancelled');
      const totalSales = activeSales.reduce((sum, s) => {
        const directTotal = Number(s.totalAmount);
        if (!isNaN(directTotal) && directTotal >= 0) return sum + directTotal;
        const qty = Number(s.quantity) || 0;
        const price = Number(s.unitPrice) || 0;
        return sum + (qty * price);
      }, 0);

      const totalRevenueReceived = activeSales.reduce((sum, s) => sum + (Number(s.amountPaid) || 0), 0);
      const outstandingReceivables = activeSales.reduce((sum, s) => sum + (Number(s.outstandingBalance) || 0), 0);
      const totalTransactions = activeSales.length;

      // 9. Total Expenses (sum of expenditures in Nigerian Naira, excluding cancelled)
      const activeExpenses = expenses.filter((ex) => ex.status !== 'Cancelled');
      const totalExpenses = activeExpenses.reduce((sum, ex) => sum + (Math.max(0, Number(ex.amount)) || 0), 0);
      const totalExpensesPaid = activeExpenses.reduce((sum, ex) => sum + (Math.max(0, Number(ex.amountPaid)) || 0), 0);
      const outstandingPayables = activeExpenses.reduce((sum, ex) => sum + (Math.max(0, Number(ex.outstandingBalance)) || 0), 0);

      // 10. Estimated Profit (Sales minus Expenses in Nigerian Naira)
      const estimatedProfit = totalSales - totalExpenses;

      // 11. General Inventory Metrics
      const totalInventoryItems = inventory ? inventory.length : 0;
      const totalInventoryValuation = inventory
        ? inventory.reduce((sum, item) => sum + ((Number(item.currentQuantity) || 0) * (Number(item.unitCost) || 0)), 0)
        : 0;

      return {
        totalBirds,
        activeBirds,
        totalBatches,
        deadBirds,
        eggsToday,
        feedStock,
        medicationStock,
        totalSales,
        totalRevenueReceived,
        outstandingReceivables,
        totalTransactions,
        totalExpenses,
        totalExpensesPaid,
        outstandingPayables,
        estimatedProfit,
        totalInventoryItems,
        totalInventoryValuation,
      };
    } catch (err) {
      console.error('Error calculating dashboard stats:', err);
      return {
        totalBirds: 0,
        activeBirds: 0,
        totalBatches: 0,
        deadBirds: 0,
        eggsToday: 0,
        feedStock: 0,
        medicationStock: 0,
        totalSales: 0,
        totalRevenueReceived: 0,
        outstandingReceivables: 0,
        totalTransactions: 0,
        totalExpenses: 0,
        totalExpensesPaid: 0,
        outstandingPayables: 0,
        estimatedProfit: 0,
        totalInventoryItems: 0,
        totalInventoryValuation: 0,
      };
    }
  },

  /**
   * Fetch production analytics trends for charts (Eggs, Mortality, Sales/Expenses, Bird Population)
   */
  async getProductionAnalytics() {
    try {
      const [eggLogs, mortalityLogs, sales, expenses, batches] = await Promise.all([
        db.eggLogs.toArray(),
        db.mortalityLogs.toArray(),
        db.sales.toArray(),
        db.expenses.toArray(),
        db.batches.toArray(),
      ]);

      // Process Egg Production Trends
      const eggTrendMap = {};
      eggLogs.forEach((log) => {
        const dateKey = log.date ? log.date.slice(0, 10) : (log.createdAt ? log.createdAt.slice(0, 10) : 'Unknown');
        const count = Number(log.totalEggs) || ((Number(log.goodEggs) || 0) + (Number(log.crackedEggs) || 0));
        eggTrendMap[dateKey] = (eggTrendMap[dateKey] || 0) + count;
      });
      const eggTrends = Object.entries(eggTrendMap)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date));

      // Process Mortality Trends
      const mortalityTrendMap = {};
      mortalityLogs.forEach((log) => {
        const dateKey = log.date ? log.date.slice(0, 10) : (log.createdAt ? log.createdAt.slice(0, 10) : 'Unknown');
        const count = Number(log.count) || 0;
        mortalityTrendMap[dateKey] = (mortalityTrendMap[dateKey] || 0) + count;
      });
      const mortalityTrends = Object.entries(mortalityTrendMap)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date));

      // Process Sales vs Expenses
      const financeMap = {};
      sales.forEach((s) => {
        const dateKey = s.saleDate ? s.saleDate.slice(0, 7) : (s.createdAt ? s.createdAt.slice(0, 7) : 'Unknown');
        const amt = Number(s.totalAmount) || 0;
        if (!financeMap[dateKey]) financeMap[dateKey] = { date: dateKey, sales: 0, expenses: 0 };
        financeMap[dateKey].sales += amt;
      });
      expenses.forEach((e) => {
        const dateKey = e.expenseDate ? e.expenseDate.slice(0, 7) : (e.createdAt ? e.createdAt.slice(0, 7) : 'Unknown');
        const amt = Number(e.amount) || 0;
        if (!financeMap[dateKey]) financeMap[dateKey] = { date: dateKey, sales: 0, expenses: 0 };
        financeMap[dateKey].expenses += amt;
      });
      const financeTrends = Object.values(financeMap).sort((a, b) => a.date.localeCompare(b.date));

      // Process Bird Population by Batch / Type
      const batchPopulation = batches.map((b) => ({
        batchCode: b.batchCode || `Batch #${b.id}`,
        breed: b.breed || b.birdType || 'Broiler/Layer',
        currentCount: Number(b.currentCount !== undefined ? b.currentCount : b.initialCount) || 0,
        status: b.status || 'Active',
      }));

      return {
        eggTrends,
        mortalityTrends,
        financeTrends,
        batchPopulation,
      };
    } catch (err) {
      console.error('Error fetching production analytics:', err);
      return {
        eggTrends: [],
        mortalityTrends: [],
        financeTrends: [],
        batchPopulation: [],
      };
    }
  },

  /**
   * Fetch recent farm activities aggregated across 6 modules
   */
  async getRecentActivities(limit = 8) {
    try {
      const [
        recentBirds,
        recentBatches,
        recentFeeds,
        recentMedLogs,
        recentVaxLogs,
        recentEggs,
        recentMortality,
        recentSales,
        recentExpenses,
        recentInventoryMovements,
      ] = await Promise.all([
        db.birds.orderBy('id').reverse().limit(5).toArray(),
        db.batches.orderBy('id').reverse().limit(5).toArray(),
        db.feeds.orderBy('id').reverse().limit(5).toArray(),
        db.medicationLogs.orderBy('id').reverse().limit(5).toArray(),
        db.vaccinationLogs.orderBy('id').reverse().limit(5).toArray(),
        db.eggLogs.orderBy('id').reverse().limit(5).toArray(),
        db.mortalityLogs.orderBy('id').reverse().limit(5).toArray(),
        db.sales.orderBy('id').reverse().limit(5).toArray(),
        db.expenses.orderBy('id').reverse().limit(5).toArray(),
        db.inventoryMovements.orderBy('id').reverse().limit(5).toArray(),
      ]);

      const activities = [];

      recentBirds.forEach((b) => {
        activities.push({
          id: `bird-${b.id}`,
          type: 'Bird Registered',
          title: `Registered Bird #${b.tagNumber || b.id}`,
          detail: `Breed: ${b.breed || 'Standard'} · House: ${b.houseNumber || 'Pen 1'}`,
          timestamp: b.createdAt || new Date().toISOString(),
          module: 'birds',
        });
      });

      recentBatches.forEach((batch) => {
        activities.push({
          id: `batch-${batch.id}`,
          type: 'New Batch',
          title: `Created Flock Batch ${batch.batchCode || `#${batch.id}`}`,
          detail: `${batch.initialCount || 0} birds · ${batch.birdType || 'Layer/Broiler'}`,
          timestamp: batch.createdAt || new Date().toISOString(),
          module: 'batches',
        });
      });

      recentFeeds.forEach((feed) => {
        activities.push({
          id: `feed-${feed.id}`,
          type: 'Feed Stock Added',
          title: `Stocked ${feed.name}`,
          detail: `${feed.currentStock || 0} ${feed.unit || 'kg'} · ${feed.brand || 'Standard Mill'}`,
          timestamp: feed.createdAt || new Date().toISOString(),
          module: 'feed',
        });
      });

      recentMedLogs.forEach((log) => {
        activities.push({
          id: `medlog-${log.id}`,
          type: 'Treatment Administered',
          title: `Treated ${log.targetDisplay || (log.batchId ? `Batch #${log.batchId}` : 'Flock')}`,
          detail: `${log.medicationName || 'Medication'} · ${log.dosageGiven || log.quantity || ''} ${log.unit || ''}`,
          timestamp: log.administeredDate || log.date || log.createdAt || new Date().toISOString(),
          module: 'medication',
        });
      });

      recentVaxLogs.forEach((vax) => {
        activities.push({
          id: `vaxlog-${vax.id}`,
          type: 'Vaccination Administered',
          title: `Vaccinated ${vax.targetDisplay || (vax.batchId ? `Batch #${vax.batchId}` : 'Flock')}`,
          detail: `${vax.vaccineName || 'Vaccine'} · ${vax.quantity || 0} ${vax.unit || 'doses'} (${vax.administrationMethod || 'Administered'})`,
          timestamp: vax.administeredDate || vax.createdAt || new Date().toISOString(),
          module: 'vaccination',
        });
      });

      recentEggs.forEach((egg) => {
        activities.push({
          id: `egg-${egg.id}`,
          type: 'Egg Collection',
          title: `Collected ${egg.totalEggs || egg.goodEggs || 0} Eggs`,
          detail: `Batch: ${egg.batchId || 'Main'} · Good: ${egg.goodEggs || 0}, Cracked: ${egg.crackedEggs || 0}`,
          timestamp: egg.date || egg.createdAt || new Date().toISOString(),
          module: 'eggs',
        });
      });

      recentMortality.forEach((m) => {
        activities.push({
          id: `mortality-${m.id}`,
          type: 'Mortality Logged',
          title: `Recorded ${m.count} Mortality`,
          detail: `Reason: ${m.cause || 'Unspecified'} · Batch: ${m.batchId || 'Main'}`,
          timestamp: m.date || m.createdAt || new Date().toISOString(),
          module: 'mortality',
        });
      });

      recentSales.forEach((sale) => {
        activities.push({
          id: `sale-${sale.id}`,
          type: 'Sale Recorded',
          title: `Sold ${sale.itemType || 'Produce'} - ₦${Number(sale.totalAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          detail: `Customer: ${sale.customerName || 'Walk-in'} · Qty: ${sale.quantity || 0}`,
          timestamp: sale.saleDate || sale.createdAt || new Date().toISOString(),
          module: 'sales',
        });
      });

      recentExpenses.forEach((exp) => {
        activities.push({
          id: `expense-${exp.id}`,
          type: 'Expense Recorded',
          title: `${exp.category || 'Expense'} - ₦${Number(exp.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          detail: `Payee: ${exp.supplier || exp.paidTo || 'Supplier'} · ${exp.description || 'General expenditure'}`,
          timestamp: exp.expenseDate || exp.date || exp.createdAt || new Date().toISOString(),
          module: 'expenses',
        });
      });

      recentInventoryMovements.forEach((mov) => {
        activities.push({
          id: `inventory-${mov.id}`,
          type: mov.movementType === 'STOCK_IN' ? 'Stock Received' : mov.movementType === 'STOCK_OUT' ? 'Stock Disbursed' : 'Stock Movement',
          title: `${mov.itemName || 'Supplies'} (${mov.quantity} ${mov.unit || 'units'})`,
          detail: `${(mov.movementType || '').replace(/_/g, ' ')} · ${mov.reason || 'General inventory movement'}`,
          timestamp: mov.date || mov.movementDate || mov.createdAt || new Date().toISOString(),
          module: 'inventory',
        });
      });

      // Sort descending by timestamp
      return activities
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, limit);
    } catch (err) {
      console.error('Error fetching recent activities:', err);
      return [];
    }
  },

  /**
   * Fetch active farm alerts & reminders
   */
  async getAlertsAndReminders() {
    try {
      const alerts = [];
      const now = new Date();
      const todayStr = now.toISOString().slice(0, 10);

      const [feeds, medications, medicationLogs, vaccines, vaccinationSchedules, mortalityLogs, batches] = await Promise.all([
        db.feeds.toArray(),
        db.medications.toArray(),
        db.medicationLogs.toArray(),
        db.vaccines.toArray(),
        db.vaccinationSchedules.toArray(),
        db.mortalityLogs.toArray(),
        db.batches.toArray(),
      ]);

      // 1. Low feed stock & expired feed alert
      feeds.forEach((feed) => {
        const threshold = Number(feed.reorderLevel) || 50;
        const current = Number(feed.currentStock) || 0;

        if (feed.expiryDate && feed.expiryDate < todayStr) {
          alerts.push({
            id: `feed-exp-${feed.id}`,
            type: 'expired_feed',
            severity: 'danger',
            title: `Expired Feed: ${feed.name}`,
            message: `Expired on ${feed.expiryDate}. Biosecurity alert: do not feed to birds.`,
            module: 'feed',
          });
        } else if (current <= threshold) {
          alerts.push({
            id: `feed-alert-${feed.id}`,
            type: 'low_feed',
            severity: current === 0 ? 'danger' : 'warning',
            title: current === 0 ? `Out of Feed: ${feed.name}` : `Low Feed: ${feed.name}`,
            message: `Current stock is ${current} ${feed.unit || 'kg'} (Reorder threshold: ${threshold} ${feed.unit || 'kg'}).`,
            module: 'feed',
          });
        }
      });

      // 2. Medication stock & expiration alerts
      medications.forEach((med) => {
        const current = Number(med.currentStock) || 0;
        const threshold = Number(med.reorderLevel) || 5;

        // Expired medication alert
        if (med.expiryDate && med.expiryDate < todayStr) {
          alerts.push({
            id: `med-exp-${med.id}`,
            type: 'expired_med',
            severity: 'danger',
            title: `Expired Medication: ${med.name}`,
            message: `Expired on ${med.expiryDate}. Dispose safely per biosecurity protocol.`,
            module: 'medication',
          });
        } else if (current <= threshold) {
          alerts.push({
            id: `med-alert-${med.id}`,
            type: 'low_med',
            severity: current === 0 ? 'danger' : 'warning',
            title: current === 0 ? `Out of Stock: ${med.name}` : `Low Medication: ${med.name}`,
            message: current === 0 ? `Inventory is at 0 ${med.unit || 'units'}. Restock needed.` : `Only ${current} ${med.unit || 'units'} left (Threshold: ${threshold}).`,
            module: 'medication',
          });
        }
      });

      // 3. Food Safety / Withdrawal Period Active Alerts
      medicationLogs.forEach((log) => {
        if (log.withdrawalPeriodDays > 0 && log.withdrawalEndDate && log.withdrawalEndDate >= todayStr) {
          const endDate = new Date(`${log.withdrawalEndDate}T23:59:59`);
          const daysRemaining = Math.max(0, Math.ceil((endDate - now) / (1000 * 60 * 60 * 24)));
          alerts.push({
            id: `med-with-${log.id}`,
            type: 'withdrawal_active',
            severity: 'danger',
            title: `Withdrawal Active: ${log.targetDisplay || (log.batchId ? `Batch #${log.batchId}` : 'Treated Birds')}`,
            message: `Treated with ${log.medicationName || 'Medication'}. DO NOT SELL OR CONSUME EGGS/MEAT until ${log.withdrawalEndDate} (${daysRemaining} day${daysRemaining === 1 ? '' : 's'} remaining).`,
            module: 'medication',
          });
        }
      });

      // 4. Vaccination Schedules Alerts (Overdue & Due Today)
      vaccinationSchedules.forEach((sched) => {
        if (sched.status === 'Completed' || sched.status === 'Cancelled') return;

        if (sched.scheduledDate < todayStr) {
          alerts.push({
            id: `vax-overdue-${sched.id}`,
            type: 'overdue_vax',
            severity: 'danger',
            title: `OVERDUE Vaccination: ${sched.batchName || `Batch #${sched.batchId}`}`,
            message: `${sched.vaccineName} was scheduled for ${sched.scheduledDate}. Immunise flock immediately!`,
            module: 'vaccination',
          });
        } else if (sched.scheduledDate === todayStr) {
          alerts.push({
            id: `vax-due-${sched.id}`,
            type: 'due_today_vax',
            severity: 'warning',
            title: `Vaccination Due TODAY: ${sched.batchName || `Batch #${sched.batchId}`}`,
            message: `${sched.vaccineName} is scheduled for administration today.`,
            module: 'vaccination',
          });
        } else {
          const vaxDate = new Date(sched.scheduledDate);
          const daysAway = Math.ceil((vaxDate - now) / (1000 * 60 * 60 * 24));
          if (daysAway > 0 && daysAway <= 7) {
            alerts.push({
              id: `vax-upcoming-${sched.id}`,
              type: 'upcoming_vax',
              severity: 'info',
              title: `Upcoming Vaccination (${daysAway}d): ${sched.batchName || `Batch #${sched.batchId}`}`,
              message: `${sched.vaccineName} scheduled for ${sched.scheduledDate}. Check cold chain stock.`,
              module: 'vaccination',
            });
          }
        }
      });

      // 5. Vaccine Inventory Alerts (Expired & Low Stock)
      vaccines.forEach((vac) => {
        const stock = Number(vac.currentStock) || 0;
        const threshold = Number(vac.reorderLevel) || 500;

        if (vac.expiryDate && vac.expiryDate < todayStr) {
          alerts.push({
            id: `vac-exp-${vac.id}`,
            type: 'expired_vaccine',
            severity: 'danger',
            title: `Expired Vaccine: ${vac.name}`,
            message: `Expired on ${vac.expiryDate}. Biosecurity alert: discard safely. Expired vaccines must never be administered.`,
            module: 'vaccination',
          });
        } else if (stock <= threshold) {
          alerts.push({
            id: `vac-stock-${vac.id}`,
            type: 'low_vaccine',
            severity: stock === 0 ? 'danger' : 'warning',
            title: stock === 0 ? `Out of Vaccine: ${vac.name}` : `Low Vaccine Stock: ${vac.name}`,
            message: stock === 0 ? `Inventory at 0 ${vac.unit || 'doses'}. Restock needed.` : `Only ${stock} ${vac.unit || 'doses'} remaining (Reorder threshold: ${threshold}).`,
            module: 'vaccination',
          });
        }
      });

      // 6. Mortality Threshold & Biosecurity Alerts
      const batchLossMap = {};
      let todayLosses = 0;
      mortalityLogs.forEach((m) => {
        const qty = Number(m.quantity ?? m.count ?? 1);
        const mDate = m.date || m.mortalityDate || '';
        if (mDate === todayStr) {
          todayLosses += qty;
        }
        if (m.batchId) {
          batchLossMap[m.batchId] = (batchLossMap[m.batchId] || 0) + qty;
        }
      });

      batches.forEach((batch) => {
        if (batch.status === 'Active') {
          const deaths = batchLossMap[batch.id] || 0;
          const initial = Number(batch.initialCount) || 0;
          if (initial > 0 && deaths > 0) {
            const rate = (deaths / initial) * 100;
            if (rate >= 5.0) {
              alerts.push({
                id: `mort-batch-${batch.id}`,
                type: 'high_mortality',
                severity: rate >= 10.0 ? 'danger' : 'warning',
                title: rate >= 10.0 ? `Critical Mortality: ${batch.batchCode || batch.name}` : `Elevated Mortality: ${batch.batchCode || batch.name}`,
                message: `Cumulative loss is ${deaths} birds (${rate.toFixed(1)}% mortality rate). Inspect housing ventilation and consult vet.`,
                module: 'mortality',
              });
            }
          }
        }
      });

      if (todayLosses >= 5) {
        alerts.push({
          id: `mort-spike-${todayStr}`,
          type: 'high_mortality',
          severity: 'danger',
          title: 'Daily Mortality Spike Warning',
          message: `${todayLosses} birds died today. Immediate biosecurity review recommended.`,
          module: 'mortality',
        });
      }

      return alerts;
    } catch (err) {
      console.error('Error fetching alerts:', err);
      return [];
    }
  },

  /**
   * Export all database records to JSON for offline farm data backups
   */
  async exportBackup() {
    const backupData = {
      app: 'FreshNest Poultry Farm',
      schemaVersion: db.verno,
      exportedAt: new Date().toISOString(),
      data: {},
    };

    for (const table of db.tables) {
      backupData.data[table.name] = await table.toArray();
    }

    return backupData;
  },

  /**
   * Clear all records safely (for farm reset or testing)
   */
  async clearAllData() {
    return await db.transaction('rw', db.tables, async () => {
      for (const table of db.tables) {
        await table.clear();
      }
    });
  },
};
