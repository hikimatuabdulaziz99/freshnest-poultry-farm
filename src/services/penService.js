import { db } from '../database/db.js';

/**
 * Pen / Housing Types
 */
export const PEN_TYPES = [
  'Brooder',
  'Grower',
  'Layer',
  'Broiler',
  'Breeder',
  'Quarantine',
  'Other',
];

/**
 * Pen Operational Statuses
 */
export const PEN_STATUSES = ['Available', 'Occupied', 'Maintenance', 'Closed'];

/**
 * Initial Farm Pen Configurations
 */
export const INITIAL_PENS = [
  {
    penId: 'PEN-001',
    name: 'Pen 1 - North Wing',
    type: 'Brooder',
    capacity: 500,
    location: 'North Brooder Bay',
    status: 'Available',
    notes: 'Climate-controlled brooding environment with infrared heating lamps.',
  },
  {
    penId: 'PEN-002',
    name: 'Pen 2 - Central',
    type: 'Grower',
    capacity: 1000,
    location: 'Central Rearing Shed',
    status: 'Available',
    notes: 'Ventilated grower unit equipped with automatic nipple drinkers.',
  },
  {
    penId: 'PEN-003',
    name: 'Pen 3 - South',
    type: 'Layer',
    capacity: 1000,
    location: 'Layer House 1',
    status: 'Available',
    notes: 'Equipped with individual nest boxes and egg collection trays.',
  },
  {
    penId: 'PEN-004',
    name: 'House A - Layer Coop',
    type: 'Layer',
    capacity: 1500,
    location: 'East Commercial Sector',
    status: 'Available',
    notes: 'Large commercial laying unit with automated conveyor feeders.',
  },
  {
    penId: 'PEN-005',
    name: 'House B - Broiler Unit',
    type: 'Broiler',
    capacity: 2000,
    location: 'South Broiler Shed',
    status: 'Available',
    notes: 'Deep-litter high-density broiler pen with cross-ventilation fans.',
  },
  {
    penId: 'PEN-006',
    name: 'Quarantine Bay',
    type: 'Quarantine',
    capacity: 200,
    location: 'Biosecurity Isolation Block',
    status: 'Available',
    notes: 'Isolated biosecurity unit for sick, newly acquired, or monitored stock.',
  },
  {
    penId: 'PEN-007',
    name: 'Breeder Unit',
    type: 'Breeder',
    capacity: 300,
    location: 'Pedigree Breeding Wing',
    status: 'Available',
    notes: 'Specialized mating pens for pedigree genetics and cockerel tracking.',
  },
];

let seedPensPromise = null;

/**
 * FreshNest Pen Management Service
 * Handles pen creation, capacity validation, dynamic occupancy calculations,
 * and safe housing allocation.
 */
