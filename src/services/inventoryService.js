import { db } from '../database/db.js';

/**
 * Module 12: General Farm Inventory Management Service
 * Pure offline-first architecture using Dexie.js and IndexedDB.
 * Features:
 * - Monotonic sequential IDs (INV-0001, MOV-0001)
 * - Complete stock-in, stock-out, and adjustment workflows
 * - Paired location transfers conserving total farm stock
 * - Non-negative stock enforcement
 * - Biosecurity expiration guards (blocks routine use of expired items)
 * - Real-time alerts (low stock, out of stock, near expiry, expired)
 * - Read-only bridge to specialized inventories (feeds, medications, vaccines, eggs)
 *   without duplicating records or stock quantities
 */

export const DEFAULT_INVENTORY_CATEGORIES = [
  'Feed supplies',
  'Veterinary supplies',
  'Vaccination supplies',
  'Cleaning materials',
  'Disinfectants',
  'Packaging materials',
  'Farm tools',
  'Equipment',
  'Spare parts',
  'Protective clothing',
  'Fuel and other consumables',
  'Other',
];

export const STORAGE_LOCATIONS = [
  'Main Store',
  'Feed Warehouse',
  'Chemical / Biosecurity Store',
  'Tool Shed',
  'Packaging Room',
  'Brooder Store',
  'Layer House Store',
  'General Warehouse',
];

export const UNITS_OF_MEASURE = [
  'pcs',
  'kg',
  'liters',
  'bags',
  'boxes',
  'rolls',
  'sets',
  'pairs',
  'bottles',
  'packs',
  'cans',
];

export const MOVEMENT_TYPES = [
  'STOCK_IN',
  'STOCK_OUT',
  'ADJUSTMENT_INCREASE',
  'ADJUSTMENT_DECREASE',
  'TRANSFER_OUT',
  'TRANSFER_IN',
];

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
 * Helper: Format local calendar date YYYY-MM-DD
 */
export function getLocalDateString(date = new Date()) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Rapid submission cache: stores hash -> timestamp
const submissionCache = new Map();

function checkDuplicateSubmission(key, windowMs = 3000) {
  const now = Date.now();
  const lastTime = submissionCache.get(key);
  if (lastTime && now - lastTime < windowMs) {
    throw new Error('Rapid duplicate submission detected. Please wait 3 seconds before resubmitting.');
  }
  submissionCache.set(key, now);
  if (submissionCache.size > 200) {
    submissionCache.clear();
  }
}

