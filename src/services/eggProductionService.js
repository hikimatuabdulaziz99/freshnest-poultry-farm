import { db } from '../database/db.js';

/**
 * Module 08: Egg Production Management Service
 * Pure offline-first business logic for daily egg collection,
 * Hen-Day Production (HDP) calculation, grading quality sorting,
 * defect tracking, and atomic inventory stock management.
 */

export const EGG_GRADES = [
  'Grade A',
  'Grade B',
  'Small Eggs',
  'Cracked Eggs',
  'Dirty Eggs',
  'Damaged / Rejected Eggs',
];

export const SELLABLE_GRADES = ['Grade A', 'Grade B', 'Small Eggs'];

export const DEFECT_GRADES = [
  'Cracked Eggs',
  'Dirty Eggs',
  'Damaged / Rejected Eggs',
];

export const MOVEMENT_TYPES = [
  'COLLECTION',
  'SALE',
  'DAMAGE',
  'DISPOSAL',
  'ADJUSTMENT',
  'TRANSFER',
  'SALE_RETURN',
];

export const EGGS_PER_CRATE = 30; // Standard poultry industry crate size

/**
 * Helper: Format local calendar date YYYY-MM-DD
 */
export function getLocalDateString(date = new Date()) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Helper: Format egg count into eggs and crates
 * e.g. 90 -> "90 eggs (3 crates)"
 * e.g. 95 -> "95 eggs (3 crates, 5 loose)"
 */
export function formatEggCount(count) {
  const safeCount = Math.max(0, Number(count) || 0);
  const crates = Math.floor(safeCount / EGGS_PER_CRATE);
  const loose = safeCount % EGGS_PER_CRATE;

  if (crates === 0) {
    return `${safeCount} eggs`;
  }
  if (loose === 0) {
    return `${safeCount.toLocaleString()} eggs (${crates} ${crates === 1 ? 'crate' : 'crates'})`;
  }
  return `${safeCount.toLocaleString()} eggs (${crates} ${crates === 1 ? 'crate' : 'crates'}, ${loose} loose)`;
}

/**
 * Helper: Calculate Hen-Day Production (HDP) percentage
 * Formula: (Total Eggs / Living Hen Population) * 100
 * Strictly excludes non-laying, male, dead, or sold populations
 */
export function calculateHDP(eggsCollected, livingPopulation) {
  const eggs = Number(eggsCollected) || 0;
  const hens = Number(livingPopulation) || 0;
  if (hens <= 0 || eggs <= 0) return 0;
  const hdp = (eggs / hens) * 100;
  return Number(hdp.toFixed(1));
}

/**
 * Helper: Retrieve living laying-hen population of a batch safely
 * Strictly excludes non-laying bird types (Broiler, Cockerel, Chick, Grower)
 * and subtracts recorded mortality.
 */
export async function getBatchLivingCount(batchId) {
  try {
    const batch = await db.batches
      .filter((b) => Number(b.id) === Number(batchId) || b.batchId === batchId || b.batchCode === batchId)
      .first();

    if (!batch) return 0;

    // Non-laying bird types (Broiler, Cockerel, Chick, Grower) are not laying hens
    const nonLayingTypes = ['Broiler', 'Cockerel', 'Chick', 'Grower'];
    if (nonLayingTypes.includes(batch.birdType)) {
      return 0;
    }

    const mortalities = await db.mortalityLogs
      .filter((m) => Number(m.batchId) === Number(batch.id) || m.batchId === batch.batchCode || m.batchId === batch.batchId)
      .toArray();

    const deaths = mortalities.reduce((sum, m) => sum + (Number(m.count) || 0), 0);

    if (batch.currentCount !== undefined && batch.currentCount !== null && !isNaN(Number(batch.currentCount))) {
      return Math.max(0, Math.min(Number(batch.currentCount), (Number(batch.initialCount) || 0) - deaths));
    }

    return Math.max(0, (Number(batch.initialCount) || 0) - deaths);
  } catch (err) {
    console.error('Error fetching batch living count:', err);
    return 0;
  }
}

