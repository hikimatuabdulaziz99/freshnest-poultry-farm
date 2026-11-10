import { useState } from 'react';
import {
  X,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import styles from './EggDeleteModal.module.css';

/**
 * Delete Confirmation Modal with Inventory Rollback Guard
 */
export function EggDeleteModal({
  isOpen,
  onClose,
  onConfirm,
  log = null,
}) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen || !log) return null;

  const handleDelete = async () => {
    setErrorMsg('');
    setIsDeleting(true);
    try {
      await onConfirm(log.id || log.logId);
      onClose();
    } catch (err) {
      console.error('Error deleting collection log:', err);
      setErrorMsg(err.message || 'Failed to delete record.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div className={styles.headerTitleGroup}>
            <div className={styles.headerIcon}>
              <Trash2 size={20} />
            </div>
            <h3 className={styles.modalTitle}>Delete Collection Record</h3>
          </div>
          <button type="button" onClick={onClose} className={styles.closeButton}>
            <X size={18} />
          </button>
        </div>

        <div className={styles.modalBody}>
          {errorMsg && (
            <div style={{ color: '#dc2626', fontWeight: 600, fontSize: '0.85rem' }}>
              {errorMsg}
            </div>
          )}

          <p>
            Are you sure you want to permanently delete Egg Collection Log{' '}
            <strong>{log.logId}</strong> recorded on <strong>{log.collectionDate}</strong> for flock{' '}
            <strong>{log.batchCode}</strong>?
          </p>

          <div className={styles.warningBox}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, marginBottom: 4 }}>
              <AlertTriangle size={16} />
              <span>Inventory Rollback Warning</span>
            </div>
            This action will automatically reverse and remove all associated stock-in movements ({log.goodEggs} good eggs and defects) from the egg inventory ledger. If any of these eggs have already been sold or allocated, deletion will be blocked to prevent negative inventory balances.
          </div>
        </div>

        <div className={styles.modalFooter}>
          <button type="button" onClick={onClose} className={styles.btnCancel}>
            Cancel
          </button>
          <button
            type="button"
            disabled={isDeleting}
            onClick={handleDelete}
            className={styles.btnDelete}
          >
            <Trash2 size={16} />
            <span>{isDeleting ? 'Rolling back...' : 'Confirm Deletion'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