export const inventoryService = {
  /**
   * Automatically generate the next sequential Inventory Item ID (e.g. INV-0001)
   */
  async generateNextItemId() {
    try {
      let settingSeq = 0;
      try {
        const setting = await db.farmSettings.get('last_inventory_item_seq');
        if (setting && typeof setting.value === 'number') {
          settingSeq = setting.value;
        }
      } catch {
        // Fallback
      }

      const items = await db.inventory.toArray();
      let maxNumber = settingSeq;

      items.forEach((item) => {
        const code = item.itemId;
        if (code) {
          const match = code.match(/INV-(\d+)/i);
          if (match && match[1]) {
            const num = parseInt(match[1], 10);
            if (!isNaN(num) && num > maxNumber) {
              maxNumber = num;
            }
          }
        } else if (item.id && typeof item.id === 'number' && item.id > maxNumber) {
          maxNumber = item.id;
        }
      });

      const nextNum = maxNumber + 1;
      return `INV-${String(nextNum).padStart(4, '0')}`;
    } catch (err) {
      console.error('Error generating inventory item ID:', err);
      return 'INV-0001';
    }
  },

  /**
   * Automatically generate the next sequential Inventory Movement ID (e.g. MOV-0001)
   */
  async generateNextMovementId() {
    try {
      let settingSeq = 0;
      try {
        const setting = await db.farmSettings.get('last_inventory_movement_seq');
        if (setting && typeof setting.value === 'number') {
          settingSeq = setting.value;
        }
      } catch {
        // Fallback
      }

      const movements = await db.inventoryMovements.toArray();
      let maxNumber = settingSeq;

      movements.forEach((mov) => {
        const code = mov.movementId;
        if (code) {
          const match = code.match(/MOV-(\d+)/i);
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
      return `MOV-${String(nextNum).padStart(4, '0')}`;
    } catch (err) {
      console.error('Error generating inventory movement ID:', err);
      return 'MOV-0001';
    }
  },

  /**
   * Retrieve all categories (defaults + custom added by users)
   */
  async getCategories() {
    try {
      const customRecords = await db.inventoryCategories.toArray();
      const customNames = customRecords.map((c) => c.name);
      const set = new Set([...DEFAULT_INVENTORY_CATEGORIES, ...customNames]);
      return Array.from(set);
    } catch {
      return [...DEFAULT_INVENTORY_CATEGORIES];
    }
  },

  /**
   * Add a custom inventory category with validation against duplicates
   */
  async addCustomCategory(categoryName) {
    if (!categoryName || typeof categoryName !== 'string' || !categoryName.trim()) {
      throw new Error('Category name cannot be empty.');
    }
    const cleanName = categoryName.trim();
    const existing = await this.getCategories();
    const isDuplicate = existing.some((c) => c.toLowerCase() === cleanName.toLowerCase());
    if (isDuplicate) {
      throw new Error(`Inventory category "${cleanName}" already exists.`);
    }

    await db.inventoryCategories.add({
      name: cleanName,
      isDefault: false,
      createdAt: new Date().toISOString(),
    });

    return cleanName;
  },

  /**
   * Determine item status dynamically based on stock and expiry
   */
  computeItemStatus(currentQuantity, reorderLevel, expiryDate) {
    const today = getLocalDateString();
    if (expiryDate && expiryDate < today) {
      return 'Expired';
    }
    const qty = Number(currentQuantity) || 0;
    const reorder = Number(reorderLevel) || 0;
    if (qty <= 0) {
      return 'Out of Stock';
    }
    if (qty <= reorder) {
      return 'Low Stock';
    }
    return 'Active';
  },

  /**
   * Create a new inventory catalog item
   */
  async createItem(data) {
    const subHash = `INV_ITEM_${data.itemName || data.name || ''}_${data.category || ''}_${data.storageLocation || ''}`;
    checkDuplicateSubmission(subHash, 3000);

    const itemName = (data.itemName || data.name || '').trim();
    if (!itemName) {
      throw new Error('Item name is required.');
    }

    const category = (data.category || '').trim();
    if (!category) {
      throw new Error('Category is required.');
    }

    const unit = (data.unit || 'pcs').trim();
    const initialQty = data.currentQuantity !== undefined && data.currentQuantity !== null && data.currentQuantity !== ''
      ? Math.max(0, Number(data.currentQuantity) || 0)
      : 0;

    const minimumStockLevel = data.minimumStockLevel !== undefined && data.minimumStockLevel !== null && data.minimumStockLevel !== ''
      ? Math.max(0, Number(data.minimumStockLevel) || 0)
      : 5;

    const reorderLevel = data.reorderLevel !== undefined && data.reorderLevel !== null && data.reorderLevel !== ''
      ? Math.max(0, Number(data.reorderLevel) || 0)
      : 10;

    const unitCost = data.unitCost !== undefined && data.unitCost !== null && data.unitCost !== ''
      ? Math.max(0, Number(data.unitCost) || 0)
      : 0;

    const storageLocation = (data.storageLocation || data.location || 'Main Store').trim();
    const supplier = (data.supplier || '').trim();
    const description = (data.description || '').trim();
    const sku = (data.sku || '').trim();
    const expiryDate = data.expiryDate && /^\d{4}-\d{2}-\d{2}$/.test(data.expiryDate.trim())
      ? data.expiryDate.trim()
      : null;
    const batchLotNumber = (data.batchLotNumber || data.batchNumber || '').trim();

    const status = this.computeItemStatus(initialQty, reorderLevel, expiryDate);

    const itemId = data.itemId || (await this.generateNextItemId());
    const initialMovementId = initialQty > 0 ? await this.generateNextMovementId() : null;

    return await db.transaction('rw', [db.inventory, db.inventoryMovements, db.farmSettings], async () => {
      const itemRecord = {
        itemId,
        itemName,
        name: itemName,
        category,
        description,
        sku,
        unit,
        currentQuantity: initialQty,
        quantity: initialQty,
        minimumStockLevel,
        minimumThreshold: minimumStockLevel,
        reorderLevel,
        storageLocation,
        location: storageLocation,
        supplier,
        unitCost,
        expiryDate,
        batchLotNumber,
        status,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const newKey = await db.inventory.add(itemRecord);

      // If initial stock was entered, record immutable initial stock movement
      if (initialQty > 0 && initialMovementId) {
        await db.inventoryMovements.add({
          movementId: initialMovementId,
          itemId,
          movementType: 'STOCK_IN',
          quantity: initialQty,
          previousBalance: 0,
          newBalance: initialQty,
          storageLocation,
          reason: 'Initial catalog stock registration',
          referenceNumber: 'INITIAL-STOCK',
          date: getLocalDateString(),
          recordedBy: data.recordedBy || 'Administrator',
          createdAt: new Date().toISOString(),
        });

        const matchM = initialMovementId.match(/MOV-(\d+)/i);
        if (matchM && matchM[1]) {
          await db.farmSettings.put({
            key: 'last_inventory_movement_seq',
            value: parseInt(matchM[1], 10),
            updatedAt: new Date().toISOString(),
          });
        }
      }

      // Update item sequence counter
      const matchI = itemId.match(/INV-(\d+)/i);
      if (matchI && matchI[1]) {
        await db.farmSettings.put({
          key: 'last_inventory_item_seq',
          value: parseInt(matchI[1], 10),
          updatedAt: new Date().toISOString(),
        });
      }

      return { id: newKey, ...itemRecord };
    });
  },

  /**
   * Safely edit item catalog metadata
   * (Does not directly manipulate currentQuantity without audit movement)
   */
  async updateItem(itemId, updates) {
    const item = await db.inventory
      .filter((i) => i.itemId === itemId || Number(i.id) === Number(itemId))
      .first();

    if (!item) {
      throw new Error(`Inventory item "${itemId}" was not found.`);
    }

    const safeUpdates = { ...updates };
    delete safeUpdates.id;
    delete safeUpdates.itemId;
    delete safeUpdates.createdAt;
    delete safeUpdates.currentQuantity; // quantity must be changed via movements!
    delete safeUpdates.quantity;

    if (safeUpdates.itemName) safeUpdates.name = safeUpdates.itemName;
    if (safeUpdates.name) safeUpdates.itemName = safeUpdates.name;
    if (safeUpdates.storageLocation) safeUpdates.location = safeUpdates.storageLocation;

    const reorder = safeUpdates.reorderLevel !== undefined ? Number(safeUpdates.reorderLevel) : item.reorderLevel;
    const expDate = safeUpdates.expiryDate !== undefined ? safeUpdates.expiryDate : item.expiryDate;
    safeUpdates.status = this.computeItemStatus(item.currentQuantity, reorder, expDate);
    safeUpdates.updatedAt = new Date().toISOString();

    await db.inventory.update(item.id, safeUpdates);
    return { ...item, ...safeUpdates };
  },

  /**
   * Record Stock-In with atomic stock increment & ledger movement
   */
  async recordStockIn(data) {
    if (!data.itemId) {
      throw new Error('Item ID is required for stock-in.');
    }

    const subHash = `STK_IN_${data.itemId}_${data.quantity || ''}_${data.referenceNumber || data.invoiceNumber || ''}`;
    checkDuplicateSubmission(subHash, 3000);

    const item = await db.inventory
      .filter((i) => i.itemId === data.itemId || Number(i.id) === Number(data.itemId))
      .first();

    if (!item) {
      throw new Error(`Inventory item "${data.itemId}" was not found.`);
    }

    const qty = Number(data.quantity);
    if (isNaN(qty) || qty <= 0) {
      throw new Error('Stock-in quantity must be greater than zero.');
    }

    const unitCost = data.unitCost !== undefined && data.unitCost !== null && data.unitCost !== ''
      ? Math.max(0, Number(data.unitCost) || 0)
      : item.unitCost || 0;

    const purchaseDate = data.purchaseDate && /^\d{4}-\d{2}-\d{2}$/.test(data.purchaseDate.trim())
      ? data.purchaseDate.trim()
      : (data.date || getLocalDateString());

    const supplier = (data.supplier || item.supplier || '').trim();
    const referenceNumber = (data.referenceNumber || data.invoiceNumber || '').trim();
    const notes = (data.notes || '').trim();
    const recordedBy = (data.recordedBy || 'Administrator').trim();
    const expiryDate = data.expiryDate && /^\d{4}-\d{2}-\d{2}$/.test(data.expiryDate.trim())
      ? data.expiryDate.trim()
      : item.expiryDate;

    const movementId = await this.generateNextMovementId();

    return await db.transaction('rw', [db.inventory, db.inventoryMovements, db.farmSettings], async () => {
      const prevBalance = Number(item.currentQuantity) || 0;
      const newBalance = prevBalance + qty;
      const newStatus = this.computeItemStatus(newBalance, item.reorderLevel, expiryDate);

      // 1. Create movement record
      const movementRecord = {
        movementId,
        itemId: item.itemId,
        itemName: item.itemName,
        category: item.category,
        movementType: 'STOCK_IN',
        quantity: qty,
        unit: item.unit,
        unitCost,
        previousBalance: prevBalance,
        newBalance,
        storageLocation: item.storageLocation,
        supplier,
        referenceNumber,
        date: purchaseDate,
        movementDate: purchaseDate,
        notes,
        recordedBy,
        createdAt: new Date().toISOString(),
      };

      const movKey = await db.inventoryMovements.add(movementRecord);

      // 2. Update item stock and latest cost
      const itemUpdates = {
        currentQuantity: newBalance,
        quantity: newBalance,
        unitCost,
        expiryDate,
        supplier: supplier || item.supplier,
        status: newStatus,
        updatedAt: new Date().toISOString(),
      };

      await db.inventory.update(item.id, itemUpdates);

      // 3. Update sequence
      const matchM = movementId.match(/MOV-(\d+)/i);
      if (matchM && matchM[1]) {
        await db.farmSettings.put({
          key: 'last_inventory_movement_seq',
          value: parseInt(matchM[1], 10),
          updatedAt: new Date().toISOString(),
        });
      }

      return {
        updatedItem: { ...item, ...itemUpdates },
        movement: { id: movKey, ...movementRecord },
      };
    });
  },

  /**
   * Record Stock-Out with validation against negative stock and biosecurity expiry check
   */
  async recordStockOut(data) {
    if (!data.itemId) {
      throw new Error('Item ID is required for stock-out.');
    }

    const subHash = `STK_OUT_${data.itemId}_${data.quantity || ''}_${data.purpose || data.reason || ''}`;
    checkDuplicateSubmission(subHash, 3000);

    const item = await db.inventory
      .filter((i) => i.itemId === data.itemId || Number(i.id) === Number(data.itemId))
      .first();

    if (!item) {
      throw new Error(`Inventory item "${data.itemId}" was not found.`);
    }

    const qty = Number(data.quantity);
    if (isNaN(qty) || qty <= 0) {
      throw new Error('Stock-out quantity must be greater than zero.');
    }

    const currentQty = Number(item.currentQuantity) || 0;
    if (qty > currentQty) {
      throw new Error(
        `Requested quantity (${qty} ${item.unit}) exceeds available stock (${currentQty} ${item.unit}). Negative stock prevented.`
      );
    }

    const today = getLocalDateString();
    if (item.expiryDate && item.expiryDate < today && !data.overrideExpired) {
      throw new Error(
        `Item "${item.itemName}" expired on ${item.expiryDate}. Expired items cannot be used routinely for farm operations.`
      );
    }

    const purpose = (data.purpose || data.reason || '').trim();
    if (!purpose) {
      throw new Error('Purpose / reason is required for stock disbursement.');
    }

    const date = data.date && /^\d{4}-\d{2}-\d{2}$/.test(data.date.trim())
      ? data.date.trim()
      : getLocalDateString();

    const batchId = data.batchId ? String(data.batchId).trim() : null;
    const penId = data.penId ? String(data.penId).trim() : null;
    const notes = (data.notes || '').trim();
    const recordedBy = (data.recordedBy || 'Administrator').trim();

    const movementId = await this.generateNextMovementId();

    return await db.transaction('rw', [db.inventory, db.inventoryMovements, db.farmSettings], async () => {
      const prevBalance = currentQty;
      const newBalance = prevBalance - qty;
      const newStatus = this.computeItemStatus(newBalance, item.reorderLevel, item.expiryDate);

      // 1. Create movement record
      const movementRecord = {
        movementId,
        itemId: item.itemId,
        itemName: item.itemName,
        category: item.category,
        movementType: 'STOCK_OUT',
        quantity: qty,
        unit: item.unit,
        unitCost: item.unitCost,
        previousBalance: prevBalance,
        newBalance,
        storageLocation: item.storageLocation,
        reason: purpose,
        purpose,
        batchId,
        penId,
        date,
        movementDate: date,
        notes,
        recordedBy,
        createdAt: new Date().toISOString(),
      };

      const movKey = await db.inventoryMovements.add(movementRecord);

      // 2. Update item stock
      const itemUpdates = {
        currentQuantity: newBalance,
        quantity: newBalance,
        status: newStatus,
        updatedAt: new Date().toISOString(),
      };

      await db.inventory.update(item.id, itemUpdates);

      // 3. Update sequence
      const matchM = movementId.match(/MOV-(\d+)/i);
      if (matchM && matchM[1]) {
        await db.farmSettings.put({
          key: 'last_inventory_movement_seq',
          value: parseInt(matchM[1], 10),
          updatedAt: new Date().toISOString(),
        });
      }

      return {
        updatedItem: { ...item, ...itemUpdates },
        movement: { id: movKey, ...movementRecord },
      };
    });
  },

  /**
   * Record Stock Adjustment (Increase or Decrease) with mandatory reason
   */
  async recordAdjustment(data) {
    if (!data.itemId) {
      throw new Error('Item ID is required for stock adjustment.');
    }

    const item = await db.inventory
      .filter((i) => i.itemId === data.itemId || Number(i.id) === Number(data.itemId))
      .first();

    if (!item) {
      throw new Error(`Inventory item "${data.itemId}" was not found.`);
    }

    const qty = Number(data.quantity);
    if (isNaN(qty) || qty <= 0) {
      throw new Error('Adjustment quantity must be greater than zero.');
    }

    const type = (data.adjustmentType || 'INCREASE').toUpperCase();
    if (type !== 'INCREASE' && type !== 'DECREASE') {
      throw new Error('Adjustment type must be either INCREASE or DECREASE.');
    }

    const reason = (data.reason || '').trim();
    if (!reason) {
      throw new Error('A detailed reason is strictly required for stock adjustments.');
    }

    const currentQty = Number(item.currentQuantity) || 0;
    if (type === 'DECREASE' && qty > currentQty) {
      throw new Error(
        `Adjustment reduction (${qty} ${item.unit}) exceeds current stock (${currentQty} ${item.unit}). Negative stock prevented.`
      );
    }

    const movementId = await this.generateNextMovementId();
    const date = data.date || getLocalDateString();
    const recordedBy = data.recordedBy || 'Administrator';

    return await db.transaction('rw', [db.inventory, db.inventoryMovements, db.farmSettings], async () => {
      const prevBalance = currentQty;
      const newBalance = type === 'INCREASE' ? prevBalance + qty : prevBalance - qty;
      const movType = type === 'INCREASE' ? 'ADJUSTMENT_INCREASE' : 'ADJUSTMENT_DECREASE';
      const newStatus = this.computeItemStatus(newBalance, item.reorderLevel, item.expiryDate);

      const movementRecord = {
        movementId,
        itemId: item.itemId,
        itemName: item.itemName,
        category: item.category,
        movementType: movType,
        quantity: qty,
        unit: item.unit,
        unitCost: item.unitCost,
        previousBalance: prevBalance,
        newBalance,
        storageLocation: item.storageLocation,
        reason,
        date,
        movementDate: date,
        recordedBy,
        createdAt: new Date().toISOString(),
      };

      const movKey = await db.inventoryMovements.add(movementRecord);

      const itemUpdates = {
        currentQuantity: newBalance,
        quantity: newBalance,
        status: newStatus,
        updatedAt: new Date().toISOString(),
      };

      await db.inventory.update(item.id, itemUpdates);

      const matchM = movementId.match(/MOV-(\d+)/i);
      if (matchM && matchM[1]) {
        await db.farmSettings.put({
          key: 'last_inventory_movement_seq',
          value: parseInt(matchM[1], 10),
          updatedAt: new Date().toISOString(),
        });
      }

      return {
        updatedItem: { ...item, ...itemUpdates },
        movement: { id: movKey, ...movementRecord },
      };
    });
  },

  /**
   * Record paired Location Transfer within one atomic transaction
   * Conserves total farm stock (TRANSFER_OUT + TRANSFER_IN)
   */
  async recordTransfer(data) {
    if (!data.itemId) {
      throw new Error('Item ID is required for stock transfer.');
    }

    const item = await db.inventory
      .filter((i) => i.itemId === data.itemId || Number(i.id) === Number(data.itemId))
      .first();

    if (!item) {
      throw new Error(`Inventory item "${data.itemId}" was not found.`);
    }

    const fromLocation = (data.fromLocation || item.storageLocation || '').trim();
    const toLocation = (data.toLocation || '').trim();

    if (!fromLocation) {
      throw new Error('Source storage location is required.');
    }
    if (!toLocation) {
      throw new Error('Destination storage location is required.');
    }
    if (fromLocation.toLowerCase() === toLocation.toLowerCase()) {
      throw new Error('Source and destination locations must be different.');
    }

    const qty = Number(data.quantity);
    if (isNaN(qty) || qty <= 0) {
      throw new Error('Transfer quantity must be greater than zero.');
    }

    const currentQty = Number(item.currentQuantity) || 0;
    if (qty > currentQty) {
      throw new Error(
        `Transfer quantity (${qty} ${item.unit}) exceeds available stock (${currentQty} ${item.unit}). Negative stock prevented.`
      );
    }

    const reason = (data.reason || '').trim();
    if (!reason) {
      throw new Error('Reason is required for location stock transfer.');
    }

    const date = data.date || getLocalDateString();
    const recordedBy = data.recordedBy || 'Administrator';

    const movOutId = await this.generateNextMovementId();
    // Simulate next for paired in-movement
    const matchM = movOutId.match(/MOV-(\d+)/i);
    const nextSeq = matchM && matchM[1] ? parseInt(matchM[1], 10) + 1 : 2;
    const movInId = `MOV-${String(nextSeq).padStart(4, '0')}`;

    return await db.transaction('rw', [db.inventory, db.inventoryMovements, db.farmSettings], async () => {
      // 1. TRANSFER_OUT movement
      const outRecord = {
        movementId: movOutId,
        itemId: item.itemId,
        itemName: item.itemName,
        category: item.category,
        movementType: 'TRANSFER_OUT',
        quantity: qty,
        unit: item.unit,
        unitCost: item.unitCost,
        previousBalance: currentQty,
        newBalance: currentQty - qty,
        storageLocation: fromLocation,
        fromLocation,
        toLocation,
        reason: `Transfer OUT to ${toLocation}: ${reason}`,
        date,
        movementDate: date,
        recordedBy,
        createdAt: new Date().toISOString(),
      };
      await db.inventoryMovements.add(outRecord);

      // 2. TRANSFER_IN movement
      const inRecord = {
        movementId: movInId,
        itemId: item.itemId,
        itemName: item.itemName,
        category: item.category,
        movementType: 'TRANSFER_IN',
        quantity: qty,
        unit: item.unit,
        unitCost: item.unitCost,
        previousBalance: currentQty - qty,
        newBalance: currentQty, // Total stock conserved
        storageLocation: toLocation,
        fromLocation,
        toLocation,
        reason: `Transfer IN from ${fromLocation}: ${reason}`,
        date,
        movementDate: date,
        recordedBy,
        createdAt: new Date().toISOString(),
      };
      await db.inventoryMovements.add(inRecord);

      // 3. Update item location to destination
      const itemUpdates = {
        storageLocation: toLocation,
        location: toLocation,
        updatedAt: new Date().toISOString(),
      };
      await db.inventory.update(item.id, itemUpdates);

      // 4. Update movement sequence to highest
      await db.farmSettings.put({
        key: 'last_inventory_movement_seq',
        value: nextSeq,
        updatedAt: new Date().toISOString(),
      });

      return {
        updatedItem: { ...item, ...itemUpdates },
        movements: [outRecord, inRecord],
      };
    });
  },

  /**
   * Retrieve inventory items with multi-criteria filtering
   */
  async getItems(filters = {}) {
    try {
      let items = await db.inventory.toArray();
      const today = getLocalDateString();

      // Search term
      if (filters.searchTerm && filters.searchTerm.trim()) {
        const term = filters.searchTerm.trim().toLowerCase();
        items = items.filter((i) => {
          const idMatch = (i.itemId || '').toLowerCase().includes(term);
          const nameMatch = (i.itemName || i.name || '').toLowerCase().includes(term);
          const catMatch = (i.category || '').toLowerCase().includes(term);
          const locMatch = (i.storageLocation || i.location || '').toLowerCase().includes(term);
          const suppMatch = (i.supplier || '').toLowerCase().includes(term);
          const skuMatch = (i.sku || '').toLowerCase().includes(term);
          return idMatch || nameMatch || catMatch || locMatch || suppMatch || skuMatch;
        });
      }

      // Category filter
      if (filters.category && filters.category !== 'All') {
        items = items.filter((i) => i.category === filters.category);
      }

      // Location filter
      if (filters.storageLocation && filters.storageLocation !== 'All') {
        items = items.filter((i) => (i.storageLocation || i.location) === filters.storageLocation);
      }

      // Status filter
      if (filters.status && filters.status !== 'All') {
        items = items.filter((i) => {
          const status = this.computeItemStatus(i.currentQuantity, i.reorderLevel, i.expiryDate);
          return status === filters.status;
        });
      }

      // Low stock only
      if (filters.isLowStock) {
        items = items.filter((i) => Number(i.currentQuantity) <= Number(i.reorderLevel) && Number(i.currentQuantity) > 0);
      }

      // Expiring or expired only
      if (filters.isExpiring) {
        const soon = new Date();
        soon.setDate(soon.getDate() + 30);
        const soonStr = getLocalDateString(soon);
        items = items.filter((i) => i.expiryDate && i.expiryDate <= soonStr);
      }

      return items.map((i) => {
        const currentQty = Number(i.currentQuantity) || 0;
        const reorderLevel = Number(i.reorderLevel) || 0;
        const unitCost = Number(i.unitCost) || 0;
        const isExpired = Boolean(i.expiryDate && i.expiryDate < today);

        let isNearExpiry = false;
        if (i.expiryDate && !isExpired) {
          const dExp = new Date(i.expiryDate);
          const dToday = new Date(today);
          const diffDays = Math.ceil((dExp - dToday) / (1000 * 60 * 60 * 24));
          isNearExpiry = diffDays >= 0 && diffDays <= 30;
        }

        const totalValuation = fromKobo(toKobo(currentQty * unitCost));

        return {
          ...i,
          currentQuantity: currentQty,
          status: this.computeItemStatus(currentQty, reorderLevel, i.expiryDate),
          isLowStock: currentQty <= reorderLevel && currentQty > 0,
          isOutOfStock: currentQty === 0,
          isNearExpiry,
          isExpired,
          totalValuation,
        };
      }).sort((a, b) => (a.itemId || '').localeCompare(b.itemId || ''));
    } catch (err) {
      console.error('Error fetching inventory items:', err);
      return [];
    }
  },

  /**
   * Retrieve stock movements history with filtering
   */
  async getMovements(filters = {}) {
    try {
      let movements = await db.inventoryMovements.toArray();

      if (filters.searchTerm && filters.searchTerm.trim()) {
        const q = filters.searchTerm.trim().toLowerCase();
        movements = movements.filter((m) => {
          const idM = (m.movementId || '').toLowerCase().includes(q);
          const itemM = (m.itemId || '').toLowerCase().includes(q);
          const nameM = (m.itemName || '').toLowerCase().includes(q);
          const reasonM = (m.reason || '').toLowerCase().includes(q);
          const refM = (m.referenceNumber || '').toLowerCase().includes(q);
          return idM || itemM || nameM || reasonM || refM;
        });
      }

      if (filters.itemId && filters.itemId !== 'All') {
        movements = movements.filter((m) => m.itemId === filters.itemId);
      }

      if (filters.category && filters.category !== 'All') {
        movements = movements.filter((m) => m.category === filters.category);
      }

      if (filters.movementType && filters.movementType !== 'All') {
        movements = movements.filter((m) => m.movementType === filters.movementType);
      }

      if (filters.storageLocation && filters.storageLocation !== 'All') {
        movements = movements.filter((m) => m.storageLocation === filters.storageLocation);
      }

      if (filters.startDate) {
        movements = movements.filter((m) => (m.date || m.movementDate || '') >= filters.startDate);
      }
      if (filters.endDate) {
        movements = movements.filter((m) => (m.date || m.movementDate || '') <= filters.endDate);
      }

      // Sort newest first
      return movements.sort((a, b) => {
        const dateA = a.date || a.movementDate || a.createdAt || '';
        const dateB = b.date || b.movementDate || b.createdAt || '';
        if (dateB !== dateA) return dateB.localeCompare(dateA);
        return (b.id || 0) - (a.id || 0);
      });
    } catch (err) {
      console.error('Error fetching inventory movements:', err);
      return [];
    }
  },

  /**
   * Retrieve active inventory alerts
   */
  async getInventoryAlerts() {
    try {
      const items = await this.getItems();
      const alerts = [];

      items.forEach((item) => {
        // Out of stock
        if (item.currentQuantity === 0) {
          alerts.push({
            id: `out-${item.itemId}`,
            type: 'OUT_OF_STOCK',
            severity: 'critical',
            title: `Out of Stock: ${item.itemName}`,
            message: `Current balance is 0 ${item.unit}. Minimum required is ${item.minimumStockLevel} ${item.unit}.`,
            itemId: item.itemId,
            location: item.storageLocation,
          });
        } else if (item.isLowStock) {
          alerts.push({
            id: `low-${item.itemId}`,
            type: 'LOW_STOCK',
            severity: 'warning',
            title: `Low Stock: ${item.itemName}`,
            message: `Current stock (${item.currentQuantity} ${item.unit}) is at or below reorder level (${item.reorderLevel} ${item.unit}).`,
            itemId: item.itemId,
            location: item.storageLocation,
          });
        }

        // Expired
        if (item.isExpired) {
          alerts.push({
            id: `exp-${item.itemId}`,
            type: 'EXPIRED',
            severity: 'danger',
            title: `Expired Item: ${item.itemName}`,
            message: `Passed expiration date on ${item.expiryDate}. Quarantine or dispose safely according to biosecurity protocols.`,
            itemId: item.itemId,
            location: item.storageLocation,
          });
        } else if (item.isNearExpiry) {
          alerts.push({
            id: `nearexp-${item.itemId}`,
            type: 'NEAR_EXPIRY',
            severity: 'info',
            title: `Near Expiry: ${item.itemName}`,
            message: `Expires on ${item.expiryDate} (within 30 days). Prioritize usage before expiration.`,
            itemId: item.itemId,
            location: item.storageLocation,
          });
        }
      });

      return alerts;
    } catch (err) {
      console.error('Error calculating inventory alerts:', err);
      return [];
    }
  },

  /**
   * Aggregate inventory metrics and category breakdown
   */
  async getInventoryStats() {
    try {
      const [items, movements] = await Promise.all([
        this.getItems(),
        this.getMovements(),
      ]);

      let totalStockUnits = 0;
      let totalValuationKobo = 0;
      let lowStockCount = 0;
      let outOfStockCount = 0;
      let expiringCount = 0;
      let expiredCount = 0;

      const categoryMap = {};
      const locationMap = {};

      items.forEach((item) => {
        const qty = item.currentQuantity || 0;
        const cost = item.unitCost || 0;
        const valKobo = toKobo(qty * cost);

        totalStockUnits += qty;
        totalValuationKobo += valKobo;

        if (item.isOutOfStock) outOfStockCount++;
        else if (item.isLowStock) lowStockCount++;

        if (item.isExpired) expiredCount++;
        else if (item.isNearExpiry) expiringCount++;

        // Category breakdown
        const cat = item.category || 'Other';
        if (!categoryMap[cat]) {
          categoryMap[cat] = { valuationKobo: 0, itemCount: 0, unitsCount: 0 };
        }
        categoryMap[cat].valuationKobo += valKobo;
        categoryMap[cat].itemCount += 1;
        categoryMap[cat].unitsCount += qty;

        // Location breakdown
        const loc = item.storageLocation || 'Main Store';
        if (!locationMap[loc]) {
          locationMap[loc] = { itemCount: 0, unitsCount: 0 };
        }
        locationMap[loc].itemCount += 1;
        locationMap[loc].unitsCount += qty;
      });

      const totalValuation = fromKobo(totalValuationKobo);

      const categoryBreakdown = Object.entries(categoryMap).map(([cat, data]) => {
        const val = fromKobo(data.valuationKobo);
        const pct = totalValuation > 0 ? Number(((val / totalValuation) * 100).toFixed(1)) : 0;
        return {
          category: cat,
          valuation: val,
          itemCount: data.itemCount,
          unitsCount: data.unitsCount,
          percentage: pct,
        };
      }).sort((a, b) => b.valuation - a.valuation);

      const locationBreakdown = Object.entries(locationMap).map(([loc, data]) => ({
        location: loc,
        itemCount: data.itemCount,
        unitsCount: data.unitsCount,
      })).sort((a, b) => b.itemCount - a.itemCount);

      return {
        totalItems: items.length,
        totalStockUnits,
        lowStockCount,
        outOfStockCount,
        expiringCount,
        expiredCount,
        estimatedTotalValuation: totalValuation,
        categoryBreakdown,
        locationBreakdown,
        recentMovements: movements.slice(0, 8),
      };
    } catch (err) {
      console.error('Error generating inventory stats:', err);
      return {
        totalItems: 0,
        totalStockUnits: 0,
        lowStockCount: 0,
        outOfStockCount: 0,
        expiringCount: 0,
        expiredCount: 0,
        estimatedTotalValuation: 0,
        categoryBreakdown: [],
        locationBreakdown: [],
        recentMovements: [],
      };
    }
  },

  /**
   * Read-Only Bridge to Specialized Farm Inventories
   * Provides real-time summaries of feeds, medications, vaccines, and eggs
   * WITHOUT duplicating records or mixing into general inventory tables.
   */
  async getSpecializedInventoriesSummary() {
    try {
      const [feeds, medications, vaccines, eggMovements] = await Promise.all([
        db.feeds.toArray(),
        db.medications.toArray(),
        db.vaccines.toArray(),
        db.eggInventory.toArray(),
      ]);

      // Feeds
      const totalFeedKg = feeds.reduce((sum, f) => sum + (Number(f.currentStock) || 0), 0);
      const lowFeeds = feeds.filter((f) => (Number(f.currentStock) || 0) <= (Number(f.reorderLevel) || 0)).length;

      // Medications
      const totalMedUnits = medications.reduce((sum, m) => sum + (Number(m.currentStock) || 0), 0);

      // Vaccines
      const totalVacDoses = vaccines.reduce((sum, v) => sum + (Number(v.currentStock) || 0), 0);

      // Eggs
      const eggBalances = {};
      eggMovements.forEach((m) => {
        const grade = m.grade || 'Grade A';
        if (!eggBalances[grade]) eggBalances[grade] = 0;
        const qty = Number(m.quantity) || 0;
        if (m.movementType === 'COLLECTION' || m.movementType === 'SALE_RETURN' || m.movementType === 'ADJUSTMENT_IN') {
          eggBalances[grade] += qty;
        } else {
          eggBalances[grade] = Math.max(0, eggBalances[grade] - qty);
        }
      });

      const totalEggs = Object.values(eggBalances).reduce((a, b) => a + b, 0);
      const totalCrates = Math.floor(totalEggs / 30);
      const totalLoose = totalEggs % 30;

      return {
        feeds: {
          count: feeds.length,
          totalStockKg: totalFeedKg,
          lowStockCount: lowFeeds,
        },
        medications: {
          count: medications.length,
          totalStockUnits: totalMedUnits,
        },
        vaccines: {
          count: vaccines.length,
          totalDoses: totalVacDoses,
        },
        eggs: {
          totalEggs,
          crates: totalCrates,
          loose: totalLoose,
        },
      };
    } catch (err) {
      console.error('Error fetching specialized inventories summary:', err);
      return null;
    }
  },

  /**
   * Export inventory catalog to CSV
   */
  async exportInventoryCSV(filters = {}) {
    const items = await this.getItems(filters);

    const headers = [
      'Item ID',
      'Item Name',
      'Category',
      'Description',
      'Unit',
      'Current Quantity',
      'Minimum Level',
      'Reorder Level',
      'Unit Purchase Cost (NGN)',
      'Estimated Valuation (NGN)',
      'Storage Location',
      'Supplier',
      'Expiry Date',
      'Batch / Lot #',
      'Status',
      'Created At',
    ];

    const escapeCsv = (str) => {
      if (str === null || str === undefined) return '""';
      const s = String(str).replace(/"/g, '""');
      return `"${s}"`;
    };

    const rows = items.map((i) => [
      escapeCsv(i.itemId),
      escapeCsv(i.itemName || i.name),
      escapeCsv(i.category),
      escapeCsv(i.description),
      escapeCsv(i.unit),
      i.currentQuantity,
      i.minimumStockLevel,
      i.reorderLevel,
      Number(i.unitCost || 0).toFixed(2),
      Number(i.totalValuation || 0).toFixed(2),
      escapeCsv(i.storageLocation || i.location),
      escapeCsv(i.supplier),
      escapeCsv(i.expiryDate || ''),
      escapeCsv(i.batchLotNumber || ''),
      escapeCsv(i.status),
      escapeCsv(i.createdAt),
    ]);

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  },

  /**
   * Export stock movements ledger to CSV
   */
  async exportMovementsCSV(filters = {}) {
    const movements = await this.getMovements(filters);

    const headers = [
      'Movement ID',
      'Date',
      'Item ID',
      'Item Name',
      'Category',
      'Movement Type',
      'Quantity',
      'Unit',
      'Previous Balance',
      'New Balance',
      'Storage Location',
      'Reason / Reference',
      'Supplier',
      'Recorded By',
      'Created At',
    ];

    const escapeCsv = (str) => {
      if (str === null || str === undefined) return '""';
      const s = String(str).replace(/"/g, '""');
      return `"${s}"`;
    };

    const rows = movements.map((m) => [
      escapeCsv(m.movementId),
      escapeCsv(m.date || m.movementDate),
      escapeCsv(m.itemId),
      escapeCsv(m.itemName),
      escapeCsv(m.category),
      escapeCsv(m.movementType),
      m.quantity,
      escapeCsv(m.unit),
      m.previousBalance,
      m.newBalance,
      escapeCsv(m.storageLocation),
      escapeCsv(m.reason || m.referenceNumber),
      escapeCsv(m.supplier || ''),
      escapeCsv(m.recordedBy),
      escapeCsv(m.createdAt),
    ]);

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  },

  /**
   * Demo initial farm supplies seeding if table is empty
   */
  async seedDemoInventory() {
    try {
      const count = await db.inventory.count();
      if (count > 0) return false;

      const demo = [
        {
          itemName: 'Paper Egg Trays (30-Egg Capacity)',
          category: 'Packaging materials',
          description: 'Standard biodegradable cardboard egg packing trays',
          unit: 'pcs',
          currentQuantity: 350,
          minimumStockLevel: 100,
          reorderLevel: 200,
          storageLocation: 'Packaging Room',
          unitCost: 150,
          supplier: 'Crown Packaging Ltd',
        },
        {
          itemName: 'TH4+ Broad Spectrum Disinfectant',
          category: 'Disinfectants',
          description: 'Hospital grade biosecurity disinfectant for footbaths and pens',
          unit: 'liters',
          currentQuantity: 15,
          minimumStockLevel: 5,
          reorderLevel: 10,
          storageLocation: 'Chemical / Biosecurity Store',
          unitCost: 18500,
          supplier: 'Animal Care Services Konsult',
          expiryDate: '2027-12-31',
        },
        {
          itemName: 'Heavy-Duty Rubber Footwear Boots',
          category: 'Protective clothing',
          description: 'Farm worker biosecurity disinfection boots',
          unit: 'pairs',
          currentQuantity: 12,
          minimumStockLevel: 4,
          reorderLevel: 6,
          storageLocation: 'Main Store',
          unitCost: 6500,
          supplier: 'Industrial Safety Supplies',
        },
        {
          itemName: 'Automatic Poultry Bell Drinkers',
          category: 'Equipment',
          description: 'Plasson bell drinkers with hanging cords and ball valves',
          unit: 'sets',
          currentQuantity: 25,
          minimumStockLevel: 5,
          reorderLevel: 10,
          storageLocation: 'Tool Shed',
          unitCost: 4500,
          supplier: 'AgroTech Machinery Ltd',
        },
        {
          itemName: 'Generator Diesel Fuel',
          category: 'Fuel and other consumables',
          description: 'Low-sulfur automotive gas oil for standby farm power',
          unit: 'liters',
          currentQuantity: 120,
          minimumStockLevel: 50,
          reorderLevel: 100,
          storageLocation: 'Main Store',
          unitCost: 1150,
          supplier: 'Total Filling Station',
        },
      ];

      for (const d of demo) {
        await this.createItem(d);
      }
      return true;
    } catch (err) {
      console.error('Error seeding demo inventory:', err);
      return false;
    }
  },
};
