import { useState, useEffect } from 'react';
import { X, Trash2, AlertTriangle, ShieldAlert, Archive } from 'lucide-react';
import { db } from '../../database/db.js';
import styles from './VaccineDeleteModal.module.css';

/**
 * Safe Delete Vaccine Modal
 * Checks for foreign references in purchases, schedules, and administration logs.
 * Blocks deletion if references exist to protect auditability and farm biosecurity records.
 */
export function VaccineDeleteModal({
  isOpen,
  onClose,
  vaccine,
  onConfirmDelete,
  onArchive,
}) {
  const [purchaseCount, setPurchaseCount] = useState(0);
  const [scheduleCount, setScheduleCount] = useState(0);
  const [logCount, setLogCount] = useState(0);
  const [isChecking, setIsChecking] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  useEffect(() => {
    if (isOpen && vaccine) {
      checkReferences();
    }
  }, [isOpen, vaccine]);

  const checkReferences = async () => {
    setIsChecking(true);
    setErrorMessage(null);
    try {
      const [purchases, schedules, logs] = await Promise.all([
        db.vaccinePurchases
          .where('vaccineId')
          .equals(vaccine.vaccineId)
          .count(),
        db.vaccinationSchedules
          .where('vaccineId')
          .equals(vaccine.vaccineId)
          .count(),
        db.vaccinationLogs
          .where('vaccineId')
          .equals(vaccine.vaccineId)
          .count(),
      ]);
      setPurchaseCount(purchases);
      setScheduleCount(schedules);
      setLogCount(logs);
    } catch (err) {
      console.error('Error checking vaccine references:', err);
    } finally {
      setIsChecking(false);
    }
  };

  if (!isOpen || !vaccine) return null;

  const hasReferences = purchaseCount > 0 || scheduleCount > 0 || logCount > 0;

  const handleDelete = async () => {
    setIsDeleting(true);
    setErrorMessage(null);
    try {
      await onConfirmDelete(vaccine.id);
      onClose();
    } catch (err) {
      setErrorMessage(err.message || 'Failed to delete vaccine.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleArchive = async () => {
    setIsDeleting(true);
    setErrorMessage(null);
    try {
      await onArchive(vaccine.id);
      onClose();
    } catch (err) {
      setErrorMessage(err.message || 'Failed to archive vaccine.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalBackdrop} onClick={onClose} />
      <div className={styles.modalContainer}>
        <div className={styles.modalHeader}>
          <div className={styles.headerTitleWrap}>
            <div className={`${styles.headerIcon} ${hasReferences ? styles.iconWarning : styles.iconDanger}`}>
              {hasReferences ? <ShieldAlert size={22} /> : <Trash2 size={22} />}
            </div>
            <div>
              <h2 className={styles.modalTitle}>
                {hasReferences ? 'Vaccine Cannot Be Deleted' : 'Delete Vaccine Product'}
              </h2>
              <p className={styles.modalSubtitle}>
                {vaccine.name} ({vaccine.vaccineId})
              </p>
            </div>
          </div>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Close dialog"
          >
            <X size={20} />
          </button>
        </div>

        <div className={styles.modalBody}>
          {errorMessage && (
            <div className={styles.errorBanner}>
              <AlertTriangle size={18} />
              <span>{errorMessage}</span>
            </div>
          )}

          {isChecking ? (
            <div className={styles.checkingState}>
              <p>Verifying historical farm records and biosecurity audit logs...</p>
            </div>
          ) : hasReferences ? (
            <div className={styles.blockedState}>
              <p className={styles.description}>
                This vaccine is permanently linked to historical farm records and cannot be deleted to preserve biosecurity auditability and regulatory compliance:
              </p>

              <div className={styles.referenceList}>
                {purchaseCount > 0 && (
                  <div className={styles.referenceItem}>
                    <strong>{purchaseCount}</strong>
                    <span>Purchase stock-in receipt{purchaseCount > 1 ? 's' : ''}</span>
                  </div>
                )}
                {scheduleCount > 0 && (
                  <div className={styles.referenceItem}>
                    <strong>{scheduleCount}</strong>
                    <span>Scheduled vaccination event{scheduleCount > 1 ? 's' : ''}</span>
                  </div>
                )}
                {logCount > 0 && (
                  <div className={styles.referenceItem}>
                    <strong>{logCount}</strong>
                    <span>Flock administration log{logCount > 1 ? 's' : ''}</span>
                  </div>
                )}
              </div>

              <div className={styles.recommendationBox}>
                <strong>Recommended Action: Archive</strong>
                <p>
                  Archiving deactivates this vaccine so it cannot be selected for future vaccinations or stock purchases, while keeping all historical veterinary records completely intact.
                </p>
              </div>
            </div>
          ) : (
            <div className={styles.confirmState}>
              <p className={styles.description}>
                Are you sure you want to permanently delete <strong>{vaccine.name}</strong> ({vaccine.vaccineId})?
              </p>
              <p className={styles.warningNote}>
                No purchases, scheduled events, or administration logs were found for this item. This action cannot be undone.
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
              disabled={isDeleting || vaccine.status === 'Archived'}
            >
              <Archive size={16} />
              <span>{vaccine.status === 'Archived' ? 'Already Archived' : 'Archive Vaccine'}</span>
            </button>
          ) : (
            <button
              type="button"
              className={styles.deleteBtn}
              onClick={handleDelete}
              disabled={isDeleting || isChecking}
            >
              <Trash2 size={16} />
              <span>{isDeleting ? 'Deleting...' : 'Delete Vaccine'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
