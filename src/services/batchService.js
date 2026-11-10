import { db } from '../database/db.js';
import { penService } from './penService.js';

/**
 * Batch Bird Types
 */
export const BATCH_TYPES = [
  'Broiler',
  'Layer',
  'Cockerel',
  'Pullet',
  'Chick',
  'Breeder',
  'Other',
];

/**
 * Batch Lifecycle Statuses
 */
export const BATCH_STATUSES = ['Planned', 'Active', 'Completed', 'Archived'];

/**
 * Common Production Purposes
 */
export const PRODUCTION_PURPOSES = [
  'Table Egg Production',
  'Meat / Broiler Production',
  'Point of Lay / Pullet Sale',
  'Breeding Stock & Pedigree',
  'Day-Old Chick (DOC) Rearing',
  'Dual-Purpose / Backyard Stock',
];

/**
 * FreshNest Batch Management Service
 * Full lifecycle cohort management, pen placement with strict capacity enforcement,
 * population tracking (initial vs current count), and safe archiving.
 */
export const batchService = {
  /**
   * Automatically generate the next sequential Batch ID (e.g. BAT-0001)
   * Uses persistent high-water mark sequence in farmSettings
   */
  async generateNextBatchId() {
    try {
      let settingSeq = 0;
      try {
        const setting = await db.farmSettings.get('last_batch_seq');
        if (setting && typeof setting.value === 'number') {
          settingSeq = setting.value;
        }
      } catch {
        // Fallback
      }

      const batches = await db.batches.toArray();
      let maxNumber = settingSeq;

      batches.forEach((b) => {
        const code = b.batchId || b.batchCode;
        if (code) {
          const match = code.match(/BAT-(\d+)/i);
          if (match && match[1]) {
            const num = parseInt(match[1], 10);
            if (!isNaN(num) && num > maxNumber) {
              maxNumber = num;
            }
          }
        } else if (b.id && typeof b.id === 'number' && b.id > maxNumber) {
          maxNumber = b.id;
        }
      });

      const nextNum = maxNumber + 1;
      return `BAT-${String(nextNum).padStart(4, '0')}`;
    } catch (err) {
      console.error('Error generating batch ID:', err);
      return 'BAT-0001';
    }
  },

  /**
   * Check if a Batch ID is unique (case-insensitive)
   */
  async checkBatchIdAvailable(batchId, excludeId = null) {
    if (!batchId || !batchId.trim()) return false;
    const cleanId = batchId.trim().toUpperCase();

    const existing = await db.batches
      .filter((b) => {
        const currentCode = (b.batchId || b.batchCode || '').trim().toUpperCase();
        if (!currentCode) return false;
        if (currentCode !== cleanId) return false;
        if (excludeId !== null && excludeId !== undefined) {
          return Number(b.id) !== Number(excludeId);
        }
        return true;
      })
      .first();

    return !existing;
  },

  /**
   * Register a new Flock Batch with strict pen capacity verification
   */
  async createBatch(data) {
    // 1. Validation
    if (!data.name || !data.name.trim()) {
      throw new Error('Batch Name or Description is required.');
    }
    if (!data.birdType || !BATCH_TYPES.includes(data.birdType)) {
      throw new Error(`Valid Batch Type is required (${BATCH_TYPES.join(', ')}).`);
    }
    if (!data.breed || !data.breed.trim()) {
      throw new Error('Breed is required.');
    }

    const initialCount = parseInt(data.initialCount, 10);
    if (isNaN(initialCount) || initialCount <= 0) {
      throw new Error('Initial Bird Count must be an integer greater than zero.');
    }

    let currentCount = initialCount;
    if (data.currentCount !== undefined && data.currentCount !== null && data.currentCount !== '') {
      const parsedCurrent = parseInt(data.currentCount, 10);
      if (isNaN(parsedCurrent) || parsedCurrent < 0) {
        throw new Error('Current Bird Count must be a non-negative integer.');
      }
      currentCount = parsedCurrent;
    }

    if (!data.arrivalDate || !data.arrivalDate.trim()) {
      throw new Error('Arrival or Placement Date is required.');
    }
    if (!data.penId && !data.houseId) {
      throw new Error('Assigned Poultry House / Pen is required.');
    }

    const status = data.status && BATCH_STATUSES.includes(data.status) ? data.status : 'Active';

    // 2. Resolve Pen & Enforce Strict Capacity Validation
    const penIdentifier = data.penId || data.houseId;
    const resolvedPen = await penService.resolvePen(penIdentifier);
    if (!resolvedPen) {
      throw new Error(`Assigned Pen / House "${penIdentifier}" was not found in the pen registry.`);
    }

    // Only active and planned batches consume physical pen space
    if (status === 'Active' || status === 'Planned') {
      const capacityCheck = await penService.validatePenCapacity(resolvedPen, currentCount);
      if (!capacityCheck.valid) {
        throw new Error(capacityCheck.message);
      }
    }

    // 3. Batch ID Generation & Uniqueness
    let batchId = data.batchId && data.batchId.trim()
      ? data.batchId.trim().toUpperCase()
      : await this.generateNextBatchId();

    const isAvailable = await this.checkBatchIdAvailable(batchId);
    if (!isAvailable) {
      throw new Error(`Batch ID "${batchId}" already exists. Batch IDs must be unique.`);
    }

    const costPerBird = Math.max(0, parseFloat(data.costPerBird) || 0);
    let totalCost = Math.max(0, parseFloat(data.totalCost) || 0);
    if (totalCost === 0 && costPerBird > 0) {
      totalCost = Number((costPerBird * initialCount).toFixed(2));
    }

    const newBatch = {
      batchId,
      batchCode: batchId, // Ensure backward compatibility with existing schema
      name: data.name.trim(),
      birdType: data.birdType,
      breed: data.breed.trim(),
      initialCount,
      currentCount,
      arrivalDate: data.arrivalDate.trim(),
      supplier: data.supplier ? data.supplier.trim() : 'Farm Hatched / Local Hatchery',
      costPerBird,
      totalCost,
      purpose: data.purpose ? data.purpose.trim() : 'Table Egg Production',
      penId: resolvedPen.penId,
      houseId: resolvedPen.name, // Link human readable name
      expectedMarketDate: data.expectedMarketDate ? data.expectedMarketDate.trim() : null,
      status,
      notes: data.notes ? data.notes.trim() : '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const insertedId = await db.batches.add(newBatch);

    // Update persistent sequence high-water mark in farmSettings
    try {
      const match = batchId.match(/BAT-(\d+)/i);
      const seqVal = match && match[1] ? parseInt(match[1], 10) : 0;
      if (seqVal > 0) {
        const currentSetting = await db.farmSettings.get('last_batch_seq');
        const currentMax = currentSetting && typeof currentSetting.value === 'number' ? currentSetting.value : 0;
        if (seqVal > currentMax) {
          await db.farmSettings.put({
            key: 'last_batch_seq',
            value: seqVal,
            updatedAt: new Date().toISOString(),
          });
        }
      }
    } catch (seqErr) {
      console.warn('Could not record last_batch_seq:', seqErr);
    }

    return { ...newBatch, id: insertedId };
  },

  /**
   * Update an existing Batch
   * Re-evaluates pen capacity excluding this batch's previous occupancy
   */
  async updateBatch(id, data) {
    const numId = Number(id);
    const existing = await db.batches.get(numId);
    if (!existing) {
      throw new Error(`Batch record #${id} not found.`);
    }

    // Preserve initialCount by default; allow controlled adjustment if explicitly passed
    const initialCount = data.initialCount !== undefined
      ? Math.max(1, parseInt(data.initialCount, 10) || existing.initialCount)
      : existing.initialCount;

    // Validate current count
    const currentCount = data.currentCount !== undefined
      ? Math.max(0, parseInt(data.currentCount, 10))
      : existing.currentCount;

    const newStatus = data.status || existing.status;
    const targetPenIdentifier = data.penId || data.houseId || existing.penId || existing.houseId;
    const resolvedPen = await penService.resolvePen(targetPenIdentifier);
    if (!resolvedPen) {
      throw new Error(`Assigned Pen / House "${targetPenIdentifier}" was not found.`);
    }

    // Validate pen capacity if active or planned (excluding this batch)
    if (newStatus === 'Active' || newStatus === 'Planned') {
      const capacityCheck = await penService.validatePenCapacity(resolvedPen, currentCount, numId);
      if (!capacityCheck.valid) {
        throw new Error(capacityCheck.message);
      }
    }

    // Validate Batch ID if modified
    let newBatchId = existing.batchId || existing.batchCode;
    if (data.batchId && data.batchId.trim() && data.batchId.trim().toUpperCase() !== newBatchId) {
      const targetId = data.batchId.trim().toUpperCase();
      const isAvailable = await this.checkBatchIdAvailable(targetId, numId);
      if (!isAvailable) {
        throw new Error(`Batch ID "${targetId}" is already assigned to another batch.`);
      }
      newBatchId = targetId;
    }

    const costPerBird = data.costPerBird !== undefined
      ? Math.max(0, parseFloat(data.costPerBird) || 0)
      : (existing.costPerBird || 0);

    let totalCost = data.totalCost !== undefined
      ? Math.max(0, parseFloat(data.totalCost) || 0)
      : (existing.totalCost || 0);

    if (totalCost === 0 && costPerBird > 0) {
      totalCost = Number((costPerBird * initialCount).toFixed(2));
    }

    const updates = {
      batchId: newBatchId,
      batchCode: newBatchId,
      name: data.name !== undefined ? data.name.trim() : existing.name,
      birdType: data.birdType || existing.birdType,
      breed: data.breed ? data.breed.trim() : existing.breed,
      initialCount,
      currentCount,
      arrivalDate: data.arrivalDate ? data.arrivalDate.trim() : existing.arrivalDate,
      supplier: data.supplier !== undefined ? data.supplier.trim() : existing.supplier,
      costPerBird,
      totalCost,
      purpose: data.purpose !== undefined ? data.purpose.trim() : existing.purpose,
      penId: resolvedPen.penId,
      houseId: resolvedPen.name,
      expectedMarketDate: data.expectedMarketDate !== undefined
        ? (data.expectedMarketDate ? data.expectedMarketDate.trim() : null)
        : existing.expectedMarketDate,
      status: newStatus,
      notes: data.notes !== undefined ? data.notes.trim() : existing.notes,
      updatedAt: new Date().toISOString(),
    };

    await db.batches.update(numId, updates);
    return { ...existing, ...updates, id: numId };
  },

  /**
   * Safely Archive Batch
   * Historical records remain intact, and pen space is released
   */
  async archiveBatch(id, reason = 'Batch cycle completed') {
    const numId = Number(id);
    const existing = await db.batches.get(numId);
    if (!existing) {
      throw new Error(`Batch #${id} not found.`);
    }

    const updates = {
      status: 'Archived',
      archivedAt: new Date().toISOString(),
      archiveReason: reason,
      updatedAt: new Date().toISOString(),
    };

    await db.batches.update(numId, updates);
    return { ...existing, ...updates };
  },

  /**
   * Delete Batch with dependency and safety audit
   * Rejects deletion if dependent individual birds or historical production logs exist
   */
  async deleteBatch(id, { force = false } = {}) {
    const numId = Number(id);
    const batch = await db.batches.get(numId);
    if (!batch) {
      throw new Error(`Batch record #${id} does not exist.`);
    }

    const batchCode = batch.batchId || batch.batchCode || `#${batch.id}`;

    // 1. Check for individual birds assigned to this batch
    const assignedBirds = await db.birds
      .filter((b) => Number(b.batchId) === numId || b.batchId === batch.batchId || b.batchId === batch.batchCode)
      .toArray();

    if (assignedBirds.length > 0) {
      throw new Error(
        `Cannot delete Batch ${batchCode}: ${assignedBirds.length} individual bird record(s) are currently assigned to this batch. Reassign or remove these individual birds first, or use "Archive Batch" instead to preserve flock genealogy.`
      );
    }

    // 2. Check for historical production logs across modules
    const [eggLogs, mortalityLogs, feedLogs, medLogs, vaxLogs] = await Promise.all([
      db.eggLogs.filter((e) => Number(e.batchId) === numId || e.batchId === batchCode).count(),
      db.mortalityLogs.filter((m) => Number(m.batchId) === numId || m.batchId === batchCode).count(),
      db.feedLogs.filter((f) => Number(f.batchId) === numId || f.batchId === batchCode).count(),
      db.medicationLogs.filter((m) => Number(m.batchId) === numId || m.batchId === batchCode).count(),
      db.vaccinationLogs.filter((v) => Number(v.batchId) === numId || v.batchId === batchCode).count(),
    ]);

    const totalLogs = eggLogs + mortalityLogs + feedLogs + medLogs + vaxLogs;
    if (totalLogs > 0 && !force) {
      const details = [];
      if (eggLogs > 0) details.push(`${eggLogs} egg collection(s)`);
      if (mortalityLogs > 0) details.push(`${mortalityLogs} mortality record(s)`);
      if (feedLogs > 0) details.push(`${feedLogs} feed log(s)`);
      if (medLogs > 0) details.push(`${medLogs} medication log(s)`);
      if (vaxLogs > 0) details.push(`${vaxLogs} vaccination log(s)`);

      throw new Error(
        `Cannot delete Batch ${batchCode}: This batch has ${totalLogs} historical operational records (${details.join(', ')}). Deleting it would compromise farm reporting and auditing ledgers. Please use "Archive Batch" instead.`
      );
    }

    await db.batches.delete(numId);
    return true;
  },

  /**
   * Get single batch with enriched pen, assigned birds count, and mortality metrics
   */
  async getBatchById(id) {
    let batch = null;
    if (typeof id === 'number' || !isNaN(Number(id))) {
      batch = await db.batches.get(Number(id));
    }
    if (!batch && typeof id === 'string') {
      batch = await db.batches.where('batchId').equalsIgnoreCase(id.trim()).first();
      if (!batch) {
        batch = await db.batches.where('batchCode').equalsIgnoreCase(id.trim()).first();
      }
    }
    if (!batch) return null;

    const [pen, assignedBirds, mortalityLogs, eggLogs] = await Promise.all([
      penService.resolvePen(batch.penId || batch.houseId),
      db.birds.filter((b) => Number(b.batchId) === Number(batch.id) || b.batchId === batch.batchId).toArray(),
      db.mortalityLogs.filter((m) => Number(m.batchId) === Number(batch.id) || m.batchId === batch.batchCode).toArray(),
      db.eggLogs.filter((e) => Number(e.batchId) === Number(batch.id) || e.batchId === batch.batchCode).toArray(),
    ]);

    const totalMortality = mortalityLogs.reduce((sum, m) => sum + (Number(m.count) || 0), 0);
    const totalEggs = eggLogs.reduce((sum, e) => sum + (Number(e.totalEggs) || (Number(e.goodEggs) || 0) + (Number(e.crackedEggs) || 0)), 0);
    const initial = Number(batch.initialCount) || 1;
    const mortalityRatePct = Number(((totalMortality / initial) * 100).toFixed(2));

    return {
      ...batch,
      penDetails: pen,
      assignedBirdsCount: assignedBirds.length,
      assignedBirds,
      totalMortality,
      mortalityRatePct,
      totalEggs,
    };
  },

  /**
   * Filtered, searched, sorted, and paginated query for batches
   */
  async getBatches({
    search = '',
    type = 'all',
    status = 'all',
    penId = 'all',
    sortBy = 'id',
    sortOrder = 'desc',
    page = 1,
    pageSize = 10,
  } = {}) {
    try {
      const [allBatches, allPens, allBirds] = await Promise.all([
        db.batches.toArray(),
        penService.getPens(),
        db.birds.toArray(),
      ]);

      const penMap = {};
      allPens.forEach((p) => {
        penMap[p.penId] = p;
        penMap[p.name] = p;
      });

      const birdCountMap = {};
      allBirds.forEach((b) => {
        if (b.batchId) {
          birdCountMap[b.batchId] = (birdCountMap[b.batchId] || 0) + 1;
        }
      });

      // Search
      const searchLower = search.trim().toLowerCase();
      let filtered = allBatches.filter((b) => {
        if (searchLower) {
          const matchId = (b.batchId || b.batchCode || '').toLowerCase().includes(searchLower);
          const matchName = (b.name || '').toLowerCase().includes(searchLower);
          const matchBreed = (b.breed || '').toLowerCase().includes(searchLower);
          const matchSupplier = (b.supplier || '').toLowerCase().includes(searchLower);
          const matchPen = (b.penId || b.houseId || '').toLowerCase().includes(searchLower);
          if (!matchId && !matchName && !matchBreed && !matchSupplier && !matchPen) return false;
        }

        if (type !== 'all' && b.birdType !== type) return false;
        if (status !== 'all' && b.status !== status) return false;
        if (penId !== 'all') {
          const matches = String(b.penId) === String(penId) || String(b.houseId) === String(penId);
          if (!matches) return false;
        }

        return true;
      });

      // Sort
      filtered.sort((a, b) => {
        let valA = a[sortBy];
        let valB = b[sortBy];

        if (valA === undefined || valA === null) valA = '';
        if (valB === undefined || valB === null) valB = '';

        if (typeof valA === 'number' && typeof valB === 'number') {
          return sortOrder === 'asc' ? valA - valB : valB - valA;
        }

        const cmp = String(valA).localeCompare(String(valB), undefined, { numeric: true });
        return sortOrder === 'asc' ? cmp : -cmp;
      });

      // Pagination
      const total = filtered.length;
      const currentPage = Math.max(1, Number(page) || 1);
      const limit = Math.max(1, Number(pageSize) || 10);
      const totalPages = Math.ceil(total / limit) || 1;
      const safePage = Math.min(currentPage, totalPages);
      const startIndex = (safePage - 1) * limit;

      const items = filtered.slice(startIndex, startIndex + limit).map((b) => {
        const pen = penMap[b.penId] || penMap[b.houseId] || null;
        const assignedBirdsCount = birdCountMap[b.id] || birdCountMap[b.batchId] || birdCountMap[b.batchCode] || 0;

        return {
          ...b,
          batchId: b.batchId || b.batchCode || `BAT-${String(b.id).padStart(4, '0')}`,
          penName: pen ? pen.name : (b.houseId || b.penId || 'Unassigned'),
          penCapacity: pen ? pen.capacity : null,
          assignedBirdsCount,
        };
      });

      return {
        items,
        total,
        page: safePage,
        pageSize: limit,
        totalPages,
      };
    } catch (err) {
      console.error('Error fetching batches:', err);
      return {
        items: [],
        total: 0,
        page: 1,
        pageSize: 10,
        totalPages: 1,
      };
    }
  },

  /**
   * Get 6 summary metrics for Batch Management Dashboard
   */
  async getBatchStats() {
    try {
      const batches = await db.batches.toArray();

      const totalBatches = batches.length;
      let activeBatches = 0;
      let plannedBatches = 0;
      let completedBatches = 0;
      let archivedBatches = 0;
      let totalBatchBirds = 0;
      let activeBatchBirds = 0;

      batches.forEach((b) => {
        const initial = Math.max(0, Number(b.initialCount) || 0);
        const current = Math.max(0, Number(b.currentCount !== undefined && b.currentCount !== null ? b.currentCount : initial));

        totalBatchBirds += initial;

        if (b.status === 'Active') {
          activeBatches++;
          activeBatchBirds += current;
        } else if (b.status === 'Planned') {
          plannedBatches++;
        } else if (b.status === 'Completed') {
          completedBatches++;
        } else if (b.status === 'Archived') {
          archivedBatches++;
        } else {
          activeBatches++;
          activeBatchBirds += current;
        }
      });

      return {
        totalBatches,
        activeBatches,
        plannedBatches,
        completedBatches,
        archivedBatches,
        totalBatchBirds,
        activeBatchBirds,
      };
    } catch (err) {
      console.error('Error calculating batch stats:', err);
      return {
        totalBatches: 0,
        activeBatches: 0,
        plannedBatches: 0,
        completedBatches: 0,
        archivedBatches: 0,
        totalBatchBirds: 0,
        activeBatchBirds: 0,
      };
    }
  },

  /**
   * Calculate flock age in weeks and days from arrival/placement date
   */
  calculateFlockAge(arrivalDate) {
    if (!arrivalDate) return 'Age unknown';
    const placement = new Date(arrivalDate);
    if (isNaN(placement.getTime())) return 'Age unknown';

    const now = new Date();
    const diffMs = now - placement;
    if (diffMs < 0) return 'Placement in future';

    const totalDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (totalDays === 0) return 'Placed today (Day 1)';
    if (totalDays < 7) return `${totalDays} day${totalDays > 1 ? 's' : ''}`;

    const weeks = Math.floor(totalDays / 7);
    const remDays = totalDays % 7;
    return remDays > 0 ? `${weeks} wk${weeks > 1 ? 's' : ''}, ${remDays} d` : `${weeks} weeks`;
  },
};
