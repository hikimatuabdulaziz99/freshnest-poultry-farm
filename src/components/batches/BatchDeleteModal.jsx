import { useState, useEffect } from 'react';
import { AlertTriangle, Trash2, Archive, ShieldAlert } from 'lucide-react';
import { db } from '../../database/db.js';
import { Button } from '../common/Button.jsx';
import styles from './BatchDeleteModal.module.css';

/**
 * Batch Deletion & Archiving Safety Dialog
 * Audits dependent individual birds and historical production ledgers before allowing action.
 */
export function BatchDeleteModal({
  batch,
  isOpen,
  onClose,
  onConfirmDelete,
  onConfirmArchive,
}) {
  const [isAuditing, setIsAuditing] = useState(true);
  const [dependencies, setDependencies] = useState({
    birdsCount: 0,
    eggLogs: 0,
    mortalityLogs: 0,
    feedLogs: 0,
    medicationLogs: 0,
    vaccinationLogs: 0,
    totalLogs: 0,
    hasDependencies: false,
  });
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!isOpen || !batch) return;

    let isMounted = true;
    setIsAuditing(true);

    const audit = async () => {
      try {
        const batchNumId = Number(batch.id);
        const batchCode = batch.batchId || batch.batchCode || `#${batch.id}`;

        const [birds, egg, mort, feed, med, vax] = await Promise.all([
          db.birds.filter((b) => Number(b.batchId) === batchNumId || b.batchId === batch.batchId).count(),
          db.eggLogs.filter((e) => Number(e.batchId) === batchNumId || e.batchId === batchCode).count(),
          db.mortalityLogs.filter((m) => Number(m.batchId) === batchNumId || m.batchId === batchCode).count(),
          db.feedLogs.filter((f) => Number(f.batchId) === batchNumId || f.batchId === batchCode).count(),
          db.medicationLogs.filter((m) => Number(m.batchId) === batchNumId || m.batchId === batchCode).count(),
          db.vaccinationLogs.filter((v) => Number(v.batchId) === batchNumId || v.batchId === batchCode).count(),
        ]);

        const totalLogs = egg + mort + feed + med + vax;
        if (isMounted) {
          setDependencies({
            birdsCount: birds,
            eggLogs: egg,
            mortalityLogs: mort,
            feedLogs: feed,
            medicationLogs: med,
            vaccinationLogs: vax,
            totalLogs,
            hasDependencies: birds > 0 || totalLogs > 0,
          });
        }
      } catch (err) {
        console.error('Batch dependency audit error:', err);
      } finally {
        if (isMounted) setIsAuditing(false);
      }
    };

    audit();

    return () => {
      isMounted = false;
    };
  }, [isOpen, batch]);

  if (!isOpen || !batch) return null;

  const batchCode = batch.batchId || batch.batchCode || `BAT-${String(batch.id).padStart(4, '0')}`;

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onConfirmDelete(batch.id);
      onClose();
    } catch (err) {
      console.error('Delete error:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleArchive = async () => {
    try {
      await onConfirmArchive(batch.id);
      onClose();
    } catch (err) {
      console.error('Archive error:', err);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div className={dependencies.hasDependencies ? styles.iconBoxWarning : styles.iconBoxDanger}>
            {dependencies.hasDependencies ? <ShieldAlert size={24} /> : <AlertTriangle size={24} />}
          </div>
          <div className={styles.headerText}>
            <h3>{dependencies.hasDependencies ? 'Batch Dependency Warning' : 'Delete Batch Record'}</h3>
            <p>Auditing safety integrity for {batchCode}</p>
          </div>
        </div>

        <div className={styles.modalBody}>
          <div className={styles.batchSummary}>
            <strong>{batch.name}</strong> ({batch.breed} · {batch.birdType})<br />
            Initial Placement: {batch.initialCount} birds · Live Count: {batch.currentCount} birds · Pen: {batch.penName || batch.houseId}
          </div>

          {isAuditing ? (
            <p style={{ color: '#6b7280' }}>Auditing associated flock and production ledgers...</p>
          ) : dependencies.hasDependencies ? (
            <div className={styles.dependencyAlert}>
              <div className={styles.dependencyTitle}>
                Cannot Delete: Dependent Farm Ledgers Exist
              </div>
              <div>
                Deleting this batch is prevented to avoid orphan records and preserve historical farm audit trails.
                The following dependent records exist:
              </div>
              <ul className={styles.dependencyList}>
                {dependencies.birdsCount > 0 && (
                  <li><strong>{dependencies.birdsCount}</strong> individual bird records currently assigned to this batch</li>
                )}
                {dependencies.eggLogs > 0 && (
                  <li><strong>{dependencies.eggLogs}</strong> egg collection logs</li>
                )}
                {dependencies.mortalityLogs > 0 && (
                  <li><strong>{dependencies.mortalityLogs}</strong> mortality logs</li>
                )}
                {dependencies.feedLogs > 0 && (
                  <li><strong>{dependencies.feedLogs}</strong> feed consumption logs</li>
                )}
                {dependencies.medicationLogs > 0 && (
                  <li><strong>{dependencies.medicationLogs}</strong> medication administration records</li>
                )}
                {dependencies.vaccinationLogs > 0 && (
                  <li><strong>{dependencies.vaccinationLogs}</strong> vaccination schedule logs</li>
                )}
              </ul>
              <div style={{ marginTop: 10, fontWeight: 600 }}>
                Recommendation: Use "Archive Batch" instead to preserve production ledgers and free housing capacity.
              </div>
            </div>
          ) : (
            <p>
              Are you sure you want to permanently delete <strong>{batchCode}</strong>?
              This batch has no dependent production logs or individual birds assigned. This operation is permanent.
            </p>
          )}
        </div>

        <div className={styles.modalFooter}>
          <Button variant="outline" size="sm" onClick={onClose} disabled={isDeleting}>
            Cancel
          </Button>

          {dependencies.hasDependencies ? (
            <Button
              variant="primary"
              size="sm"
              icon={<Archive size={15} />}
              onClick={handleArchive}
            >
              Archive Batch Instead
            </Button>
          ) : (
            <Button
              variant="danger"
              size="sm"
              icon={<Trash2 size={15} />}
              onClick={handleDelete}
              disabled={isDeleting || isAuditing}
            >
              {isDeleting ? 'Deleting...' : 'Permanently Delete'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
