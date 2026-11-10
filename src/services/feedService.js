import { db } from '../database/db.js';

/**
 * Feed Product Types
 */
export const FEED_TYPES = [
  'Chick Starter',
  'Broiler Starter',
  'Broiler Finisher',
  'Layer Starter',
  'Grower Mash',
  'Layer Mash',
  'Breeder Feed',
  'Scratch Feed',
  'Other',
];

/**
 * Physical Feed Forms
 */
export const FEED_FORMS = ['Mash', 'Pellets', 'Crumbles', 'Other'];

/**
 * Supported Measurement Units
 */
export const FEED_UNITS = ['kg', 'bag', 'ton'];

/**
 * Inventory Stock Statuses
 */
export const FEED_STATUSES = ['In Stock', 'Low Stock', 'Out of Stock', 'Expired'];

/**
 * Feeding Sessions
 */
export const FEEDING_SESSIONS = ['Morning', 'Afternoon', 'Evening', 'Ad-libitum'];

/**
 * Target Bird Categories
 */
export const TARGET_BIRD_TYPES = [
  'Broiler',
  'Layer',
  'Cockerel',
  'Pullet',
  'Chick',
  'Breeder',
  'All Birds',
  'Other',
];

/**
 * Initial Feed Inventory Seed Data
 */
