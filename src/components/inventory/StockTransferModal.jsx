import { useState, useEffect } from 'react';
import {
  X,
  ArrowRightLeft,
  AlertTriangle,
} from 'lucide-react';
import { STORAGE_LOCATIONS, getLocalDateString } from '../../services/inventoryService.js';
import styles from './StockTransferModal.module.css';

export function StockTransferModal({
  isOpen,
  onClose,
  onConfirmTransfer,
  item,
}) {
  const [fromLocation, setFromLocation] = useState('Main Store');
  const [toLocation, setToLocation] = useState('Brooder Store');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [date, setDate] = useState(getLocalDateString());
  const [recordedBy, setRecordedBy] = useState('Administrator');

  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (item) {
      const currentLoc = item.storageLocation || item.location || 'Main Store';
      setFromLocation(currentLoc);
      // Pick a different default for toLocation
      const other = STORAGE_LOCATIONS.find((l) => l !== currentLoc) || 'Feed Warehouse';
      setToLocation(other);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (fromLocation.toLowerCase() === toLocation.toLowerCase()) {
      setError('Source and destination storage locations must be different.');
      return;
    }

    if (isNaN(qtyNum) || qtyNum <= 0) {
      setError('Transfer quantity must be greater than zero.');
      return;
    }

    if (qtyNum > currentQty) {
      setError(
        `Transfer quantity (${qtyNum} ${item.unit}) exceeds available stock (${currentQty} ${item.unit}). Negative stock prevented.`
      );
      return;
    }

    if (!reason.trim()) {
      setError('Reason is required for location stock transfer.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onConfirmTransfer({
        itemId: item.itemId,
        fromLocation,
        toLocation,
        quantity: qtyNum,
        reason: reason.trim(),
        date,
        recordedBy: recordedBy.trim() || 'Administrator',
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to record stock transfer.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContainer} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>
            <ArrowRightLeft size={20} />
            Transfer Stock between Storage Locations
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
            <div><strong>Available Stock:</strong> {currentQty.toLocaleString()} {item.unit}</div>
            <div style={{ fontSize: '0.75rem', opacity: 0.9 }}>
              Paired atomic transfer: records dual OUT & IN movements to conserve total farm stock balance.
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>From Source Location *</label>
              <select
                className={styles.select}
                value={fromLocation}
                onChange={(e) => setFromLocation(e.target.value)}
                required
              >
                {STORAGE_LOCATIONS.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>To Destination Location *</label>
              <select
                className={styles.select}
                value={toLocation}
                onChange={(e) => setToLocation(e.target.value)}
                required
              >
                {STORAGE_LOCATIONS.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Transfer Quantity ({item.unit}) *</label>
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
              <label className={styles.formLabel}>Transfer Date *</label>
              <input
                type="date"
                className={styles.input}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Reason for Transfer *</label>
            <input
              type="text"
              className={styles.input}
              placeholder="e.g. Relocating disinfectant drums from Main Store to Chemical Shed"
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
              {isSubmitting ? 'Transferring...' : 'Execute Transfer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
