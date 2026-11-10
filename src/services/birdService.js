import { db } from '../database/db.js';

/**
 * Bird Types allowed in FreshNest
 */
export const BIRD_TYPES = [
  'Broiler',
  'Layer',
  'Cockerel',
  'Pullet',
  'Chick',
  'Breeder',
  'Other',
];

/**
 * Genders
 */
export const BIRD_GENDERS = ['Female', 'Male', 'Unknown'];

/**
 * Bird Health / Lifecycle Statuses
 */
export const BIRD_STATUSES = [
  'Active',
  'Sick',
  'Quarantined',
  'Sold',
  'Dead',
];

/**
 * Popular Breeds for quick selection
 */
export const POPULAR_BREEDS = [
  'Isa Brown',
  'Lohmann Brown',
  'Cobb 500',
  'Ross 308',
  'Black Australorp',
  'Noiler',
  'Rhode Island Red',
  'Light Sussex',
  'ShikaBrown',
  'Indigenous / Local',
  'Silkie',
  'Bovans Brown',
];

/**
 * Standard House / Pen suggestions
 */
export const DEFAULT_HOUSES = [
  'Pen 1',
  'Pen 2',
  'Pen 3',
  'House A',
  'House B',
  'Brooder Room',
  'Quarantine Bay',
  'Breeder Unit',
];

/**
 * FreshNest Bird Management Service
 * Encapsulates all CRUD, tag validation, auto-ID generation,
 * batch linking, and distinct statistics for individual bird records.
 */
