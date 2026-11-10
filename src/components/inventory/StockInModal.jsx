import { useState, useEffect } from 'react';
import {
  X,
  PackagePlus,
  AlertTriangle,
} from 'lucide-react';
import { getLocalDateString, formatNaira } from '../../services/inventoryService.js';
import styles from './StockInModal.module.css';

export function StockInModal({
  isOpen,
  onClose,
  onConfirmStockIn,
  item,
}) {
  const [quantity, setQuantity] = useState('');
  const [unitCost, setUnitCost] = useState('');
  const [supplier, setSupplier] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(getLocalDateString());
  const [referenceNumber, setReferenceNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [notes, setNotes] = useState('');
  const [recordedBy, setRecordedBy] = useState('Administrator');

  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (item) {
      setQuantity('');
      setUnitCost(item.unitCost ? String(item.unitCost) : '');
      setSupplier(item.supplier || '');
      setPurchaseDate(getLocalDateString());
      setReferenceNumber('');
      setExpiryDate(item.expiryDate || '');
      setNotes('');
      setRecordedBy('Administrator');
      setError('');
    }
  }, [item, isOpen]);

  if (!isOpen || !item) return null;

  const currentQty = Number(item.currentQuantity) || 0;
  const qtyNum = Number(quantity) || 0;
  const newBalance = currentQty + qtyNum;
  const costNum = Number(unitCost) || 0;
  const totalPurchaseValue = qtyNum * costNum;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (isNaN(qtyNum) || qtyNum <= 0) {
      setError('Received quantity must be greater than zero.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onConfirmStockIn({
        itemId: item.itemId,
        quantity: qtyNum,
        unitCost: costNum,
        supplier: supplier.trim(),
        purchaseDate,
        referenceNumber: referenceNumber.trim(),
        expiryDate: expiryDate || null,
        notes: notes.trim(),
        recordedBy: recordedBy.trim() || 'Administrator',
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to record stock-in.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContainer} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>
            <PackagePlus size={20} />
            Record Stock-In (Receive Supplies)
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
            <div><strong>Category:</strong> {item.category} · <strong>Location:</strong> {item.storageLocation}</div>
            <div>
              <strong>Current Stock:</strong> {currentQty.toLocaleString()} {item.unit} →{' '}
              <span style={{ color: '#1b4332', fontWeight: 700 }}>
                New Balance: {newBalance.toLocaleString()} {item.unit}
              </span>
            </div>
          </div>

          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Quantity Received ({item.unit}) *</label>
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

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Unit Cost (₦)</label>
              <input
                type="number"
                min="0"
                step="any"
                className={styles.input}
                placeholder="0.00"
                value={unitCost}
                onChange={(e) => setUnitCost(e.target.value)}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Supplier / Source</label>
              <input
                type="text"
                className={styles.input}
                placeholder="Supplier name"
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Receive Date *</label>
              <input
                type="date"
                className={styles.input}
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Invoice / Delivery Note #</label>
              <input
                type="text"
                className={styles.input}
                placeholder="e.g. INV-2026-90"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Expiry Date (Where Applicable)</label>
              <input
                type="date"
                className={styles.input}
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
              />
            </div>

            <div className={`${styles.formGroup} ${styles.fullWidth}`}>
              <label className={styles.formLabel}>Notes (Optional)</label>
              <input
                type="text"
                className={styles.input}
                placeholder="Condition of delivery, batch reference..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            {totalPurchaseValue > 0 && (
              <div className={`${styles.fullWidth}`} style={{ fontSize: '0.8125rem', color: '#1b4332', fontWeight: 600 }}>
                Total Inbound Stock Value: {formatNaira(totalPurchaseValue)}
              </div>
            )}
          </div>

          <div className={styles.modalFooter}>
            <button type="button" className={styles.btnSecondary} onClick={onClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" className={styles.btnPrimary} disabled={isSubmitting}>
              {isSubmitting ? 'Receiving...' : 'Confirm Stock-In'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
