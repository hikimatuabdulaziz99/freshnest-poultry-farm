import { useState } from 'react';
import {
  X,
  AlertTriangle,
  Ban,
} from 'lucide-react';
import styles from './SaleCancelModal.module.css';

export function SaleCancelModal({
  isOpen,
  onClose,
  sale,
  onConfirmCancel,
}) {
  const [reason, setReason] = useState('Customer cancellation / return');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !sale) return null;

  const isBatchBirds = sale.productType === 'LIVE_BIRDS' && sale.birdSourceType === 'BATCH';
  const isBirdIndividual = sale.productType === 'LIVE_BIRDS' && sale.birdId;
  const isEggs = sale.productType === 'EGGS';

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      await onConfirmCancel(sale.saleId || sale.id, reason.trim());
      onClose();
    } catch (err) {
      console.error('Error cancelling sale:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.modalHeader}>
          <div className={styles.headerTitleGroup}>
            <div className={styles.headerIcon}>
              <Ban size={20} />
            </div>
            <h3 className={styles.modalTitle}>Confirm Sale Cancellation</h3>
          </div>
          <button type="button" className={styles.closeButton} onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className={styles.modalBody}>
          <p>
            Are you sure you want to cancel sale{' '}
            <strong>{sale.saleId || sale.invoiceNumber}</strong> for customer{' '}
            <strong>{sale.customerName}</strong>?
          </p>

          <div className={styles.warningBox}>
            <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              {isBatchBirds && (
                <span>
                  Cancelling this transaction will atomically restore <strong>{sale.quantity} live birds</strong> back to batch <strong>{sale.batchCode || 'batch'}</strong>&apos;s living count.
                </span>
              )}
              {isBirdIndividual && (
                <span>
                  Cancelling this transaction will restore individual bird <strong>{sale.birdTag || 'tag'}</strong> from <strong>Sold</strong> back to its prior status.
                </span>
              )}
              {isEggs && (
                <span>
                  Cancelling this transaction will atomically restore <strong>{sale.totalEggsSold || (sale.quantity * 30)} eggs ({sale.eggGrade})</strong> back to active egg inventory.
                </span>
              )}
              {!isBatchBirds && !isBirdIndividual && !isEggs && (
                <span>
                  This sale will be marked as Cancelled without silently deleting payment records.
                </span>
              )}
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Reason for Cancellation</label>
            <textarea
              className={styles.formTextarea}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Provide a reason for auditing and farm records..."
              required
            />
          </div>
        </div>

        {/* Footer */}
        <div className={styles.modalFooter}>
          <button
            type="button"
            className={styles.btnCancel}
            onClick={onClose}
            disabled={isSubmitting}
          >
            Go Back
          </button>
          <button
            type="button"
            className={styles.btnConfirmCancel}
            onClick={handleConfirm}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Cancelling...' : 'Confirm Cancellation & Restore Stock'}
          </button>
        </div>
      </div>
    </div>
  );
}
