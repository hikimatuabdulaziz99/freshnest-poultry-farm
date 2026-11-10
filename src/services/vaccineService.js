import { db } from '../database/db.js';

/**
 * Vaccine Types
 */
export const VACCINE_TYPES = [
  'Live Attenuated',
  'Inactivated / Killed',
  'Recombinant',
  'Toxoid',
  'Subunit',
  'Other',
];

/**
 * Administration Methods
 */
export const ADMINISTRATION_METHODS = [
  'Drinking Water',
  'Eye Drop',
  'Injection / Subcutaneous',
  'Injection / Intramuscular',
  'Wing Web Stab',
  'Spray / Aerosol',
  'Other',
];

/**
 * Measurement Units and Pack Sizes
 */
export const VACCINE_UNITS = ['doses', 'vials', 'vial', 'ampoules', 'ampoule', 'ml', 'bottles', 'bottle'];

/**
 * Vaccine Stock Statuses
 */
export const VACCINE_STATUSES = ['In Stock', 'Low Stock', 'Out of Stock', 'Expired'];

/**
 * Vaccination Schedule Statuses
 */
export const SCHEDULE_STATUSES = ['Scheduled', 'Due', 'Completed', 'Overdue', 'Cancelled'];

/**
 * Common Poultry Target Diseases
 */
export const TARGET_DISEASES = [
  "Marek's Disease",
  "Newcastle Disease (ND)",
  "Infectious Bursal Disease (Gumboro)",
  "Infectious Bronchitis (IB)",
  "Fowl Pox",
  "Fowl Typhoid / Salmonella",
  "Egg Drop Syndrome (EDS)",
  "Fowl Cholera",
  "Infectious Coryza",
  "Coccidiosis",
  "Other",
];

/**
 * Recommended Storage Conditions
 */
export const STORAGE_TEMPERATURES = [
  '2°C to 8°C (Refrigerated Cold Chain)',
  'Liquid Nitrogen / -196°C (Cryogenic)',
  '-20°C (Frozen Cold Chain)',
  'Cool Dry Place (below 25°C)',
  'Protect from Direct Sunlight & Heat',
];

/**
 * Suggested Standard Vaccination Schedule Templates (Reference Examples)
 * NOTE: Clearly labeled as examples requiring veterinary confirmation.
 */
export const SUGGESTED_SCHEDULE_TEMPLATES = [
  {
    targetAgeDays: 1,
    disease: "Marek's Disease",
    vaccineName: "Marek's Disease Vaccine (HVT)",
    method: 'Injection / Subcutaneous',
    notes: 'Administer at hatchery or arrival Day 1. (Example template - verify with veterinarian)',
  },
  {
    targetAgeDays: 1,
    disease: 'Newcastle Disease (ND)',
    vaccineName: 'Newcastle + Infectious Bronchitis (ND+IB)',
    method: 'Eye Drop',
    notes: 'Primary ND+IB ocular or coarse spray at Day 1. (Example template - verify with veterinarian)',
  },
  {
    targetAgeDays: 8,
    disease: 'Infectious Bursal Disease (Gumboro)',
    vaccineName: 'Gumboro Vaccine (IBD Intermediate)',
    method: 'Drinking Water',
    notes: 'First Gumboro booster via skim milk stabilizer. (Example template - verify with veterinarian)',
  },
  {
    targetAgeDays: 14,
    disease: 'Newcastle Disease (ND)',
    vaccineName: 'Newcastle Disease Vaccine (LaSota)',
    method: 'Drinking Water',
    notes: 'First LaSota booster via drinking water. (Example template - verify with veterinarian)',
  },
  {
    targetAgeDays: 21,
    disease: 'Infectious Bursal Disease (Gumboro)',
    vaccineName: 'Gumboro Vaccine (IBD Intermediate Plus)',
    method: 'Drinking Water',
    notes: 'Second Gumboro booster. (Example template - verify with veterinarian)',
  },
  {
    targetAgeDays: 28,
    disease: 'Newcastle Disease (ND)',
    vaccineName: 'Newcastle Disease Vaccine (LaSota)',
    method: 'Drinking Water',
    notes: 'Second LaSota booster for growing broilers and pullets. (Example template - verify with veterinarian)',
  },
  {
    targetAgeDays: 42,
    disease: 'Fowl Pox',
    vaccineName: 'Fowl Pox Live Vaccine',
    method: 'Wing Web Stab',
    notes: 'Inspect wing web for "take" swellings after 7-10 days. (Example template - verify with veterinarian)',
  },
  {
    targetAgeDays: 56,
    disease: 'Fowl Typhoid / Salmonella',
    vaccineName: 'Fowl Typhoid Vaccine (9R)',
    method: 'Injection / Subcutaneous',
    notes: 'Pullet development immunisation. (Example template - verify with veterinarian)',
  },
  {
    targetAgeDays: 112,
    disease: 'Egg Drop Syndrome (EDS)',
    vaccineName: 'Coryza + EDS Inactivated Oil Emulsion',
    method: 'Injection / Intramuscular',
    notes: 'Pre-lay protective killed booster for layers/breeders. (Example template - verify with veterinarian)',
  },
];

/**
 * Baseline Vaccine Catalog Seed Data (Compliant with Nigerian NVRI Vom & International Veterinary Standards)
 */
