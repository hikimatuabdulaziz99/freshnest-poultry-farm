import { useState, useEffect } from 'react';
import { X, Trash2, AlertTriangle, ShieldAlert } from 'lucide-react';
import { db } from '../../database/db.js';
import styles from './MedicationDeleteModal.module.css';

/**
 * Safe Delete Medication Modal
 * Checks for foreign references before allowing deletion
 */
export function MedicationDeleteModal({
  isOpen,
  onClose,
  medication,
  onConfirmDelete,
  onArchive,
}) {
  const [purchaseCount, setPurchaseCount] = useState(0);
  const [logCount, setLogCount] = useState(0);
  const [isChecking, setIsChecking] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  useEffect(() => {
    if (isOpen && medication) {
      checkReferences();
    }
  }, [isOpen, medication]);

  const checkReferences = async () => {
    setIsChecking(true);
    setErrorMessage(null);
    try {
      const [purchases, logs] = await Promise.all([
        db.medicationPurchases
          .where('medicationId')
          .equals(medication.medicationId)
          .count(),
        db.medicationLogs
          .where('medicationId')
          .equals(medication.medicationId)
          .count(),
      ]);
      setPurchaseCount(purchases);
      setLogCount(logs);
    } catch (err) {
      console.error('Error checking medication references:', err);
    } finally {
      setIsChecking(false);
    }
  };

  if (!isOpen || !medication) return null;

  const hasReferences = purchaseCount > 0 || logCount > 0;

  const handleDelete = async () => {
    setIsDeleting(true);
    setErrorMessage(null);
    try {
      await onConfirmDelete(medication.id);
      onClose();
    } catch (err) {
      console.error('Delete error:', err);
      setErrorMessage(err.message || 'Failed to delete medication.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleArchive = async () => {
    setIsDeleting(true);
    setErrorMessage(null);
    try {
      if (onArchive) {
        await onArchive(medication);
      }
      onClose();
    } catch (err) {
      console.error('Archive error:', err);
      setErrorMessage(err.message || 'Failed to archive medication.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalBackdrop} onClick={onClose} aria-hidden="true" />
      <div className={styles.modalContainer} role="dialog" aria-modal="true">
        <div className={styles.modalHeader}>
          <div className={styles.headerTitleWrap}>
            <div className={hasReferences ? styles.headerWarningIcon : styles.headerDangerIcon}>
              {hasReferences ? <ShieldAlert size={20} /> : <Trash2 size={20} />}
            </div>
            <div>
              <h2 className={styles.modalTitle}>
                {hasReferences ? 'Medication In Use — Deletion Blocked' : 'Confirm Delete Medication'}
              </h2>
              <p className={styles.modalSubtitle}>
                {medication.name} ({medication.medicationId})
              </p>
            </div>
          </div>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        {errorMessage && (
          <div className={styles.errorAlert}>
            <AlertTriangle size={16} />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className={styles.modalBody}>
          {isChecking ? (
            <p className={styles.loadingText}>Checking medication ledger references...</p>
          ) : hasReferences ? (
            <div className={styles.referenceWarningBox}>
              <p className={styles.warningText}>
                This medication product cannot be deleted because it is referenced in farm audit records:
              </p>
              <ul className={styles.referenceList}>
                {purchaseCount > 0 && (
                  <li>
                    <strong>{purchaseCount}</strong> stock-in purchase order(s)
                  </li>
                )}
                {logCount > 0 && (
                  <li>
                    <strong>{logCount}</strong> flock treatment log(s)
                  </li>
                )}
              </ul>
              <p className={styles.explanationText}>
                Deleting this item would corrupt historical financial accounting and veterinary food-safety records. You can archive the medication or set its stock to zero instead.
              </p>
            </div>
          ) : (
            <div className={styles.confirmBox}>
              <p className={styles.confirmText}>
                Are you sure you want to permanently delete <strong>{medication.name}</strong> ({medication.medicationId})?
              </p>
              <p className={styles.subConfirmText}>
                This action is irreversible. All catalog details and thresholds for this medication will be removed.
              </p>
            </div>
          )}
        </div>

        <div className={styles.modalFooter}>
          <button
            type="button"
            className={styles.cancelBtn}
            onClick={onClose}
            disabled={isDeleting}
          >
            Cancel
          </button>

          {hasReferences ? (
            <button
              type="button"
              className={styles.archiveBtn}
              onClick={handleArchive}
              disabled={isDeleting}
            >
              Set Stock to 0 / Mark Out of Stock
            </button>
          ) : (
            <button
              type="button"
              className={styles.deleteBtn}
              onClick={handleDelete}
              disabled={isDeleting}
            >
              <Trash2 size={16} />
              <span>{isDeleting ? 'Deleting...' : 'Delete Permanently'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
