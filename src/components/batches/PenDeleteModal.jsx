import { useState } from 'react';
import { AlertTriangle, Trash2, ShieldAlert } from 'lucide-react';
import { Button } from '../common/Button.jsx';
import styles from './PenDeleteModal.module.css';

/**
 * Pen Deletion Confirmation Modal
 * Strictly blocks deletion if active/planned cohorts currently occupy the pen.
 */
export function PenDeleteModal({
  pen,
  isOpen,
  onClose,
  onConfirmDelete,
}) {
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOpen || !pen) return null;

  const hasOccupants = pen.occupiedCount > 0 || (pen.assignedBatches && pen.assignedBatches.length > 0);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onConfirmDelete(pen.id);
      onClose();
    } catch (err) {
      console.error('Delete pen error:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div className={hasOccupants ? styles.iconBoxWarning : styles.iconBoxDanger}>
            {hasOccupants ? <ShieldAlert size={24} /> : <AlertTriangle size={24} />}
          </div>
          <div className={styles.headerText}>
            <h3>{hasOccupants ? 'Cannot Delete Pen' : 'Delete Poultry House / Pen'}</h3>
            <p>Safety validation for {pen.penId} - {pen.name}</p>
          </div>
        </div>

        <div className={styles.modalBody}>
          <div className={styles.penSummary}>
            <strong>{pen.name}</strong> ({pen.type} Facility)<br />
            Capacity: {pen.capacity.toLocaleString()} birds · Current Occupancy: {pen.occupiedCount.toLocaleString()} birds
          </div>

          {hasOccupants ? (
            <div className={styles.alertBox}>
              <div className={styles.alertTitle}>Pen Contains Active Batches</div>
              <div>
                This pen currently houses <strong>{pen.occupiedCount.toLocaleString()} birds</strong> across {pen.assignedBatches?.length || pen.batchCount || 0} active cohort(s):
              </div>
              <ul className={styles.batchList}>
                {pen.assignedBatches?.map((b) => (
                  <li key={b.id}>
                    <strong>{b.batchId || b.batchCode || `#${b.id}`}</strong> - {b.name} ({b.currentCount || b.initialCount} birds)
                  </li>
                ))}
              </ul>
              <div style={{ marginTop: 10 }}>
                To delete this pen, you must first move or reassign these batches to another pen.
              </div>
            </div>
          ) : (
            <p>
              Are you sure you want to permanently delete <strong>{pen.penId} ({pen.name})</strong>?
              This pen is currently empty and has no active batches assigned. This operation is permanent.
            </p>
          )}
        </div>

        <div className={styles.modalFooter}>
          <Button variant="outline" size="sm" onClick={onClose} disabled={isDeleting}>
            {hasOccupants ? 'Close' : 'Cancel'}
          </Button>

          {!hasOccupants && (
            <Button
              variant="danger"
              size="sm"
              icon={<Trash2 size={15} />}
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Permanently Delete'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