export const INITIAL_FEEDS = [
  {
    feedId: 'FEED-0001',
    name: 'Vital Broiler Starter Crumbles',
    type: 'Broiler Starter',
    brand: 'Vital Feed',
    form: 'Crumbles',
    unit: 'kg',
    currentStock: 850,
    reorderLevel: 200,
    unitCost: 650,
    targetBirdType: 'Broiler',
    crudeProtein: '22%',
    energyKcal: '3050',
    expiryDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    storageLocation: 'Silo A - Broiler Feed Bay',
    status: 'In Stock',
    supplier: 'Vital Feeds Agro Mills Ltd',
    notes: 'High-protein pre-starter crumbles for day-old chicks up to 14 days.',
  },
  {
    feedId: 'FEED-0002',
    name: 'TopFeed Layer Mash Phase 1',
    type: 'Layer Mash',
    brand: 'TopFeed',
    form: 'Mash',
    unit: 'kg',
    currentStock: 1450,
    reorderLevel: 250,
    unitCost: 580,
    targetBirdType: 'Layer',
    crudeProtein: '17.5%',
    energyKcal: '2750',
    expiryDate: new Date(Date.now() + 240 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    storageLocation: 'Silo B - Layer Bulk Store',
    status: 'In Stock',
    supplier: 'TopFeed Agro Industrial',
    notes: 'Formulated with fortified calcium (3.8%) and phosphorus for strong eggshells.',
  },
  {
    feedId: 'FEED-0003',
    name: 'Animal Care Chick Starter Mash',
    type: 'Chick Starter',
    brand: 'Animal Care',
    form: 'Mash',
    unit: 'kg',
    currentStock: 380,
    reorderLevel: 150,
    unitCost: 620,
    targetBirdType: 'Chick',
    crudeProtein: '20%',
    energyKcal: '2950',
    expiryDate: new Date(Date.now() + 150 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    storageLocation: 'Store 1 - North Rearing Wing',
    status: 'In Stock',
    supplier: 'Animal Care Konsult',
    notes: 'Contains coccidiostat and essential amino acids for early gut development.',
  },
  {
    feedId: 'FEED-0004',
    name: 'Chikun Grower Mash Fortified',
    type: 'Grower Mash',
    brand: 'Chikun',
    form: 'Mash',
    unit: 'kg',
    currentStock: 600,
    reorderLevel: 120,
    unitCost: 540,
    targetBirdType: 'Pullet',
    crudeProtein: '16%',
    energyKcal: '2800',
    expiryDate: new Date(Date.now() + 210 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    storageLocation: 'Store 2 - Central Rearing Shed',
    status: 'In Stock',
    supplier: 'Chikun Feeds Nig Ltd',
    notes: 'Optimum frame development feed for replacement pullets aged 9–18 weeks.',
  },
  {
    feedId: 'FEED-0005',
    name: 'Ultima Broiler Finisher Pellets',
    type: 'Broiler Finisher',
    brand: 'Ultima',
    form: 'Pellets',
    unit: 'kg',
    currentStock: 1100,
    reorderLevel: 200,
    unitCost: 610,
    targetBirdType: 'Broiler',
    crudeProtein: '19%',
    energyKcal: '3150',
    expiryDate: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    storageLocation: 'Silo C - South Sector',
    status: 'In Stock',
    supplier: 'Ultima Feeds Corporation',
    notes: 'High metabolisable energy pellets for rapid market weight gain and carcass quality.',
  },
  {
    feedId: 'FEED-0006',
    name: 'Premier Breeder Diet Pellets',
    type: 'Breeder Feed',
    brand: 'Premier',
    form: 'Pellets',
    unit: 'kg',
    currentStock: 75,
    reorderLevel: 100,
    unitCost: 720,
    targetBirdType: 'Breeder',
    crudeProtein: '18%',
    energyKcal: '2900',
    expiryDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    storageLocation: 'Store 1 - Biosecure Vault',
    status: 'Low Stock',
    supplier: 'Premier Agro Allied',
    notes: 'Enhanced selenium and vitamin E for rooster fertility and hatchability.',
  },
];

/**
 * Compute the authoritative status of a feed item
 */
export function computeFeedStatus(currentStock, reorderLevel, expiryDate) {
  const stock = Number(currentStock) || 0;
  const threshold = Number(reorderLevel) || 0;

  if (expiryDate) {
    const today = new Date().toISOString().slice(0, 10);
    if (expiryDate < today) {
      return 'Expired';
    }
  }

  if (stock <= 0) {
    return 'Out of Stock';
  }

  if (stock <= threshold) {
    return 'Low Stock';
  }

  return 'In Stock';
}

/**
 * FreshNest Feed Management Service
 * Full stock inventory management, stock-in purchases, stock-out feeding logs,
 * safe atomic transactions, and negative-stock prevention.
 */
export const feedService = {
  /**
   * Seed baseline feed catalog if feeds table is empty
   */
  async seedInitialFeedsIfEmpty() {
    try {
      const count = await db.feeds.count();
      if (count === 0) {
        for (const feed of INITIAL_FEEDS) {
          const status = computeFeedStatus(feed.currentStock, feed.reorderLevel, feed.expiryDate);
          await db.feeds.add({
            ...feed,
            status,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        }
        await db.farmSettings.put({
          key: 'last_feed_seq',
          value: INITIAL_FEEDS.length,
          updatedAt: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.error('Error seeding initial feeds:', err);
    }
  },

  /**
   * Automatically generate the next sequential Feed ID (e.g. FEED-0001)
   * Uses persistent high-water mark sequence in farmSettings
   */
  async generateNextFeedId() {
    try {
      let settingSeq = 0;
      try {
        const setting = await db.farmSettings.get('last_feed_seq');
        if (setting && typeof setting.value === 'number') {
          settingSeq = setting.value;
        }
      } catch {
        // Fallback
      }

      const feeds = await db.feeds.toArray();
      let maxNumber = settingSeq;

      feeds.forEach((f) => {
        const code = f.feedId || f.code;
        if (code) {
          const match = code.match(/FEED-(\d+)/i);
          if (match && match[1]) {
            const num = parseInt(match[1], 10);
            if (!isNaN(num) && num > maxNumber) {
              maxNumber = num;
            }
          }
        } else if (f.id && typeof f.id === 'number' && f.id > maxNumber) {
          maxNumber = f.id;
        }
      });

      const nextNum = maxNumber + 1;
      return `FEED-${String(nextNum).padStart(4, '0')}`;
    } catch (err) {
      console.error('Error generating feed ID:', err);
      return 'FEED-0001';
    }
  },

  /**
   * Automatically generate the next sequential Feed Purchase ID (e.g. FPUR-0001)
   */
  async generateNextPurchaseId() {
    try {
      let settingSeq = 0;
      try {
        const setting = await db.farmSettings.get('last_feed_purchase_seq');
        if (setting && typeof setting.value === 'number') {
          settingSeq = setting.value;
        }
      } catch {
        // Fallback
      }

      const purchases = await db.feedPurchases.toArray();
      let maxNumber = settingSeq;

      purchases.forEach((p) => {
        const code = p.purchaseId;
        if (code) {
          const match = code.match(/FPUR-(\d+)/i) || code.match(/PUR-(\d+)/i);
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
      return `FPUR-${String(nextNum).padStart(4, '0')}`;
    } catch (err) {
      console.error('Error generating feed purchase ID:', err);
      return 'FPUR-0001';
    }
  },

  /**
   * Automatically generate the next sequential Feed Log ID (e.g. FLOG-0001)
   */
  async generateNextFeedLogId() {
    try {
      let settingSeq = 0;
      try {
        const setting = await db.farmSettings.get('last_feed_log_seq');
        if (setting && typeof setting.value === 'number') {
          settingSeq = setting.value;
        }
      } catch {
        // Fallback
      }

      const logs = await db.feedLogs.toArray();
      let maxNumber = settingSeq;

      logs.forEach((l) => {
        const code = l.logId;
        if (code) {
          const match = code.match(/FLOG-(\d+)/i);
          if (match && match[1]) {
            const num = parseInt(match[1], 10);
            if (!isNaN(num) && num > maxNumber) {
              maxNumber = num;
            }
          }
        } else if (l.id && typeof l.id === 'number' && l.id > maxNumber) {
          maxNumber = l.id;
        }
      });

      const nextNum = maxNumber + 1;
      return `FLOG-${String(nextNum).padStart(4, '0')}`;
    } catch (err) {
      console.error('Error generating feed log ID:', err);
      return 'FLOG-0001';
    }
  },

  /**
   * Check if Feed ID is unique (case-insensitive)
   */
  async checkFeedIdAvailable(feedId, excludeId = null) {
    if (!feedId || !feedId.trim()) return false;
    const clean = feedId.trim().toUpperCase();

    const existing = await db.feeds
      .filter((f) => {
        const currentCode = (f.feedId || '').trim().toUpperCase();
        if (!currentCode) return false;
        if (currentCode !== clean) return false;
        if (excludeId !== null && excludeId !== undefined) {
          return Number(f.id) !== Number(excludeId);
        }
        return true;
      })
      .first();

    return !existing;
  },

  /**
   * Create a new feed product in inventory
   */
  async createFeed(feedData) {
    const {
      name,
      type,
      brand = 'Standard Feed Mill',
      form = 'Mash',
      unit = 'kg',
      currentStock = 0,
      reorderLevel = 100,
      unitCost = 0,
      targetBirdType = 'All Birds',
      crudeProtein = '',
      energyKcal = '',
      expiryDate = '',
      storageLocation = 'Main Feed Store',
      supplier = '',
      notes = '',
    } = feedData;

    // Validation
    if (!name || !name.trim()) {
      throw new Error('Feed Name is required.');
    }
    if (!type || !type.trim()) {
      throw new Error('Feed Type is required.');
    }

    const numStock = Number(currentStock);
    if (isNaN(numStock) || numStock < 0) {
      throw new Error('Initial stock quantity cannot be negative.');
    }

    const numReorder = Number(reorderLevel);
    if (isNaN(numReorder) || numReorder < 0) {
      throw new Error('Reorder level cannot be negative.');
    }

    const numUnitCost = Number(unitCost);
    if (isNaN(numUnitCost) || numUnitCost < 0) {
      throw new Error('Unit cost cannot be negative.');
    }

    // Generate or validate Feed ID
    let finalFeedId = feedData.feedId ? feedData.feedId.trim().toUpperCase() : null;
    if (!finalFeedId) {
      finalFeedId = await this.generateNextFeedId();
    } else {
      const available = await this.checkFeedIdAvailable(finalFeedId);
      if (!available) {
        throw new Error(`Feed ID "${finalFeedId}" is already registered. Please choose a unique ID.`);
      }
    }

    const status = computeFeedStatus(numStock, numReorder, expiryDate);

    const record = {
      feedId: finalFeedId,
      name: name.trim(),
      type: type.trim(),
      brand: brand.trim(),
      form: form.trim(),
      unit: unit.trim().toLowerCase(),
      currentStock: numStock,
      reorderLevel: numReorder,
      unitCost: numUnitCost,
      targetBirdType: targetBirdType.trim(),
      crudeProtein: crudeProtein ? String(crudeProtein).trim() : '',
      energyKcal: energyKcal ? String(energyKcal).trim() : '',
      expiryDate: expiryDate ? expiryDate.trim() : '',
      storageLocation: storageLocation ? storageLocation.trim() : '',
      supplier: supplier ? supplier.trim() : '',
      status,
      notes: notes ? notes.trim() : '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const newId = await db.feeds.add(record);

    // Update persistent sequence high-water mark
    const match = finalFeedId.match(/FEED-(\d+)/i);
    if (match && match[1]) {
      const num = parseInt(match[1], 10);
      try {
        const existingSeq = await db.farmSettings.get('last_feed_seq');
        const curr = existingSeq ? existingSeq.value : 0;
        if (num > curr) {
          await db.farmSettings.put({
            key: 'last_feed_seq',
            value: num,
            updatedAt: new Date().toISOString(),
          });
        }
      } catch {
        // Safe skip
      }
    }

    return { id: newId, ...record };
  },

  /**
   * Get all feeds with optional filters, search, sorting, and pagination
   */
  async getFeeds(filters = {}) {
    const {
      search = '',
      type = '',
      status = '',
      brand = '',
      sortBy = 'name',
      sortOrder = 'asc',
      page = 1,
      limit = 0,
    } = filters;

    // Check if empty and seed initial items
    await this.seedInitialFeedsIfEmpty();

    let collection = await db.feeds.toArray();

    // Re-verify real-time statuses (e.g. check for newly expired items)
    collection = collection.map((item) => {
      const dynamicStatus = computeFeedStatus(item.currentStock, item.reorderLevel, item.expiryDate);
      return {
        ...item,
        status: dynamicStatus,
      };
    });

    // 1. Text Search (name, feedId, brand, type, storageLocation)
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      collection = collection.filter((f) => {
        return (
          (f.name && f.name.toLowerCase().includes(q)) ||
          (f.feedId && f.feedId.toLowerCase().includes(q)) ||
          (f.brand && f.brand.toLowerCase().includes(q)) ||
          (f.type && f.type.toLowerCase().includes(q)) ||
          (f.storageLocation && f.storageLocation.toLowerCase().includes(q)) ||
          (f.supplier && f.supplier.toLowerCase().includes(q))
        );
      });
    }

    // 2. Filter by Type
    if (type && type !== 'all') {
      collection = collection.filter((f) => f.type === type);
    }

    // 3. Filter by Status
    if (status && status !== 'all') {
      collection = collection.filter((f) => f.status === status);
    }

    // 4. Filter by Brand
    if (brand && brand !== 'all') {
      collection = collection.filter((f) => f.brand === brand);
    }

    // 5. Sorting
    collection.sort((a, b) => {
      let valA = a[sortBy];
      let valB = b[sortBy];

      if (sortBy === 'currentStock' || sortBy === 'reorderLevel' || sortBy === 'unitCost') {
        valA = Number(valA) || 0;
        valB = Number(valB) || 0;
      } else {
        valA = String(valA || '').toLowerCase();
        valB = String(valB || '').toLowerCase();
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    const totalCount = collection.length;

    // 6. Pagination
    if (limit > 0) {
      const startIndex = (page - 1) * limit;
      collection = collection.slice(startIndex, startIndex + limit);
    }

    return {
      items: collection,
      totalCount,
      page,
      limit,
      totalPages: limit > 0 ? Math.ceil(totalCount / limit) : 1,
    };
  },

  /**
   * Get single feed by numeric ID or string Feed ID
   */
  async getFeedById(idOrCode) {
    if (!idOrCode) return null;

    if (typeof idOrCode === 'number' || !isNaN(Number(idOrCode))) {
      const feed = await db.feeds.get(Number(idOrCode));
      if (feed) {
        return {
          ...feed,
          status: computeFeedStatus(feed.currentStock, feed.reorderLevel, feed.expiryDate),
        };
      }
    }

    const clean = String(idOrCode).trim().toUpperCase();
    const feed = await db.feeds
      .filter((f) => (f.feedId || '').toUpperCase() === clean)
      .first();

    if (feed) {
      return {
        ...feed,
        status: computeFeedStatus(feed.currentStock, feed.reorderLevel, feed.expiryDate),
      };
    }

    return null;
  },

  /**
   * Update feed product details
   */
  async updateFeed(id, updates) {
    const existing = await db.feeds.get(Number(id));
    if (!existing) {
      throw new Error(`Feed record with ID #${id} not found.`);
    }

    // Validate unique feedId if being changed
    if (updates.feedId && updates.feedId.trim().toUpperCase() !== (existing.feedId || '').toUpperCase()) {
      const available = await this.checkFeedIdAvailable(updates.feedId, id);
      if (!available) {
        throw new Error(`Feed ID "${updates.feedId}" is already taken.`);
      }
      updates.feedId = updates.feedId.trim().toUpperCase();
    }

    if (updates.currentStock !== undefined) {
      const stock = Number(updates.currentStock);
      if (isNaN(stock) || stock < 0) {
        throw new Error('Feed stock quantity cannot be negative.');
      }
      updates.currentStock = stock;
    }

    if (updates.reorderLevel !== undefined) {
      const reorder = Number(updates.reorderLevel);
      if (isNaN(reorder) || reorder < 0) {
        throw new Error('Reorder level cannot be negative.');
      }
      updates.reorderLevel = reorder;
    }

    if (updates.unitCost !== undefined) {
      const cost = Number(updates.unitCost);
      if (isNaN(cost) || cost < 0) {
        throw new Error('Unit cost cannot be negative.');
      }
      updates.unitCost = cost;
    }

    const updatedStock = updates.currentStock !== undefined ? updates.currentStock : existing.currentStock;
    const updatedReorder = updates.reorderLevel !== undefined ? updates.reorderLevel : existing.reorderLevel;
    const updatedExpiry = updates.expiryDate !== undefined ? updates.expiryDate : existing.expiryDate;

    const dynamicStatus = computeFeedStatus(updatedStock, updatedReorder, updatedExpiry);

    const finalUpdates = {
      ...updates,
      status: dynamicStatus,
      updatedAt: new Date().toISOString(),
    };

    await db.feeds.update(Number(id), finalUpdates);
    return await db.feeds.get(Number(id));
  },

  /**
   * Safely delete or archive a feed
   */
  async deleteFeed(id, options = { force: false }) {
    const feed = await db.feeds.get(Number(id));
    if (!feed) {
      throw new Error(`Feed record #${id} not found.`);
    }

    // Check associated purchases or consumption logs
    const purchasesCount = await db.feedPurchases
      .filter((p) => String(p.feedId) === String(feed.id) || p.feedId === feed.feedId)
      .count();

    const logsCount = await db.feedLogs
      .filter((l) => String(l.feedId) === String(feed.id) || l.feedId === feed.feedId)
      .count();

    if ((purchasesCount > 0 || logsCount > 0) && !options.force) {
      throw new Error(
        `Cannot delete feed "${feed.name}" because it has ${purchasesCount} purchase(s) and ${logsCount} feeding log(s). Use Archive instead to preserve audit records.`
      );
    }

    await db.feeds.delete(Number(id));
    return { success: true, deletedFeedId: feed.feedId || id };
  },

  /**
   * Record Feed Purchase / Stock-In
   * ATOMIC TRANSACTION:
   * 1. Validates inputs & non-negative amounts.
   * 2. Checks duplicate invoice for supplier.
   * 3. Increases feed currentStock.
   * 4. Updates unitCost & expiryDate if supplied.
   * 5. Inserts record into feedPurchases table.
   * 6. Updates persistent purchase sequence high-water mark.
   */
  async recordFeedPurchase(purchaseData) {
    const {
      feedId,
      quantity,
      unitCost,
      supplier = '',
      supplierContact = '',
      invoiceNumber = '',
      purchaseDate = new Date().toISOString().slice(0, 10),
      expiryDate = '',
      batchLotNumber = '',
      notes = '',
      recordedBy = 'Farm Administrator',
    } = purchaseData;

    if (!feedId) {
      throw new Error('Please select a valid Feed Product.');
    }

    const numQty = Number(quantity);
    if (isNaN(numQty) || numQty <= 0) {
      throw new Error('Purchase quantity must be greater than zero.');
    }

    const numUnitCost = Number(unitCost);
    if (isNaN(numUnitCost) || numUnitCost < 0) {
      throw new Error('Purchase unit cost cannot be negative.');
    }

    if (!supplier || !supplier.trim()) {
      throw new Error('Supplier name is required for purchase records.');
    }

    // Check for duplicate invoice from same supplier
    if (invoiceNumber && invoiceNumber.trim()) {
      const cleanInvoice = invoiceNumber.trim().toUpperCase();
      const cleanSupplier = supplier.trim().toLowerCase();
      const existing = await db.feedPurchases
        .filter((p) => {
          return (
            (p.invoiceNumber || '').trim().toUpperCase() === cleanInvoice &&
            (p.supplier || '').trim().toLowerCase() === cleanSupplier
          );
        })
        .first();

      if (existing) {
        throw new Error(
          `Invoice #${invoiceNumber} from supplier "${supplier}" has already been recorded (Purchase ID: ${existing.purchaseId}).`
        );
      }
    }

    const generatedPurchaseId = await this.generateNextPurchaseId();
    const totalCost = Number((numQty * numUnitCost).toFixed(2));

    // Execute atomic transaction
    return await db.transaction('rw', [db.feeds, db.feedPurchases, db.farmSettings], async () => {
      // Find feed
      let feed = await db.feeds
        .filter((f) => f.id === Number(feedId) || f.feedId === feedId)
        .first();

      if (!feed) {
        throw new Error(`Selected feed product #${feedId} was not found in inventory.`);
      }

      const updatedStock = (Number(feed.currentStock) || 0) + numQty;
      const targetExpiry = expiryDate ? expiryDate.trim() : feed.expiryDate;
      const updatedStatus = computeFeedStatus(updatedStock, feed.reorderLevel, targetExpiry);

      // Update feed product
      const feedUpdates = {
        currentStock: updatedStock,
        status: updatedStatus,
        updatedAt: new Date().toISOString(),
      };

      if (numUnitCost > 0) {
        feedUpdates.unitCost = numUnitCost;
      }
      if (expiryDate) {
        feedUpdates.expiryDate = expiryDate;
      }

      await db.feeds.update(feed.id, feedUpdates);

      // Insert purchase log
      const purchaseRecord = {
        purchaseId: generatedPurchaseId,
        feedId: feed.feedId || String(feed.id),
        feedName: feed.name,
        quantity: numQty,
        unit: feed.unit || 'kg',
        unitCost: numUnitCost,
        totalCost,
        supplier: supplier.trim(),
        supplierContact: supplierContact ? supplierContact.trim() : '',
        invoiceNumber: invoiceNumber ? invoiceNumber.trim() : '',
        purchaseDate,
        expiryDate: expiryDate || '',
        batchLotNumber: batchLotNumber ? batchLotNumber.trim() : '',
        notes: notes ? notes.trim() : '',
        recordedBy: recordedBy ? recordedBy.trim() : 'Farm Administrator',
        createdAt: new Date().toISOString(),
      };

      const newPurchaseId = await db.feedPurchases.add(purchaseRecord);

      // Advance sequence in farmSettings
      const match = generatedPurchaseId.match(/(?:FPUR|PUR)-(\d+)/i);
      if (match && match[1]) {
        const num = parseInt(match[1], 10);
        try {
          const existingSeq = await db.farmSettings.get('last_feed_purchase_seq');
          const curr = existingSeq ? existingSeq.value : 0;
          if (num > curr) {
            await db.farmSettings.put({
              key: 'last_feed_purchase_seq',
              value: num,
              updatedAt: new Date().toISOString(),
            });
          }
        } catch {
          // Safe skip
        }
      }

      const freshFeed = await db.feeds.get(feed.id);
      return {
        success: true,
        purchaseId: generatedPurchaseId,
        purchase: { id: newPurchaseId, ...purchaseRecord },
        updatedFeed: freshFeed,
      };
    });
  },

  /**
   * Record Feed Consumption / Stock-Out (Feeding Log)
   * ATOMIC TRANSACTION:
   * 1. Validates inputs & positive quantity.
   * 2. Checks expiry: blocks expired feed unless options.allowExpired === true.
   * 3. Checks stock: blocks if quantity > currentStock. Prevents negative stock.
   * 4. Decrements feed currentStock.
   * 5. Calculates per-bird consumption if linked to batch.
   * 6. Inserts log into feedLogs table.
   * 7. Updates persistent log sequence high-water mark.
   */
  async recordFeedConsumption(logData, options = {}) {
    const {
      feedId,
      batchId = '',
      quantity,
      date = new Date().toISOString().slice(0, 10),
      session = 'Morning',
      birdsFed = null,
      notes = '',
      recordedBy = 'Farm Administrator',
    } = logData;

    if (!feedId) {
      throw new Error('Please select a valid Feed Product.');
    }

    const numQty = Number(quantity);
    if (isNaN(numQty) || numQty <= 0) {
      throw new Error('Feeding disbursement quantity must be greater than zero.');
    }

    const generatedLogId = await this.generateNextFeedLogId();

    // Execute atomic transaction
    return await db.transaction('rw', [db.feeds, db.feedLogs, db.batches, db.farmSettings], async () => {
      // Find feed
      const feed = await db.feeds
        .filter((f) => f.id === Number(feedId) || f.feedId === feedId)
        .first();

      if (!feed) {
        throw new Error(`Selected feed product #${feedId} was not found in inventory.`);
      }

      const currentStock = Number(feed.currentStock) || 0;

      // 1. Expiry Check
      if (feed.expiryDate) {
        const today = new Date().toISOString().slice(0, 10);
        if (feed.expiryDate < today && !options.allowExpired) {
          throw new Error(
            `Feed "${feed.name}" expired on ${feed.expiryDate}. Biosecurity rules prohibit feeding expired stock without explicit farm administrator override.`
          );
        }
      }

      // 2. Stock Availability Check
      if (currentStock < numQty) {
        throw new Error(
          `Insufficient feed stock: only ${currentStock} ${feed.unit || 'kg'} of "${feed.name}" available, but ${numQty} ${feed.unit || 'kg'} was requested.`
        );
      }

      // 3. Decrement stock
      const updatedStock = Number((currentStock - numQty).toFixed(2));
      const updatedStatus = computeFeedStatus(updatedStock, feed.reorderLevel, feed.expiryDate);

      await db.feeds.update(feed.id, {
        currentStock: updatedStock,
        status: updatedStatus,
        updatedAt: new Date().toISOString(),
      });

      // 4. Batch lookup & consumption per bird
      let linkedBatchCode = '';
      let calculatedBirdsFed = birdsFed ? Number(birdsFed) : 0;
      let consumptionPerBirdGrams = 0;

      if (batchId) {
        const batch = await db.batches
          .filter((b) => b.id === Number(batchId) || b.batchId === batchId || b.batchCode === batchId)
          .first();

        if (batch) {
          linkedBatchCode = batch.batchCode || batch.batchId || `Batch #${batch.id}`;
          if (!calculatedBirdsFed && batch.currentCount) {
            calculatedBirdsFed = Number(batch.currentCount);
          }
        }
      }

      if (calculatedBirdsFed > 0 && numQty > 0) {
        // If unit is kg, 1kg = 1000g; if unit is bag, assume 25kg or 50kg, or standard calculation
        let qtyInGrams = numQty * 1000;
        if (feed.unit === 'bag') {
          qtyInGrams = numQty * 25 * 1000; // standard 25kg bag
        } else if (feed.unit === 'ton') {
          qtyInGrams = numQty * 1000 * 1000;
        }
        consumptionPerBirdGrams = Number((qtyInGrams / calculatedBirdsFed).toFixed(1));
      }

      // 5. Insert feed log
      const logRecord = {
        logId: generatedLogId,
        feedId: feed.feedId || String(feed.id),
        feedName: feed.name,
        batchId: batchId ? String(batchId) : '',
        batchCode: linkedBatchCode,
        quantity: numQty,
        unit: feed.unit || 'kg',
        date,
        session,
        birdsFed: calculatedBirdsFed,
        consumptionPerBirdGrams,
        notes: notes ? notes.trim() : '',
        recordedBy: recordedBy ? recordedBy.trim() : 'Farm Administrator',
        createdAt: new Date().toISOString(),
      };

      const newLogId = await db.feedLogs.add(logRecord);

      // Advance sequence in farmSettings
      const match = generatedLogId.match(/FLOG-(\d+)/i);
      if (match && match[1]) {
        const num = parseInt(match[1], 10);
        try {
          const existingSeq = await db.farmSettings.get('last_feed_log_seq');
          const curr = existingSeq ? existingSeq.value : 0;
          if (num > curr) {
            await db.farmSettings.put({
              key: 'last_feed_log_seq',
              value: num,
              updatedAt: new Date().toISOString(),
            });
          }
        } catch {
          // Safe skip
        }
      }

      const freshFeed = await db.feeds.get(feed.id);
      return {
        success: true,
        logId: generatedLogId,
        log: { id: newLogId, ...logRecord },
        updatedFeed: freshFeed,
      };
    });
  },

  /**
   * Fetch Feed Purchases with search and date filters
   */
  async getFeedPurchases(filters = {}) {
    const { search = '', feedId = '', startDate = '', endDate = '', limit = 0 } = filters;

    let purchases = await db.feedPurchases.toArray();

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      purchases = purchases.filter((p) => {
        return (
          (p.purchaseId && p.purchaseId.toLowerCase().includes(q)) ||
          (p.feedName && p.feedName.toLowerCase().includes(q)) ||
          (p.supplier && p.supplier.toLowerCase().includes(q)) ||
          (p.invoiceNumber && p.invoiceNumber.toLowerCase().includes(q))
        );
      });
    }

    if (feedId && feedId !== 'all') {
      purchases = purchases.filter((p) => String(p.feedId) === String(feedId));
    }

    if (startDate) {
      purchases = purchases.filter((p) => p.purchaseDate >= startDate);
    }

    if (endDate) {
      purchases = purchases.filter((p) => p.purchaseDate <= endDate);
    }

    // Sort descending by purchaseDate then id
    purchases.sort((a, b) => {
      const dateA = a.purchaseDate || a.createdAt;
      const dateB = b.purchaseDate || b.createdAt;
      return dateB.localeCompare(dateA);
    });

    if (limit > 0) {
      purchases = purchases.slice(0, limit);
    }

    return purchases;
  },

  /**
   * Fetch Feeding Logs with filters
   */
  async getFeedLogs(filters = {}) {
    const { search = '', feedId = '', batchId = '', startDate = '', endDate = '', limit = 0 } = filters;

    let logs = await db.feedLogs.toArray();

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      logs = logs.filter((l) => {
        return (
          (l.logId && l.logId.toLowerCase().includes(q)) ||
          (l.feedName && l.feedName.toLowerCase().includes(q)) ||
          (l.batchCode && l.batchCode.toLowerCase().includes(q)) ||
          (l.session && l.session.toLowerCase().includes(q))
        );
      });
    }

    if (feedId && feedId !== 'all') {
      logs = logs.filter((l) => String(l.feedId) === String(feedId));
    }

    if (batchId && batchId !== 'all') {
      logs = logs.filter((l) => String(l.batchId) === String(batchId));
    }

    if (startDate) {
      logs = logs.filter((l) => l.date >= startDate);
    }

    if (endDate) {
      logs = logs.filter((l) => l.date <= endDate);
    }

    // Sort descending by date then id
    logs.sort((a, b) => {
      const dateA = a.date || a.createdAt;
      const dateB = b.date || b.createdAt;
      return dateB.localeCompare(dateA);
    });

    if (limit > 0) {
      logs = logs.slice(0, limit);
    }

    return logs;
  },

  /**
   * Fetch all feed transactions (Purchases + Consumption Logs) into a unified timeline
   */
  async getFeedTransactions(filters = {}) {
    const [purchases, logs] = await Promise.all([
      this.getFeedPurchases(filters),
      this.getFeedLogs(filters),
    ]);

    const unified = [
      ...purchases.map((p) => ({
        id: `pur-${p.id}`,
        transactionType: 'STOCK_IN',
        code: p.purchaseId,
        feedId: p.feedId,
        feedName: p.feedName,
        quantity: p.quantity,
        unit: p.unit,
        unitCost: p.unitCost,
        totalCost: p.totalCost,
        date: p.purchaseDate,
        party: p.supplier,
        reference: p.invoiceNumber ? `Invoice #${p.invoiceNumber}` : 'Direct Purchase',
        operator: p.recordedBy,
        timestamp: p.createdAt || p.purchaseDate,
      })),
      ...logs.map((l) => ({
        id: `log-${l.id}`,
        transactionType: 'STOCK_OUT',
        code: l.logId,
        feedId: l.feedId,
        feedName: l.feedName,
        quantity: l.quantity,
        unit: l.unit,
        unitCost: 0,
        totalCost: 0,
        date: l.date,
        party: l.batchCode || (l.batchId ? `Batch #${l.batchId}` : 'Flock Feeding'),
        reference: `${l.session} Session · ${l.birdsFed || 0} birds`,
        operator: l.recordedBy,
        timestamp: l.createdAt || l.date,
      })),
    ];

    unified.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    return unified;
  },

  /**
   * Compute overall Feed Management Dashboard Statistics
   */
  async getFeedStatistics() {
    await this.seedInitialFeedsIfEmpty();

    const [feeds, purchases, logs] = await Promise.all([
      db.feeds.toArray(),
      db.feedPurchases.toArray(),
      db.feedLogs.toArray(),
    ]);

    const totalProducts = feeds.length;
    let totalStockKg = 0;
    let totalInventoryValue = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;
    let expiredCount = 0;

    const today = new Date().toISOString().slice(0, 10);

    feeds.forEach((feed) => {
      const stock = Number(feed.currentStock) || 0;
      const reorder = Number(feed.reorderLevel) || 0;
      const cost = Number(feed.unitCost) || 0;

      // Approximate standard kg representation for metric card
      let multiplier = 1;
      if (feed.unit === 'bag') multiplier = 25;
      if (feed.unit === 'ton') multiplier = 1000;
      totalStockKg += stock * multiplier;

      totalInventoryValue += stock * cost;

      if (feed.expiryDate && feed.expiryDate < today) {
        expiredCount++;
      } else if (stock <= 0) {
        outOfStockCount++;
        lowStockCount++;
      } else if (stock <= reorder) {
        lowStockCount++;
      }
    });

    const totalPurchasesCount = purchases.length;
    const totalPurchasesSpend = purchases.reduce((sum, p) => sum + (Number(p.totalCost) || 0), 0);

    const totalConsumedQty = logs.reduce((sum, l) => {
      const qty = Number(l.quantity) || 0;
      let multiplier = 1;
      if (l.unit === 'bag') multiplier = 25;
      if (l.unit === 'ton') multiplier = 1000;
      return sum + qty * multiplier;
    }, 0);

    return {
      totalProducts,
      totalStockKg: Number(totalStockKg.toFixed(1)),
      totalInventoryValue: Number(totalInventoryValue.toFixed(2)),
      totalPurchasesCount,
      totalPurchasesSpend: Number(totalPurchasesSpend.toFixed(2)),
      totalConsumedKg: Number(totalConsumedQty.toFixed(1)),
      lowStockCount,
      outOfStockCount,
      expiredCount,
    };
  },

  /**
   * Get feeds needing immediate attention (Low stock, out of stock, or expired)
   */
  async getLowStockFeeds() {
    await this.seedInitialFeedsIfEmpty();
    const feeds = await db.feeds.toArray();
    const today = new Date().toISOString().slice(0, 10);

    return feeds
      .map((f) => ({
        ...f,
        status: computeFeedStatus(f.currentStock, f.reorderLevel, f.expiryDate),
      }))
      .filter((f) => {
        const isExp = f.expiryDate && f.expiryDate < today;
        const isLow = (Number(f.currentStock) || 0) <= (Number(f.reorderLevel) || 0);
        return isExp || isLow;
      });
  },
};
