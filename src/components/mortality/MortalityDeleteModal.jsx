import { X, AlertTriangle, Trash2 } from 'lucide-react';
import styles from './MortalityDeleteModal.module.css';

export function MortalityDeleteModal({
  isOpen,
  onClose,
  onConfirm,
  log,
  isDeleting = false,
}) {
  if (!isOpen || !log) return null;

  const isBatch = log.recordType === 'BATCH';
  const qty = log.quantity || log.count || 1;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div className={styles.headerTitleGroup}>
            <div className={styles.headerIcon}>
              <Trash2 size={18} />
            </div>
            <h3 className={styles.modalTitle}>Confirm Record Deletion</h3>
          </div>
          <button type="button" className={styles.closeButton} onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className={styles.modalBody}>
          <p>
            Are you sure you want to delete mortality log{' '}
            <strong>{log.mortalityId || `MORT-${log.id}`}</strong>?
          </p>

          <div className={styles.warningBox}>
            <AlertTriangle size={16} style={{ display: 'inline', marginRight: 6 }} />
            {isBatch ? (
              <span>
                Deleting this record will restore <strong>{qty} birds</strong> back to{' '}
                <strong>{log.targetCode}</strong>&apos;s living population count.
              </span>
            ) : (
              <span>
                Deleting this record will restore bird <strong>{log.targetCode}</strong>&apos;s status
                back to <strong>{log.previousBirdStatus || log.previousStatus || 'Active'}</strong>.
              </span>
            )}
          </div>

          <p style={{ fontSize: '0.8125rem', color: '#64748b', margin: 0 }}>
            This operation will be performed atomically inside local IndexedDB.
          </p>
        </div>

        <div className={styles.modalFooter}>
          <button
            type="button"
            className={styles.btnCancel}
            onClick={onClose}
            disabled={isDeleting}
          >
            Cancel
          </button>
          <button
            type="button"
            className={styles.btnDelete}
            onClick={() => onConfirm(log.id)}
            disabled={isDeleting}
          >
            {isDeleting ? 'Deleting...' : 'Delete & Restore Population'}
          </button>
        </div>
      </div>
    </div>
  );
}
