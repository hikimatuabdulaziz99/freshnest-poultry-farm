import { useState } from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { Button } from '../common/Button.jsx';
import styles from './BirdDeleteModal.module.css';

/**
 * Bird Deletion Confirmation Modal
 * Ensures irreversible deletion is confirmed by the administrator.
 */
export function BirdDeleteModal({ bird, isOpen, onClose, onConfirm }) {
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOpen || !bird) return null;

  const handleConfirm = async () => {
    setIsDeleting(true);
    try {
      await onConfirm(bird.id);
      onClose();
    } catch {
      // handled upstream
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
        <div className={styles.body}>
          <div className={styles.dangerIcon}>
            <AlertTriangle size={28} />
          </div>
          <div>
            <h3 className={styles.title}>Confirm Bird Deletion</h3>
            <p className={styles.message}>
              Are you sure you want to permanently delete this bird record from the farm database?
              This action cannot be undone.
            </p>
          </div>

          <div className={styles.birdSummary}>
            <span>
              ID: <span className={styles.mono}>{bird.birdId || `BRD-${bird.id}`}</span>
            </span>
            <span>
              {bird.breed} ({bird.type})
            </span>
            <span>Tag: {bird.tagNumber || '—'}</span>
          </div>
        </div>

        <div className={styles.footer}>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleConfirm}
            disabled={isDeleting}
            icon={<Trash2 size={16} />}
          >
            {isDeleting ? 'Deleting...' : 'Permanently Delete'}
          </Button>
        </div>
      </div>
    </div>
  );
}