export const penService = {
  /**
   * Seed standard default pens if table is empty, with concurrency mutex and deduplication
   */
  async seedDefaultPensIfEmpty() {
    if (seedPensPromise) return seedPensPromise;
    seedPensPromise = (async () => {
      try {
        await db.transaction('rw', [db.pens, db.farmSettings], async () => {
          const allPens = await db.pens.toArray();
          // Clean up any existing duplicate records by penId
          const seen = new Set();
          const dupes = [];
          allPens.forEach((p) => {
            const code = (p.penId || '').trim().toUpperCase();
            if (code) {
              if (seen.has(code)) {
                dupes.push(p.id);
              } else {
                seen.add(code);
              }
            }
          });

          for (const dupId of dupes) {
            await db.pens.delete(dupId);
          }

          const count = await db.pens.count();
          if (count === 0) {
            for (const pen of INITIAL_PENS) {
              const existing = await db.pens.where('penId').equalsIgnoreCase(pen.penId).first();
              if (!existing) {
                await db.pens.add({
                  ...pen,
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                });
              }
            }
          }
        });
      } catch (err) {
        console.warn('Could not seed default pens:', err);
      } finally {
        seedPensPromise = null;
      }
    })();
    return seedPensPromise;
  },

  /**
   * Automatically generate the next sequential Pen ID (e.g. PEN-001)
   */
  async generateNextPenId() {
    try {
      let settingSeq = 0;
      try {
        const setting = await db.farmSettings.get('last_pen_seq');
        if (setting && typeof setting.value === 'number') {
          settingSeq = setting.value;
        }
      } catch {
        // Fallback if settings table not yet populated
      }

      const pens = await db.pens.toArray();
      let maxNumber = settingSeq;

      pens.forEach((p) => {
        if (p.penId) {
          const match = p.penId.match(/PEN-(\d+)/i);
          if (match && match[1]) {
            const num = parseInt(match[1], 10);
            if (!isNaN(num) && num > maxNumber) {
              maxNumber = num;
            }
          }
        } else if (p.id && typeof p.id === 'number' && p.id > maxNumber) {
          maxNumber = p.id;
        }
      });

      const nextNum = maxNumber + 1;
      return `PEN-${String(nextNum).padStart(3, '0')}`;
    } catch (err) {
      console.error('Error generating Pen ID:', err);
      return 'PEN-001';
    }
  },

  /**
   * Check if Pen ID is unique (case-insensitive)
   */
  async checkPenIdAvailable(penId, excludeId = null) {
    if (!penId || !penId.trim()) return false;
    const cleanId = penId.trim().toUpperCase();

    const existing = await db.pens
      .filter((p) => {
        if (!p.penId) return false;
        const matches = p.penId.trim().toUpperCase() === cleanId;
        if (!matches) return false;
        if (excludeId !== null && excludeId !== undefined) {
          return Number(p.id) !== Number(excludeId);
        }
        return true;
      })
      .first();

    return !existing;
  },

  /**
   * Calculate current occupancy for a pen based on active & planned batches
   * Supports excluding a specific batch (critical when moving or editing a batch)
   */
  async calculatePenOccupancy(penIdentifier, excludeBatchId = null) {
    const pen = await this.resolvePen(penIdentifier);
    if (!pen) {
      return {
        pen: null,
        capacity: 0,
        occupiedCount: 0,
        availableCapacity: 0,
        occupancyPercentage: 0,
        isFull: false,
        assignedBatches: [],
      };
    }

    const allBatches = await db.batches.toArray();
    const assignedBatches = allBatches.filter((b) => {
      // Exclude completed or archived batches from consuming physical pen space
      if (b.status === 'Completed' || b.status === 'Archived') {
        return false;
      }

      // Exclude current batch being evaluated
      if (excludeBatchId !== null && excludeBatchId !== undefined) {
        if (Number(b.id) === Number(excludeBatchId) || b.batchId === excludeBatchId || b.batchCode === excludeBatchId) {
          return false;
        }
      }

      // Match against pen ID, database primary key ID, or pen name
      const matchesPenId = b.penId && (String(b.penId) === String(pen.penId) || Number(b.penId) === Number(pen.id));
      const matchesHouseId = b.houseId && (
        String(b.houseId).trim().toLowerCase() === String(pen.name).trim().toLowerCase() ||
        String(b.houseId).trim().toLowerCase() === String(pen.penId).trim().toLowerCase()
      );

      return matchesPenId || matchesHouseId;
    });

    const occupiedCount = assignedBatches.reduce((sum, b) => {
      const count = Number(b.currentCount !== undefined && b.currentCount !== null ? b.currentCount : b.initialCount) || 0;
      return sum + Math.max(0, count);
    }, 0);

    const capacity = Math.max(0, Number(pen.capacity) || 0);
    const availableCapacity = Math.max(0, capacity - occupiedCount);
    const occupancyPercentage = capacity > 0 ? Math.min(100, Math.round((occupiedCount / capacity) * 100)) : 0;
    const isFull = occupiedCount >= capacity;

    return {
      pen,
      capacity,
      occupiedCount,
      availableCapacity,
      occupancyPercentage,
      isFull,
      assignedBatches,
    };
  },

  /**
   * Helper to resolve pen by ID, Pen ID string, or Pen Name
   */
  async resolvePen(penIdentifier) {
    if (!penIdentifier) return null;

    if (typeof penIdentifier === 'object' && penIdentifier.capacity !== undefined) {
      return penIdentifier;
    }

    // By numeric DB primary key
    if (typeof penIdentifier === 'number' || (!isNaN(Number(penIdentifier)) && String(penIdentifier).trim() !== '')) {
      const byPk = await db.pens.get(Number(penIdentifier));
      if (byPk) return byPk;
    }

    const cleanStr = String(penIdentifier).trim();

    // By penId code (e.g. PEN-001)
    const byCode = await db.pens.where('penId').equalsIgnoreCase(cleanStr).first();
    if (byCode) return byCode;

    // By pen name (e.g. Pen 1 - North Wing)
    const byName = await db.pens
      .filter((p) => p.name && p.name.trim().toLowerCase() === cleanStr.toLowerCase())
      .first();
    if (byName) return byName;

    return null;
  },

  /**
   * Strict Capacity Validation
   * Checks whether the pen can safely accommodate `requiredBirdCount`.
   * When moving an existing batch, pass `excludeBatchId` so its previous occupancy is excluded.
   */
  async validatePenCapacity(penIdentifier, requiredBirdCount, excludeBatchId = null) {
    const count = Number(requiredBirdCount);
    if (isNaN(count) || count < 0) {
      return {
        valid: false,
        message: 'Bird count must be a non-negative number.',
        availableCapacity: 0,
      };
    }

    const pen = await this.resolvePen(penIdentifier);
    if (!pen) {
      return {
        valid: false,
        message: `Specified Poultry House/Pen "${penIdentifier}" was not found.`,
        availableCapacity: 0,
      };
    }

    // Prevent placement in closed or maintenance pens
    if (pen.status === 'Maintenance') {
      return {
        valid: false,
        message: `Pen "${pen.name}" (${pen.penId}) is currently under Maintenance and cannot accept bird placements.`,
        availableCapacity: 0,
        pen,
      };
    }

    if (pen.status === 'Closed') {
      return {
        valid: false,
        message: `Pen "${pen.name}" (${pen.penId}) is Closed and unavailable for placement.`,
        availableCapacity: 0,
        pen,
      };
    }

    const occupancy = await this.calculatePenOccupancy(pen, excludeBatchId);

    if (count > occupancy.availableCapacity) {
      return {
        valid: false,
        pen,
        capacity: occupancy.capacity,
        occupiedCount: occupancy.occupiedCount,
        availableCapacity: occupancy.availableCapacity,
        requiredCount: count,
        message: `Pen "${pen.name}" (${pen.penId}) has a capacity of ${occupancy.capacity.toLocaleString()} birds. Currently occupied by ${occupancy.occupiedCount.toLocaleString()} birds. Remaining available space is ${occupancy.availableCapacity.toLocaleString()} birds, which cannot accommodate ${count.toLocaleString()} birds.`,
      };
    }

    return {
      valid: true,
      pen,
      capacity: occupancy.capacity,
      occupiedCount: occupancy.occupiedCount,
      availableCapacity: occupancy.availableCapacity,
      requiredCount: count,
      message: `Capacity check passed: ${count.toLocaleString()} birds fits within available space of ${occupancy.availableCapacity.toLocaleString()} birds.`,
    };
  },

  /**
   * Register a new Pen
   */
  async createPen(data) {
    if (!data.name || !data.name.trim()) {
      throw new Error('Pen / House Name is required.');
    }
    const capacity = Number(data.capacity);
    if (isNaN(capacity) || capacity <= 0) {
      throw new Error('Pen Capacity must be a positive integer greater than zero.');
    }
    if (!data.type || !PEN_TYPES.includes(data.type)) {
      throw new Error(`Valid Pen Type is required (${PEN_TYPES.join(', ')}).`);
    }

    const status = data.status && PEN_STATUSES.includes(data.status) ? data.status : 'Available';

    // Auto-generate or validate Pen ID
    let penId = data.penId && data.penId.trim()
      ? data.penId.trim().toUpperCase()
      : await this.generateNextPenId();

    const isAvailable = await this.checkPenIdAvailable(penId);
    if (!isAvailable) {
      throw new Error(`Pen ID "${penId}" already exists. Pen IDs must be unique.`);
    }

    const newPen = {
      penId,
      name: data.name.trim(),
      type: data.type,
      capacity: Math.floor(capacity),
      location: data.location ? data.location.trim() : '',
      status,
      notes: data.notes ? data.notes.trim() : '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const insertedId = await db.pens.add(newPen);

    // Update persistent sequence high-water mark in farmSettings
    try {
      const match = penId.match(/PEN-(\d+)/i);
      const seqVal = match && match[1] ? parseInt(match[1], 10) : 0;
      if (seqVal > 0) {
        const currentSetting = await db.farmSettings.get('last_pen_seq');
        const currentMax = currentSetting && typeof currentSetting.value === 'number' ? currentSetting.value : 0;
        if (seqVal > currentMax) {
          await db.farmSettings.put({
            key: 'last_pen_seq',
            value: seqVal,
            updatedAt: new Date().toISOString(),
          });
        }
      }
    } catch (seqErr) {
      console.warn('Could not record last_pen_seq:', seqErr);
    }

    return { ...newPen, id: insertedId };
  },

  /**
   * Update an existing Pen record
   */
  async updatePen(id, data) {
    const existing = await this.resolvePen(id);
    if (!existing) {
      throw new Error(`Pen record #${id} not found.`);
    }
    const numId = existing.id;

    // Validate capacity
    let newCapacity = existing.capacity;
    if (data.capacity !== undefined) {
      const parsedCap = Number(data.capacity);
      if (isNaN(parsedCap) || parsedCap <= 0) {
        throw new Error('Pen Capacity must be a positive number greater than zero.');
      }
      newCapacity = Math.floor(parsedCap);

      // Verify new capacity is not lower than currently occupied count
      const occupancy = await this.calculatePenOccupancy(existing);
      if (newCapacity < occupancy.occupiedCount) {
        throw new Error(
          `Cannot reduce pen capacity to ${newCapacity.toLocaleString()} birds because it currently houses ${occupancy.occupiedCount.toLocaleString()} birds across active batches. Reassign batches before lowering capacity.`
        );
      }
    }

    // Validate Pen ID if modified
    let newPenId = existing.penId;
    if (data.penId && data.penId.trim() && data.penId.trim().toUpperCase() !== existing.penId) {
      const targetPenId = data.penId.trim().toUpperCase();
      const isAvailable = await this.checkPenIdAvailable(targetPenId, numId);
      if (!isAvailable) {
        throw new Error(`Pen ID "${targetPenId}" is already assigned to another pen.`);
      }
      newPenId = targetPenId;
    }

    const updates = {
      penId: newPenId,
      name: data.name !== undefined ? data.name.trim() : existing.name,
      type: data.type || existing.type,
      capacity: newCapacity,
      location: data.location !== undefined ? data.location.trim() : existing.location,
      status: data.status || existing.status,
      notes: data.notes !== undefined ? data.notes.trim() : existing.notes,
      updatedAt: new Date().toISOString(),
    };

    await db.pens.update(numId, updates);
    return { ...existing, ...updates, id: numId };
  },

  /**
   * Delete Pen with strict batch occupancy guard
   */
  async deletePen(id) {
    const existing = await this.resolvePen(id);
    if (!existing) {
      throw new Error(`Pen record #${id} does not exist.`);
    }

    // Check if any active batches occupy this pen
    const occupancy = await this.calculatePenOccupancy(existing);
    if (occupancy.assignedBatches && occupancy.assignedBatches.length > 0) {
      const batchList = occupancy.assignedBatches.map((b) => b.batchId || b.batchCode || `#${b.id}`).join(', ');
      throw new Error(
        `Cannot delete Pen "${existing.name}" (${existing.penId}): It currently houses ${occupancy.assignedBatches.length} active/planned batch(es) (${batchList}) totaling ${occupancy.occupiedCount.toLocaleString()} birds. Reassign these batches before deleting this pen.`
      );
    }

    await db.pens.delete(existing.id);
    return true;
  },

  /**
   * Query pens with dynamic capacity, occupancy, and assigned batches
   */
  async getPens({
    search = '',
    type = 'all',
    status = 'all',
    sortBy = 'penId',
    sortOrder = 'asc',
  } = {}) {
    try {
      await this.seedDefaultPensIfEmpty();

      const [allPens, allBatches] = await Promise.all([
        db.pens.toArray(),
        db.batches.toArray(),
      ]);

      // Active batches map by pen identifier
      const activeBatches = allBatches.filter(
        (b) => b.status !== 'Completed' && b.status !== 'Archived'
      );

      const searchLower = search.trim().toLowerCase();

      // Deduplicate pens by penId
      const seenPenCodes = new Set();
      const uniquePens = [];
      allPens.forEach((p) => {
        const code = (p.penId || '').trim().toUpperCase();
        if (!code || !seenPenCodes.has(code)) {
          if (code) seenPenCodes.add(code);
          uniquePens.push(p);
        }
      });

      // Enrich pens with dynamic occupancy
      const enrichedPens = uniquePens.map((pen) => {
        const assigned = activeBatches.filter((b) => {
          const matchesPenId = b.penId && (String(b.penId) === String(pen.penId) || Number(b.penId) === Number(pen.id));
          const matchesHouseId = b.houseId && (
            String(b.houseId).trim().toLowerCase() === String(pen.name).trim().toLowerCase() ||
            String(b.houseId).trim().toLowerCase() === String(pen.penId).trim().toLowerCase()
          );
          return matchesPenId || matchesHouseId;
        });

        const occupiedCount = assigned.reduce((sum, b) => {
          const count = Number(b.currentCount !== undefined && b.currentCount !== null ? b.currentCount : b.initialCount) || 0;
          return sum + Math.max(0, count);
        }, 0);

        const capacity = Math.max(0, Number(pen.capacity) || 0);
        const availableCapacity = Math.max(0, capacity - occupiedCount);
        const occupancyPercentage = capacity > 0 ? Math.min(100, Math.round((occupiedCount / capacity) * 100)) : 0;

        // Dynamic status reflection
        let displayStatus = pen.status;
        if (pen.status !== 'Maintenance' && pen.status !== 'Closed') {
          if (occupiedCount >= capacity) {
            displayStatus = 'Occupied';
          } else if (occupiedCount > 0) {
            displayStatus = 'Occupied';
          } else {
            displayStatus = 'Available';
          }
        }

        return {
          ...pen,
          occupiedCount,
          availableCapacity,
          occupancyPercentage,
          displayStatus,
          assignedBatches: assigned,
          batchCount: assigned.length,
        };
      });

      // Filter
      let filtered = enrichedPens.filter((p) => {
        if (searchLower) {
          const matchId = (p.penId || '').toLowerCase().includes(searchLower);
          const matchName = (p.name || '').toLowerCase().includes(searchLower);
          const matchLoc = (p.location || '').toLowerCase().includes(searchLower);
          const matchType = (p.type || '').toLowerCase().includes(searchLower);
          if (!matchId && !matchName && !matchLoc && !matchType) return false;
        }

        if (type !== 'all' && p.type !== type) return false;
        if (status !== 'all') {
          if (status === 'Available' && p.displayStatus !== 'Available') return false;
          if (status === 'Occupied' && p.displayStatus !== 'Occupied') return false;
          if (status === 'Maintenance' && p.status !== 'Maintenance') return false;
          if (status === 'Closed' && p.status !== 'Closed') return false;
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

      return filtered;
    } catch (err) {
      console.error('Error fetching pens:', err);
      return [];
    }
  },

  /**
   * Get single Pen with full occupancy and assigned batches breakdown
   */
  async getPenById(id) {
    const pen = await this.resolvePen(id);
    if (!pen) return null;

    const occupancy = await this.calculatePenOccupancy(pen);
    return {
      ...pen,
      ...occupancy,
    };
  },

  /**
   * Get overall housing statistics for dashboard and pen overview
   */
  async getPenStats() {
    try {
      await this.seedDefaultPensIfEmpty();
      const pens = await this.getPens();

      const totalPens = pens.length;
      let availablePens = 0;
      let occupiedPens = 0;
      let maintenancePens = 0;
      let totalCapacity = 0;
      let totalOccupied = 0;

      pens.forEach((p) => {
        totalCapacity += p.capacity;
        totalOccupied += p.occupiedCount;

        if (p.status === 'Maintenance' || p.status === 'Closed') {
          maintenancePens++;
        } else if (p.occupiedCount > 0) {
          occupiedPens++;
        } else {
          availablePens++;
        }
      });

      const availableCapacity = Math.max(0, totalCapacity - totalOccupied);
      const overallOccupancyPct = totalCapacity > 0 ? Math.min(100, Math.round((totalOccupied / totalCapacity) * 100)) : 0;

      return {
        totalPens,
        availablePens,
        occupiedPens,
        maintenancePens,
        totalCapacity,
        totalOccupied,
        availableCapacity,
        overallOccupancyPct,
      };
    } catch (err) {
      console.error('Error calculating pen statistics:', err);
      return {
        totalPens: 0,
        availablePens: 0,
        occupiedPens: 0,
        maintenancePens: 0,
        totalCapacity: 0,
        totalOccupied: 0,
        availableCapacity: 0,
        overallOccupancyPct: 0,
      };
    }
  },
};