export const birdService = {
  /**
   * Automatically generate the next sequential Bird ID (e.g. BRD-0001)
   * Uses persistent high-water mark sequence in farmSettings to ensure
   * deleting birds never rewinds or duplicates an existing/historical ID.
   */
  async generateNextBirdId() {
    try {
      // 1. Fetch persistent sequence counter from farmSettings
      let settingSeq = 0;
      try {
        const setting = await db.farmSettings.get('last_bird_seq');
        if (setting && typeof setting.value === 'number') {
          settingSeq = setting.value;
        }
      } catch {
        // Fallback if settings table not yet populated
      }

      // 2. Also check current birds table to ensure sequence is never lower than any existing record
      const birds = await db.birds.toArray();
      let maxNumber = settingSeq;

      birds.forEach((b) => {
        if (b.birdId) {
          const match = b.birdId.match(/BRD-(\d+)/i);
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
      return `BRD-${String(nextNum).padStart(4, '0')}`;
    } catch (err) {
      console.error('Error generating bird ID:', err);
      return `BRD-0001`;
    }
  },

  /**
   * Check if a Tag Number is unique across all birds (case-insensitive)
   * @param {string} tagNumber
   * @param {number|null} excludeId - ID of bird currently being edited
   * @returns {Promise<boolean>} - true if available, false if already in use
   */
  async checkTagNumberAvailable(tagNumber, excludeId = null) {
    if (!tagNumber || !tagNumber.trim()) {
      return true; // Optional field
    }

    const cleanTag = tagNumber.trim().toLowerCase();
    const existing = await db.birds
      .filter((b) => {
        if (!b.tagNumber || !b.tagNumber.trim()) return false;
        const matches = b.tagNumber.trim().toLowerCase() === cleanTag;
        if (!matches) return false;
        if (excludeId !== null && excludeId !== undefined) {
          return Number(b.id) !== Number(excludeId);
        }
        return true;
      })
      .first();

    return !existing;
  },

  /**
   * Register a new individual bird
   */
  async createBird(data) {
    // 1. Validation
    if (!data.type || !BIRD_TYPES.includes(data.type)) {
      throw new Error(`Valid Bird Type is required (${BIRD_TYPES.join(', ')}).`);
    }
    if (!data.breed || !data.breed.trim()) {
      throw new Error('Breed is required.');
    }
    if (!data.gender || !BIRD_GENDERS.includes(data.gender)) {
      throw new Error('Gender is required (Female, Male, or Unknown).');
    }
    if (!data.status || !BIRD_STATUSES.includes(data.status)) {
      throw new Error('Valid Bird Status is required.');
    }
    if (!data.houseNumber || !data.houseNumber.trim()) {
      throw new Error('Poultry House or Pen is required.');
    }

    // Tag Number Uniqueness Validation
    const cleanTag = data.tagNumber && data.tagNumber.trim() ? data.tagNumber.trim() : null;
    if (cleanTag) {
      const isAvailable = await this.checkTagNumberAvailable(cleanTag);
      if (!isAvailable) {
        throw new Error(`Tag Number "${cleanTag}" is already assigned to another bird.`);
      }
    }

    // Auto-generate Bird ID if not provided
    const birdId = data.birdId && data.birdId.trim()
      ? data.birdId.trim().toUpperCase()
      : await this.generateNextBirdId();

    // Verify Bird ID uniqueness
    const existingId = await db.birds.where('birdId').equalsIgnoreCase(birdId).first();
    if (existingId) {
      throw new Error(`Bird ID "${birdId}" already exists. Bird IDs must be unique.`);
    }

    // Clean data payload
    const newBird = {
      birdId,
      tagNumber: cleanTag,
      name: data.name ? data.name.trim() : '',
      type: data.type,
      breed: data.breed.trim(),
      gender: data.gender,
      hatchDate: data.hatchDate || null,
      acquisitionDate: data.acquisitionDate || new Date().toISOString().slice(0, 10),
      source: data.source ? data.source.trim() : 'Farm Raised / Hatched',
      purchasePrice: Math.max(0, parseFloat(data.purchasePrice) || 0),
      status: data.status,
      batchId: data.batchId ? Number(data.batchId) : null,
      houseNumber: data.houseNumber.trim(),
      notes: data.notes ? data.notes.trim() : '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const insertedId = await db.birds.add(newBird);

    // Update persistent sequence high-water mark in farmSettings
    try {
      const match = birdId.match(/BRD-(\d+)/i);
      const seqVal = match && match[1] ? parseInt(match[1], 10) : 0;
      if (seqVal > 0) {
        const currentSetting = await db.farmSettings.get('last_bird_seq');
        const currentMax = currentSetting && typeof currentSetting.value === 'number' ? currentSetting.value : 0;
        if (seqVal > currentMax) {
          await db.farmSettings.put({
            key: 'last_bird_seq',
            value: seqVal,
            updatedAt: new Date().toISOString(),
          });
        }
      }
    } catch (seqErr) {
      console.warn('Could not record last_bird_seq:', seqErr);
    }

    return { ...newBird, id: insertedId };
  },

  /**
   * Update an existing bird record
   */
  async updateBird(id, data) {
    const numId = Number(id);
    const existing = await db.birds.get(numId);
    if (!existing) {
      throw new Error(`Bird record #${id} not found.`);
    }

    // Tag Number Uniqueness Validation
    const cleanTag = data.tagNumber !== undefined
      ? (data.tagNumber && data.tagNumber.trim() ? data.tagNumber.trim() : null)
      : existing.tagNumber;

    if (cleanTag && cleanTag !== existing.tagNumber) {
      const isAvailable = await this.checkTagNumberAvailable(cleanTag, numId);
      if (!isAvailable) {
        throw new Error(`Tag Number "${cleanTag}" is already assigned to another bird.`);
      }
    }

    // Bird ID uniqueness if modified
    if (data.birdId && data.birdId.trim() && data.birdId.trim().toUpperCase() !== existing.birdId) {
      const targetBirdId = data.birdId.trim().toUpperCase();
      const duplicate = await db.birds.where('birdId').equalsIgnoreCase(targetBirdId).first();
      if (duplicate && Number(duplicate.id) !== numId) {
        throw new Error(`Bird ID "${targetBirdId}" is already assigned to another bird.`);
      }
    }

    const updates = {
      birdId: data.birdId && data.birdId.trim() ? data.birdId.trim().toUpperCase() : existing.birdId,
      tagNumber: cleanTag,
      name: data.name !== undefined ? data.name.trim() : existing.name,
      type: data.type || existing.type,
      breed: data.breed ? data.breed.trim() : existing.breed,
      gender: data.gender || existing.gender,
      hatchDate: data.hatchDate !== undefined ? (data.hatchDate || null) : existing.hatchDate,
      acquisitionDate: data.acquisitionDate || existing.acquisitionDate,
      source: data.source !== undefined ? data.source.trim() : existing.source,
      purchasePrice: data.purchasePrice !== undefined ? Math.max(0, parseFloat(data.purchasePrice) || 0) : existing.purchasePrice,
      status: data.status || existing.status,
      batchId: data.batchId !== undefined ? (data.batchId ? Number(data.batchId) : null) : existing.batchId,
      houseNumber: data.houseNumber ? data.houseNumber.trim() : existing.houseNumber,
      notes: data.notes !== undefined ? data.notes.trim() : existing.notes,
      updatedAt: new Date().toISOString(),
    };

    await db.birds.update(numId, updates);
    return { ...existing, ...updates, id: numId };
  },

  /**
   * Delete a bird record permanently
   */
  async deleteBird(id) {
    const numId = Number(id);
    const existing = await db.birds.get(numId);
    if (!existing) {
      throw new Error(`Bird record #${id} does not exist.`);
    }
    await db.birds.delete(numId);
    return true;
  },

  /**
   * Get single bird by ID with batch details
   */
  async getBirdById(id) {
    let bird = null;
    if (typeof id === 'number' || !isNaN(Number(id))) {
      bird = await db.birds.get(Number(id));
    }
    if (!bird && typeof id === 'string') {
      bird = await db.birds.where('birdId').equalsIgnoreCase(id.trim()).first();
    }
    if (!bird) return null;

    let batch = null;
    if (bird.batchId) {
      batch = await db.batches.get(Number(bird.batchId));
    }

    return {
      ...bird,
      batchCode: batch ? batch.batchCode || `Batch #${batch.id}` : null,
      batchDetails: batch,
    };
  },

  /**
   * Get 6 core metrics for Bird Management Dashboard
   */
  async getBirdStats() {
    try {
      const birds = await db.birds.toArray();

      const total = birds.length;
      let active = 0;
      let sick = 0;
      let quarantined = 0;
      let sold = 0;
      let dead = 0;
      let standalone = 0;
      let batchAssigned = 0;

      birds.forEach((b) => {
        if (b.status === 'Active') active++;
        else if (b.status === 'Sick') sick++;
        else if (b.status === 'Quarantined') quarantined++;
        else if (b.status === 'Sold') sold++;
        else if (b.status === 'Dead') dead++;
        else active++; // Default fallback

        if (b.batchId) {
          batchAssigned++;
        } else {
          standalone++;
        }
      });

      return {
        total,
        active,
        sick,
        quarantined,
        sold,
        dead,
        standalone,
        batchAssigned,
      };
    } catch (err) {
      console.error('Error fetching bird statistics:', err);
      return {
        total: 0,
        active: 0,
        sick: 0,
        quarantined: 0,
        sold: 0,
        dead: 0,
        standalone: 0,
        batchAssigned: 0,
      };
    }
  },

  /**
   * Filtered, searched, sorted, and paginated query for bird records
   */
  async getBirds({
    search = '',
    type = 'all',
    gender = 'all',
    status = 'all',
    batchId = 'all',
    houseNumber = 'all',
    sortBy = 'id',
    sortOrder = 'desc',
    page = 1,
    pageSize = 10,
  } = {}) {
    try {
      const [allBirds, batches] = await Promise.all([
        db.birds.toArray(),
        db.batches.toArray(),
      ]);

      const batchMap = {};
      batches.forEach((b) => {
        batchMap[b.id] = b.batchCode || `Batch #${b.id}`;
      });

      // Filter
      const searchLower = search.trim().toLowerCase();
      let filtered = allBirds.filter((bird) => {
        // Search across Bird ID, Tag Number, Name, Breed, Source
        if (searchLower) {
          const matchId = (bird.birdId || '').toLowerCase().includes(searchLower);
          const matchTag = (bird.tagNumber || '').toLowerCase().includes(searchLower);
          const matchName = (bird.name || '').toLowerCase().includes(searchLower);
          const matchBreed = (bird.breed || '').toLowerCase().includes(searchLower);
          const matchSource = (bird.source || '').toLowerCase().includes(searchLower);
          const matchHouse = (bird.houseNumber || '').toLowerCase().includes(searchLower);
          if (!matchId && !matchTag && !matchName && !matchBreed && !matchSource && !matchHouse) {
            return false;
          }
        }

        // Type filter
        if (type !== 'all' && bird.type !== type) {
          return false;
        }

        // Gender filter
        if (gender !== 'all' && bird.gender !== gender) {
          return false;
        }

        // Status filter
        if (status !== 'all' && bird.status !== status) {
          return false;
        }

        // Batch filter
        if (batchId === 'standalone') {
          if (bird.batchId) return false;
        } else if (batchId !== 'all') {
          if (String(bird.batchId) !== String(batchId)) return false;
        }

        // House filter
        if (houseNumber !== 'all' && bird.houseNumber !== houseNumber) {
          return false;
        }

        return true;
      });

      // Sort
      filtered.sort((a, b) => {
        let valA = a[sortBy];
        let valB = b[sortBy];

        if (sortBy === 'batch') {
          valA = a.batchId ? (batchMap[a.batchId] || '') : '';
          valB = b.batchId ? (batchMap[b.batchId] || '') : '';
        }

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
      const paginatedItems = filtered.slice(startIndex, startIndex + limit).map((b) => ({
        ...b,
        batchCode: b.batchId ? (batchMap[b.batchId] || `Batch #${b.batchId}`) : null,
      }));

      return {
        items: paginatedItems,
        total,
        page: safePage,
        pageSize: limit,
        totalPages,
      };
    } catch (err) {
      console.error('Error querying bird records:', err);
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
   * Get available active batches for selection dropdown
   */
  async getAvailableBatches() {
    try {
      const batches = await db.batches.toArray();
      return batches.map((b) => ({
        id: b.id,
        batchCode: b.batchCode || `Batch #${b.id}`,
        birdType: b.birdType,
        status: b.status || 'Active',
      }));
    } catch (err) {
      console.error('Error fetching available batches:', err);
      return [];
    }
  },

  /**
   * Get distinct houses from birds & batches
   */
  async getDistinctHouses() {
    try {
      const housesSet = new Set(DEFAULT_HOUSES);
      const [birds, batches, pens] = await Promise.all([
        db.birds.toArray(),
        db.batches.toArray(),
        db.pens ? db.pens.toArray() : Promise.resolve([]),
      ]);

      pens.forEach((p) => {
        if (p.name && p.name.trim()) housesSet.add(p.name.trim());
        if (p.penId && p.penId.trim()) housesSet.add(p.penId.trim());
      });

      birds.forEach((b) => {
        if (b.houseNumber && b.houseNumber.trim()) {
          housesSet.add(b.houseNumber.trim());
        }
      });

      batches.forEach((b) => {
        if (b.houseId && b.houseId.trim()) {
          housesSet.add(b.houseId.trim());
        }
        if (b.penId && b.penId.trim()) {
          housesSet.add(b.penId.trim());
        }
      });

      return Array.from(housesSet);
    } catch (err) {
      console.error('Error fetching distinct houses:', err);
      return DEFAULT_HOUSES;
    }
  },

  /**
   * Calculate bird age in human readable format (days, weeks, months)
   */
  calculateAge(hatchDate) {
    if (!hatchDate) return 'Age unknown';
    const hatch = new Date(hatchDate);
    if (isNaN(hatch.getTime())) return 'Age unknown';

    const now = new Date();
    const diffMs = now - hatch;
    if (diffMs < 0) return 'Future hatch date';

    const totalDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (totalDays === 0) return 'Hatched today';
    if (totalDays < 7) return `${totalDays} day${totalDays > 1 ? 's' : ''}`;

    const weeks = Math.floor(totalDays / 7);
    const remDays = totalDays % 7;
    if (weeks < 12) {
      return remDays > 0 ? `${weeks} wk${weeks > 1 ? 's' : ''}, ${remDays} d` : `${weeks} weeks`;
    }

    const months = Math.floor(totalDays / 30.4375);
    return `${months} month${months > 1 ? 's' : ''} (${weeks} wks)`;
  },
};
