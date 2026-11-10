import { useState, useEffect, useCallback } from 'react';
import {
  Database,
  Layers,
  HardDrive,
  Clock,
  RefreshCw,
  Cpu,
  TableProperties,
} from 'lucide-react';
import { settingsService } from '../../services/settingsService.js';
import styles from './DatabaseInfoTab.module.css';

export function DatabaseInfoTab() {
  const [dbInfo, setDbInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadInfo = useCallback(async () => {
    setIsLoading(true);
    try {
      const info = await settingsService.getDatabaseInfo();
      setDbInfo(info);
    } catch (err) {
      console.error('Error loading database info:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInfo();
  }, [loadInfo]);

  const formatTimestamp = (isoString) => {
    if (!isoString) return 'Never backed up';
    try {
      return new Intl.DateTimeFormat('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }).format(new Date(isoString));
    } catch {
      return isoString;
    }
  };

  return (
    <div className={styles.tabContainer}>
      <div className={styles.headerRow}>
        <div>
          <h3 className={styles.tabTitle}>Database Architecture & Table Diagnostics</h3>
          <p className={styles.tabSubtitle}>
            Real-time IndexedDB storage metrics, schema versioning, and per-table record tallies
          </p>
        </div>
        <button
          type="button"
          className={styles.refreshBtn}
          onClick={loadInfo}
          disabled={isLoading}
          title="Recount tables"
        >
          <RefreshCw size={14} className={isLoading ? styles.spinning : ''} />
          <span>Refresh Metrics</span>
        </button>
      </div>

      {/* Primary KPI Cards */}
      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <div className={styles.kpiIconBox}>
            <Database size={18} />
          </div>
          <div className={styles.kpiContent}>
            <span className={styles.kpiLabel}>Database Name</span>
            <span className={styles.kpiValue}>{dbInfo?.databaseName || 'freshnest_poultry_db'}</span>
            <span className={styles.kpiSub}>Client-side Dexie.js instance</span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIconBox}>
            <Cpu size={18} />
          </div>
          <div className={styles.kpiContent}>
            <span className={styles.kpiLabel}>Schema Version</span>
            <span className={styles.kpiValue}>Version {dbInfo?.schemaVersion || 12}</span>
            <span className={styles.kpiSub}>Supports Modules 00 through 15 (PWA Active)</span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIconBox}>
            <Layers size={18} />
          </div>
          <div className={styles.kpiContent}>
            <span className={styles.kpiLabel}>Total Database Records</span>
            <span className={styles.kpiValue}>{(dbInfo?.totalRecords || 0).toLocaleString()}</span>
            <span className={styles.kpiSub}>Across {Object.keys(dbInfo?.tableCounts || {}).length} registered tables</span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIconBox}>
            <Clock size={18} />
          </div>
          <div className={styles.kpiContent}>
            <span className={styles.kpiLabel}>Last Full Backup</span>
            <span className={styles.kpiValueSmall}>{formatTimestamp(dbInfo?.lastBackupAt)}</span>
            <span className={styles.kpiSub}>
              {dbInfo?.lastRestoreAt ? `Last restore: ${formatTimestamp(dbInfo?.lastRestoreAt)}` : 'No restore logged'}
            </span>
          </div>
        </div>
      </div>

      {/* Storage Estimate Banner */}
      {dbInfo?.storageEstimate && dbInfo.storageEstimate.quotaMb > 0 && (
        <div className={styles.storageCard}>
          <div className={styles.storageHeader}>
            <div className={styles.storageLeft}>
              <HardDrive size={16} className={styles.storageIcon} />
              <span className={styles.storageTitle}>Local Browser Storage Usage</span>
            </div>
            <span className={styles.storageMeta}>
              {dbInfo.storageEstimate.usageMb} MB used of {dbInfo.storageEstimate.quotaMb.toLocaleString()} MB allocated ({dbInfo.storageEstimate.percentage}%)
            </span>
          </div>
          <div className={styles.storageTrack}>
            <div
              className={styles.storageFill}
              style={{ width: `${Math.min(100, Math.max(1, dbInfo.storageEstimate.percentage))}%` }}
            />
          </div>
        </div>
      )}

      {/* Table Records Breakdown Grid */}
      <div className={styles.tableBreakdownCard}>
        <div className={styles.tableCardHeader}>
          <div className={styles.tableTitleGroup}>
            <TableProperties size={16} className={styles.tableTitleIcon} />
            <h4 className={styles.tableCardTitle}>Dexie.js Table Inventory & Record Counts</h4>
          </div>
          <span className={styles.tableBadge}>{Object.keys(dbInfo?.tableCounts || {}).length} Tables Active</span>
        </div>

        <div className={styles.tableGrid}>
          {Object.entries(dbInfo?.tableCounts || {}).map(([tableName, count]) => (
            <div key={tableName} className={styles.tableRowItem}>
              <div className={styles.tableItemLeft}>
                <span className={styles.tableNameCode}>{tableName}</span>
              </div>
              <span className={`${styles.tableCountTag} ${count > 0 ? styles.countActive : ''}`}>
                {count.toLocaleString()} {count === 1 ? 'record' : 'records'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
