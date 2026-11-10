import { db } from '../database/db.js';
import { APP_INFO } from '../utils/constants.js';

/**
 * FreshNest Poultry Farm - Module 14: Settings, Backup & Restore Service
 * Pure offline-first architecture using Dexie.js and IndexedDB.
 * Features:
 * - Farm profile settings management (name, logo, phone, email, address, admin, description)
 * - General system preferences (currency, date format, crate size, timezone)
 * - Real-time database table record counts and metadata
 * - Full database JSON backup generation with comprehensive metadata
 * - Atomic database restore with strict pre-validation and rollback safety
 */

export const DEFAULT_FARM_PROFILE = {
  farm_name: 'FreshNest Poultry Farm',
  farm_logo: '',
  farm_phone: '+234 803 123 4567',
  farm_email: 'info@freshnestpoultry.ng',
  farm_address: 'KM 14, Old Abeokuta Expressway, Farm Settlement, Ogun State, Nigeria',
  farm_admin_name: 'Farm Administrator',
  farm_description: 'Smart commercial poultry management system specialized in layer flocks, broilers, feed rations, and biosecurity.',
};

export const DEFAULT_PREFERENCES = {
  currency: 'NGN',
  currency_symbol: '₦',
  date_format: 'DD/MM/YYYY',
  egg_crate_size: 30,
  local_date_mode: 'Africa/Lagos',
};

