import { useState, useEffect } from 'react';
import {
  X,
  PackageMinus,
  AlertTriangle,
} from 'lucide-react';
import { getLocalDateString } from '../../services/inventoryService.js';
import styles from './StockOutModal.module.css';

export function StockOutModal({
  isOpen,
  onClose,
  onConfirmStockOut,
  item,
  batches = [],
  pens = [],
}) {
  const [quantity, setQuantity] = useState('');
  const [purpose, setPurpose] = useState('');
  const [date, setDate] = useState(getLocalDateString());
  const [batchId, setBatchId] = useState('');
  const [penId, setPenId] = useState('');
  const [notes, setNotes] = useState('');
  const [overrideExpired, setOverrideExpired] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');
  const [recordedBy, setRecordedBy] = useState('Administrator');

  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (item) {
      setQuantity('');
      setPurpose('');
      setDate(getLocalDateString());
      setBatchId('');
      setPenId('');
      setNotes('');
      setOverrideExpired(false);
      setOverrideReason('');
      setRecordedBy('Administrator');
      setError('');
    }
  }, [item, isOpen]);

  if (!isOpen || !item) return null;

  const currentQty = Number(item.currentQuantity) || 0;
  const qtyNum = Number(quantity) || 0;
  const remainingStock = Math.max(0, currentQty - qtyNum);
  const isExpired = Boolean(item.expiryDate && item.expiryDate < getLocalDateString());

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (isNaN(qtyNum) || qtyNum <= 0) {
      setError('Disbursement quantity must be greater than zero.');
      return;
    }

    if (qtyNum > currentQty) {
      setError(
        `Requested quantity (${qtyNum} ${item.unit}) exceeds available stock (${currentQty} ${item.unit}). Negative stock prevented.`
      );
      return;
    }

    if (!purpose.trim()) {
      setError('Please provide the operational purpose or reason for disbursement.');
      return;
    }

    if (isExpired && !overrideExpired) {
      setError(
        `This item expired on ${item.expiryDate}. Expired items cannot be used routinely. Check the biosecurity override box if authorized for non-critical use.`
      );
      return;
    }

    setIsSubmitting(true);
    try {
      await onConfirmStockOut({
        itemId: item.itemId,
        quantity: qtyNum,
        purpose: purpose.trim(),
        date,
        batchId: batchId || null,
        penId: penId || null,
        notes: isExpired ? `[BIOSECURITY OVERRIDE: ${overrideReason}] ${notes}` : notes.trim(),
        overrideExpired,
        recordedBy: recordedBy.trim() || 'Administrator',
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to disburse stock.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContainer} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>
            <PackageMinus size={20} />
            Disburse / Use Inventory Stock
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
            <div><strong>Location:</strong> {item.storageLocation} · <strong>Available:</strong> {currentQty.toLocaleString()} {item.unit}</div>
            <div>
              <strong>Remaining after disbursement:</strong>{' '}
              <span style={{ color: remainingStock === 0 ? '#dc2626' : '#1b4332', fontWeight: 700 }}>
                {remainingStock.toLocaleString()} {item.unit}
              </span>
            </div>
          </div>

          {/* Biosecurity Expiration Guard */}
          {isExpired && (
            <div className={styles.expiredWarning}>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <AlertTriangle size={16} />
                <strong>Biosecurity Expiry Notice: Expired on {item.expiryDate}</strong>
              </div>
              <p style={{ margin: 0 }}>
                Expired materials (e.g. disinfectants, chemical consumables) cannot be disbursed routinely.
              </p>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 600 }}>
                <input
                  type="checkbox"
                  checked={overrideExpired}
                  onChange={(e) => setOverrideExpired(e.target.checked)}
                />
                Authorize supervisor override for non-routine usage
              </label>
              {overrideExpired && (
                <input
                  type="text"
                  className={styles.input}
                  placeholder="Mandatory override authorization reason..."
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  required
                />
              )}
            </div>
          )}

          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Quantity to Use ({item.unit}) *</label>
              <input
                type="number"
                min="0.01"
                step="any"
                max={currentQty}
                className={styles.input}
                placeholder="0"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Disbursement Date *</label>
              <input
                type="date"
                className={styles.input}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>

            <div className={`${styles.formGroup} ${styles.fullWidth}`}>
              <label className={styles.formLabel}>Purpose / Operation *</label>
              <input
                type="text"
                className={styles.input}
                placeholder="e.g. Disinfecting Brooder Pen 2 before chick arrival"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                required
              />
            </div>

            {/* Related Batch */}
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Related Batch (Optional)</label>
              <select
                className={styles.select}
                value={batchId}
                onChange={(e) => setBatchId(e.target.value)}
              >
                <option value="">None / General Farm</option>
                {batches.map((b) => (
                  <option key={b.id || b.batchId} value={b.batchId || b.id}>
                    {b.batchCode || `Batch #${b.id}`} ({b.birdType})
                  </option>
                ))}
              </select>
            </div>

            {/* Related Pen */}
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Related Pen (Optional)</label>
              <select
                className={styles.select}
                value={penId}
                onChange={(e) => setPenId(e.target.value)}
              >
                <option value="">None / General Farm</option>
                {pens.map((p) => (
                  <option key={p.id || p.penId} value={p.penId || p.id}>
                    {p.name || p.penId}
                  </option>
                ))}
              </select>
            </div>

            <div className={`${styles.formGroup} ${styles.fullWidth}`}>
              <label className={styles.formLabel}>Notes (Optional)</label>
              <input
                type="text"
                className={styles.input}
                placeholder="Personnel receiving supplies, condition..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          <div className={styles.modalFooter}>
            <button type="button" className={styles.btnSecondary} onClick={onClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" className={styles.btnDisburse} disabled={isSubmitting || (isExpired && !overrideExpired)}>
              {isSubmitting ? 'Disbursing...' : 'Confirm Stock-Out'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
