import { db } from '../database/db.js';

/**
 * Medication Product Types
 */
export const MEDICATION_TYPES = [
  'Antibiotic',
  'Antiparasitic',
  'Vitamin',
  'Supplement',
  'Antiseptic',
  'Pain Relief',
  'Other',
];

/**
 * Administration Routes
 */
export const ADMINISTRATION_ROUTES = [
  'Oral / Drinking Water',
  'Feed Additive',
  'Subcutaneous Injection',
  'Intramuscular Injection',
  'Topical',
  'Eye Drop',
  'Spray',
  'Other',
];

/**
 * Supported Measurement Units
 */
export const MEDICATION_UNITS = [
  'ml',
  'L',
  'g',
  'kg',
  'tablet',
  'bolus',
  'vial',
  'sachet',
  'bottle',
  'pack',
  'dose',
];

/**
 * Inventory Stock Statuses
 */
export const MEDICATION_STATUSES = ['In Stock', 'Low Stock', 'Out of Stock', 'Expired'];

/**
 * Treatment Administration Statuses
 */
export const TREATMENT_STATUSES = ['Completed', 'Ongoing', 'Scheduled'];

/**
 * Common Storage Conditions
 */
export const STORAGE_CONDITIONS = [
  'Store below 25°C in a dry place. Protect from light.',
  'Store in a cool dry place (15-25°C).',
  'Refrigerate at 2-8°C. Do not freeze.',
  'Store at room temperature away from direct sunlight.',
  'Store sealed in original container in ventilated cabinet.',
];

/**
 * Realistic Baseline Poultry Medication Inventory Seed Data (Nigerian Poultry Veterinary Standards)
 */