export const settingsService = {
  /**
   * Fetch current Farm Profile from farmSettings table
   */
  async getFarmProfile() {
    try {
      const keys = [
        'farm_name',
        'farm_logo',
        'farm_phone',
        'farm_email',
        'farm_address',
        'farm_admin_name',
        'farm_description',
      ];

      const profile = { ...DEFAULT_FARM_PROFILE };

      for (const k of keys) {
        const record = await db.farmSettings.get(k);
        if (record && record.value !== undefined && record.value !== null) {
          profile[k] = record.value;
        }
      }

      return profile;
    } catch (err) {
      console.error('Error fetching farm profile:', err);
      return { ...DEFAULT_FARM_PROFILE };
    }
  },

  /**
   * Save Farm Profile to farmSettings table
   */
  async updateFarmProfile(profileData) {
    if (!profileData || typeof profileData !== 'object') {
      throw new Error('Invalid profile data provided.');
    }

    const farmName = (profileData.farm_name || '').trim();
    if (!farmName) {
      throw new Error('Farm name is required.');
    }

    const farmEmail = (profileData.farm_email || '').trim();
    if (!farmEmail) {
      throw new Error('Farm email address is required.');
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(farmEmail)) {
      throw new Error('Please provide a valid farm email address.');
    }

    const farmPhone = (profileData.farm_phone || '').trim();
    if (!farmPhone) {
      throw new Error('Farm phone number is required.');
    }

    const updates = {
      farm_name: farmName,
      farm_logo: profileData.farm_logo || '',
      farm_phone: farmPhone,
      farm_email: farmEmail,
      farm_address: (profileData.farm_address || '').trim(),
      farm_admin_name: (profileData.farm_admin_name || '').trim(),
      farm_description: (profileData.farm_description || '').trim(),
    };

    const now = new Date().toISOString();

    await db.transaction('rw', db.farmSettings, async () => {
      for (const [key, value] of Object.entries(updates)) {
        await db.farmSettings.put({
          key,
          value,
          updatedAt: now,
        });
      }
    });

    return updates;
  },

  /**
   * Fetch General System Preferences
   */
  async getGeneralPreferences() {
    try {
      const keys = [
        'pref_currency',
        'pref_currency_symbol',
        'pref_date_format',
        'pref_egg_crate_size',
        'pref_local_date_mode',
      ];

      const prefs = { ...DEFAULT_PREFERENCES };

      for (const k of keys) {
        const record = await db.farmSettings.get(k);
        if (record && record.value !== undefined) {
          const propName = k.replace('pref_', '');
          prefs[propName] = record.value;
        }
      }

      return prefs;
    } catch (err) {
      console.error('Error fetching preferences:', err);
      return { ...DEFAULT_PREFERENCES };
    }
  },

  /**
   * Save General Preferences
   */
  async updateGeneralPreferences(preferencesData) {
    if (!preferencesData || typeof preferencesData !== 'object') {
      throw new Error('Invalid preferences data provided.');
    }

    const crateSize = Number(preferencesData.egg_crate_size);
    if (isNaN(crateSize) || crateSize <= 0 || !Number.isInteger(crateSize)) {
      throw new Error('Standard egg crate size must be a positive integer (e.g. 30).');
    }

    const updates = {
      pref_currency: (preferencesData.currency || 'NGN').trim(),
      pref_currency_symbol: (preferencesData.currency_symbol || '₦').trim(),
      pref_date_format: (preferencesData.date_format || 'DD/MM/YYYY').trim(),
      pref_egg_crate_size: crateSize,
      pref_local_date_mode: (preferencesData.local_date_mode || 'Africa/Lagos').trim(),
    };

    const now = new Date().toISOString();

    await db.transaction('rw', db.farmSettings, async () => {
      for (const [key, value] of Object.entries(updates)) {
        await db.farmSettings.put({
          key,
          value,
          updatedAt: now,
        });
      }
    });

    return {
      currency: updates.pref_currency,
      currency_symbol: updates.pref_currency_symbol,
      date_format: updates.pref_date_format,
      egg_crate_size: updates.pref_egg_crate_size,
      local_date_mode: updates.pref_local_date_mode,
    };
  },

  /**
   * Get detailed database diagnostic and table record counts
   */
  async getDatabaseInfo() {
    try {
      const tableCounts = {};
      for (const table of db.tables) {
        tableCounts[table.name] = await table.count();
      }

      const totalRecords = Object.values(tableCounts).reduce((a, b) => a + b, 0);

      // Last backup and restore dates
      const backupSetting = await db.farmSettings.get('last_backup_timestamp');
      const restoreSetting = await db.farmSettings.get('last_restore_timestamp');

      let storageEstimate = { usageMb: 0, quotaMb: 0, percentage: 0 };
      if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.estimate) {
        try {
          const est = await navigator.storage.estimate();
          const usageMb = (est.usage || 0) / (1024 * 1024);
          const quotaMb = (est.quota || 0) / (1024 * 1024);
          storageEstimate = {
            usageMb: Number(usageMb.toFixed(2)),
            quotaMb: Number(quotaMb.toFixed(2)),
            percentage: quotaMb > 0 ? Number(((usageMb / quotaMb) * 100).toFixed(2)) : 0,
          };
        } catch {
          // Fallback
        }
      }

      return {
        databaseName: db.name,
        schemaVersion: db.verno,
        tableCounts,
        totalRecords,
        tableList: db.tables.map((t) => t.name),
        lastBackupAt: backupSetting ? backupSetting.value : null,
        lastRestoreAt: restoreSetting ? restoreSetting.value : null,
        appVersion: APP_INFO.version,
        appName: APP_INFO.name,
        storageEstimate,
      };
    } catch (err) {
      console.error('Error fetching database info:', err);
      return {
        databaseName: db.name || 'freshnest_poultry_db',
        schemaVersion: db.verno || 12,
        tableCounts: {},
        totalRecords: 0,
        tableList: [],
        lastBackupAt: null,
        lastRestoreAt: null,
        appVersion: APP_INFO.version,
        appName: APP_INFO.name,
        storageEstimate: { usageMb: 0, quotaMb: 0, percentage: 0 },
      };
    }
  },

  /**
   * Generate complete full database backup JSON with metadata
   */
  async generateFullBackup() {
    const nowIso = new Date().toISOString();

    // Update last backup timestamp in farmSettings first so snapshot includes it
    await db.farmSettings.put({
      key: 'last_backup_timestamp',
      value: nowIso,
      updatedAt: nowIso,
    });

    const tableCounts = {};
    const tablesData = {};

    for (const table of db.tables) {
      const records = await table.toArray();
      tablesData[table.name] = records;
      tableCounts[table.name] = records.length;
    }

    const totalRecords = Object.values(tableCounts).reduce((a, b) => a + b, 0);

    const backupPayload = {
      appName: 'FreshNest Poultry Farm',
      backupFormatVersion: '1.0',
      databaseName: db.name,
      schemaVersion: db.verno,
      exportedAt: nowIso,
      tableCounts,
      totalRecords,
      tables: tablesData,
    };

    const dateStr = nowIso.slice(0, 10);
    const filename = `FreshNest_Backup_${dateStr}.json`;
    const jsonString = JSON.stringify(backupPayload, null, 2);

    return {
      filename,
      jsonString,
      metadata: {
        appName: backupPayload.appName,
        backupFormatVersion: backupPayload.backupFormatVersion,
        schemaVersion: backupPayload.schemaVersion,
        exportedAt: nowIso,
        totalRecords,
        tableCounts,
      },
    };
  },

  /**
   * Validate a candidate backup JSON structure before restoring
   */
  validateBackup(backupData) {
    if (!backupData || typeof backupData !== 'object') {
      throw new Error('Invalid backup file: Content is not a valid JSON object.');
    }

    // Verify application signature
    const hasAppName = backupData.appName && typeof backupData.appName === 'string' && backupData.appName.includes('FreshNest');
    const hasTables = backupData.tables && typeof backupData.tables === 'object';
    const hasLegacyData = backupData.data && typeof backupData.data === 'object';

    if (!hasAppName && !hasTables && !hasLegacyData) {
      throw new Error('Invalid backup file: This file does not appear to be a FreshNest Poultry Farm backup.');
    }

    // Normalize tables object (support backup.tables or legacy backup.data)
    const tables = backupData.tables || backupData.data;
    if (!tables || typeof tables !== 'object') {
      throw new Error('Invalid backup file: Missing database tables record container.');
    }

    // Schema version check
    const schemaVersion = Number(backupData.schemaVersion);
    if (!isNaN(schemaVersion) && schemaVersion > db.verno) {
      throw new Error(
        `Incompatible backup schema: Backup was created with schema Version ${schemaVersion}, but your current application runs Version ${db.verno}. Please update the FreshNest application before restoring this file.`
      );
    }

    // Table array validation and record counting
    const tableCounts = {};
    let totalRecords = 0;

    for (const [tableName, records] of Object.entries(tables)) {
      if (!Array.isArray(records)) {
        throw new Error(`Corrupted backup data: Table "${tableName}" does not contain a valid record array.`);
      }
      tableCounts[tableName] = records.length;
      totalRecords += records.length;
    }

    return {
      isValid: true,
      appName: backupData.appName || 'FreshNest Poultry Farm',
      backupFormatVersion: backupData.backupFormatVersion || '1.0',
      schemaVersion: schemaVersion || db.verno,
      exportedAt: backupData.exportedAt || backupData.exportDate || 'Unknown date',
      tableCounts,
      totalRecords,
      normalizedTables: tables,
    };
  },

  /**
   * Atomically restore database from validated backup
   * Guarantees rollback if anything fails midway
   */
  async executeRestore(backupData) {
    // 1. Strict validation
    const validation = this.validateBackup(backupData);
    const tablesToRestore = validation.normalizedTables;

    // 2. Atomic Dexie transaction across all database tables
    const nowIso = new Date().toISOString();

    await db.transaction('rw', db.tables, async () => {
      // Step A: Clear all tables
      for (const table of db.tables) {
        await table.clear();
      }

      // Step B: Bulk add records for each table defined in backup
      for (const table of db.tables) {
        const records = tablesToRestore[table.name];
        if (records && Array.isArray(records) && records.length > 0) {
          await table.bulkAdd(records);
        }
      }

      // Step C: Record restore timestamp in farmSettings
      await db.farmSettings.put({
        key: 'last_restore_timestamp',
        value: nowIso,
        updatedAt: nowIso,
      });
    });

    return {
      success: true,
      restoredAt: nowIso,
      restoredRecordCounts: validation.tableCounts,
      totalRestored: validation.totalRecords,
    };
  },
};
