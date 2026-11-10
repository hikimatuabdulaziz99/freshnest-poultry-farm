import { useState, useRef } from 'react';
import {
  Download,
  Upload,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  FileJson,
  RefreshCw,
  Database,
  ArrowRight,
  ShieldAlert,
  FileCheck,
} from 'lucide-react';
import { settingsService } from '../../services/settingsService.js';
import styles from './BackupRestoreTab.module.css';

export function BackupRestoreTab({ onDatabaseRestored }) {
  // Backup states
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [backupSuccess, setBackupSuccess] = useState(null);
  const [backupError, setBackupError] = useState(null);

  // Restore states
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [parseError, setParseError] = useState(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreSuccess, setRestoreSuccess] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const fileInputRef = useRef(null);

  // 1. Full Database Backup Handler
  const handleCreateBackup = async () => {
    setIsBackingUp(true);
    setBackupSuccess(null);
    setBackupError(null);
    try {
      const { filename, jsonString, metadata } = await settingsService.generateFullBackup();

      // Trigger browser file download
      const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setBackupSuccess({
        filename,
        totalRecords: metadata.totalRecords,
        tableCount: Object.keys(metadata.tableCounts).length,
        exportedAt: metadata.exportedAt,
      });
    } catch (err) {
      console.error('Backup error:', err);
      setBackupError('Failed to generate full backup: ' + (err.message || 'Unknown error'));
    } finally {
      setIsBackingUp(false);
    }
  };

  // 2. File Selection & Pre-Validation Handler
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setParseError(null);
    setPreviewData(null);
    setRestoreSuccess(null);

    const reader = new window.FileReader();
    reader.onload = (readEvent) => {
      try {
        const text = readEvent.target?.result;
        if (typeof text !== 'string') {
          throw new Error('Unable to read the selected file content.');
        }

        const parsedJson = JSON.parse(text);
        const validation = settingsService.validateBackup(parsedJson);

        setPreviewData({
          parsedBackup: parsedJson,
          validation,
        });
      } catch (err) {
        console.error('Validation error:', err);
        setParseError(err.message || 'Invalid or corrupted backup JSON file.');
      }
    };

    reader.onerror = () => {
      setParseError('Failed to read backup file from your local storage.');
    };

    reader.readAsText(file);
  };

  // 3. Execute Validated Restore inside Atomic Transaction
  const handleExecuteRestore = async () => {
    if (!previewData?.parsedBackup) return;

    setShowConfirmModal(false);
    setIsRestoring(true);
    setParseError(null);

    try {
      const result = await settingsService.executeRestore(previewData.parsedBackup);

      setRestoreSuccess({
        totalRestored: result.totalRestored,
        restoredAt: result.restoredAt,
        tableCounts: result.restoredRecordCounts,
      });

      // Clear selection
      setSelectedFile(null);
      setPreviewData(null);
      if (fileInputRef.current) fileInputRef.current.value = '';

      // Trigger app-level reload / refresh callback
      if (onDatabaseRestored) {
        onDatabaseRestored(result);
      }
    } catch (err) {
      console.error('Restore error:', err);
      setParseError('Restore failed: ' + (err.message || 'Database transaction rolled back.'));
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <div className={styles.tabContainer}>
      <div className={styles.headerRow}>
        <div>
          <h3 className={styles.tabTitle}>Full Database Backup & Disaster Recovery</h3>
          <p className={styles.tabSubtitle}>
            Safely download complete offline JSON database archives or restore previously exported farm records
          </p>
        </div>
      </div>

      {/* Backup Section */}
      <div className={styles.sectionCard}>
        <div className={styles.sectionHeader}>
          <div className={styles.iconCircle}>
            <Download size={18} />
          </div>
          <div>
            <h4 className={styles.sectionTitle}>Full Database Export (JSON Backup)</h4>
            <p className={styles.sectionDesc}>
              Creates an immutable JSON archive containing every record across all 26 Dexie tables, preserving unique IDs, batch cohorts, transactions, and settings.
            </p>
          </div>
        </div>

        {backupSuccess && (
          <div className={styles.successBanner} role="alert">
            <CheckCircle2 size={16} className={styles.successIcon} />
            <div>
              <strong>Backup Downloaded Successfully:</strong> {backupSuccess.filename}
              <p className={styles.successSub}>
                Exported {backupSuccess.totalRecords.toLocaleString()} records across {backupSuccess.tableCount} tables at {backupSuccess.exportedAt.slice(0, 19).replace('T', ' ')}.
              </p>
            </div>
          </div>
        )}

        {backupError && (
          <div className={styles.errorBanner} role="alert">
            <AlertCircle size={16} className={styles.errorIcon} />
            <div>
              <strong>Backup Failed:</strong>
              <p className={styles.errorSub}>{backupError}</p>
            </div>
          </div>
        )}

        <div className={styles.sectionActions}>
          <button
            type="button"
            className={styles.backupBtn}
            onClick={handleCreateBackup}
            disabled={isBackingUp}
          >
            {isBackingUp ? (
              <>
                <RefreshCw size={15} className={styles.spinning} />
                <span>Generating Backup...</span>
              </>
            ) : (
              <>
                <Download size={15} />
                <span>Create & Download Full Backup (.json)</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Restore Section */}
      <div className={styles.sectionCard}>
        <div className={styles.sectionHeader}>
          <div className={`${styles.iconCircle} ${styles.iconRestore}`}>
            <Upload size={18} />
          </div>
          <div>
            <h4 className={styles.sectionTitle}>Database Restore from JSON Backup</h4>
            <p className={styles.sectionDesc}>
              Restore all farm operational records from a previously generated FreshNest JSON backup file.
            </p>
          </div>
        </div>

        {/* Warning Callout */}
        <div className={styles.warningBox}>
          <AlertTriangle size={18} className={styles.warningIcon} />
          <div>
            <h5 className={styles.warningTitle}>Critical Safety & Atomic Replacement Notice</h5>
            <p className={styles.warningText}>
              Restoring a backup will atomically replace your current database records with the contents of the chosen backup.
              If the backup file is corrupted or validation fails, your current database is strictly preserved with zero data loss.
            </p>
          </div>
        </div>

        {restoreSuccess && (
          <div className={styles.successBanner} role="alert">
            <CheckCircle2 size={16} className={styles.successIcon} />
            <div>
              <strong>Database Restored Successfully!</strong>
              <p className={styles.successSub}>
                Successfully restored {restoreSuccess.totalRestored.toLocaleString()} total records into IndexedDB. The application is up to date.
              </p>
            </div>
          </div>
        )}

        {parseError && (
          <div className={styles.errorBanner} role="alert">
            <AlertCircle size={16} className={styles.errorIcon} />
            <div>
              <strong>Backup Validation / Restore Error:</strong>
              <p className={styles.errorSub}>{parseError}</p>
            </div>
          </div>
        )}

        {/* File Picker */}
        <div className={styles.fileUploadArea}>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleFileSelect}
            className={styles.hiddenInput}
            id="backup-file-input"
          />
          <label htmlFor="backup-file-input" className={styles.fileDropZone}>
            <FileJson size={32} className={styles.fileIcon} />
            <span className={styles.fileLabel}>
              {selectedFile ? selectedFile.name : 'Select FreshNest Backup JSON File'}
            </span>
            <span className={styles.fileHint}>
              Click to browse your device for a valid FreshNest_Backup_*.json file
            </span>
          </label>
        </div>

        {/* Restore Preview Card */}
        {previewData && (
          <div className={styles.previewCard}>
            <div className={styles.previewHeader}>
              <div className={styles.previewTitleGroup}>
                <FileCheck size={18} className={styles.previewCheckIcon} />
                <h5 className={styles.previewTitle}>Backup File Pre-Validation Passed</h5>
              </div>
              <span className={styles.previewBadge}>Schema V{previewData.validation.schemaVersion}</span>
            </div>

            <div className={styles.previewMetaGrid}>
              <div className={styles.previewMetaItem}>
                <span className={styles.previewMetaLabel}>Application</span>
                <span className={styles.previewMetaValue}>{previewData.validation.appName}</span>
              </div>
              <div className={styles.previewMetaItem}>
                <span className={styles.previewMetaLabel}>Export Timestamp</span>
                <span className={styles.previewMetaValue}>{previewData.validation.exportedAt}</span>
              </div>
              <div className={styles.previewMetaItem}>
                <span className={styles.previewMetaLabel}>Total Records</span>
                <span className={styles.previewMetaValue}>
                  {previewData.validation.totalRecords.toLocaleString()} records
                </span>
              </div>
              <div className={styles.previewMetaItem}>
                <span className={styles.previewMetaLabel}>Format Version</span>
                <span className={styles.previewMetaValue}>V{previewData.validation.backupFormatVersion}</span>
              </div>
            </div>

            {/* Table Counts Preview */}
            <div className={styles.previewTableCounts}>
              <span className={styles.previewSubheading}>Records Breakdown:</span>
              <div className={styles.tableTagsContainer}>
                {Object.entries(previewData.validation.tableCounts).map(([tbl, cnt]) => (
                  <span key={tbl} className={styles.tableTag}>
                    <strong>{tbl}:</strong> {cnt}
                  </span>
                ))}
              </div>
            </div>

            <div className={styles.previewActions}>
              <button
                type="button"
                className={styles.cancelPreviewBtn}
                onClick={() => {
                  setSelectedFile(null);
                  setPreviewData(null);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
              >
                Cancel Selection
              </button>

              <button
                type="button"
                className={styles.confirmRestoreBtn}
                onClick={() => setShowConfirmModal(true)}
                disabled={isRestoring}
              >
                <ArrowRight size={15} />
                <span>Proceed to Restore Database</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className={styles.modalBackdrop}>
          <div className={styles.modalCard} role="dialog" aria-modal="true" aria-labelledby="modal-title">
            <div className={styles.modalHeader}>
              <div className={styles.modalIconBox}>
                <ShieldAlert size={24} />
              </div>
              <div>
                <h4 id="modal-title" className={styles.modalTitle}>Confirm Full Database Replacement</h4>
                <p className={styles.modalSubtitle}>This action replaces all active IndexedDB data</p>
              </div>
            </div>

            <div className={styles.modalBody}>
              <p className={styles.modalWarning}>
                You are about to restore <strong>{previewData?.validation.totalRecords.toLocaleString()} records</strong> from the backup dated <strong>{previewData?.validation.exportedAt}</strong>.
              </p>
              <p className={styles.modalWarningDetail}>
                All current farm records in IndexedDB will be replaced with the contents of this backup file.
                This operation is atomic and protected by Dexie rollback, but current untracked records will be overwritten.
              </p>
            </div>

            <div className={styles.modalFooter}>
              <button
                type="button"
                className={styles.modalCancelBtn}
                onClick={() => setShowConfirmModal(false)}
                disabled={isRestoring}
              >
                Cancel
              </button>
              <button
                type="button"
                className={styles.modalProceedBtn}
                onClick={handleExecuteRestore}
                disabled={isRestoring}
              >
                {isRestoring ? (
                  <>
                    <RefreshCw size={14} className={styles.spinning} />
                    <span>Restoring Database...</span>
                  </>
                ) : (
                  <>
                    <Database size={14} />
                    <span>Yes, Overwrite & Restore Now</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
