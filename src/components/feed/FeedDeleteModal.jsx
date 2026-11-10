import { useState, useEffect } from 'react';
import { X, AlertTriangle, Trash2, Archive, ShieldAlert } from 'lucide-react';
import { db } from '../../database/db.js';
import styles from './FeedDeleteModal.module.css';

/**
 * Feed Safe Delete / Archive Confirmation Modal
 */
export function FeedDeleteModal({ isOpen, feed, onClose, onDelete, onArchive }) {
  const [hasHistory, setHasHistory] = useState(false);
  const [historyCounts, setHistoryCounts] = useState({ purchases: 0, logs: 0 });
  const [isChecking, setIsChecking] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function checkHistory() {
      if (!feed) return;
      try {
        setIsChecking(true);
        const [purchasesCount, logsCount] = await Promise.all([
          db.feedPurchases
            .filter((p) => String(p.feedId) === String(feed.id) || p.feedId === feed.feedId)
            .count(),
          db.feedLogs
            .filter((l) => String(l.feedId) === String(feed.id) || l.feedId === feed.feedId)
            .count(),
        ]);

        if (isMounted) {
          setHistoryCounts({ purchases: purchasesCount, logs: logsCount });
          setHasHistory(purchasesCount > 0 || logsCount > 0);
        }
      } catch (err) {
        console.error('Error checking feed history:', err);
      } finally {
        if (isMounted) setIsChecking(false);
      }
    }

    if (isOpen && feed) {
      checkHistory();
    }

    return () => {
      isMounted = false;
    };
  }, [isOpen, feed]);

  if (!isOpen || !feed) return null;

  const handleDelete = async () => {
    try {
      setIsSubmitting(true);
      await onDelete(feed.id, { force: true });
      onClose();
    } catch (err) {
      console.error('Failed to delete feed:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleArchive = async () => {
    try {
      setIsSubmitting(true);
      await onArchive(feed.id);
      onClose();
    } catch (err) {
      console.error('Failed to archive feed:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.iconBox}>
            {hasHistory ? <ShieldAlert size={22} /> : <AlertTriangle size={22} />}
          </div>
          <div>
            <h3 className={styles.title}>
              {hasHistory ? 'Feed Has Transaction Records' : 'Delete Feed Product?'}
            </h3>
            <p className={styles.subtitle}>
              {feed.name} ({feed.feedId || `FEED-${feed.id}`})
            </p>
          </div>
          <button type="button" className={styles.closeBtn} onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className={styles.body}>
          {isChecking ? (
            <p className={styles.checkingText}>Auditing linked inventory transactions...</p>
          ) : hasHistory ? (
            <div className={styles.warningBox}>
              <p className={styles.warningText}>
                This feed product is linked to{' '}
                <strong>{historyCounts.purchases} purchase order(s)</strong> and{' '}
                <strong>{historyCounts.logs} feeding log(s)</strong>.
              </p>
              <p className={styles.recommendationText}>
                Permanent deletion will remove financial audit history. We recommend marking this
                feed product as <strong>Archived</strong> instead, which will hide it from active
                feeding lists while preserving accounting records.
              </p>
            </div>
          ) : (
            <p className={styles.confirmText}>
              Are you sure you want to permanently delete <strong>{feed.name}</strong>? This action
              cannot be undone.
            </p>
          )}
        </div>

        <div className={styles.footer}>
          <button type="button" className={styles.cancelBtn} onClick={onClose} disabled={isSubmitting}>
            Cancel
          </button>

          {hasHistory ? (
            <button
              type="button"
              className={styles.archiveBtn}
              onClick={handleArchive}
              disabled={isSubmitting}
            >
              <Archive size={15} />
              Archive Feed Product
            </button>
          ) : (
            <button
              type="button"
              className={styles.deleteBtn}
              onClick={handleDelete}
              disabled={isSubmitting}
            >
              <Trash2 size={15} />
              Delete Feed Product
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