export const INITIAL_VACCINES = [
  {
    vaccineId: 'VAC-0001',
    name: 'Newcastle Disease Vaccine (LaSota Strain)',
    targetDisease: 'Newcastle Disease (ND)',
    manufacturer: 'National Veterinary Research Institute (NVRI) Vom',
    vaccineType: 'Live Attenuated',
    administrationMethod: 'Drinking Water',
    dosageInstructions: '1 vial (1,000 doses) mixed with 20 to 40 Litres non-chlorinated well water with 2g/L skimmed milk stabilizer.',
    recommendedAgeDays: 14,
    unit: 'doses',
    packSize: '1,000 doses/vial',
    currentStock: 4000,
    reorderLevel: 1000,
    unitPrice: 2.2, // ₦2.20 per dose (₦2,200/vial)
    supplier: 'NVRI Vom Agrovet Depot Ibadan',
    lotNumber: 'NVRI-ND-2025-08',
    expiryDate: new Date(Date.now() + 240 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    storageTemperature: '2°C to 8°C (Refrigerated Cold Chain)',
    status: 'In Stock',
    notes: 'Maintain strict cold chain in insulated cooler with ice packs during transport. Discard mixed solution after 2 hours.',
  },
  {
    vaccineId: 'VAC-0002',
    name: 'Gumboro Vaccine (IBD Intermediate Plus)',
    targetDisease: 'Infectious Bursal Disease (Gumboro)',
    manufacturer: 'Laboratorios Hipra / NVRI Vom',
    vaccineType: 'Live Attenuated',
    administrationMethod: 'Drinking Water',
    dosageInstructions: '1,000 doses diluted in cool clean water with chlorine neutralizer for flocks 14 to 21 days old.',
    recommendedAgeDays: 18,
    unit: 'doses',
    packSize: '1,000 doses/vial',
    currentStock: 3000,
    reorderLevel: 1000,
    unitPrice: 2.5,
    supplier: 'Animal Care Konsult Vet Services',
    lotNumber: 'GUM-2025-05A',
    expiryDate: new Date(Date.now() + 210 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    storageTemperature: '2°C to 8°C (Refrigerated Cold Chain)',
    status: 'In Stock',
    notes: 'Withdraw flock drinking water for 1.5 to 2 hours prior to vaccination to ensure rapid uniform consumption.',
  },
  {
    vaccineId: 'VAC-0003',
    name: "Marek's Disease Vaccine (HVT Lyophilized)",
    targetDisease: "Marek's Disease",
    manufacturer: 'Boehringer Ingelheim / Merial',
    vaccineType: 'Live Attenuated',
    administrationMethod: 'Injection / Subcutaneous',
    dosageInstructions: '0.2ml per chick administered subcutaneously in the nape of the neck on Day 1.',
    recommendedAgeDays: 1,
    unit: 'doses',
    packSize: '1,000 doses/vial',
    currentStock: 1000,
    reorderLevel: 1000,
    unitPrice: 3.8,
    supplier: 'Chi Pharmaceuticals Veterinary Wing',
    lotNumber: 'MRK-2025-03H',
    expiryDate: new Date(Date.now() + 300 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    storageTemperature: '2°C to 8°C (Refrigerated Cold Chain)',
    status: 'Low Stock',
    notes: 'Critical day-old hatchery vaccination against neural Marek paralysis and lymphomatosis.',
  },
  {
    vaccineId: 'VAC-0004',
    name: 'Fowl Pox Live Vaccine',
    targetDisease: 'Fowl Pox',
    manufacturer: 'National Veterinary Research Institute (NVRI) Vom',
    vaccineType: 'Live Attenuated',
    administrationMethod: 'Wing Web Stab',
    dosageInstructions: 'Dip double-needle applicator into reconstituted vaccine and pierce the unfeathered wing web without puncturing blood vessels.',
    recommendedAgeDays: 42,
    unit: 'doses',
    packSize: '500 doses/vial',
    currentStock: 1500,
    reorderLevel: 500,
    unitPrice: 3.0,
    supplier: 'Livestock Feeds Agrovet Depot',
    lotNumber: 'FPX-2025-01V',
    expiryDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    storageTemperature: '2°C to 8°C (Refrigerated Cold Chain)',
    status: 'In Stock',
    notes: 'Inspect wing web for "take" nodular swelling 7 to 10 days post-administration to confirm immunity take.',
  },
  {
    vaccineId: 'VAC-0005',
    name: 'Newcastle + Infectious Bronchitis (ND+IB Clone 30)',
    targetDisease: 'Newcastle Disease (ND)',
    manufacturer: 'Intervet MSD Animal Health',
    vaccineType: 'Live Attenuated',
    administrationMethod: 'Eye Drop',
    dosageInstructions: '1 drop in one eye per bird using specialized dropper provided with diluent.',
    recommendedAgeDays: 1,
    unit: 'doses',
    packSize: '1,000 doses/vial',
    currentStock: 2000,
    reorderLevel: 1000,
    unitPrice: 2.8,
    supplier: 'Agrovet Solutions Ltd',
    lotNumber: 'NDIB-2025-07M',
    expiryDate: new Date(Date.now() + 320 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    storageTemperature: '2°C to 8°C (Refrigerated Cold Chain)',
    status: 'In Stock',
    notes: 'Combined dual respiratory protection against Newcastle and infectious bronchitis strains.',
  },
  {
    vaccineId: 'VAC-0006',
    name: 'Fowl Typhoid Vaccine (Salmonella gallinarum 9R)',
    targetDisease: 'Fowl Typhoid / Salmonella',
    manufacturer: 'National Veterinary Research Institute (NVRI) Vom',
    vaccineType: 'Live Attenuated',
    administrationMethod: 'Injection / Subcutaneous',
    dosageInstructions: '0.5ml subcutaneous injection in the lower third of the neck.',
    recommendedAgeDays: 56,
    unit: 'doses',
    packSize: '500 doses/vial',
    currentStock: 0,
    reorderLevel: 500,
    unitPrice: 3.2,
    supplier: 'NVRI Vom Agrovet Depot Ibadan',
    lotNumber: 'SAL-2024-11V',
    expiryDate: new Date(Date.now() + 150 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    storageTemperature: '2°C to 8°C (Refrigerated Cold Chain)',
    status: 'Out of Stock',
    notes: 'Urgent restocking required before upcoming pullet batch week 8 point-of-vaccination.',
  },
  {
    vaccineId: 'VAC-0007',
    name: 'Coryza + EDS Inactivated Oil Emulsion',
    targetDisease: 'Egg Drop Syndrome (EDS)',
    manufacturer: 'Ceva Santé Animale',
    vaccineType: 'Inactivated / Killed',
    administrationMethod: 'Injection / Intramuscular',
    dosageInstructions: '0.5ml deep intramuscular injection in breast muscle for point-of-lay pullets.',
    recommendedAgeDays: 112,
    unit: 'doses',
    packSize: '500 doses/bottle',
    currentStock: 1000,
    reorderLevel: 500,
    unitPrice: 5.5,
    supplier: 'Animal Care Konsult Nigeria Ltd',
    lotNumber: 'EDS-2025-04C',
    expiryDate: new Date(Date.now() + 360 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    storageTemperature: '2°C to 8°C (Refrigerated Cold Chain)',
    status: 'In Stock',
    notes: 'Pre-lay protective killed vaccine for commercial egg layers preventing soft-shelled eggs and coryza.',
  },
];

/**
 * Compute the authoritative status of a vaccine catalog item
 */
export function computeVaccineStatus(currentStock, reorderLevel, expiryDate) {
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
 * Compute the authoritative status of a scheduled vaccination
 */
export function computeScheduleStatus(scheduledDate, currentStatus) {
  if (currentStatus === 'Completed' || currentStatus === 'Cancelled') {
    return currentStatus;
  }

  const todayStr = new Date().toISOString().slice(0, 10);
  if (!scheduledDate) return 'Scheduled';

  if (scheduledDate < todayStr) {
    return 'Overdue';
  }

  if (scheduledDate === todayStr) {
    return 'Due';
  }

  return 'Scheduled';
}

/**
 * Calculate expected vaccination date from batch arrival/hatch date + recommended age in days.
 * Strictly respects batch hatchDate and ageAtArrival. Does not silently assume Day 1 if age is unknown.
 */
export function calculateExpectedVaccinationDate(baseDateOrBatch, ageInDays) {
  if (!baseDateOrBatch) return null;

  let targetAge = parseInt(ageInDays, 10);
  if (isNaN(targetAge) || targetAge < 0) {
    targetAge = 0;
  }

  // If a batch object is provided
  if (typeof baseDateOrBatch === 'object' && baseDateOrBatch !== null) {
    const batch = baseDateOrBatch;

    // Case 1: Batch has known hatchDate
    if (batch.hatchDate && typeof batch.hatchDate === 'string' && batch.hatchDate.trim()) {
      const hatchTime = new Date(batch.hatchDate.trim()).getTime();
      if (!isNaN(hatchTime)) {
        const target = new Date(hatchTime);
        target.setDate(target.getDate() + targetAge);
        return target.toISOString().slice(0, 10);
      }
    }

    // Case 2: Batch has arrivalDate and age info
    if (batch.arrivalDate && typeof batch.arrivalDate === 'string' && batch.arrivalDate.trim()) {
      const arrivalTime = new Date(batch.arrivalDate.trim()).getTime();
      if (!isNaN(arrivalTime)) {
        let ageAtArrival = null;
        if (batch.hatchDate && typeof batch.hatchDate === 'string' && batch.hatchDate.trim()) {
          const hTime = new Date(batch.hatchDate.trim()).getTime();
          if (!isNaN(hTime)) {
            ageAtArrival = Math.max(0, Math.round((arrivalTime - hTime) / (1000 * 60 * 60 * 24)));
          }
        } else if (batch.ageAtArrivalDays !== undefined && batch.ageAtArrivalDays !== null && !isNaN(Number(batch.ageAtArrivalDays))) {
          ageAtArrival = Math.max(0, parseInt(batch.ageAtArrivalDays, 10));
        } else if (batch.birdType === 'Chick' || (batch.breed && String(batch.breed).toLowerCase().includes('doc'))) {
          ageAtArrival = 1; // Standard Day-Old Chick
        }

        if (ageAtArrival !== null) {
          const additionalDays = targetAge - ageAtArrival;
          const target = new Date(arrivalTime);
          target.setDate(target.getDate() + additionalDays);
          return target.toISOString().slice(0, 10);
        }

        // If age at arrival is unknown for older birds, do not silently guess Day 1
        return null;
      }
    }

    // Required date info is missing
    return null;
  }

  // If a raw date string or Date is passed
  if (typeof baseDateOrBatch === 'string' || baseDateOrBatch instanceof Date) {
    const time = new Date(baseDateOrBatch).getTime();
    if (isNaN(time)) return null;
    const target = new Date(time);
    target.setDate(target.getDate() + targetAge);
    return target.toISOString().slice(0, 10);
  }

  return null;
}

/**
 * FreshNest Vaccination Management Service
 * Full vaccine pharmacy inventory, purchases, scheduling linked to cohorts,
 * administration logs, and biosecurity cold chain tracking.
 */
export const vaccineService = {
  /**
   * Seed baseline vaccines if table is empty
   */
  async seedInitialVaccinesIfEmpty() {
    try {
      const count = await db.vaccines.count();
      if (count === 0) {
        for (const vac of INITIAL_VACCINES) {
          const status = computeVaccineStatus(vac.currentStock, vac.reorderLevel, vac.expiryDate);
          await db.vaccines.add({
            ...vac,
            status,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        }

        await db.farmSettings.put({
          key: 'last_vaccine_seq',
          value: INITIAL_VACCINES.length,
          updatedAt: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.error('Error seeding initial vaccines:', err);
    }
  },

  async seedInitialVaccines() {
    return this.seedInitialVaccinesIfEmpty();
  },

  async generateVaccineId() {
    return this.generateNextVaccineId();
  },

  async generatePurchaseId() {
    return this.generateNextPurchaseId();
  },

  async generateScheduleId() {
    return this.generateNextScheduleId();
  },

  async generateLogId() {
    return this.generateNextLogId();
  },

  /**
   * Generate next sequential Vaccine ID (e.g. VAC-0001)
   */
  async generateNextVaccineId() {
    try {
      let settingSeq = 0;
      try {
        const setting = await db.farmSettings.get('last_vaccine_seq');
        if (setting && typeof setting.value === 'number') {
          settingSeq = setting.value;
        }
      } catch {
        // Fallback
      }

      const vaccines = await db.vaccines.toArray();
      let maxNumber = settingSeq;

      vaccines.forEach((v) => {
        const code = v.vaccineId || v.code;
        if (code && typeof code === 'string') {
          const match = code.match(/VAC-(\d+)/i);
          if (match && match[1]) {
            const num = parseInt(match[1], 10);
            if (!isNaN(num) && num > maxNumber) {
              maxNumber = num;
            }
          }
        }
      });

      const nextNumber = maxNumber + 1;
      return `VAC-${String(nextNumber).padStart(4, '0')}`;
    } catch (err) {
      console.error('Error generating vaccine ID:', err);
      const rand = Math.floor(1000 + Math.random() * 9000);
      return `VAC-${rand}`;
    }
  },

  /**
   * Generate next sequential Vaccine Purchase ID (e.g. VPUR-0001)
   */
  async generateNextPurchaseId() {
    try {
      let settingSeq = 0;
      try {
        const setting = await db.farmSettings.get('last_vaccine_purchase_seq');
        if (setting && typeof setting.value === 'number') {
          settingSeq = setting.value;
        }
      } catch {
        // Fallback
      }

      const purchases = await db.vaccinePurchases.toArray();
      let maxNumber = settingSeq;

      purchases.forEach((p) => {
        const code = p.purchaseId || p.code;
        if (code && typeof code === 'string') {
          const match = code.match(/VPUR-(\d+)/i);
          if (match && match[1]) {
            const num = parseInt(match[1], 10);
            if (!isNaN(num) && num > maxNumber) {
              maxNumber = num;
            }
          }
        }
      });

      const nextNumber = maxNumber + 1;
      return `VPUR-${String(nextNumber).padStart(4, '0')}`;
    } catch (err) {
      console.error('Error generating vaccine purchase ID:', err);
      const rand = Math.floor(1000 + Math.random() * 9000);
      return `VPUR-${rand}`;
    }
  },

  /**
   * Generate next sequential Vaccination Schedule ID (e.g. VSCH-0001)
   */
  async generateNextScheduleId() {
    try {
      let settingSeq = 0;
      try {
        const setting = await db.farmSettings.get('last_vaccine_schedule_seq');
        if (setting && typeof setting.value === 'number') {
          settingSeq = setting.value;
        }
      } catch {
        // Fallback
      }

      const schedules = await db.vaccinationSchedules.toArray();
      let maxNumber = settingSeq;

      schedules.forEach((s) => {
        const code = s.scheduleId || s.code;
        if (code && typeof code === 'string') {
          const match = code.match(/VSCH-(\d+)/i);
          if (match && match[1]) {
            const num = parseInt(match[1], 10);
            if (!isNaN(num) && num > maxNumber) {
              maxNumber = num;
            }
          }
        }
      });

      const nextNumber = maxNumber + 1;
      return `VSCH-${String(nextNumber).padStart(4, '0')}`;
    } catch (err) {
      console.error('Error generating vaccination schedule ID:', err);
      const rand = Math.floor(1000 + Math.random() * 9000);
      return `VSCH-${rand}`;
    }
  },

  /**
   * Generate next sequential Vaccination Log ID (e.g. VLOG-0001)
   */
  async generateNextLogId() {
    try {
      let settingSeq = 0;
      try {
        const setting = await db.farmSettings.get('last_vaccine_log_seq');
        if (setting && typeof setting.value === 'number') {
          settingSeq = setting.value;
        }
      } catch {
        // Fallback
      }

      const logs = await db.vaccinationLogs.toArray();
      let maxNumber = settingSeq;

      logs.forEach((l) => {
        const code = l.logId || l.code;
        if (code && typeof code === 'string') {
          const match = code.match(/VLOG-(\d+)/i);
          if (match && match[1]) {
            const num = parseInt(match[1], 10);
            if (!isNaN(num) && num > maxNumber) {
              maxNumber = num;
            }
          }
        }
      });

      const nextNumber = maxNumber + 1;
      return `VLOG-${String(nextNumber).padStart(4, '0')}`;
    } catch (err) {
      console.error('Error generating vaccination log ID:', err);
      const rand = Math.floor(1000 + Math.random() * 9000);
      return `VLOG-${rand}`;
    }
  },

  /**
   * Validation function for Vaccine Products
   */
  validateVaccine(data, _isUpdate = false) {
    const errors = {};

    if (!data.name || !data.name.trim()) {
      errors.name = 'Vaccine name is required';
    }

    if (!data.targetDisease || !data.targetDisease.trim()) {
      errors.targetDisease = 'Target disease or condition is required';
    }

    if (!data.vaccineType || !VACCINE_TYPES.includes(data.vaccineType)) {
      errors.vaccineType = `Please select a valid vaccine type (${VACCINE_TYPES.join(', ')})`;
    }

    if (!data.administrationMethod || !ADMINISTRATION_METHODS.includes(data.administrationMethod)) {
      errors.administrationMethod = `Please select a valid administration method (${ADMINISTRATION_METHODS.join(', ')})`;
    }

    if (!data.unit || !VACCINE_UNITS.includes(data.unit)) {
      errors.unit = `Please select a valid unit of measure (${VACCINE_UNITS.join(', ')})`;
    }

    if (data.currentStock === undefined || data.currentStock === null || isNaN(Number(data.currentStock)) || Number(data.currentStock) < 0) {
      errors.currentStock = 'Current stock must be a non-negative number';
    }

    if (data.reorderLevel === undefined || data.reorderLevel === null || isNaN(Number(data.reorderLevel)) || Number(data.reorderLevel) < 0) {
      errors.reorderLevel = 'Reorder level must be a non-negative number';
    }

    const price = data.unitPrice !== undefined && data.unitPrice !== null ? data.unitPrice : data.costPerUnit;
    if (price !== undefined && price !== null && (isNaN(Number(price)) || Number(price) < 0)) {
      errors.unitPrice = 'Unit price must be a non-negative number in Naira (₦)';
    }

    if (data.recommendedAgeDays !== undefined && data.recommendedAgeDays !== null && (isNaN(Number(data.recommendedAgeDays)) || Number(data.recommendedAgeDays) < 0)) {
      errors.recommendedAgeDays = 'Recommended age in days must be a non-negative integer';
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
    };
  },

  /**
   * Get all vaccines with optional filtering
   */
  async getVaccines(filters = {}) {
    try {
      let items = await db.vaccines.toArray();

      // Recalculate status dynamically
      items = items.map((item) => ({
        ...item,
        status: computeVaccineStatus(item.currentStock, item.reorderLevel, item.expiryDate),
      }));

      if (filters.search) {
        const q = filters.search.toLowerCase().trim();
        items = items.filter((v) =>
          (v.name && v.name.toLowerCase().includes(q)) ||
          (v.vaccineId && v.vaccineId.toLowerCase().includes(q)) ||
          (v.targetDisease && v.targetDisease.toLowerCase().includes(q)) ||
          (v.manufacturer && v.manufacturer.toLowerCase().includes(q)) ||
          (v.supplier && v.supplier.toLowerCase().includes(q))
        );
      }

      if (filters.type && filters.type !== 'All') {
        items = items.filter((v) => v.vaccineType === filters.type);
      }

      if (filters.method && filters.method !== 'All') {
        items = items.filter((v) => v.administrationMethod === filters.method);
      }

      if (filters.status && filters.status !== 'All') {
        items = items.filter((v) => v.status === filters.status);
      }

      return items.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    } catch (err) {
      console.error('Error fetching vaccines:', err);
      return [];
    }
  },

  /**
   * Get a single vaccine by ID or code
   */
  async getVaccineById(idOrCode) {
    try {
      if (!idOrCode) return null;

      if (typeof idOrCode === 'number' || !isNaN(Number(idOrCode))) {
        const item = await db.vaccines.get(Number(idOrCode));
        if (item) {
          return {
            ...item,
            status: computeVaccineStatus(item.currentStock, item.reorderLevel, item.expiryDate),
          };
        }
      }

      const item = await db.vaccines.where('vaccineId').equals(String(idOrCode)).first();
      if (item) {
        return {
          ...item,
          status: computeVaccineStatus(item.currentStock, item.reorderLevel, item.expiryDate),
        };
      }

      return null;
    } catch (err) {
      console.error('Error fetching vaccine by ID:', err);
      return null;
    }
  },

  /**
   * Create a new vaccine product in the catalog
   */
  async createVaccine(data) {
    const validation = this.validateVaccine(data);
    if (!validation.isValid) {
      const err = new Error('Validation failed');
      err.errors = validation.errors;
      throw err;
    }

    const vaccineId = data.vaccineId || (await this.generateNextVaccineId());

    // Check duplicate ID
    const existing = await db.vaccines.where('vaccineId').equals(vaccineId).first();
    if (existing) {
      throw new Error(`Vaccine with ID "${vaccineId}" already exists.`);
    }

    const stock = Number(data.currentStock) || 0;
    const reorder = Number(data.reorderLevel) || 0;
    const status = computeVaccineStatus(stock, reorder, data.expiryDate);

    const record = {
      vaccineId,
      name: data.name.trim(),
      targetDisease: data.targetDisease.trim(),
      manufacturer: (data.manufacturer || '').trim(),
      vaccineType: data.vaccineType,
      administrationMethod: data.administrationMethod,
      dosageInstructions: (data.dosageInstructions || '').trim(),
      recommendedAgeDays: parseInt(data.recommendedAgeDays, 10) || 0,
      unit: data.unit || 'doses',
      packSize: (data.packSize || '').trim(),
      currentStock: stock,
      reorderLevel: reorder,
      unitPrice: Number(data.unitPrice != null ? data.unitPrice : data.costPerUnit) || 0,
      costPerUnit: Number(data.costPerUnit != null ? data.costPerUnit : data.unitPrice) || 0,
      supplier: (data.supplier || '').trim(),
      lotNumber: (data.lotNumber || '').trim(),
      expiryDate: data.expiryDate || '',
      storageTemperature: data.storageTemperature || STORAGE_TEMPERATURES[0],
      status,
      notes: (data.notes || '').trim(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const newId = await db.vaccines.add(record);

    // Update sequence
    const match = vaccineId.match(/VAC-(\d+)/i);
    if (match && match[1]) {
      const num = parseInt(match[1], 10);
      try {
        const currentSetting = await db.farmSettings.get('last_vaccine_seq');
        const currentVal = currentSetting ? currentSetting.value : 0;
        if (num > currentVal) {
          await db.farmSettings.put({
            key: 'last_vaccine_seq',
            value: num,
            updatedAt: new Date().toISOString(),
          });
        }
      } catch {
        // Ignore
      }
    }

    return { ...record, id: newId };
  },

  /**
   * Update an existing vaccine
   */
  async updateVaccine(id, updates) {
    const existing = await this.getVaccineById(id);
    if (!existing) {
      throw new Error(`Vaccine record #${id} not found.`);
    }

    const merged = { ...existing, ...updates };
    const validation = this.validateVaccine(merged, true);
    if (!validation.isValid) {
      const err = new Error('Validation failed');
      err.errors = validation.errors;
      throw err;
    }

    const currentStock = Number(merged.currentStock) || 0;
    const reorderLevel = Number(merged.reorderLevel) || 0;
    const status = computeVaccineStatus(currentStock, reorderLevel, merged.expiryDate);

    const cleanUpdates = {
      name: merged.name.trim(),
      targetDisease: merged.targetDisease.trim(),
      manufacturer: (merged.manufacturer || '').trim(),
      vaccineType: merged.vaccineType,
      administrationMethod: merged.administrationMethod,
      dosageInstructions: (merged.dosageInstructions || '').trim(),
      recommendedAgeDays: parseInt(merged.recommendedAgeDays, 10) || 0,
      unit: merged.unit,
      packSize: (merged.packSize || '').trim(),
      currentStock,
      reorderLevel,
      unitPrice: Number(merged.unitPrice != null ? merged.unitPrice : merged.costPerUnit) || 0,
      costPerUnit: Number(merged.costPerUnit != null ? merged.costPerUnit : merged.unitPrice) || 0,
      supplier: (merged.supplier || '').trim(),
      lotNumber: (merged.lotNumber || '').trim(),
      expiryDate: merged.expiryDate || '',
      storageTemperature: merged.storageTemperature || STORAGE_TEMPERATURES[0],
      status,
      notes: (merged.notes || '').trim(),
      updatedAt: new Date().toISOString(),
    };

    await db.vaccines.update(existing.id, cleanUpdates);
    return { ...existing, ...cleanUpdates };
  },

  /**
   * Safely delete a vaccine product.
   * Prevents deletion if referenced by purchases, schedules, or logs.
   */
  async deleteVaccine(id) {
    const existing = await this.getVaccineById(id);
    if (!existing) {
      throw new Error(`Vaccine record #${id} not found.`);
    }

    const purchaseCount = await db.vaccinePurchases
      .where('vaccineId')
      .equals(existing.vaccineId)
      .count();

    if (purchaseCount > 0) {
      throw new Error(
        `Cannot delete vaccine "${existing.name}" because it has ${purchaseCount} linked stock-in purchase record(s). Archive or set stock to 0 instead.`
      );
    }

    const scheduleCount = await db.vaccinationSchedules
      .where('vaccineId')
      .equals(existing.vaccineId)
      .count();

    if (scheduleCount > 0) {
      throw new Error(
        `Cannot delete vaccine "${existing.name}" because it has ${scheduleCount} scheduled vaccination event(s). Cancel or update the schedules first.`
      );
    }

    const logCount = await db.vaccinationLogs
      .where('vaccineId')
      .equals(existing.vaccineId)
      .count();

    if (logCount > 0) {
      throw new Error(
        `Cannot delete vaccine "${existing.name}" because it has ${logCount} administered vaccination log(s). Veterinary audit rules require preserving immunisation history.`
      );
    }

    await db.vaccines.delete(existing.id);
    return true;
  },

  /**
   * Archive vaccine (mark Archived so it cannot be scheduled or purchased)
   */
  async archiveVaccine(id) {
    const existing = await this.getVaccineById(id);
    if (!existing) {
      throw new Error(`Vaccine record #${id} not found.`);
    }

    await db.vaccines.update(existing.id, {
      status: 'Archived',
      updatedAt: new Date().toISOString(),
    });

    return { ...existing, status: 'Archived' };
  },

  /**
   * Record a Stock-In Vaccine Purchase with atomic inventory increment
   */
  async recordVaccinePurchase(purchaseData) {
    const vacId = purchaseData.vaccineId;
    const qty = Number(purchaseData.quantity);
    const cost = Number(purchaseData.unitPrice || purchaseData.unitCost);

    if (!vacId) {
      throw new Error('Please select a vaccine product to restock.');
    }

    if (isNaN(qty) || qty <= 0) {
      throw new Error('Purchase quantity must be greater than zero.');
    }

    if (isNaN(cost) || cost < 0) {
      throw new Error('Unit price in Naira (₦) must be a non-negative number.');
    }

    if (!purchaseData.purchaseDate) {
      throw new Error('Purchase date is required.');
    }

    if (!purchaseData.supplier || !purchaseData.supplier.trim()) {
      throw new Error('Supplier name is required for veterinary audit tracking.');
    }

    // Atomic transaction
    return await db.transaction('rw', [db.vaccines, db.vaccinePurchases, db.farmSettings], async () => {
      let vac = await db.vaccines.where('vaccineId').equals(vacId).first();
      if (!vac && !isNaN(Number(vacId))) {
        vac = await db.vaccines.get(Number(vacId));
      }

      if (!vac) {
        throw new Error(`Vaccine record with identifier "${vacId}" does not exist.`);
      }

      // Check duplicate invoice from same supplier
      if (purchaseData.invoiceNumber && purchaseData.invoiceNumber.trim()) {
        const inv = purchaseData.invoiceNumber.trim();
        const existingInv = await db.vaccinePurchases
          .where('invoiceNumber')
          .equals(inv)
          .first();

        if (existingInv && existingInv.supplier.toLowerCase() === purchaseData.supplier.trim().toLowerCase()) {
          throw new Error(`Invoice #${inv} from supplier "${purchaseData.supplier}" has already been recorded.`);
        }
      }

      const purchaseId = purchaseData.purchaseId || (await this.generateNextPurchaseId());
      const totalCost = Number((qty * cost).toFixed(2));
      const newStock = Number((Number(vac.currentStock || 0) + qty).toFixed(2));
      const updatedExpiry = purchaseData.expiryDate || vac.expiryDate || '';
      const newStatus = computeVaccineStatus(newStock, vac.reorderLevel, updatedExpiry);

      // 1. Update Vaccine Stock & Lot Details
      await db.vaccines.update(vac.id, {
        currentStock: newStock,
        unitPrice: cost > 0 ? cost : vac.unitPrice,
        lotNumber: purchaseData.lotNumber ? purchaseData.lotNumber.trim() : vac.lotNumber,
        expiryDate: updatedExpiry,
        status: newStatus,
        storageTemperature: purchaseData.storageTemperature || vac.storageTemperature,
        updatedAt: new Date().toISOString(),
      });

      // 2. Insert Purchase Ledger Entry
      const purchaseRecord = {
        purchaseId,
        vaccineId: vac.vaccineId,
        vaccineName: vac.name,
        quantity: qty,
        unit: vac.unit,
        unitPrice: cost,
        totalCost,
        purchaseDate: purchaseData.purchaseDate,
        supplier: purchaseData.supplier.trim(),
        invoiceNumber: (purchaseData.invoiceNumber || '').trim(),
        lotNumber: (purchaseData.lotNumber || '').trim(),
        expiryDate: updatedExpiry,
        storageTemperature: purchaseData.storageTemperature || vac.storageTemperature,
        notes: (purchaseData.notes || '').trim(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const newKey = await db.vaccinePurchases.add(purchaseRecord);

      // 3. Update Sequence Counter
      const match = purchaseId.match(/VPUR-(\d+)/i);
      if (match && match[1]) {
        const num = parseInt(match[1], 10);
        try {
          const currentSetting = await db.farmSettings.get('last_vaccine_purchase_seq');
          const currentVal = currentSetting ? currentSetting.value : 0;
          if (num > currentVal) {
            await db.farmSettings.put({
              key: 'last_vaccine_purchase_seq',
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
        id: newKey,
        updatedStock: newStock,
      };
    });
  },

  /**
   * Create a Vaccination Schedule linked to an existing batch
   */
  async createVaccinationSchedule(scheduleData) {
    if (!scheduleData.batchId) {
      throw new Error('Please select a flock batch for this vaccination schedule.');
    }

    if (!scheduleData.vaccineId) {
      throw new Error('Please select a vaccine.');
    }

    if (!scheduleData.scheduledDate) {
      throw new Error('Scheduled vaccination date is required.');
    }

    const batch = await db.batches.where('batchId').equals(scheduleData.batchId).first() ||
                  await db.batches.get(Number(scheduleData.batchId));
    if (!batch) {
      throw new Error(`Flock batch #${scheduleData.batchId} not found.`);
    }

    const vaccine = await db.vaccines.where('vaccineId').equals(scheduleData.vaccineId).first() ||
                    await db.vaccines.get(Number(scheduleData.vaccineId));
    if (!vaccine) {
      throw new Error(`Vaccine #${scheduleData.vaccineId} not found.`);
    }

    const scheduleId = scheduleData.scheduleId || (await this.generateNextScheduleId());
    const initialStatus = computeScheduleStatus(scheduleData.scheduledDate, 'Scheduled');

    const record = {
      scheduleId,
      batchId: batch.batchId || batch.id,
      batchName: batch.batchCode || batch.name || `Batch #${batch.id}`,
      vaccineId: vaccine.vaccineId,
      vaccineName: vaccine.name,
      targetAgeDays: parseInt(scheduleData.targetAgeDays, 10) || vaccine.recommendedAgeDays || 0,
      scheduledDate: scheduleData.scheduledDate,
      recommendedMethod: scheduleData.recommendedMethod || vaccine.administrationMethod,
      assignedStaff: (scheduleData.assignedStaff || '').trim() || 'Veterinary Team',
      status: initialStatus,
      notes: (scheduleData.notes || '').trim(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const newKey = await db.vaccinationSchedules.add(record);

    // Update sequence
    const match = scheduleId.match(/VSCH-(\d+)/i);
    if (match && match[1]) {
      const num = parseInt(match[1], 10);
      try {
        const currentSetting = await db.farmSettings.get('last_vaccine_schedule_seq');
        const currentVal = currentSetting ? currentSetting.value : 0;
        if (num > currentVal) {
          await db.farmSettings.put({
            key: 'last_vaccine_schedule_seq',
            value: num,
            updatedAt: new Date().toISOString(),
          });
        }
      } catch {
        // Ignore
      }
    }

    return { ...record, id: newKey };
  },

  /**
   * Get a schedule by database primary ID or scheduleId code
   */
  async getScheduleById(idOrCode) {
    if (!idOrCode) return null;
    if (typeof idOrCode === 'number' || (!isNaN(Number(idOrCode)) && typeof idOrCode !== 'string')) {
      const byNum = await db.vaccinationSchedules.get(Number(idOrCode));
      if (byNum) return byNum;
    }
    const byCode = await db.vaccinationSchedules.where('scheduleId').equals(String(idOrCode)).first();
    if (byCode) return byCode;
    if (!isNaN(Number(idOrCode))) {
      return db.vaccinationSchedules.get(Number(idOrCode));
    }
    return null;
  },

  /**
   * Update an existing vaccination schedule (e.g. reschedule date, change staff)
   */
  async updateVaccinationSchedule(id, updates) {
    const existing = await this.getScheduleById(id);
    if (!existing) {
      throw new Error(`Vaccination schedule #${id} not found.`);
    }

    const newDate = updates.scheduledDate || existing.scheduledDate;
    const newStatus = updates.status
      ? updates.status
      : computeScheduleStatus(newDate, existing.status);

    const cleanUpdates = {
      scheduledDate: newDate,
      targetAgeDays: updates.targetAgeDays !== undefined ? parseInt(updates.targetAgeDays, 10) : existing.targetAgeDays,
      recommendedMethod: updates.recommendedMethod || existing.recommendedMethod,
      assignedStaff: updates.assignedStaff !== undefined ? updates.assignedStaff.trim() : existing.assignedStaff,
      status: newStatus,
      notes: updates.notes !== undefined ? updates.notes.trim() : existing.notes,
      updatedAt: new Date().toISOString(),
    };

    await db.vaccinationSchedules.update(existing.id, cleanUpdates);
    return { ...existing, ...cleanUpdates };
  },

  /**
   * Cancel a vaccination schedule
   */
  async cancelVaccinationSchedule(id, reason = '') {
    const existing = await this.getScheduleById(id);
    if (!existing) {
      throw new Error(`Vaccination schedule #${id} not found.`);
    }

    if (existing.status === 'Completed') {
      throw new Error('Cannot cancel a vaccination schedule that has already been completed.');
    }

    const notesWithReason = reason
      ? `${existing.notes || ''} [Cancelled: ${reason}]`.trim()
      : existing.notes;

    await db.vaccinationSchedules.update(existing.id, {
      status: 'Cancelled',
      notes: notesWithReason,
      updatedAt: new Date().toISOString(),
    });

    return { ...existing, status: 'Cancelled' };
  },

  /**
   * Get all vaccination schedules with status evaluation
   */
  async getVaccinationSchedules(filters = {}) {
    try {
      let schedules = await db.vaccinationSchedules.toArray();

      // Recalculate dynamic statuses (e.g. Due today, Overdue)
      schedules = schedules.map((s) => ({
        ...s,
        status: computeScheduleStatus(s.scheduledDate, s.status),
      }));

      if (filters.batchId) {
        schedules = schedules.filter((s) => String(s.batchId) === String(filters.batchId));
      }

      if (filters.vaccineId) {
        schedules = schedules.filter((s) => s.vaccineId === filters.vaccineId);
      }

      if (filters.status && filters.status !== 'All') {
        schedules = schedules.filter((s) => s.status === filters.status);
      }

      if (filters.search) {
        const q = filters.search.toLowerCase().trim();
        schedules = schedules.filter((s) =>
          (s.scheduleId && s.scheduleId.toLowerCase().includes(q)) ||
          (s.batchName && s.batchName.toLowerCase().includes(q)) ||
          (s.vaccineName && s.vaccineName.toLowerCase().includes(q)) ||
          (s.assignedStaff && s.assignedStaff.toLowerCase().includes(q))
        );
      }

      // Sort chronological by scheduledDate
      return schedules.sort((a, b) => (a.scheduledDate || '').localeCompare(b.scheduledDate || ''));
    } catch (err) {
      console.error('Error fetching vaccination schedules:', err);
      return [];
    }
  },

  /**
   * Record Vaccination Administration (Stock-Out)
   * Validates stock, prevents negative stock, blocks expired vaccines,
   * updates linked schedule to 'Completed', and logs administration atomically.
   */
  async recordVaccination(adminData) {
    const vacId = adminData.vaccineId;
    const qty = Number(adminData.quantity);

    if (!vacId) {
      throw new Error('Please select a vaccine product.');
    }

    if (isNaN(qty) || qty <= 0) {
      throw new Error('Administered vaccine quantity / dosage must be greater than zero.');
    }

    const administeredDate = adminData.administeredDate || new Date().toISOString();
    const administeredBy = (adminData.administeredBy || 'Farm Administrator').trim();

    const targetType = adminData.targetType || (adminData.batchId ? 'batch' : (adminData.birdId ? 'bird' : ''));
    if (!targetType || (targetType !== 'batch' && targetType !== 'bird')) {
      throw new Error('Vaccination must be administered to either a Batch or an Individual Bird.');
    }

    if (targetType === 'batch' && !adminData.batchId) {
      throw new Error('Please select a flock batch for this vaccination event.');
    }

    if (targetType === 'bird' && !adminData.birdId) {
      throw new Error('Please select an individual bird for this vaccination event.');
    }

    // Atomic transaction
    return await db.transaction(
      'rw',
      [db.vaccines, db.vaccinationLogs, db.vaccinationSchedules, db.batches, db.birds, db.farmSettings],
      async () => {
        let vac = await db.vaccines.where('vaccineId').equals(vacId).first();
        if (!vac && !isNaN(Number(vacId))) {
          vac = await db.vaccines.get(Number(vacId));
        }

        if (!vac) {
          throw new Error(`Vaccine record with identifier "${vacId}" does not exist.`);
        }

        const adminDateStr = administeredDate ? administeredDate.slice(0, 10) : new Date().toISOString().slice(0, 10);
        const todayStr = new Date().toISOString().slice(0, 10);

        // Strict Biosecurity Safeguard: Expired vaccines NEVER allowed to be administered
        // Evaluates against the actual administration date as well as current date
        if (vac.expiryDate && (vac.expiryDate < adminDateStr || vac.expiryDate < todayStr)) {
          throw new Error(
            `Biosecurity Violation: Vaccine "${vac.name}" expired on ${vac.expiryDate}. Expired vaccines lose viral/bacterial antigen potency and must NEVER be administered (Administration date: ${adminDateStr}).`
          );
        }

        // Strict Stock Check: Prevent negative stock
        const currentStock = Number(vac.currentStock) || 0;
        if (currentStock < qty) {
          throw new Error(
            `Insufficient stock. Current inventory has ${currentStock} ${vac.unit || 'doses'} of "${vac.name}", but this vaccination requires ${qty} ${vac.unit || 'doses'}. Please restock before recording administration.`
          );
        }

        // Prevent duplicate administration submission on the exact same schedule if already logged
        if (adminData.scheduleId) {
          const existingScheduleLog = await db.vaccinationLogs
            .where('scheduleId')
            .equals(adminData.scheduleId)
            .first();

          if (existingScheduleLog && existingScheduleLog.status === 'Completed') {
            throw new Error(`Vaccination for schedule #${adminData.scheduleId} has already been logged.`);
          }
        }

        // Prevent rapid double-clicking / duplicate submissions
        const duplicateLog = await db.vaccinationLogs
          .where('vaccineId')
          .equals(vac.vaccineId)
          .filter((l) => {
            const isSameTarget = targetType === 'batch'
              ? String(l.batchId) === String(adminData.batchId)
              : String(l.birdId) === String(adminData.birdId);
            if (!isSameTarget) return false;
            if (l.administeredDate === administeredDate) return true;
            const timeDiff = Math.abs(new Date(l.createdAt || l.administeredDate).getTime() - Date.now());
            return timeDiff < 3000 && Number(l.quantity) === qty;
          })
          .first();

        if (duplicateLog) {
          throw new Error(`Duplicate administration detected: vaccination for "${vac.name}" on this target was already recorded.`);
        }

        // Resolve Target Details
        let batchRecord = null;
        let birdRecord = null;
        let targetDisplay;
        let birdsVaccinatedCount = Number(adminData.birdsVaccinated) || qty;

        if (targetType === 'batch') {
          const bId = adminData.batchId;
          batchRecord = await db.batches.where('batchId').equals(bId).first();
          if (!batchRecord && !isNaN(Number(bId))) {
            batchRecord = await db.batches.get(Number(bId));
          }
          if (!batchRecord) {
            throw new Error(`Target flock batch #${bId} not found.`);
          }
          targetDisplay = `Batch ${batchRecord.batchId || batchRecord.batchCode} (${batchRecord.name || batchRecord.birdType || 'Flock'})`;
          if (!adminData.birdsVaccinated) {
            birdsVaccinatedCount = batchRecord.currentCount ?? batchRecord.initialCount ?? qty;
          }
          // Validate that vaccinated count does not exceed living batch population
          const livingPopulation = Number(batchRecord.currentCount !== undefined && batchRecord.currentCount !== null ? batchRecord.currentCount : batchRecord.initialCount) || 0;
          if (birdsVaccinatedCount > livingPopulation) {
            throw new Error(
              `Number of birds vaccinated (${birdsVaccinatedCount}) cannot exceed the living population of the batch (${livingPopulation} birds).`
            );
          }
        } else {
          const bId = adminData.birdId;
          birdRecord = await db.birds.where('birdId').equals(bId).first();
          if (!birdRecord && !isNaN(Number(bId))) {
            birdRecord = await db.birds.get(Number(bId));
          }
          if (!birdRecord) {
            throw new Error(`Target individual bird #${bId} not found.`);
          }
          if (birdRecord.status === 'Dead' || birdRecord.status === 'Sold') {
            throw new Error(`Cannot administer vaccination to bird #${birdRecord.birdId || birdRecord.tagNumber} because its status is "${birdRecord.status}".`);
          }
          targetDisplay = `Bird ${birdRecord.birdId || birdRecord.tagNumber} (${birdRecord.name || birdRecord.breed || 'Bird'})`;
          birdsVaccinatedCount = 1;
        }

        // 1. Decrement Vaccine Inventory
        const newStock = Number((currentStock - qty).toFixed(2));
        const newStatus = computeVaccineStatus(newStock, vac.reorderLevel, vac.expiryDate);

        await db.vaccines.update(vac.id, {
          currentStock: newStock,
          status: newStatus,
          updatedAt: new Date().toISOString(),
        });

        // 2. Generate Log ID
        const logId = adminData.logId || (await this.generateNextLogId());

        // 3. Create Vaccination Log
        const logEntry = {
          logId,
          scheduleId: adminData.scheduleId || null,
          targetType,
          batchId: targetType === 'batch' ? (batchRecord ? (batchRecord.batchId || batchRecord.id) : adminData.batchId) : null,
          birdId: targetType === 'bird' ? (birdRecord ? (birdRecord.birdId || birdRecord.id) : adminData.birdId) : null,
          targetDisplay,
          vaccineId: vac.vaccineId,
          vaccineName: vac.name,
          quantity: qty,
          unit: vac.unit,
          birdsVaccinated: birdsVaccinatedCount,
          administrationMethod: adminData.administrationMethod || vac.administrationMethod || 'Drinking Water',
          administeredDate,
          administeredBy,
          lotNumber: (adminData.lotNumber || vac.lotNumber || '').trim(),
          storageTemperature: vac.storageTemperature,
          reactionsObserved: (adminData.reactionsObserved || '').trim(),
          status: 'Completed',
          notes: (adminData.notes || '').trim(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        const newLogKey = await db.vaccinationLogs.add(logEntry);

        // 4. Update linked schedule to 'Completed' if provided
        if (adminData.scheduleId) {
          const sched = await db.vaccinationSchedules.where('scheduleId').equals(adminData.scheduleId).first() ||
                        await db.vaccinationSchedules.get(Number(adminData.scheduleId));
          if (sched) {
            await db.vaccinationSchedules.update(sched.id, {
              status: 'Completed',
              updatedAt: new Date().toISOString(),
            });
          }
        }

        // 5. Update Sequence
        const match = logId.match(/VLOG-(\d+)/i);
        if (match && match[1]) {
          const num = parseInt(match[1], 10);
          try {
            const currentSetting = await db.farmSettings.get('last_vaccine_log_seq');
            const currentVal = currentSetting ? currentSetting.value : 0;
            if (num > currentVal) {
              await db.farmSettings.put({
                key: 'last_vaccine_log_seq',
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
          updatedStock: newStock,
        };
      }
    );
  },

  /**
   * Get all vaccination logs / history
   */
  async getVaccinationHistory(filters = {}) {
    try {
      let logs = await db.vaccinationLogs.toArray();

      if (filters.vaccineId) {
        logs = logs.filter((l) => l.vaccineId === filters.vaccineId);
      }

      if (filters.batchId) {
        logs = logs.filter((l) => String(l.batchId) === String(filters.batchId));
      }

      if (filters.birdId) {
        logs = logs.filter((l) => String(l.birdId) === String(filters.birdId));
      }

      if (filters.search) {
        const q = filters.search.toLowerCase().trim();
        logs = logs.filter((l) =>
          (l.logId && l.logId.toLowerCase().includes(q)) ||
          (l.vaccineName && l.vaccineName.toLowerCase().includes(q)) ||
          (l.targetDisplay && l.targetDisplay.toLowerCase().includes(q)) ||
          (l.administeredBy && l.administeredBy.toLowerCase().includes(q)) ||
          (l.lotNumber && l.lotNumber.toLowerCase().includes(q))
        );
      }

      return logs.sort((a, b) => (b.administeredDate || '').localeCompare(a.administeredDate || ''));
    } catch (err) {
      console.error('Error fetching vaccination history:', err);
      return [];
    }
  },

  /**
   * Get all vaccine purchases
   */
  async getVaccinePurchases(filters = {}) {
    try {
      let purchases = await db.vaccinePurchases.toArray();

      if (filters.vaccineId) {
        purchases = purchases.filter((p) => p.vaccineId === filters.vaccineId);
      }

      if (filters.search) {
        const q = filters.search.toLowerCase().trim();
        purchases = purchases.filter((p) =>
          (p.purchaseId && p.purchaseId.toLowerCase().includes(q)) ||
          (p.vaccineName && p.vaccineName.toLowerCase().includes(q)) ||
          (p.supplier && p.supplier.toLowerCase().includes(q)) ||
          (p.invoiceNumber && p.invoiceNumber.toLowerCase().includes(q))
        );
      }

      return purchases.sort((a, b) => (b.purchaseDate || '').localeCompare(a.purchaseDate || ''));
    } catch (err) {
      console.error('Error fetching vaccine purchases:', err);
      return [];
    }
  },

  /**
   * Calculate comprehensive vaccination statistics
   */
  async getVaccinationStatistics() {
    try {
      const [vaccines, schedules] = await Promise.all([
        db.vaccines.toArray(),
        db.vaccinationSchedules.toArray(),
      ]);

      const totalProducts = vaccines.length;
      let totalStock = 0;
      let totalInventoryValue = 0;
      let lowStockCount = 0;
      let outOfStockCount = 0;
      let expiredCount = 0;

      vaccines.forEach((v) => {
        const stock = Number(v.currentStock) || 0;
        const price = Number(v.unitPrice != null && v.unitPrice !== 0 ? v.unitPrice : v.costPerUnit) || 0;
        const reorder = Number(v.reorderLevel) || 0;

        totalStock += stock;
        totalInventoryValue += stock * price;

        const status = computeVaccineStatus(stock, reorder, v.expiryDate);
        if (status === 'Expired') {
          expiredCount++;
        } else if (status === 'Out of Stock') {
          outOfStockCount++;
        } else if (status === 'Low Stock') {
          lowStockCount++;
        }
      });

      let scheduledCount = 0;
      let completedCount = 0;
      let dueTodayCount = 0;
      let overdueCount = 0;

      schedules.forEach((s) => {
        const status = computeScheduleStatus(s.scheduledDate, s.status);
        if (status === 'Completed') {
          completedCount++;
        } else if (status === 'Overdue') {
          overdueCount++;
        } else if (status === 'Due') {
          dueTodayCount++;
        } else if (status === 'Scheduled') {
          scheduledCount++;
        }
      });

      return {
        totalProducts,
        totalVaccines: totalProducts,
        totalStock: Number(totalStock.toFixed(2)),
        totalStockDoses: Number(totalStock.toFixed(2)),
        scheduledVaccinations: scheduledCount + dueTodayCount + overdueCount,
        completedVaccinations: completedCount,
        completedCount,
        dueToday: dueTodayCount,
        overdueVaccinations: overdueCount,
        lowStockVaccines: lowStockCount,
        outOfStockCount,
        expiredCount,
        totalInventoryValue: Number(totalInventoryValue.toFixed(2)),
        inventoryValuation: Number(totalInventoryValue.toFixed(2)),
      };
    } catch (err) {
      console.error('Error calculating vaccination statistics:', err);
      return {
        totalProducts: 0,
        totalVaccines: 0,
        totalStock: 0,
        totalStockDoses: 0,
        scheduledVaccinations: 0,
        completedVaccinations: 0,
        completedCount: 0,
        dueToday: 0,
        overdueVaccinations: 0,
        lowStockVaccines: 0,
        outOfStockCount: 0,
        expiredCount: 0,
        totalInventoryValue: 0,
        inventoryValuation: 0,
      };
    }
  },

  /**
   * Get Vaccination Reminders & Alerts
   */
  async getVaccinationAlerts() {
    try {
      const alerts = [];
      const now = new Date();
      const todayStr = now.toISOString().slice(0, 10);
      const sevenDaysAhead = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const thirtyDaysAhead = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

      const [vaccines, schedules] = await Promise.all([
        db.vaccines.toArray(),
        db.vaccinationSchedules.toArray(),
      ]);

      // 1. Schedules Alerts (Due Today, Overdue, Upcoming 7 days)
      schedules.forEach((sched) => {
        const status = computeScheduleStatus(sched.scheduledDate, sched.status);

        if (status === 'Overdue') {
          alerts.push({
            id: `vax-overdue-${sched.id}`,
            scheduleId: sched.scheduleId,
            type: 'overdue',
            severity: 'danger',
            title: `OVERDUE Vaccination: ${sched.batchName}`,
            message: `${sched.vaccineName} was scheduled for ${sched.scheduledDate}. Immunise flock immediately to avoid disease vulnerability.`,
            scheduledDate: sched.scheduledDate,
            module: 'vaccination',
          });
        } else if (status === 'Due') {
          alerts.push({
            id: `vax-due-${sched.id}`,
            scheduleId: sched.scheduleId,
            type: 'due_today',
            severity: 'warning',
            title: `Vaccination Due TODAY: ${sched.batchName}`,
            message: `${sched.vaccineName} (${sched.recommendedMethod || 'Standard route'}) is scheduled for administration today.`,
            scheduledDate: sched.scheduledDate,
            module: 'vaccination',
          });
        } else if (status === 'Scheduled' && sched.scheduledDate <= sevenDaysAhead) {
          const diffDays = Math.ceil((new Date(sched.scheduledDate) - now) / (1000 * 60 * 60 * 24));
          alerts.push({
            id: `vax-upcoming-${sched.id}`,
            scheduleId: sched.scheduleId,
            type: 'upcoming',
            severity: 'info',
            title: `Upcoming Vaccination in ${diffDays} day(s): ${sched.batchName}`,
            message: `${sched.vaccineName} scheduled for ${sched.scheduledDate}. Ensure vaccine is in stock and cold chain is ready.`,
            scheduledDate: sched.scheduledDate,
            module: 'vaccination',
          });
        }
      });

      // 2. Vaccine Inventory Stock & Expiration Alerts
      vaccines.forEach((vac) => {
        const stock = Number(vac.currentStock) || 0;
        const reorder = Number(vac.reorderLevel) || 0;

        // Expired Alert
        if (vac.expiryDate && vac.expiryDate < todayStr) {
          alerts.push({
            id: `vac-exp-${vac.id}`,
            vaccineId: vac.vaccineId,
            type: 'expired',
            severity: 'danger',
            title: `Expired Vaccine: ${vac.name}`,
            message: `Expired on ${vac.expiryDate}. Biosecurity alert: discard safely. Expired vaccines must never be administered.`,
            expiryDate: vac.expiryDate,
            module: 'vaccination',
          });
        } else if (vac.expiryDate && vac.expiryDate <= thirtyDaysAhead) {
          alerts.push({
            id: `vac-exp-soon-${vac.id}`,
            vaccineId: vac.vaccineId,
            type: 'expiring_soon',
            severity: 'warning',
            title: `Expiring Soon: ${vac.name}`,
            message: `Expires on ${vac.expiryDate}. Schedule administration before expiry date.`,
            expiryDate: vac.expiryDate,
            module: 'vaccination',
          });
        }

        // Out of Stock / Low Stock Alert
        if (stock <= 0) {
          alerts.push({
            id: `vac-oos-${vac.id}`,
            vaccineId: vac.vaccineId,
            type: 'out_of_stock',
            severity: 'danger',
            title: `Out of Vaccine: ${vac.name}`,
            message: `Stock is at 0 ${vac.unit || 'doses'}. Restock immediately to maintain scheduled flock immunity.`,
            module: 'vaccination',
          });
        } else if (stock <= reorder) {
          alerts.push({
            id: `vac-low-${vac.id}`,
            vaccineId: vac.vaccineId,
            type: 'low_stock',
            severity: 'warning',
            title: `Low Vaccine Stock: ${vac.name}`,
            message: `Current stock: ${stock} ${vac.unit} (Reorder threshold: ${reorder} ${vac.unit}).`,
            module: 'vaccination',
          });
        }

        // Cold Chain Storage Notice
        if (!vac.storageTemperature || !vac.storageTemperature.trim() || vac.storageTemperature === 'Unspecified') {
          alerts.push({
            id: `vac-temp-${vac.id}`,
            vaccineId: vac.vaccineId,
            type: 'missing_storage',
            severity: 'warning',
            title: `Storage Warning: ${vac.name}`,
            message: 'Cold chain storage temperature is missing or unverified. Verify manufacturer specifications (typically 2°C to 8°C).',
            module: 'vaccination',
          });
        }
      });

      alerts.overdue = alerts.filter((a) => a.type === 'overdue');
      alerts.dueToday = alerts.filter((a) => a.type === 'due_today');
      alerts.upcoming7Days = alerts.filter((a) => a.type === 'upcoming');
      alerts.expiredVaccines = alerts.filter((a) => a.type === 'expired');
      alerts.lowStock = alerts.filter((a) => a.type === 'low_stock' || a.type === 'out_of_stock');
      alerts.storageWarnings = alerts.filter((a) => a.type === 'missing_storage');

      return alerts;
    } catch (err) {
      console.error('Error fetching vaccination alerts:', err);
      const emptyAlerts = [];
      emptyAlerts.overdue = [];
      emptyAlerts.dueToday = [];
      emptyAlerts.upcoming7Days = [];
      emptyAlerts.expiredVaccines = [];
      emptyAlerts.lowStock = [];
      emptyAlerts.storageWarnings = [];
      return emptyAlerts;
    }
  },
};
