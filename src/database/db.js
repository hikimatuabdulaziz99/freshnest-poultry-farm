import Dexie from 'dexie';
import { DB_NAME, SCHEMA_V1, SCHEMA_V2, SCHEMA_V3, SCHEMA_V4, SCHEMA_V5, SCHEMA_V6, SCHEMA_V7, SCHEMA_V8, SCHEMA_V9, SCHEMA_V10, SCHEMA_V11, SCHEMA_V12 } from './schema.js';

/**
 * FreshNest Database Instance
 * Pure offline IndexedDB storage using Dexie.js
 */
export class FreshNestDatabase extends Dexie {
  constructor() {
    super(DB_NAME);

    // Register Version 1 Schema (Baseline 14 tables)
    this.version(1).stores(SCHEMA_V1);

    // Register Version 2 Migration (Adds administrators table)
    this.version(2).stores(SCHEMA_V2);

    // Register Version 3 Migration (Module 03 Bird Management indexes)
    this.version(3).stores(SCHEMA_V3);

    // Register Version 4 Migration (Module 04 Batch & Pen Management)
    this.version(4).stores(SCHEMA_V4);

    // Register Version 5 Migration (Module 05 Feed Management)
    this.version(5).stores(SCHEMA_V5);

    // Register Version 6 Migration (Module 06 Medication Management)
    this.version(6).stores(SCHEMA_V6);

    // Register Version 7 Migration (Module 07 Vaccination Management)
    this.version(7).stores(SCHEMA_V7);

    // Register Version 8 Migration (Module 08 Egg Production & Inventory Management)
    this.version(8).stores(SCHEMA_V8);

    // Register Version 9 Migration (Module 09 Mortality Management)
    this.version(9).stores(SCHEMA_V9);

    // Register Version 10 Migration (Module 10 Sales & Revenue Management)
    this.version(10).stores(SCHEMA_V10);

    // Register Version 11 Migration (Module 11 Expenses Management)
    this.version(11).stores(SCHEMA_V11);

    // Register Version 12 Migration (Module 12 General Inventory Management)
    this.version(12).stores(SCHEMA_V12);

    // Setup automated timestamps on creation
    this.tables.forEach((table) => {
      table.hook('creating', (_primaryKey, obj) => {
        if (!obj.createdAt) {
          obj.createdAt = new Date().toISOString();
        }
        obj.updatedAt = new Date().toISOString();
      });

      table.hook('updating', (modifications, _primaryKey, _obj) => {
        return {
          ...modifications,
          updatedAt: new Date().toISOString(),
        };
      });
    });
  }
}

// Singleton database instance
export const db = new FreshNestDatabase();

/**
 * Verify and initialize database connection
 * Returns database metadata and connection health
 */
export async function initDatabase() {
  try {
    await db.open();
    return {
      status: 'ready',
      name: db.name,
      version: db.verno,
      tableCount: db.tables.length,
      tables: db.tables.map((t) => t.name),
    };
  } catch (error) {
    console.error('Failed to open FreshNest IndexedDB:', error);
    return {
      status: 'error',
      error: error.message || 'Unknown database initialization error',
    };
  }
}