export const INITIAL_MEDICATIONS = [
  {
    medicationId: 'MED-0001',
    name: 'Tylodox Powder Fortified',
    type: 'Antibiotic',
    activeIngredient: 'Tylosin Tartrate 10% + Doxycycline HCl 10%',
    targetDisease: 'Chronic Respiratory Disease (CRD), Mycoplasmosis, Colibacillosis',
    dosage: '100g in 200 Litres of drinking water for 3 to 5 consecutive days',
    route: 'Oral / Drinking Water',
    unit: 'sachet',
    currentStock: 18,
    reorderLevel: 5,
    unitPrice: 3200,
    supplier: 'Animal Care Konsult Nigeria Ltd',
    lotNumber: 'TYL-2025-09B',
    expiryDate: new Date(Date.now() + 280 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    storageInstructions: 'Store below 25°C in a dry place. Protect from light.',
    withdrawalPeriodDays: 7,
    status: 'In Stock',
    notes: 'Do not administer to laying hens producing eggs for human consumption during treatment without strict withdrawal hold.',
  },
  {
    medicationId: 'MED-0002',
    name: 'Piperazine Dihydrochloride 100%',
    type: 'Antiparasitic',
    activeIngredient: 'Piperazine Citrate / Dihydrochloride 1000mg/g',
    targetDisease: 'Roundworms (Ascaridia galli), Cecal worms (Heterakis gallinarum)',
    dosage: '1g per 2 Litres of drinking water as a single morning dose',
    route: 'Oral / Drinking Water',
    unit: 'sachet',
    currentStock: 12,
    reorderLevel: 4,
    unitPrice: 1800,
    supplier: 'Kepro BV / Agrovet Solutions',
    lotNumber: 'PIP-2025-11A',
    expiryDate: new Date(Date.now() + 360 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    storageInstructions: 'Store in a cool dry place (15-25°C).',
    withdrawalPeriodDays: 2,
    status: 'In Stock',
    notes: 'Routine flock deworming every 6-8 weeks for free-range and deep litter birds.',
  },
  {
    medicationId: 'MED-0003',
    name: 'Amprolium 20% Soluble Powder',
    type: 'Antiparasitic',
    activeIngredient: 'Amprolium Hydrochloride 200mg/g',
    targetDisease: 'Coccidiosis (Eimeria tenella, E. necatrix, E. acervulina)',
    dosage: '30g per 50 Litres of drinking water for 5 to 7 days',
    route: 'Oral / Drinking Water',
    unit: 'sachet',
    currentStock: 25,
    reorderLevel: 6,
    unitPrice: 2400,
    supplier: 'Vital Agrochemicals Ltd',
    lotNumber: 'AMP-2025-04K',
    expiryDate: new Date(Date.now() + 190 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    storageInstructions: 'Store in a cool dry place (15-25°C).',
    withdrawalPeriodDays: 3,
    status: 'In Stock',
    notes: 'Do not mix with supplementary thiamine/vitamin B1 during acute coccidiosis treatment.',
  },
  {
    medicationId: 'MED-0004',
    name: 'Keproceril Water Soluble Powder',
    type: 'Antibiotic',
    activeIngredient: 'Oxytetracycline, Erythromycin, Streptomycin, Colistin + Vitamins A, D3, E, K3',
    targetDisease: 'Bacterial enteritis, Early chick mortality, Synovitis, Stress',
    dosage: '100g per 100 Litres of drinking water for 3 to 5 days',
    route: 'Oral / Drinking Water',
    unit: 'sachet',
    currentStock: 4,
    reorderLevel: 6,
    unitPrice: 4500,
    supplier: 'Kepro BV Holland / Chi Pharmaceuticals',
    lotNumber: 'KEP-2025-02Z',
    expiryDate: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    storageInstructions: 'Store below 25°C in a dry place. Protect from light.',
    withdrawalPeriodDays: 7,
    status: 'Low Stock',
    notes: 'Broad spectrum therapeutic combination for brooder reception stress and secondary bacterial infections.',
  },
  {
    medicationId: 'MED-0005',
    name: 'Amino Total + Electrolytes Liquid',
    type: 'Supplement',
    activeIngredient: 'Complex Amino Acids (17 Essential Aminos) + B-Complex + Potassium, Sodium',
    targetDisease: 'Heat stress, Poor weight gain, Post-vaccination recovery',
    dosage: '1ml per 2 Litres of drinking water for 3 to 5 days during heat stress',
    route: 'Oral / Drinking Water',
    unit: 'bottle',
    currentStock: 14,
    reorderLevel: 3,
    unitPrice: 6500,
    supplier: 'Livestock Feeds & Vet Supplies Ltd',
    lotNumber: 'AMT-2025-08L',
    expiryDate: new Date(Date.now() + 420 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    storageInstructions: 'Store below 25°C in a dry place. Protect from light.',
    withdrawalPeriodDays: 0,
    status: 'In Stock',
    notes: 'Zero withdrawal period for meat and eggs. Recommended during hot harmattan and peak laying stress.',
  },
  {
    medicationId: 'MED-0006',
    name: 'Oxytetracycline 20% L.A. Injectable',
    type: 'Antibiotic',
    activeIngredient: 'Oxytetracycline base 200mg/ml (Long Acting)',
    targetDisease: 'Severe Fowl Cholera, Infectious Coryza, Severe Septicemia',
    dosage: '0.25ml per 1kg body weight deep intramuscular or subcutaneous',
    route: 'Intramuscular Injection',
    unit: 'vial',
    currentStock: 2,
    reorderLevel: 5,
    unitPrice: 3800,
    supplier: 'Animal Care Konsult Nigeria Ltd',
    lotNumber: 'OTC-2025-01X',
    expiryDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    storageInstructions: 'Store below 25°C in a dry place. Protect from light.',
    withdrawalPeriodDays: 14,
    status: 'Low Stock',
    notes: 'Strict 14-day withdrawal for meat. Not recommended for commercial table egg layers in production.',
  },
  {
    medicationId: 'MED-0007',
    name: 'Betadine Veterinary Antiseptic Spray',
    type: 'Antiseptic',
    activeIngredient: 'Povidone-Iodine 10%',
    targetDisease: 'Pecking wounds, Cannibalism lesions, Foot pad dermatitis, Bumblefoot',
    dosage: 'Spray directly on cleaned wound 2 times daily until healed',
    route: 'Topical',
    unit: 'bottle',
    currentStock: 8,
    reorderLevel: 3,
    unitPrice: 2200,
    supplier: 'Zaveta Agro Allied Ltd',
    lotNumber: 'BET-2024-10Y',
    expiryDate: new Date(Date.now() + 210 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    storageInstructions: 'Store at room temperature away from direct sunlight.',
    withdrawalPeriodDays: 0,
    status: 'In Stock',
    notes: 'Topical biosecurity treatment with bitter taste to discourage further flock pecking.',
  },
];

/**
 * Compute the authoritative status of a medication product
 */
export function computeMedicationStatus(currentStock, reorderLevel, expiryDate) {
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
 * Compute the withdrawal end date given a start date and withdrawal days
 */
export function calculateWithdrawalEndDate(startDateStr, withdrawalDays) {
  const days = Math.max(0, parseInt(withdrawalDays, 10) || 0);
  const start = startDateStr ? new Date(startDateStr) : new Date();
  
  // Clone date and add withdrawal days
  const end = new Date(start.getTime());
  end.setDate(end.getDate() + days);

  return end.toISOString().slice(0, 10);
}

/**
 * FreshNest Medication Management Service
 * Offline-first pharmacy inventory, purchases, flock/bird treatments,
 * and food-safety withdrawal tracking.
 */
export const medicationService = {
  /**
   * Seed baseline medications if table is empty
   */
  async seedInitialMedicationsIfEmpty() {
    try {
      const count = await db.medications.count();
      if (count === 0) {
        for (const med of INITIAL_MEDICATIONS) {
          const status = computeMedicationStatus(med.currentStock, med.reorderLevel, med.expiryDate);
          await db.medications.add({
            ...med,
            status,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        }

        await db.farmSettings.put({
          key: 'last_medication_seq',
          value: INITIAL_MEDICATIONS.length,
          updatedAt: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.error('Error seeding initial medications:', err);
    }
  },

  /**
   * Generate next sequential Medication ID (e.g. MED-0001)
   */
  async generateNextMedicationId() {
    try {
      let settingSeq = 0;
      try {
        const setting = await db.farmSettings.get('last_medication_seq');
        if (setting && typeof setting.value === 'number') {
          settingSeq = setting.value;
        }
      } catch {
        // Fallback
      }

      const meds = await db.medications.toArray();
      let maxNumber = settingSeq;

      meds.forEach((m) => {
        const code = m.medicationId || m.code;
        if (code && typeof code === 'string') {
          const match = code.match(/MED-(\d+)/i);
          if (match && match[1]) {
            const num = parseInt(match[1], 10);
            if (!isNaN(num) && num > maxNumber) {
              maxNumber = num;
            }
          }
        }
      });

      const nextNumber = maxNumber + 1;
      return `MED-${String(nextNumber).padStart(4, '0')}`;
    } catch (err) {
      console.error('Error generating medication ID:', err);
      const rand = Math.floor(1000 + Math.random() * 9000);
      return `MED-${rand}`;
    }
  },

  /**
   * Generate next sequential Medication Purchase ID (e.g. MPUR-0001)
   */
  async generateNextPurchaseId() {
    try {
      let settingSeq = 0;
      try {
        const setting = await db.farmSettings.get('last_medication_purchase_seq');
        if (setting && typeof setting.value === 'number') {
          settingSeq = setting.value;
        }
      } catch {
        // Fallback
      }

      const purchases = await db.medicationPurchases.toArray();
      let maxNumber = settingSeq;

      purchases.forEach((p) => {
        const code = p.purchaseId || p.code;
        if (code && typeof code === 'string') {
          const match = code.match(/MPUR-(\d+)/i);
          if (match && match[1]) {
            const num = parseInt(match[1], 10);
            if (!isNaN(num) && num > maxNumber) {
              maxNumber = num;
            }
          }
        }
      });

      const nextNumber = maxNumber + 1;
      return `MPUR-${String(nextNumber).padStart(4, '0')}`;
    } catch (err) {
      console.error('Error generating medication purchase ID:', err);
      const rand = Math.floor(1000 + Math.random() * 9000);
      return `MPUR-${rand}`;
    }
  },

  /**
   * Generate next sequential Medication Treatment Log ID (e.g. MLOG-0001)
   */
  async generateNextLogId() {
    try {
      let settingSeq = 0;
      try {
        const setting = await db.farmSettings.get('last_medication_log_seq');
        if (setting && typeof setting.value === 'number') {
          settingSeq = setting.value;
        }
      } catch {
        // Fallback
      }

      const logs = await db.medicationLogs.toArray();
      let maxNumber = settingSeq;

      logs.forEach((l) => {
        const code = l.logId || l.code;
        if (code && typeof code === 'string') {
          const match = code.match(/MLOG-(\d+)/i);
          if (match && match[1]) {
            const num = parseInt(match[1], 10);
            if (!isNaN(num) && num > maxNumber) {
              maxNumber = num;
            }
          }
        }
      });

      const nextNumber = maxNumber + 1;
      return `MLOG-${String(nextNumber).padStart(4, '0')}`;
    } catch (err) {
      console.error('Error generating treatment log ID:', err);
      const rand = Math.floor(1000 + Math.random() * 9000);
      return `MLOG-${rand}`;
    }
  },

  /**
   * Validation function for Medication Products
   */
  validateMedication(data, _isUpdate = false) {
    const errors = {};

    if (!data.name || !data.name.trim()) {
      errors.name = 'Medication name is required';
    }

    if (!data.type || !MEDICATION_TYPES.includes(data.type)) {
      errors.type = `Please select a valid medication type (${MEDICATION_TYPES.join(', ')})`;
    }

    if (!data.unit || !MEDICATION_UNITS.includes(data.unit)) {
      errors.unit = `Please select a valid unit (${MEDICATION_UNITS.join(', ')})`;
    }

    if (data.currentStock === undefined || data.currentStock === null || isNaN(Number(data.currentStock)) || Number(data.currentStock) < 0) {
      errors.currentStock = 'Current stock must be a non-negative number';
    }

    if (data.reorderLevel === undefined || data.reorderLevel === null || isNaN(Number(data.reorderLevel)) || Number(data.reorderLevel) < 0) {
      errors.reorderLevel = 'Reorder level must be a non-negative number';
    }

    if (data.unitPrice !== undefined && data.unitPrice !== null && (isNaN(Number(data.unitPrice)) || Number(data.unitPrice) < 0)) {
      errors.unitPrice = 'Unit price must be a non-negative number in Naira (₦)';
    }

    if (data.withdrawalPeriodDays !== undefined && data.withdrawalPeriodDays !== null && (isNaN(Number(data.withdrawalPeriodDays)) || Number(data.withdrawalPeriodDays) < 0)) {
      errors.withdrawalPeriodDays = 'Withdrawal period must be a non-negative number of days';
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
    };
  },

  /**
   * Get all medications with optional filtering
   */
  async getMedications(filters = {}) {
    try {
      let items = await db.medications.toArray();

      // Recalculate status dynamically in case dates have expired
      items = items.map((item) => ({
        ...item,
        status: computeMedicationStatus(item.currentStock, item.reorderLevel, item.expiryDate),
      }));

      if (filters.search) {
        const q = filters.search.toLowerCase().trim();
        items = items.filter((m) =>
          (m.name && m.name.toLowerCase().includes(q)) ||
          (m.medicationId && m.medicationId.toLowerCase().includes(q)) ||
          (m.activeIngredient && m.activeIngredient.toLowerCase().includes(q)) ||
          (m.targetDisease && m.targetDisease.toLowerCase().includes(q)) ||
          (m.supplier && m.supplier.toLowerCase().includes(q))
        );
      }

      if (filters.type && filters.type !== 'All') {
        items = items.filter((m) => m.type === filters.type);
      }

      if (filters.status && filters.status !== 'All') {
        items = items.filter((m) => m.status === filters.status);
      }

      return items.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    } catch (err) {
      console.error('Error fetching medications:', err);
      return [];
    }
  },

  /**
   * Get a single medication by ID (numeric or code)
   */
  async getMedicationById(idOrCode) {
    try {
      if (!idOrCode) return null;

      // Try numeric ID first
      if (typeof idOrCode === 'number' || !isNaN(Number(idOrCode))) {
        const item = await db.medications.get(Number(idOrCode));
        if (item) {
          return {
            ...item,
            status: computeMedicationStatus(item.currentStock, item.reorderLevel, item.expiryDate),
          };
        }
      }

      // Try string code (MED-XXXX)
      const item = await db.medications.where('medicationId').equals(String(idOrCode)).first();
      if (item) {
        return {
          ...item,
          status: computeMedicationStatus(item.currentStock, item.reorderLevel, item.expiryDate),
        };
      }

      return null;
    } catch (err) {
      console.error('Error fetching medication by ID:', err);
      return null;
    }
  },

  /**
   * Create a new medication product in the pharmacy catalog
   */
  async createMedication(data) {
    const validation = this.validateMedication(data);
    if (!validation.isValid) {
      const err = new Error('Validation failed');
      err.errors = validation.errors;
      throw err;
    }

    const medicationId = data.medicationId || (await this.generateNextMedicationId());
    const stock = Number(data.currentStock) || 0;
    const reorder = Number(data.reorderLevel) || 0;
    const status = computeMedicationStatus(stock, reorder, data.expiryDate);

    const record = {
      medicationId,
      name: data.name.trim(),
      type: data.type,
      activeIngredient: (data.activeIngredient || '').trim(),
      targetDisease: (data.targetDisease || '').trim(),
      dosage: (data.dosage || '').trim(),
      route: data.route || 'Oral / Drinking Water',
      unit: data.unit || 'sachet',
      currentStock: stock,
      reorderLevel: reorder,
      unitPrice: Number(data.unitPrice) || 0,
      supplier: (data.supplier || '').trim(),
      lotNumber: (data.lotNumber || '').trim(),
      expiryDate: data.expiryDate || '',
      storageInstructions: (data.storageInstructions || '').trim(),
      withdrawalPeriodDays: parseInt(data.withdrawalPeriodDays, 10) || 0,
      status,
      notes: (data.notes || '').trim(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const newId = await db.medications.add(record);

    // Update sequence in farmSettings
    const match = medicationId.match(/MED-(\d+)/i);
    if (match && match[1]) {
      const num = parseInt(match[1], 10);
      try {
        const currentSetting = await db.farmSettings.get('last_medication_seq');
        const currentVal = currentSetting ? currentSetting.value : 0;
        if (num > currentVal) {
          await db.farmSettings.put({
            key: 'last_medication_seq',
            value: num,
            updatedAt: new Date().toISOString(),
          });
        }
      } catch {
        // Ignore setting update failure
      }
    }

    return { ...record, id: newId };
  },

  /**
   * Update an existing medication product
   */
  async updateMedication(id, updates) {
    const existing = await this.getMedicationById(id);
    if (!existing) {
      throw new Error(`Medication record #${id} not found.`);
    }

    const merged = { ...existing, ...updates };
    const validation = this.validateMedication(merged, true);
    if (!validation.isValid) {
      const err = new Error('Validation failed');
      err.errors = validation.errors;
      throw err;
    }

    const currentStock = Number(merged.currentStock) || 0;
    const reorderLevel = Number(merged.reorderLevel) || 0;
    const status = computeMedicationStatus(currentStock, reorderLevel, merged.expiryDate);

    const cleanUpdates = {
      name: merged.name.trim(),
      type: merged.type,
      activeIngredient: (merged.activeIngredient || '').trim(),
      targetDisease: (merged.targetDisease || '').trim(),
      dosage: (merged.dosage || '').trim(),
      route: merged.route,
      unit: merged.unit,
      currentStock,
      reorderLevel,
      unitPrice: Number(merged.unitPrice) || 0,
      supplier: (merged.supplier || '').trim(),
      lotNumber: (merged.lotNumber || '').trim(),
      expiryDate: merged.expiryDate || '',
      storageInstructions: (merged.storageInstructions || '').trim(),
      withdrawalPeriodDays: parseInt(merged.withdrawalPeriodDays, 10) || 0,
      status,
      notes: (merged.notes || '').trim(),
      updatedAt: new Date().toISOString(),
    };

    await db.medications.update(existing.id, cleanUpdates);
    return { ...existing, ...cleanUpdates };
  },

  /**
   * Safely delete a medication.
   * Prevents deletion if the medication has associated purchase records or treatment logs.
   */
  async deleteMedication(id) {
    const existing = await this.getMedicationById(id);
    if (!existing) {
      throw new Error(`Medication record #${id} not found.`);
    }

    // Check for linked purchases
    const purchaseCount = await db.medicationPurchases
      .where('medicationId')
      .equals(existing.medicationId)
      .count();

    if (purchaseCount > 0) {
      throw new Error(
        `Cannot delete medication "${existing.name}" because it has ${purchaseCount} linked stock-in purchase record(s). To preserve accounting records, archive or set stock to 0 instead.`
      );
    }

    // Check for linked treatment logs
    const logCount = await db.medicationLogs
      .where('medicationId')
      .equals(existing.medicationId)
      .count();

    if (logCount > 0) {
      throw new Error(
        `Cannot delete medication "${existing.name}" because it has ${logCount} linked flock treatment log(s). Food safety audit rules require keeping treatment records intact.`
      );
    }

    await db.medications.delete(existing.id);
    return { success: true, deletedId: existing.id, medicationId: existing.medicationId };
  },

  /**
   * Record a Stock-In Medication Purchase with atomic stock incrementation
   */
  async recordMedicationPurchase(purchaseData) {
    const medId = purchaseData.medicationId;
    const qty = Number(purchaseData.quantity);
    const cost = Number(purchaseData.unitCost);

    if (!medId) {
      throw new Error('Please select a medication to restock.');
    }

    if (isNaN(qty) || qty <= 0) {
      throw new Error('Purchase quantity must be greater than zero.');
    }

    if (isNaN(cost) || cost < 0) {
      throw new Error('Unit cost in Naira (₦) must be a non-negative number.');
    }

    if (!purchaseData.purchaseDate) {
      throw new Error('Purchase date is required.');
    }

    if (!purchaseData.supplier || !purchaseData.supplier.trim()) {
      throw new Error('Supplier name is required for purchase audits.');
    }

    // Run in atomic Dexie transaction
    return await db.transaction('rw', [db.medications, db.medicationPurchases, db.farmSettings], async () => {
      // Find medication by medicationId or numeric id
      let med = await db.medications.where('medicationId').equals(medId).first();
      if (!med && !isNaN(Number(medId))) {
        med = await db.medications.get(Number(medId));
      }

      if (!med) {
        throw new Error(`Medication record with identifier "${medId}" does not exist.`);
      }

      // Check duplicate invoice if provided
      if (purchaseData.invoiceNumber && purchaseData.invoiceNumber.trim()) {
        const inv = purchaseData.invoiceNumber.trim();
        const existingInv = await db.medicationPurchases
          .where('invoiceNumber')
          .equals(inv)
          .first();

        if (existingInv && existingInv.supplier.toLowerCase() === purchaseData.supplier.trim().toLowerCase()) {
          throw new Error(`Invoice #${inv} from supplier "${purchaseData.supplier}" has already been recorded.`);
        }
      }

      const purchaseId = purchaseData.purchaseId || (await this.generateNextPurchaseId());
      const totalCost = Number((qty * cost).toFixed(2));

      // Calculate new stock
      const newStock = Number((Number(med.currentStock || 0) + qty).toFixed(2));
      const updatedExpiry = purchaseData.expiryDate || med.expiryDate || '';
      const newStatus = computeMedicationStatus(newStock, med.reorderLevel, updatedExpiry);

      // 1. Update Medication Record
      await db.medications.update(med.id, {
        currentStock: newStock,
        unitPrice: cost > 0 ? cost : med.unitPrice,
        lotNumber: purchaseData.lotNumber ? purchaseData.lotNumber.trim() : med.lotNumber,
        expiryDate: updatedExpiry,
        status: newStatus,
        updatedAt: new Date().toISOString(),
      });

      // 2. Insert Purchase Ledger Entry
      const purchaseRecord = {
        purchaseId,
        medicationId: med.medicationId,
        medicationName: med.name,
        quantity: qty,
        unit: med.unit,
        unitCost: cost,
        totalCost,
        purchaseDate: purchaseData.purchaseDate,
        supplier: purchaseData.supplier.trim(),
        invoiceNumber: (purchaseData.invoiceNumber || '').trim(),
        lotNumber: (purchaseData.lotNumber || '').trim(),
        expiryDate: updatedExpiry,
        notes: (purchaseData.notes || '').trim(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const newPurchaseKey = await db.medicationPurchases.add(purchaseRecord);

      // 3. Update Sequence
      const match = purchaseId.match(/MPUR-(\d+)/i);
      if (match && match[1]) {
        const num = parseInt(match[1], 10);
        try {
          const currentSetting = await db.farmSettings.get('last_medication_purchase_seq');
          const currentVal = currentSetting ? currentSetting.value : 0;
          if (num > currentVal) {
            await db.farmSettings.put({
              key: 'last_medication_purchase_seq',
              value: num,
              updatedAt: new Date().toISOString(),
            });
          }
        } catch {
          // Ignore
        }
      }

      return {
        ...purchaseRecord,
        id: newPurchaseKey,
        updatedMedicationStock: newStock,
      };
    });
  },

  /**
   * Administer Medication Treatment (Stock-Out)
   * Linked to Batch OR Individual Bird with atomic stock decrement,
   * negative stock prevention, biosecurity expiration block, and automatic withdrawal tracking.
   */
  async administerMedication(adminData, options = {}) {
    const { overrideExpired = false } = options;
    const medId = adminData.medicationId;
    const qty = Number(adminData.quantity);

    if (!medId) {
      throw new Error('Please select a medication product.');
    }

    if (isNaN(qty) || qty <= 0) {
      throw new Error('Treatment quantity / dosage used must be greater than zero.');
    }

    if (!adminData.administeredDate) {
      throw new Error('Treatment administration date is required.');
    }

    if (!adminData.administeredBy || !adminData.administeredBy.trim()) {
      throw new Error('Administering staff / operator name is required for veterinary auditing.');
    }

    const targetType = adminData.targetType || (adminData.batchId ? 'batch' : (adminData.birdId ? 'bird' : ''));
    if (!targetType || (targetType !== 'batch' && targetType !== 'bird')) {
      throw new Error('Treatment must be assigned to either a Batch or an Individual Bird.');
    }

    if (targetType === 'batch' && !adminData.batchId) {
      throw new Error('Please select an active Batch for this flock treatment.');
    }

    if (targetType === 'bird' && !adminData.birdId) {
      throw new Error('Please select an Individual Bird for this treatment.');
    }

    // Atomic transaction
    return await db.transaction('rw', [db.medications, db.medicationLogs, db.batches, db.birds, db.farmSettings], async () => {
      // Find medication
      let med = await db.medications.where('medicationId').equals(medId).first();
      if (!med && !isNaN(Number(medId))) {
        med = await db.medications.get(Number(medId));
      }

      if (!med) {
        throw new Error(`Medication record with identifier "${medId}" does not exist.`);
      }

      const todayStr = new Date().toISOString().slice(0, 10);

      // Biosecurity Check: Expired medication block
      if (med.expiryDate && med.expiryDate < todayStr && !overrideExpired) {
        const biosecurityErr = new Error(
          `Biosecurity Alert: Medication "${med.name}" expired on ${med.expiryDate}. Administering expired drugs risks flock treatment failure and bacterial resistance. Administration blocked unless emergency override is confirmed.`
        );
        biosecurityErr.isExpiredBlock = true;
        biosecurityErr.expiryDate = med.expiryDate;
        biosecurityErr.medicationName = med.name;
        throw biosecurityErr;
      }

      // Stock Check: Negative stock prevention
      const currentStock = Number(med.currentStock) || 0;
      if (currentStock < qty) {
        throw new Error(
          `Insufficient stock. Current inventory has ${currentStock} ${med.unit || 'units'} of "${med.name}", but treatment requires ${qty} ${med.unit || 'units'}. Please restock before logging administration.`
        );
      }

      // Resolve Target Name / Details
      let batchRecord = null;
      let birdRecord = null;
      let targetDisplay;

      if (targetType === 'batch') {
        const bId = adminData.batchId;
        batchRecord = await db.batches.where('batchId').equals(bId).first();
        if (!batchRecord && !isNaN(Number(bId))) {
          batchRecord = await db.batches.get(Number(bId));
        }
        targetDisplay = batchRecord ? `Batch ${batchRecord.batchId || batchRecord.batchCode} (${batchRecord.name || batchRecord.birdType || 'Flock'})` : `Batch #${bId}`;
      } else {
        const bId = adminData.birdId;
        birdRecord = await db.birds.where('birdId').equals(bId).first();
        if (!birdRecord && !isNaN(Number(bId))) {
          birdRecord = await db.birds.get(Number(bId));
        }
        targetDisplay = birdRecord ? `Bird ${birdRecord.birdId || birdRecord.tagNumber} (${birdRecord.name || birdRecord.breed || 'Bird'})` : `Bird #${bId}`;
      }

      // Calculate Withdrawal End Date
      const withdrawalDays = adminData.withdrawalPeriodDays !== undefined && adminData.withdrawalPeriodDays !== null && !isNaN(Number(adminData.withdrawalPeriodDays))
        ? parseInt(adminData.withdrawalPeriodDays, 10)
        : parseInt(med.withdrawalPeriodDays || 0, 10);

      const withdrawalEndDate = calculateWithdrawalEndDate(adminData.administeredDate, withdrawalDays);

      // Decrement Medication Inventory
      const newStock = Number((currentStock - qty).toFixed(2));
      const newStatus = computeMedicationStatus(newStock, med.reorderLevel, med.expiryDate);

      await db.medications.update(med.id, {
        currentStock: newStock,
        status: newStatus,
        updatedAt: new Date().toISOString(),
      });

      // Generate Log ID
      const logId = adminData.logId || (await this.generateNextLogId());

      // Create Medication Log
      const logEntry = {
        logId,
        targetType,
        batchId: targetType === 'batch' ? (batchRecord ? (batchRecord.batchId || batchRecord.id) : adminData.batchId) : null,
        birdId: targetType === 'bird' ? (birdRecord ? (birdRecord.birdId || birdRecord.id) : adminData.birdId) : null,
        targetDisplay,
        medicationId: med.medicationId,
        medicationName: med.name,
        dosageGiven: (adminData.dosageGiven || `${qty} ${med.unit}`).trim(),
        quantity: qty,
        unit: med.unit,
        route: adminData.route || med.route || 'Oral / Drinking Water',
        reason: (adminData.reason || '').trim(),
        administeredDate: adminData.administeredDate,
        date: adminData.administeredDate,
        administeredBy: adminData.administeredBy.trim(),
        withdrawalPeriodDays: withdrawalDays,
        withdrawalEndDate,
        status: adminData.status || 'Completed',
        notes: (adminData.notes || '').trim(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const newLogKey = await db.medicationLogs.add(logEntry);

      // Update sequence
      const match = logId.match(/MLOG-(\d+)/i);
      if (match && match[1]) {
        const num = parseInt(match[1], 10);
        try {
          const currentSetting = await db.farmSettings.get('last_medication_log_seq');
          const currentVal = currentSetting ? currentSetting.value : 0;
          if (num > currentVal) {
            await db.farmSettings.put({
              key: 'last_medication_log_seq',
              value: num,
              updatedAt: new Date().toISOString(),
            });
          }
        } catch {
          // Ignore
        }
      }

      return {
        ...logEntry,
        id: newLogKey,
        updatedMedicationStock: newStock,
      };
    });
  },

  /**
   * Get all medication treatment logs with filters
   */
  async getMedicationLogs(filters = {}) {
    try {
      let logs = await db.medicationLogs.toArray();

      if (filters.medicationId) {
        logs = logs.filter((l) => l.medicationId === filters.medicationId);
      }

      if (filters.batchId) {
        logs = logs.filter((l) => String(l.batchId) === String(filters.batchId));
      }

      if (filters.birdId) {
        logs = logs.filter((l) => String(l.birdId) === String(filters.birdId));
      }

      if (filters.targetType && filters.targetType !== 'All') {
        logs = logs.filter((l) => l.targetType === filters.targetType);
      }

      if (filters.search) {
        const q = filters.search.toLowerCase().trim();
        logs = logs.filter((l) =>
          (l.logId && l.logId.toLowerCase().includes(q)) ||
          (l.medicationName && l.medicationName.toLowerCase().includes(q)) ||
          (l.targetDisplay && l.targetDisplay.toLowerCase().includes(q)) ||
          (l.reason && l.reason.toLowerCase().includes(q)) ||
          (l.administeredBy && l.administeredBy.toLowerCase().includes(q))
        );
      }

      return logs.sort((a, b) => {
        const dateA = a.administeredDate || a.date || a.createdAt || '';
        const dateB = b.administeredDate || b.date || b.createdAt || '';
        return dateB.localeCompare(dateA);
      });
    } catch (err) {
      console.error('Error fetching medication logs:', err);
      return [];
    }
  },

  /**
   * Get all medication purchases
   */
  async getMedicationPurchases(filters = {}) {
    try {
      let purchases = await db.medicationPurchases.toArray();

      if (filters.medicationId) {
        purchases = purchases.filter((p) => p.medicationId === filters.medicationId);
      }

      if (filters.search) {
        const q = filters.search.toLowerCase().trim();
        purchases = purchases.filter((p) =>
          (p.purchaseId && p.purchaseId.toLowerCase().includes(q)) ||
          (p.medicationName && p.medicationName.toLowerCase().includes(q)) ||
          (p.supplier && p.supplier.toLowerCase().includes(q)) ||
          (p.invoiceNumber && p.invoiceNumber.toLowerCase().includes(q))
        );
      }

      return purchases.sort((a, b) => (b.purchaseDate || '').localeCompare(a.purchaseDate || ''));
    } catch (err) {
      console.error('Error fetching medication purchases:', err);
      return [];
    }
  },

  /**
   * Food Safety & Withdrawal Tracking:
   * Query all active withdrawal restrictions currently in effect across the farm
   */
  async getActiveWithdrawalRestrictions() {
    try {
      const todayStr = new Date().toISOString().slice(0, 10);
      const now = new Date();

      const logs = await db.medicationLogs.toArray();

      // Filter logs where withdrawal period was > 0 and withdrawalEndDate >= today
      const activeList = [];

      for (const log of logs) {
        if (!log.withdrawalEndDate || log.withdrawalPeriodDays <= 0) continue;

        if (log.withdrawalEndDate >= todayStr) {
          const endDate = new Date(`${log.withdrawalEndDate}T23:59:59`);
          const diffMs = endDate.getTime() - now.getTime();
          const daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

          activeList.push({
            id: log.id,
            logId: log.logId,
            targetType: log.targetType,
            batchId: log.batchId,
            birdId: log.birdId,
            targetDisplay: log.targetDisplay || (log.batchId ? `Batch #${log.batchId}` : `Bird #${log.birdId}`),
            medicationId: log.medicationId,
            medicationName: log.medicationName,
            dosageGiven: log.dosageGiven,
            administeredDate: log.administeredDate || log.date,
            withdrawalPeriodDays: log.withdrawalPeriodDays,
            withdrawalEndDate: log.withdrawalEndDate,
            daysRemaining,
            isRestricted: true,
            warningNotice: `DO NOT SELL / CONSUME EGGS OR MEAT - WITHDRAWAL ACTIVE UNTIL ${log.withdrawalEndDate} (${daysRemaining} day${daysRemaining === 1 ? '' : 's'} remaining)`,
          });
        }
      }

      // Sort by soonest expiring restriction first
      return activeList.sort((a, b) => a.withdrawalEndDate.localeCompare(b.withdrawalEndDate));
    } catch (err) {
      console.error('Error fetching active withdrawal restrictions:', err);
      return [];
    }
  },

  /**
   * Check if a specific batch is currently under medication withdrawal
   */
  async isBatchUnderWithdrawal(batchId) {
    if (!batchId) return false;
    const activeRestrictions = await this.getActiveWithdrawalRestrictions();
    return activeRestrictions.some(
      (r) => r.targetType === 'batch' && String(r.batchId) === String(batchId)
    );
  },

  /**
   * Check if a specific bird is currently under medication withdrawal
   */
  async isBirdUnderWithdrawal(birdId) {
    if (!birdId) return false;
    const activeRestrictions = await this.getActiveWithdrawalRestrictions();
    return activeRestrictions.some(
      (r) => r.targetType === 'bird' && String(r.birdId) === String(birdId)
    );
  },

  /**
   * Compute comprehensive medication module statistics
   */
  async getMedicationStatistics() {
    try {
      const todayStr = new Date().toISOString().slice(0, 10);
      const [medications, logs] = await Promise.all([
        db.medications.toArray(),
        db.medicationLogs.toArray(),
      ]);

      const totalProducts = medications.length;
      let totalStock = 0;
      let totalInventoryValue = 0;
      let lowStockCount = 0;
      let outOfStockCount = 0;
      let expiredCount = 0;

      medications.forEach((m) => {
        const stock = Number(m.currentStock) || 0;
        const price = Number(m.unitPrice) || 0;
        const reorder = Number(m.reorderLevel) || 0;

        totalStock += stock;
        totalInventoryValue += stock * price;

        const status = computeMedicationStatus(stock, reorder, m.expiryDate);
        if (status === 'Expired') {
          expiredCount++;
        } else if (status === 'Out of Stock') {
          outOfStockCount++;
        } else if (status === 'Low Stock') {
          lowStockCount++;
        }
      });

      // Active withdrawal restrictions count
      const activeWithdrawals = logs.filter(
        (l) => l.withdrawalPeriodDays > 0 && l.withdrawalEndDate && l.withdrawalEndDate >= todayStr
      ).length;

      return {
        totalProducts,
        totalStock: Number(totalStock.toFixed(2)),
        totalTreatments: logs.length,
        activeWithdrawals,
        lowStockCount,
        outOfStockCount,
        expiredCount,
        totalInventoryValue: Number(totalInventoryValue.toFixed(2)),
      };
    } catch (err) {
      console.error('Error calculating medication statistics:', err);
      return {
        totalProducts: 0,
        totalStock: 0,
        totalTreatments: 0,
        activeWithdrawals: 0,
        lowStockCount: 0,
        outOfStockCount: 0,
        expiredCount: 0,
        totalInventoryValue: 0,
      };
    }
  },

  /**
   * Get Medication Alerts (Low stock, out of stock, expiring soon, expired)
   */
  async getMedicationAlerts() {
    try {
      const medications = await db.medications.toArray();
      const alerts = [];
      const todayStr = new Date().toISOString().slice(0, 10);
      const thirtyDaysAhead = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

      medications.forEach((med) => {
        const stock = Number(med.currentStock) || 0;
        const reorder = Number(med.reorderLevel) || 0;

        // 1. Expired Alert
        if (med.expiryDate && med.expiryDate < todayStr) {
          alerts.push({
            id: `med-exp-${med.id}`,
            medicationId: med.medicationId,
            type: 'expired',
            severity: 'danger',
            title: `Expired Medication: ${med.name}`,
            message: `Expired on ${med.expiryDate}. Biosecurity alert: discard safely.`,
            expiryDate: med.expiryDate,
          });
        }
        // 2. Expiring Soon Alert (within 30 days)
        else if (med.expiryDate && med.expiryDate <= thirtyDaysAhead) {
          alerts.push({
            id: `med-exp-soon-${med.id}`,
            medicationId: med.medicationId,
            type: 'expiring_soon',
            severity: 'warning',
            title: `Expiring Soon: ${med.name}`,
            message: `Expires on ${med.expiryDate}. Plan utilization before expiration.`,
            expiryDate: med.expiryDate,
          });
        }

        // 3. Out of stock / Low stock Alert
        if (stock <= 0) {
          alerts.push({
            id: `med-oos-${med.id}`,
            medicationId: med.medicationId,
            type: 'out_of_stock',
            severity: 'danger',
            title: `Out of Stock: ${med.name}`,
            message: `Inventory is at 0 ${med.unit}. Restock urgently.`,
            currentStock: stock,
          });
        } else if (stock <= reorder) {
          alerts.push({
            id: `med-low-${med.id}`,
            medicationId: med.medicationId,
            type: 'low_stock',
            severity: 'warning',
            title: `Low Stock: ${med.name}`,
            message: `Current stock: ${stock} ${med.unit} (Reorder threshold: ${reorder} ${med.unit}).`,
            currentStock: stock,
          });
        }
      });

      return alerts;
    } catch (err) {
      console.error('Error calculating medication alerts:', err);
      return [];
    }
  },
};