export const eggProductionService = {
  /**
   * Generate next sequential Log ID (e.g. EGG-0001)
   */
  async generateNextLogId() {
    try {
      let settingSeq = 0;
      try {
        const setting = await db.farmSettings.get('last_egg_log_seq');
        if (setting && typeof setting.value === 'number') {
          settingSeq = setting.value;
        }
      } catch {
        // Fallback
      }

      const logs = await db.eggLogs.toArray();
      let maxNumber = settingSeq;

      logs.forEach((log) => {
        const code = log.logId;
        if (code) {
          const match = code.match(/EGG-(\d+)/i);
          if (match && match[1]) {
            const num = parseInt(match[1], 10);
            if (!isNaN(num) && num > maxNumber) {
              maxNumber = num;
            }
          }
        } else if (log.id && typeof log.id === 'number' && log.id > maxNumber) {
          maxNumber = log.id;
        }
      });

      const nextNum = maxNumber + 1;
      return `EGG-${String(nextNum).padStart(4, '0')}`;
    } catch (err) {
      console.error('Error generating egg log ID:', err);
      return 'EGG-0001';
    }
  },

  /**
   * Generate next sequential Movement ID (e.g. EMOV-0001)
   */
  async generateNextMovementId() {
    try {
      let settingSeq = 0;
      try {
        const setting = await db.farmSettings.get('last_egg_mov_seq');
        if (setting && typeof setting.value === 'number') {
          settingSeq = setting.value;
        }
      } catch {
        // Fallback
      }

      const movements = await db.eggInventory.toArray();
      let maxNumber = settingSeq;

      movements.forEach((mov) => {
        const code = mov.movementId;
        if (code) {
          const match = code.match(/EMOV-(\d+)/i);
          if (match && match[1]) {
            const num = parseInt(match[1], 10);
            if (!isNaN(num) && num > maxNumber) {
              maxNumber = num;
            }
          }
        } else if (mov.id && typeof mov.id === 'number' && mov.id > maxNumber) {
          maxNumber = mov.id;
        }
      });

      const nextNum = maxNumber + 1;
      return `EMOV-${String(nextNum).padStart(4, '0')}`;
    } catch (err) {
      console.error('Error generating egg movement ID:', err);
      return 'EMOV-0001';
    }
  },

  /**
   * Record a new daily egg collection log with atomic inventory updates
   */
  async createCollectionLog(data) {
    // 1. Validation
    if (!data.batchId) {
      throw new Error('Batch is required.');
    }

    const batch = await db.batches
      .filter((b) => Number(b.id) === Number(data.batchId) || b.batchId === data.batchId || b.batchCode === data.batchId)
      .first();

    if (!batch) {
      throw new Error(`Batch with ID '${data.batchId}' was not found.`);
    }

    if (!data.collectionDate || !data.collectionDate.trim()) {
      throw new Error('Collection date is required.');
    }

    const collectionDate = data.collectionDate.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(collectionDate)) {
      throw new Error('Invalid collection date format. Expected YYYY-MM-DD.');
    }

    // Duplicate check for same batch on same date
    const existingLog = await db.eggLogs
      .filter((l) => {
        const bIdMatch = Number(l.batchId) === Number(batch.id) || l.batchId === batch.batchId || l.batchId === batch.batchCode;
        const dateMatch = (l.collectionDate === collectionDate) || (l.date === collectionDate);
        return bIdMatch && dateMatch;
      })
      .first();

    if (existingLog) {
      throw new Error(`A collection log already exists for batch ${batch.batchCode || batch.name} on ${collectionDate}. Please edit the existing record.`);
    }

    // Parse collection session counts
    const morning = data.morningCollection !== undefined ? parseInt(data.morningCollection, 10) : 0;
    const afternoon = data.afternoonCollection !== undefined ? parseInt(data.afternoonCollection, 10) : 0;
    const evening = data.eveningCollection !== undefined ? parseInt(data.eveningCollection, 10) : 0;

    if (isNaN(morning) || morning < 0) {
      throw new Error('Morning collection must be a non-negative integer.');
    }
    if (isNaN(afternoon) || afternoon < 0) {
      throw new Error('Afternoon collection must be a non-negative integer.');
    }
    if (isNaN(evening) || evening < 0) {
      throw new Error('Evening collection must be a non-negative integer.');
    }

    const sumCalculated = morning + afternoon + evening;
    if (sumCalculated <= 0) {
      throw new Error('Total eggs collected must be greater than zero. Enter at least one session count.');
    }

    // Verify user total matches session sum if provided
    if (data.totalCollected !== undefined && data.totalCollected !== null && data.totalCollected !== '') {
      const providedTotal = parseInt(data.totalCollected, 10);
      if (providedTotal !== sumCalculated) {
        throw new Error(`Total collected (${providedTotal}) does not match the sum of collection sessions (${morning} + ${afternoon} + ${evening} = ${sumCalculated}).`);
      }
    }

    const totalCollected = sumCalculated;

    // Parse defect counts
    const crackedEggs = data.crackedEggs !== undefined ? parseInt(data.crackedEggs, 10) : 0;
    const dirtyEggs = data.dirtyEggs !== undefined ? parseInt(data.dirtyEggs, 10) : 0;
    const damagedEggs = data.damagedEggs !== undefined ? parseInt(data.damagedEggs, 10) : 0;

    if (isNaN(crackedEggs) || crackedEggs < 0) {
      throw new Error('Cracked eggs count must be a non-negative integer.');
    }
    if (isNaN(dirtyEggs) || dirtyEggs < 0) {
      throw new Error('Dirty eggs count must be a non-negative integer.');
    }
    if (isNaN(damagedEggs) || damagedEggs < 0) {
      throw new Error('Damaged eggs count must be a non-negative integer.');
    }

    const totalDefects = crackedEggs + dirtyEggs + damagedEggs;
    if (totalDefects > totalCollected) {
      throw new Error(`Defective eggs count (${totalDefects}) cannot exceed total collected eggs (${totalCollected}).`);
    }

    // Determine good eggs
    let goodEggs = totalCollected - totalDefects;
    if (data.goodEggs !== undefined && data.goodEggs !== null && data.goodEggs !== '') {
      const providedGood = parseInt(data.goodEggs, 10);
      if (isNaN(providedGood) || providedGood < 0) {
        throw new Error('Good eggs count must be a non-negative integer.');
      }
      if (providedGood + totalDefects !== totalCollected) {
        throw new Error(`Good eggs (${providedGood}) plus defects (${totalDefects}) must equal total collected eggs (${totalCollected}).`);
      }
      goodEggs = providedGood;
    }

    // Calculate Hen-Day Production (HDP)
    const livingHens = await getBatchLivingCount(batch.id);
    const layingRate = calculateHDP(totalCollected, livingHens);

    // Generate unique sequential log ID
    const logId = data.logId || (await this.generateNextLogId());

    // Generate movement IDs for initial stock-in
    let nextMovSeq = 0;
    try {
      const setting = await db.farmSettings.get('last_egg_mov_seq');
      if (setting && typeof setting.value === 'number') {
        nextMovSeq = setting.value;
      }
    } catch {
      // Fallback
    }

    const newMovements = [];
    const nowIso = new Date().toISOString();

    // Sellable eggs added as Grade A by default upon collection (can be further graded later)
    if (goodEggs > 0) {
      nextMovSeq++;
      newMovements.push({
        movementId: `EMOV-${String(nextMovSeq).padStart(4, '0')}`,
        movementType: 'COLLECTION',
        grade: 'Grade A',
        quantity: goodEggs,
        referenceId: logId,
        movementDate: collectionDate,
        notes: `Daily collection: good eggs from batch ${batch.batchCode || batch.name}`,
        createdAt: nowIso,
      });
    }

    if (crackedEggs > 0) {
      nextMovSeq++;
      newMovements.push({
        movementId: `EMOV-${String(nextMovSeq).padStart(4, '0')}`,
        movementType: 'COLLECTION',
        grade: 'Cracked Eggs',
        quantity: crackedEggs,
        referenceId: logId,
        movementDate: collectionDate,
        notes: `Daily collection: cracked eggs from batch ${batch.batchCode || batch.name}`,
        createdAt: nowIso,
      });
    }

    if (dirtyEggs > 0) {
      nextMovSeq++;
      newMovements.push({
        movementId: `EMOV-${String(nextMovSeq).padStart(4, '0')}`,
        movementType: 'COLLECTION',
        grade: 'Dirty Eggs',
        quantity: dirtyEggs,
        referenceId: logId,
        movementDate: collectionDate,
        notes: `Daily collection: dirty eggs from batch ${batch.batchCode || batch.name}`,
        createdAt: nowIso,
      });
    }

    if (damagedEggs > 0) {
      nextMovSeq++;
      newMovements.push({
        movementId: `EMOV-${String(nextMovSeq).padStart(4, '0')}`,
        movementType: 'COLLECTION',
        grade: 'Damaged / Rejected Eggs',
        quantity: damagedEggs,
        referenceId: logId,
        movementDate: collectionDate,
        notes: `Daily collection: damaged eggs from batch ${batch.batchCode || batch.name}`,
        createdAt: nowIso,
      });
    }

    // Atomic write
    const logRecord = {
      logId,
      batchId: batch.id,
      batchCode: batch.batchCode,
      collectionDate,
      date: collectionDate, // Backward compatibility
      morningCollection: morning,
      afternoonCollection: afternoon,
      eveningCollection: evening,
      totalCollected,
      totalEggs: totalCollected, // Backward compatibility
      goodEggs,
      crackedEggs,
      dirtyEggs,
      damagedEggs,
      graded: false,
      gradeA: goodEggs,
      gradeB: 0,
      smallEggs: 0,
      layingRate,
      livingHensAtCollection: livingHens,
      notes: (data.notes || '').trim(),
      recordedBy: (data.recordedBy || 'Farm Staff').trim(),
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    let logDbId;
    await db.transaction('rw', [db.eggLogs, db.eggInventory, db.farmSettings], async () => {
      logDbId = await db.eggLogs.add(logRecord);

      for (const mov of newMovements) {
        await db.eggInventory.add(mov);
      }

      // Update sequence in farmSettings
      const logSeqMatch = logId.match(/EGG-(\d+)/i);
      if (logSeqMatch && logSeqMatch[1]) {
        await db.farmSettings.put({ key: 'last_egg_log_seq', value: parseInt(logSeqMatch[1], 10), updatedAt: nowIso });
      }
      if (nextMovSeq > 0) {
        await db.farmSettings.put({ key: 'last_egg_mov_seq', value: nextMovSeq, updatedAt: nowIso });
      }
    });

    return {
      id: logDbId,
      ...logRecord,
      batchName: batch.name || batch.batchCode,
      birdType: batch.birdType,
      breed: batch.breed,
    };
  },

  /**
   * Retrieve all collection logs with optional filters and enriched batch data
   */
  async getCollectionLogs(filters = {}) {
    try {
      const [rawLogs, batches, pens] = await Promise.all([
        db.eggLogs.toArray(),
        db.batches.toArray(),
        db.pens ? db.pens.toArray() : Promise.resolve([]),
      ]);

      const batchMap = {};
      batches.forEach((b) => {
        batchMap[b.id] = b;
        if (b.batchCode) batchMap[b.batchCode] = b;
        if (b.batchId) batchMap[b.batchId] = b;
      });

      const penMap = {};
      pens.forEach((p) => {
        penMap[p.id] = p;
        if (p.penId) penMap[p.penId] = p;
      });

      let enriched = rawLogs.map((log) => {
        const batch = batchMap[log.batchId] || null;
        const pen = batch && (penMap[batch.penId] || penMap[batch.houseId]) ? (penMap[batch.penId] || penMap[batch.houseId]) : null;

        const collectionDate = log.collectionDate || log.date || (log.createdAt ? log.createdAt.slice(0, 10) : '');
        const total = Number(log.totalCollected ?? log.totalEggs ?? 0);
        const good = Number(log.goodEggs ?? total);
        const cracked = Number(log.crackedEggs ?? 0);
        const dirty = Number(log.dirtyEggs ?? 0);
        const damaged = Number(log.damagedEggs ?? 0);

        const livingHens = log.livingHensAtCollection !== undefined
          ? log.livingHensAtCollection
          : (batch ? (Number(batch.currentCount) || Number(batch.initialCount) || 0) : 0);

        const layingRate = log.layingRate !== undefined
          ? log.layingRate
          : calculateHDP(total, livingHens);

        return {
          ...log,
          collectionDate,
          totalCollected: total,
          goodEggs: good,
          crackedEggs: cracked,
          dirtyEggs: dirty,
          damagedEggs: damaged,
          layingRate,
          livingHens,
          batchCode: batch ? (batch.batchCode || batch.name || `Batch #${batch.id}`) : `Batch #${log.batchId}`,
          batchName: batch ? batch.name : 'Unknown Batch',
          birdType: batch ? batch.birdType : 'Layer',
          breed: batch ? batch.breed : 'Standard',
          penName: pen ? pen.name : 'General Pen',
        };
      });

      // Filter by Batch ID
      if (filters.batchId) {
        enriched = enriched.filter(
          (l) => Number(l.batchId) === Number(filters.batchId) || l.batchCode === filters.batchId
        );
      }

      // Filter by Date Range
      if (filters.startDate) {
        enriched = enriched.filter((l) => l.collectionDate >= filters.startDate);
      }
      if (filters.endDate) {
        enriched = enriched.filter((l) => l.collectionDate <= filters.endDate);
      }

      // Filter by Search Query
      if (filters.search && filters.search.trim()) {
        const q = filters.search.trim().toLowerCase();
        enriched = enriched.filter((l) =>
          (l.logId && l.logId.toLowerCase().includes(q)) ||
          (l.batchCode && l.batchCode.toLowerCase().includes(q)) ||
          (l.recordedBy && l.recordedBy.toLowerCase().includes(q)) ||
          (l.notes && l.notes.toLowerCase().includes(q))
        );
      }

      // Sort by collectionDate DESC, id DESC
      enriched.sort((a, b) => {
        const dateDiff = b.collectionDate.localeCompare(a.collectionDate);
        if (dateDiff !== 0) return dateDiff;
        return (b.id || 0) - (a.id || 0);
      });

      return enriched;
    } catch (err) {
      console.error('Error fetching collection logs:', err);
      return [];
    }
  },

  /**
   * Retrieve single collection log by ID
   */
  async getCollectionLogById(id) {
    const log = await db.eggLogs.get(Number(id));
    if (!log) return null;

    const batch = await db.batches.get(Number(log.batchId));
    return {
      ...log,
      batchCode: batch ? batch.batchCode : `Batch #${log.batchId}`,
      batchName: batch ? batch.name : 'Unknown Batch',
      birdType: batch ? batch.birdType : 'Layer',
      breed: batch ? batch.breed : 'Standard',
    };
  },

  /**
   * Update an existing egg collection log and atomically adjust its inventory movements
   */
  async updateCollectionLog(id, data) {
    const log = await db.eggLogs.get(Number(id));
    if (!log) {
      throw new Error(`Collection log #${id} not found.`);
    }

    const batch = await db.batches
      .filter((b) => Number(b.id) === Number(data.batchId || log.batchId) || b.batchId === (data.batchId || log.batchId) || b.batchCode === (data.batchId || log.batchId))
      .first();

    if (!batch) {
      throw new Error(`Batch with ID '${data.batchId || log.batchId}' was not found.`);
    }

    const collectionDate = (data.collectionDate || log.collectionDate).trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(collectionDate)) {
      throw new Error('Invalid collection date format. Expected YYYY-MM-DD.');
    }

    // Parse counts
    const morning = data.morningCollection !== undefined ? parseInt(data.morningCollection, 10) : log.morningCollection;
    const afternoon = data.afternoonCollection !== undefined ? parseInt(data.afternoonCollection, 10) : log.afternoonCollection;
    const evening = data.eveningCollection !== undefined ? parseInt(data.eveningCollection, 10) : log.eveningCollection;

    if (isNaN(morning) || morning < 0 || isNaN(afternoon) || afternoon < 0 || isNaN(evening) || evening < 0) {
      throw new Error('Collection session counts must be non-negative integers.');
    }

    const totalCollected = morning + afternoon + evening;
    if (totalCollected <= 0) {
      throw new Error('Total eggs collected must be greater than zero.');
    }

    const crackedEggs = data.crackedEggs !== undefined ? parseInt(data.crackedEggs, 10) : log.crackedEggs;
    const dirtyEggs = data.dirtyEggs !== undefined ? parseInt(data.dirtyEggs, 10) : log.dirtyEggs;
    const damagedEggs = data.damagedEggs !== undefined ? parseInt(data.damagedEggs, 10) : log.damagedEggs;

    if (isNaN(crackedEggs) || crackedEggs < 0 || isNaN(dirtyEggs) || dirtyEggs < 0 || isNaN(damagedEggs) || damagedEggs < 0) {
      throw new Error('Defect counts must be non-negative integers.');
    }

    const totalDefects = crackedEggs + dirtyEggs + damagedEggs;
    if (totalDefects > totalCollected) {
      throw new Error(`Defective eggs count (${totalDefects}) cannot exceed total collected eggs (${totalCollected}).`);
    }

    const goodEggs = totalCollected - totalDefects;

    // Fetch existing movements for this log
    const existingMovements = await db.eggInventory
      .filter((m) => m.referenceId === log.logId)
      .toArray();

    // Check inventory: if reducing counts would drop available stock below zero
    const currentStock = await this.getInventoryStock();
    const prevContributed = {};
    existingMovements.forEach((m) => {
      prevContributed[m.grade] = (prevContributed[m.grade] || 0) + Number(m.quantity);
    });

    let newGradeA = goodEggs;
    let newGradeB = 0;
    let newSmall = 0;
    let isGraded = false;

    if (log.graded) {
      const prevGradedTotal = (log.gradeA || 0) + (log.gradeB || 0) + (log.smallEggs || 0);
      if (prevGradedTotal === goodEggs) {
        newGradeA = log.gradeA;
        newGradeB = log.gradeB;
        newSmall = log.smallEggs;
        isGraded = true;
      } else {
        isGraded = false;
        newGradeA = goodEggs;
      }
    }

    const netChanges = {
      'Grade A': newGradeA - (prevContributed['Grade A'] || 0),
      'Grade B': newGradeB - (prevContributed['Grade B'] || 0),
      'Small Eggs': newSmall - (prevContributed['Small Eggs'] || 0),
      'Cracked Eggs': crackedEggs - (prevContributed['Cracked Eggs'] || 0),
      'Dirty Eggs': dirtyEggs - (prevContributed['Dirty Eggs'] || 0),
      'Damaged / Rejected Eggs': damagedEggs - (prevContributed['Damaged / Rejected Eggs'] || 0),
    };

    for (const [gradeName, net] of Object.entries(netChanges)) {
      if (net < 0) {
        const available = currentStock.byGrade[gradeName] || 0;
        if (Math.abs(net) > available) {
          throw new Error(
            `Cannot update collection log ${log.logId}: reducing ${gradeName} by ${Math.abs(net)} eggs would breach available stock (${available} eggs remaining).`
          );
        }
      }
    }

    const livingHens = await getBatchLivingCount(batch.id);
    const layingRate = calculateHDP(totalCollected, livingHens);
    const nowIso = new Date().toISOString();

    let nextMovSeq = 0;
    try {
      const setting = await db.farmSettings.get('last_egg_mov_seq');
      if (setting && typeof setting.value === 'number') {
        nextMovSeq = setting.value;
      }
    } catch {
      // Fallback
    }

    const newMovements = [];
    if (newGradeA > 0) {
      nextMovSeq++;
      newMovements.push({
        movementId: `EMOV-${String(nextMovSeq).padStart(4, '0')}`,
        movementType: 'COLLECTION',
        grade: 'Grade A',
        quantity: newGradeA,
        referenceId: log.logId,
        movementDate: collectionDate,
        notes: `Updated collection: Grade A for ${batch.batchCode}`,
        createdAt: nowIso,
      });
    }
    if (newGradeB > 0) {
      nextMovSeq++;
      newMovements.push({
        movementId: `EMOV-${String(nextMovSeq).padStart(4, '0')}`,
        movementType: 'COLLECTION',
        grade: 'Grade B',
        quantity: newGradeB,
        referenceId: log.logId,
        movementDate: collectionDate,
        notes: `Updated collection: Grade B for ${batch.batchCode}`,
        createdAt: nowIso,
      });
    }
    if (newSmall > 0) {
      nextMovSeq++;
      newMovements.push({
        movementId: `EMOV-${String(nextMovSeq).padStart(4, '0')}`,
        movementType: 'COLLECTION',
        grade: 'Small Eggs',
        quantity: newSmall,
        referenceId: log.logId,
        movementDate: collectionDate,
        notes: `Updated collection: Small for ${batch.batchCode}`,
        createdAt: nowIso,
      });
    }
    if (crackedEggs > 0) {
      nextMovSeq++;
      newMovements.push({
        movementId: `EMOV-${String(nextMovSeq).padStart(4, '0')}`,
        movementType: 'COLLECTION',
        grade: 'Cracked Eggs',
        quantity: crackedEggs,
        referenceId: log.logId,
        movementDate: collectionDate,
        notes: `Updated collection: cracked for ${batch.batchCode}`,
        createdAt: nowIso,
      });
    }
    if (dirtyEggs > 0) {
      nextMovSeq++;
      newMovements.push({
        movementId: `EMOV-${String(nextMovSeq).padStart(4, '0')}`,
        movementType: 'COLLECTION',
        grade: 'Dirty Eggs',
        quantity: dirtyEggs,
        referenceId: log.logId,
        movementDate: collectionDate,
        notes: `Updated collection: dirty for ${batch.batchCode}`,
        createdAt: nowIso,
      });
    }
    if (damagedEggs > 0) {
      nextMovSeq++;
      newMovements.push({
        movementId: `EMOV-${String(nextMovSeq).padStart(4, '0')}`,
        movementType: 'COLLECTION',
        grade: 'Damaged / Rejected Eggs',
        quantity: damagedEggs,
        referenceId: log.logId,
        movementDate: collectionDate,
        notes: `Updated collection: damaged for ${batch.batchCode}`,
        createdAt: nowIso,
      });
    }

    const updatedLogRecord = {
      batchId: batch.id,
      batchCode: batch.batchCode,
      collectionDate,
      date: collectionDate,
      morningCollection: morning,
      afternoonCollection: afternoon,
      eveningCollection: evening,
      totalCollected,
      totalEggs: totalCollected,
      goodEggs,
      crackedEggs,
      dirtyEggs,
      damagedEggs,
      graded: isGraded,
      gradeA: newGradeA,
      gradeB: newGradeB,
      smallEggs: newSmall,
      layingRate,
      livingHensAtCollection: livingHens,
      notes: (data.notes !== undefined ? data.notes : log.notes || '').trim(),
      recordedBy: (data.recordedBy !== undefined ? data.recordedBy : log.recordedBy || 'Farm Staff').trim(),
      updatedAt: nowIso,
    };

    await db.transaction('rw', [db.eggLogs, db.eggInventory, db.farmSettings], async () => {
      await db.eggLogs.update(Number(id), updatedLogRecord);

      for (const m of existingMovements) {
        await db.eggInventory.delete(m.id);
      }
      for (const m of newMovements) {
        await db.eggInventory.add(m);
      }
      if (nextMovSeq > 0) {
        await db.farmSettings.put({ key: 'last_egg_mov_seq', value: nextMovSeq, updatedAt: nowIso });
      }
    });

    return {
      id: Number(id),
      logId: log.logId,
      ...updatedLogRecord,
    };
  },

  /**
   * Delete a collection log with atomic inventory rollback & negative stock guard
   */
  async deleteCollectionLog(id) {
    const log = await db.eggLogs.get(Number(id));
    if (!log) {
      throw new Error(`Collection log #${id} not found.`);
    }

    const logId = log.logId;

    // Find all inventory movements linked to this log
    const linkedMovements = await db.eggInventory
      .filter((m) => m.referenceId === logId)
      .toArray();

    // Check if removing these movements will drive any grade's stock below zero
    const currentStock = await this.getInventoryStock();
    for (const mov of linkedMovements) {
      if (mov.movementType === 'COLLECTION' || mov.quantity > 0) {
        const available = currentStock.byGrade[mov.grade] || 0;
        if (available < mov.quantity) {
          throw new Error(
            `Cannot delete collection log ${logId}: ${mov.quantity} eggs of ${mov.grade} have already been sold or allocated. Current available stock is only ${available}.`
          );
        }
      }
    }

    // Atomic delete
    await db.transaction('rw', [db.eggLogs, db.eggInventory], async () => {
      await db.eggLogs.delete(Number(id));
      for (const mov of linkedMovements) {
        await db.eggInventory.delete(mov.id);
      }
    });

    return { success: true, deletedLogId: logId };
  },

  /**
   * Grade a collection log into Grade A, Grade B, Small Eggs
   */
  async gradeCollection(logId, gradingData) {
    const log = await db.eggLogs
      .filter((l) => l.logId === logId || Number(l.id) === Number(logId))
      .first();

    if (!log) {
      throw new Error(`Collection log '${logId}' not found.`);
    }

    const goodEggs = Number(log.goodEggs);
    if (goodEggs <= 0) {
      throw new Error(`Collection log '${logId}' has no good eggs to grade.`);
    }

    const gradeA = parseInt(gradingData.gradeA, 10) || 0;
    const gradeB = parseInt(gradingData.gradeB, 10) || 0;
    const smallEggs = parseInt(gradingData.smallEggs, 10) || 0;

    if (gradeA < 0 || gradeB < 0 || smallEggs < 0) {
      throw new Error('Graded counts must be non-negative integers.');
    }

    const sumGraded = gradeA + gradeB + smallEggs;
    if (sumGraded !== goodEggs) {
      throw new Error(`Sum of graded eggs (${gradeA} Grade A + ${gradeB} Grade B + ${smallEggs} Small = ${sumGraded}) must exactly match total good eggs (${goodEggs}).`);
    }

    // Re-grading negative stock check
    const currentStock = await this.getInventoryStock();
    const prevA = log.graded ? (log.gradeA || 0) : Number(log.goodEggs);
    const prevB = log.graded ? (log.gradeB || 0) : 0;
    const prevSmall = log.graded ? (log.smallEggs || 0) : 0;

    if (gradeA < prevA && (prevA - gradeA) > (currentStock.byGrade['Grade A'] || 0)) {
      throw new Error(`Cannot reduce Grade A to ${gradeA}: ${prevA - gradeA} eggs already sold/allocated, only ${currentStock.byGrade['Grade A'] || 0} remaining.`);
    }
    if (gradeB < prevB && (prevB - gradeB) > (currentStock.byGrade['Grade B'] || 0)) {
      throw new Error(`Cannot reduce Grade B to ${gradeB}: ${prevB - gradeB} eggs already sold/allocated, only ${currentStock.byGrade['Grade B'] || 0} remaining.`);
    }
    if (smallEggs < prevSmall && (prevSmall - smallEggs) > (currentStock.byGrade['Small Eggs'] || 0)) {
      throw new Error(`Cannot reduce Small Eggs to ${smallEggs}: ${prevSmall - smallEggs} eggs already sold/allocated, only ${currentStock.byGrade['Small Eggs'] || 0} remaining.`);
    }

    const nowIso = new Date().toISOString();

    // Find existing initial collection movement for good eggs
    const existingGradeMovements = await db.eggInventory
      .filter((m) => m.referenceId === log.logId && ['Grade A', 'Grade B', 'Small Eggs'].includes(m.grade))
      .toArray();

    let nextMovSeq = 0;
    try {
      const setting = await db.farmSettings.get('last_egg_mov_seq');
      if (setting && typeof setting.value === 'number') {
        nextMovSeq = setting.value;
      }
    } catch {
      // Fallback
    }

    const newMovements = [];
    if (gradeA > 0) {
      nextMovSeq++;
      newMovements.push({
        movementId: `EMOV-${String(nextMovSeq).padStart(4, '0')}`,
        movementType: 'COLLECTION',
        grade: 'Grade A',
        quantity: gradeA,
        referenceId: log.logId,
        movementDate: log.collectionDate,
        notes: `Graded Grade A: ${gradingData.notes || ''}`.trim(),
        createdAt: nowIso,
      });
    }

    if (gradeB > 0) {
      nextMovSeq++;
      newMovements.push({
        movementId: `EMOV-${String(nextMovSeq).padStart(4, '0')}`,
        movementType: 'COLLECTION',
        grade: 'Grade B',
        quantity: gradeB,
        referenceId: log.logId,
        movementDate: log.collectionDate,
        notes: `Graded Grade B: ${gradingData.notes || ''}`.trim(),
        createdAt: nowIso,
      });
    }

    if (smallEggs > 0) {
      nextMovSeq++;
      newMovements.push({
        movementId: `EMOV-${String(nextMovSeq).padStart(4, '0')}`,
        movementType: 'COLLECTION',
        grade: 'Small Eggs',
        quantity: smallEggs,
        referenceId: log.logId,
        movementDate: log.collectionDate,
        notes: `Graded Small: ${gradingData.notes || ''}`.trim(),
        createdAt: nowIso,
      });
    }

    await db.transaction('rw', [db.eggLogs, db.eggInventory, db.farmSettings], async () => {
      // Update egg log
      await db.eggLogs.update(log.id, {
        graded: true,
        gradeA,
        gradeB,
        smallEggs,
        gradingNotes: (gradingData.notes || '').trim(),
        gradedBy: (gradingData.gradedBy || 'Farm Staff').trim(),
        gradedAt: nowIso,
        updatedAt: nowIso,
      });

      // Remove previous generic grade movements
      for (const m of existingGradeMovements) {
        await db.eggInventory.delete(m.id);
      }

      // Insert new specific grade movements
      for (const m of newMovements) {
        await db.eggInventory.add(m);
      }

      if (nextMovSeq > 0) {
        await db.farmSettings.put({ key: 'last_egg_mov_seq', value: nextMovSeq, updatedAt: nowIso });
      }
    });

    return {
      success: true,
      logId: log.logId,
      gradeA,
      gradeB,
      smallEggs,
    };
  },

  /**
   * Calculate current egg inventory stock balances by grade
   */
  async getInventoryStock() {
    try {
      const movements = await db.eggInventory.toArray();

      const byGrade = {
        'Grade A': 0,
        'Grade B': 0,
        'Small Eggs': 0,
        'Cracked Eggs': 0,
        'Dirty Eggs': 0,
        'Damaged / Rejected Eggs': 0,
      };

      movements.forEach((mov) => {
        const grade = mov.grade;
        const qty = Number(mov.quantity) || 0;
        const type = mov.movementType;

        if (byGrade[grade] === undefined) {
          byGrade[grade] = 0;
        }

        if (type === 'COLLECTION' || type === 'ADJUSTMENT_IN' || type === 'IN' || type === 'TRANSFER_IN' || type === 'SALE_RETURN') {
          byGrade[grade] += qty;
        } else if (type === 'SALE' || type === 'DAMAGE' || type === 'DISPOSAL' || type === 'OUT' || type === 'TRANSFER_OUT') {
          byGrade[grade] -= qty;
        } else if (type === 'TRANSFER') {
          if (mov.direction === 'IN') {
            byGrade[grade] += qty;
          } else {
            byGrade[grade] -= qty;
          }
        } else if (type === 'ADJUSTMENT') {
          // If notes or flag indicates direction
          if (mov.direction === 'OUT' || qty < 0) {
            byGrade[grade] -= Math.abs(qty);
          } else {
            byGrade[grade] += qty;
          }
        }
      });

      // Ensure no negative balances in display
      Object.keys(byGrade).forEach((k) => {
        if (byGrade[k] < 0) byGrade[k] = 0;
      });

      const totalSellableEggs = (byGrade['Grade A'] || 0) + (byGrade['Grade B'] || 0) + (byGrade['Small Eggs'] || 0);
      const totalDefectEggs = (byGrade['Cracked Eggs'] || 0) + (byGrade['Dirty Eggs'] || 0) + (byGrade['Damaged / Rejected Eggs'] || 0);
      const totalEggsInStock = totalSellableEggs + totalDefectEggs;

      return {
        byGrade,
        totalSellableEggs,
        totalSellableCrates: Math.floor(totalSellableEggs / EGGS_PER_CRATE),
        totalSellableLoose: totalSellableEggs % EGGS_PER_CRATE,
        totalDefectEggs,
        totalDefectCrates: Math.floor(totalDefectEggs / EGGS_PER_CRATE),
        totalDefectLoose: totalDefectEggs % EGGS_PER_CRATE,
        totalEggsInStock,
        totalCratesInStock: Math.floor(totalEggsInStock / EGGS_PER_CRATE),
        totalLooseInStock: totalEggsInStock % EGGS_PER_CRATE,
      };
    } catch (err) {
      console.error('Error fetching egg inventory stock:', err);
      return {
        byGrade: {},
        totalSellableEggs: 0,
        totalSellableCrates: 0,
        totalSellableLoose: 0,
        totalDefectEggs: 0,
        totalDefectCrates: 0,
        totalDefectLoose: 0,
        totalEggsInStock: 0,
        totalCratesInStock: 0,
        totalLooseInStock: 0,
      };
    }
  },

  /**
   * Record a manual stock movement (Sale, Damage, Disposal, Adjustment, Transfer)
   * with Strict Negative Stock Prevention and Transfer balance conservation
   */
  async recordStockMovement(data) {
    if (!data.movementType || !MOVEMENT_TYPES.includes(data.movementType)) {
      throw new Error(`Valid movement type is required (${MOVEMENT_TYPES.join(', ')}).`);
    }

    if (!data.grade || !EGG_GRADES.includes(data.grade)) {
      throw new Error(`Valid egg grade is required (${EGG_GRADES.join(', ')}).`);
    }

    const quantity = parseInt(data.quantity, 10);
    if (isNaN(quantity) || quantity <= 0) {
      throw new Error('Quantity must be an integer greater than zero.');
    }

    if (!data.movementDate || !data.movementDate.trim()) {
      throw new Error('Movement date is required.');
    }

    const movementDate = data.movementDate.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(movementDate)) {
      throw new Error('Invalid movement date format. Expected YYYY-MM-DD.');
    }

    const nowIso = new Date().toISOString();

    // Duplicate rapid submission prevention within 3 seconds
    const recentMovements = await db.eggInventory
      .filter((m) =>
        m.movementType === data.movementType &&
        m.grade === data.grade &&
        Number(m.quantity) === quantity &&
        m.movementDate === movementDate
      )
      .toArray();

    const isDuplicate = recentMovements.some((m) => {
      if (!m.createdAt) return false;
      const diff = Math.abs(new Date(nowIso).getTime() - new Date(m.createdAt).getTime());
      return diff < 3000;
    });

    if (isDuplicate) {
      throw new Error(`A duplicate ${data.movementType} movement for ${quantity} ${data.grade} eggs was just recorded. Rapid duplicate submission prevented.`);
    }

    // Special handling for TRANSFER between grades without altering total farm stock
    if (data.movementType === 'TRANSFER') {
      const fromGrade = data.grade || data.fromGrade;
      const toGrade = data.destinationGrade || data.toGrade;

      if (!fromGrade || !EGG_GRADES.includes(fromGrade)) {
        throw new Error(`Valid source grade is required for transfer (${EGG_GRADES.join(', ')}).`);
      }
      if (!toGrade || !EGG_GRADES.includes(toGrade)) {
        throw new Error(`Valid destination grade is required for transfer (${EGG_GRADES.join(', ')}).`);
      }
      if (fromGrade === toGrade) {
        throw new Error('Source and destination grades must be different for a transfer.');
      }

      const stock = await this.getInventoryStock();
      const available = stock.byGrade[fromGrade] || 0;
      if (quantity > available) {
        throw new Error(`Insufficient stock in ${fromGrade}. Available: ${available} eggs, cannot transfer ${quantity} eggs.`);
      }

      let nextMovSeq = 0;
      try {
        const setting = await db.farmSettings.get('last_egg_mov_seq');
        if (setting && typeof setting.value === 'number') nextMovSeq = setting.value;
      } catch {
        // Fallback
      }

      nextMovSeq++;
      const movOutId = `EMOV-${String(nextMovSeq).padStart(4, '0')}`;
      nextMovSeq++;
      const movInId = `EMOV-${String(nextMovSeq).padStart(4, '0')}`;

      const outMov = {
        movementId: movOutId,
        movementType: 'TRANSFER_OUT',
        grade: fromGrade,
        quantity,
        crates: Math.floor(quantity / EGGS_PER_CRATE),
        loose: quantity % EGGS_PER_CRATE,
        referenceId: (data.referenceId || `Transfer to ${toGrade}`).trim(),
        movementDate,
        notes: (data.notes || `Transferred to ${toGrade}`).trim(),
        recordedBy: (data.recordedBy || 'Farm Staff').trim(),
        createdAt: nowIso,
      };

      const inMov = {
        movementId: movInId,
        movementType: 'TRANSFER_IN',
        grade: toGrade,
        quantity,
        crates: Math.floor(quantity / EGGS_PER_CRATE),
        loose: quantity % EGGS_PER_CRATE,
        referenceId: (data.referenceId || `Transfer from ${fromGrade}`).trim(),
        movementDate,
        notes: (data.notes || `Transferred from ${fromGrade}`).trim(),
        recordedBy: (data.recordedBy || 'Farm Staff').trim(),
        createdAt: nowIso,
      };

      await db.transaction('rw', [db.eggInventory, db.farmSettings], async () => {
        await db.eggInventory.add(outMov);
        await db.eggInventory.add(inMov);
        await db.farmSettings.put({ key: 'last_egg_mov_seq', value: nextMovSeq, updatedAt: nowIso });
      });

      return {
        id: movOutId,
        movementId: movOutId,
        destinationMovementId: movInId,
        movementType: 'TRANSFER',
        fromGrade,
        toGrade,
        grade: fromGrade,
        quantity,
        crates: Math.floor(quantity / EGGS_PER_CRATE),
        loose: quantity % EGGS_PER_CRATE,
        referenceId: outMov.referenceId,
        movementDate,
        sourceMovement: outMov,
        destMovement: inMov,
      };
    }

    // Negative stock guard for outgoing movements
    const outgoingTypes = ['SALE', 'DAMAGE', 'DISPOSAL'];
    if (outgoingTypes.includes(data.movementType)) {
      const stock = await this.getInventoryStock();
      const available = stock.byGrade[data.grade] || 0;
      if (quantity > available) {
        throw new Error(
          `Insufficient stock for ${data.grade}. Available: ${available} eggs (${Math.floor(available / EGGS_PER_CRATE)} crates). Cannot deduct ${quantity} eggs.`
        );
      }
    }

    const movementId = data.movementId || (await this.generateNextMovementId());

    const movementRecord = {
      movementId,
      movementType: data.movementType,
      grade: data.grade,
      quantity,
      crates: Math.floor(quantity / EGGS_PER_CRATE),
      loose: quantity % EGGS_PER_CRATE,
      referenceId: (data.referenceId || 'Manual Entry').trim(),
      movementDate,
      notes: (data.notes || '').trim(),
      recordedBy: (data.recordedBy || 'Farm Staff').trim(),
      createdAt: nowIso,
    };

    let id;
    await db.transaction('rw', [db.eggInventory, db.farmSettings], async () => {
      id = await db.eggInventory.add(movementRecord);

      const movSeqMatch = movementId.match(/EMOV-(\d+)/i);
      if (movSeqMatch && movSeqMatch[1]) {
        await db.farmSettings.put({ key: 'last_egg_mov_seq', value: parseInt(movSeqMatch[1], 10), updatedAt: nowIso });
      }
    });

    return {
      id,
      ...movementRecord,
    };
  },

  /**
   * Retrieve all inventory movements with filters
   */
  async getInventoryMovements(filters = {}) {
    try {
      let movements = await db.eggInventory.toArray();

      if (filters.grade) {
        movements = movements.filter((m) => m.grade === filters.grade);
      }
      if (filters.movementType) {
        movements = movements.filter((m) => m.movementType === filters.movementType);
      }
      if (filters.startDate) {
        movements = movements.filter((m) => m.movementDate >= filters.startDate);
      }
      if (filters.endDate) {
        movements = movements.filter((m) => m.movementDate <= filters.endDate);
      }
      if (filters.search && filters.search.trim()) {
        const q = filters.search.trim().toLowerCase();
        movements = movements.filter(
          (m) =>
            (m.movementId && m.movementId.toLowerCase().includes(q)) ||
            (m.referenceId && m.referenceId.toLowerCase().includes(q)) ||
            (m.notes && m.notes.toLowerCase().includes(q))
        );
      }

      movements.sort((a, b) => {
        const dateDiff = (b.movementDate || '').localeCompare(a.movementDate || '');
        if (dateDiff !== 0) return dateDiff;
        return (b.id || 0) - (a.id || 0);
      });

      return movements;
    } catch (err) {
      console.error('Error fetching inventory movements:', err);
      return [];
    }
  },

  /**
   * Calculate complete production and inventory statistics
   */
  async getEggProductionStats() {
    try {
      const todayStr = getLocalDateString();
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = getLocalDateString(yesterday);

      const past7Date = new Date();
      past7Date.setDate(past7Date.getDate() - 7);
      const past7Str = getLocalDateString(past7Date);

      const past30Date = new Date();
      past30Date.setDate(past30Date.getDate() - 30);
      const past30Str = getLocalDateString(past30Date);

      const [logs, stock, batches] = await Promise.all([
        db.eggLogs.toArray(),
        this.getInventoryStock(),
        db.batches.toArray(),
      ]);

      // Layer batches only for laying calculations
      const layerBatches = batches.filter(
        (b) => (b.birdType === 'Layer' || b.birdType === 'Pullet') && b.status !== 'Closed' && b.status !== 'Archived'
      );

      const totalLivingLayers = layerBatches.reduce(
        (sum, b) => sum + (Math.max(0, Number(b.currentCount ?? b.initialCount)) || 0),
        0
      );

      // Today collection
      const todayLogs = logs.filter((l) => (l.collectionDate === todayStr) || (l.date === todayStr));
      const todayCollected = todayLogs.reduce((sum, l) => sum + Number(l.totalCollected ?? l.totalEggs ?? 0), 0);
      const todayMorning = todayLogs.reduce((sum, l) => sum + Number(l.morningCollection ?? 0), 0);
      const todayAfternoon = todayLogs.reduce((sum, l) => sum + Number(l.afternoonCollection ?? 0), 0);
      const todayEvening = todayLogs.reduce((sum, l) => sum + Number(l.eveningCollection ?? 0), 0);
      const todayGood = todayLogs.reduce((sum, l) => sum + Number(l.goodEggs ?? 0), 0);
      const todayCracked = todayLogs.reduce((sum, l) => sum + Number(l.crackedEggs ?? 0), 0);
      const todayDirty = todayLogs.reduce((sum, l) => sum + Number(l.dirtyEggs ?? 0), 0);
      const todayDamaged = todayLogs.reduce((sum, l) => sum + Number(l.damagedEggs ?? 0), 0);
      const todayDefects = todayCracked + todayDirty + todayDamaged;

      // Yesterday collection
      const yesterdayLogs = logs.filter((l) => (l.collectionDate === yesterdayStr) || (l.date === yesterdayStr));
      const yesterdayCollected = yesterdayLogs.reduce((sum, l) => sum + Number(l.totalCollected ?? l.totalEggs ?? 0), 0);

      // 7-day logs
      const past7Logs = logs.filter((l) => {
        const d = l.collectionDate || l.date || '';
        return d >= past7Str && d <= todayStr;
      });
      const past7Collected = past7Logs.reduce((sum, l) => sum + Number(l.totalCollected ?? l.totalEggs ?? 0), 0);
      const sevenDayDailyAvg = Number((past7Collected / 7).toFixed(1));

      // 30-day logs
      const past30Logs = logs.filter((l) => {
        const d = l.collectionDate || l.date || '';
        return d >= past30Str && d <= todayStr;
      });
      const past30Collected = past30Logs.reduce((sum, l) => sum + Number(l.totalCollected ?? l.totalEggs ?? 0), 0);
      const past30Defects = past30Logs.reduce(
        (sum, l) => sum + (Number(l.crackedEggs ?? 0) + Number(l.dirtyEggs ?? 0) + Number(l.damagedEggs ?? 0)),
        0
      );
      const thirtyDayDailyAvg = Number((past30Collected / 30).toFixed(1));
      const defectRate = past30Collected > 0 ? Number(((past30Defects / past30Collected) * 100).toFixed(1)) : 0;

      // Overall HDP
      const overallHDP = calculateHDP(todayCollected, totalLivingLayers);

      // 7-Day Trend Array
      const trendDays = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dStr = getLocalDateString(d);
        const dayLabel = d.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit' });

        const dayLogs = logs.filter((l) => (l.collectionDate === dStr) || (l.date === dStr));
        const dayTotal = dayLogs.reduce((sum, l) => sum + Number(l.totalCollected ?? l.totalEggs ?? 0), 0);
        const dayGood = dayLogs.reduce((sum, l) => sum + Number(l.goodEggs ?? 0), 0);
        const dayCracked = dayLogs.reduce((sum, l) => sum + Number(l.crackedEggs ?? 0), 0);
        const dayDirty = dayLogs.reduce((sum, l) => sum + Number(l.dirtyEggs ?? 0), 0);
        const dayDamaged = dayLogs.reduce((sum, l) => sum + Number(l.damagedEggs ?? 0), 0);
        const dayHdp = calculateHDP(dayTotal, totalLivingLayers);

        trendDays.push({
          date: dStr,
          label: dayLabel,
          total: dayTotal,
          good: dayGood,
          cracked: dayCracked,
          dirty: dayDirty,
          damaged: dayDamaged,
          hdp: dayHdp,
        });
      }

      // Batch performance breakdown
      const batchPerfMap = {};
      logs.forEach((l) => {
        const bId = l.batchId;
        if (!batchPerfMap[bId]) {
          batchPerfMap[bId] = {
            totalEggs: 0,
            goodEggs: 0,
            defectEggs: 0,
            collectionCount: 0,
          };
        }
        const tot = Number(l.totalCollected ?? l.totalEggs ?? 0);
        const gd = Number(l.goodEggs ?? tot);
        const def = tot - gd;
        batchPerfMap[bId].totalEggs += tot;
        batchPerfMap[bId].goodEggs += gd;
        batchPerfMap[bId].defectEggs += def;
        batchPerfMap[bId].collectionCount += 1;
      });

      const batchPerformance = batches.map((b) => {
        const perf = batchPerfMap[b.id] || batchPerfMap[b.batchCode] || { totalEggs: 0, goodEggs: 0, defectEggs: 0, collectionCount: 0 };
        const livingHens = Math.max(0, Number(b.currentCount ?? b.initialCount) || 0);
        const avgDaily = perf.collectionCount > 0 ? Number((perf.totalEggs / perf.collectionCount).toFixed(1)) : 0;
        const avgHdp = calculateHDP(avgDaily, livingHens);

        return {
          id: b.id,
          batchCode: b.batchCode || b.name,
          birdType: b.birdType,
          breed: b.breed,
          livingHens,
          totalEggs: perf.totalEggs,
          avgDaily,
          avgHdp,
          defectCount: perf.defectEggs,
        };
      }).filter((b) => b.totalEggs > 0 || b.birdType === 'Layer');

      return {
        todayCollected,
        todayMorning,
        todayAfternoon,
        todayEvening,
        todayGood,
        todayDefects,
        todayCracked,
        todayDirty,
        todayDamaged,
        yesterdayCollected,
        past7Collected,
        sevenDayDailyAvg,
        past30Collected,
        thirtyDayDailyAvg,
        defectRate,
        overallHDP,
        totalLivingLayers,
        stock,
        trendDays,
        batchPerformance,
      };
    } catch (err) {
      console.error('Error calculating egg production statistics:', err);
      return {
        todayCollected: 0,
        todayMorning: 0,
        todayAfternoon: 0,
        todayEvening: 0,
        todayGood: 0,
        todayDefects: 0,
        yesterdayCollected: 0,
        past7Collected: 0,
        sevenDayDailyAvg: 0,
        past30Collected: 0,
        thirtyDayDailyAvg: 0,
        defectRate: 0,
        overallHDP: 0,
        totalLivingLayers: 0,
        stock: { byGrade: {}, totalSellableEggs: 0, totalSellableCrates: 0, totalDefectEggs: 0, totalEggsInStock: 0 },
        trendDays: [],
        batchPerformance: [],
      };
    }
  },

  /**
   * Seed realistic initial layer collection logs if table is empty and batches exist
   */
  async seedInitialEggData() {
    try {
      const count = await db.eggLogs.count();
      if (count > 0) return false;

      // Find an active layer batch or any batch
      const batches = await db.batches.toArray();
      let layerBatch = batches.find((b) => b.birdType === 'Layer' && b.status === 'Active');
      if (!layerBatch && batches.length > 0) {
        layerBatch = batches[0];
      }

      if (!layerBatch) {
        return false;
      }

      // Seed past 5 days of collections
      const seedDays = [
        { offset: 4, morning: 160, afternoon: 140, evening: 80, cracked: 6, dirty: 4, damaged: 2 },
        { offset: 3, morning: 175, afternoon: 150, evening: 75, cracked: 5, dirty: 3, damaged: 1 },
        { offset: 2, morning: 180, afternoon: 160, evening: 80, cracked: 7, dirty: 5, damaged: 2 },
        { offset: 1, morning: 190, afternoon: 155, evening: 85, cracked: 4, dirty: 2, damaged: 1 },
        { offset: 0, morning: 200, afternoon: 170, evening: 80, cracked: 6, dirty: 4, damaged: 2 },
      ];

      for (const item of seedDays) {
        const d = new Date();
        d.setDate(d.getDate() - item.offset);
        const dStr = d.toISOString().slice(0, 10);

        const total = item.morning + item.afternoon + item.evening;
        const defects = item.cracked + item.dirty + item.damaged;
        const good = total - defects;

        await this.createCollectionLog({
          batchId: layerBatch.id,
          collectionDate: dStr,
          morningCollection: item.morning,
          afternoonCollection: item.afternoon,
          eveningCollection: item.evening,
          totalCollected: total,
          goodEggs: good,
          crackedEggs: item.cracked,
          dirtyEggs: item.dirty,
          damagedEggs: item.damaged,
          notes: `Standard daily collection for flock ${layerBatch.batchCode || layerBatch.name}`,
          recordedBy: 'Farm Supervisor',
        });
      }

      return true;
    } catch (err) {
      console.error('Error seeding initial egg data:', err);
      return false;
    }
  },

  /**
   * Export collection logs to CSV format
   */
  async exportCollectionsCSV(filters = {}) {
    const logs = await this.getCollectionLogs(filters);
    const headers = [
      'Log ID',
      'Date',
      'Batch Code',
      'Bird Type',
      'Morning',
      'Afternoon',
      'Evening',
      'Total Eggs',
      'Good Eggs',
      'Cracked Eggs',
      'Dirty Eggs',
      'Damaged Eggs',
      'Laying Rate (HDP %)',
      'Recorded By',
      'Notes',
    ];

    const rows = logs.map((l) => [
      l.logId,
      l.collectionDate,
      `"${l.batchCode}"`,
      l.birdType,
      l.morningCollection,
      l.afternoonCollection,
      l.eveningCollection,
      l.totalCollected,
      l.goodEggs,
      l.crackedEggs,
      l.dirtyEggs,
      l.damagedEggs,
      `${l.layingRate}%`,
      `"${l.recordedBy}"`,
      `"${(l.notes || '').replace(/"/g, '""')}"`,
    ]);

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  },

  /**
   * Export inventory movements to CSV format
   */
  async exportInventoryCSV(filters = {}) {
    const movements = await this.getInventoryMovements(filters);
    const headers = [
      'Movement ID',
      'Date',
      'Type',
      'Grade',
      'Quantity (Eggs)',
      'Crates',
      'Loose',
      'Reference / Reason',
      'Recorded By',
      'Notes',
    ];

    const rows = movements.map((m) => [
      m.movementId,
      m.movementDate,
      m.movementType,
      `"${m.grade}"`,
      m.quantity,
      Math.floor(m.quantity / EGGS_PER_CRATE),
      m.quantity % EGGS_PER_CRATE,
      `"${m.referenceId}"`,
      `"${m.recordedBy || 'Farm Staff'}"`,
      `"${(m.notes || '').replace(/"/g, '""')}"`,
    ]);

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  },
};
