import { useState, useEffect } from 'react';
import {
  X,
  SlidersHorizontal,
  AlertTriangle,
} from 'lucide-react';
import { getLocalDateString } from '../../services/inventoryService.js';
import styles from './StockAdjustmentModal.module.css';

export function StockAdjustmentModal({
  isOpen,
  onClose,
  onConfirmAdjustment,
  item,
}) {
  const [adjustmentType, setAdjustmentType] = useState('INCREASE'); // 'INCREASE' | 'DECREASE'
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [date, setDate] = useState(getLocalDateString());
  const [recordedBy, setRecordedBy] = useState('Administrator');

  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (item) {
      setAdjustmentType('INCREASE');
      setQuantity('');
      setReason('');
      setDate(getLocalDateString());
      setRecordedBy('Administrator');
      setError('');
    }
  }, [item, isOpen]);

  if (!isOpen || !item) return null;

  const currentQty = Number(item.currentQuantity) || 0;
  const qtyNum = Number(quantity) || 0;
  const newBalance = adjustmentType === 'INCREASE' ? currentQty + qtyNum : currentQty - qtyNum;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (isNaN(qtyNum) || qtyNum <= 0) {
      setError('Adjustment quantity must be greater than zero.');
      return;
    }

    if (adjustmentType === 'DECREASE' && qtyNum > currentQty) {
      setError(
        `Reduction quantity (${qtyNum} ${item.unit}) exceeds current balance (${currentQty} ${item.unit}). Negative stock prevented.`
      );
      return;
    }

    if (!reason.trim()) {
      setError('A detailed reason is strictly required for inventory adjustments.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onConfirmAdjustment({
        itemId: item.itemId,
        adjustmentType,
        quantity: qtyNum,
        reason: reason.trim(),
        date,
        recordedBy: recordedBy.trim() || 'Administrator',
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to record stock adjustment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContainer} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>
            <SlidersHorizontal size={20} />
            Stock Adjustment / Audit Correction
          </h2>
          <button type="button" className={styles.closeBtn} onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.modalBody}>
          {error && (
            <div style={{ padding: '0.75rem 1rem', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#b91c1c', fontSize: '0.875rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <AlertTriangle size={16} />
              <span>{error}</span>
            </div>
          )}

          <div className={styles.summaryBox}>
            <div><strong>Item:</strong> {item.itemName || item.name} ({item.itemId})</div>
            <div><strong>Current Balance:</strong> {currentQty.toLocaleString()} {item.unit}</div>
            <div>
              <strong>Calculated Balance after adjustment:</strong>{' '}
              <span style={{ color: newBalance < 0 ? '#dc2626' : '#1b4332', fontWeight: 700 }}>
                {newBalance.toLocaleString()} {item.unit}
              </span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Adjustment Type *</label>
              <select
                className={styles.select}
                value={adjustmentType}
                onChange={(e) => setAdjustmentType(e.target.value)}
              >
                <option value="INCREASE">Increase Stock (+)</option>
                <option value="DECREASE">Decrease Stock (-)</option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Adjustment Quantity ({item.unit}) *</label>
              <input
                type="number"
                min="0.01"
                step="any"
                className={styles.input}
                placeholder="0"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
              />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Adjustment Date *</label>
            <input
              type="date"
              className={styles.input}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Mandatory Reason for Adjustment *</label>
            <textarea
              className={styles.textarea}
              placeholder="e.g. Physical inventory recount discrepancy, broken egg trays in storage..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
            />
          </div>

          <div className={styles.modalFooter}>
            <button type="button" className={styles.btnSecondary} onClick={onClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" className={styles.btnPrimary} disabled={isSubmitting}>
              {isSubmitting ? 'Adjusting...' : 'Confirm Adjustment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
