import { useState, useEffect, useMemo } from 'react';
import { X, ShoppingBag, AlertCircle, CheckCircle, ShieldCheck } from 'lucide-react';
import { formatCurrency, formatNumber } from '../../utils/formatters.js';
import styles from './FeedPurchaseModal.module.css';

/**
 * Record Feed Purchase / Stock-In Modal
 */
export function FeedPurchaseModal({
  isOpen,
  feeds = [],
  preselectedFeed,
  onClose,
  onSavePurchase,
}) {
  const [formData, setFormData] = useState({
    feedId: '',
    quantity: '',
    unitCost: '',
    supplier: '',
    supplierContact: '',
    invoiceNumber: '',
    purchaseDate: new Date().toISOString().slice(0, 10),
    expiryDate: '',
    batchLotNumber: '',
    notes: '',
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const selected = preselectedFeed || (feeds.length > 0 ? feeds[0] : null);
      setFormData({
        feedId: selected ? String(selected.id) : '',
        quantity: '',
        unitCost: selected ? String(selected.unitCost || '') : '',
        supplier: selected ? selected.supplier || '' : '',
        supplierContact: '',
        invoiceNumber: '',
        purchaseDate: new Date().toISOString().slice(0, 10),
        expiryDate: selected ? selected.expiryDate || '' : '',
        batchLotNumber: '',
        notes: '',
      });
      setErrors({});
    }
  }, [isOpen, preselectedFeed, feeds]);

  const selectedFeed = useMemo(() => {
    return feeds.find((f) => String(f.id) === String(formData.feedId) || f.feedId === formData.feedId);
  }, [feeds, formData.feedId]);

  if (!isOpen) return null;

  const handleFeedChange = (e) => {
    const newFeedId = e.target.value;
    const feed = feeds.find((f) => String(f.id) === String(newFeedId) || f.feedId === newFeedId);
    setFormData((prev) => ({
      ...prev,
      feedId: newFeedId,
      unitCost: feed ? String(feed.unitCost || '') : prev.unitCost,
      supplier: feed?.supplier ? feed.supplier : prev.supplier,
      expiryDate: feed?.expiryDate ? feed.expiryDate : prev.expiryDate,
    }));
    if (errors.feedId) setErrors((prev) => ({ ...prev, feedId: null }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const calculatedTotal = useMemo(() => {
    const qty = Number(formData.quantity);
    const cost = Number(formData.unitCost);
    if (!isNaN(qty) && qty > 0 && !isNaN(cost) && cost >= 0) {
      return qty * cost;
    }
    return 0;
  }, [formData.quantity, formData.unitCost]);

  const validate = () => {
    const newErrors = {};

    if (!formData.feedId) {
      newErrors.feedId = 'Please select a feed product.';
    }

    const qty = Number(formData.quantity);
    if (isNaN(qty) || qty <= 0) {
      newErrors.quantity = 'Purchase quantity must be greater than zero.';
    }

    const cost = Number(formData.unitCost);
    if (isNaN(cost) || cost < 0) {
      newErrors.unitCost = 'Unit cost cannot be negative.';
    }

    if (!formData.supplier.trim()) {
      newErrors.supplier = 'Supplier name is required.';
    }

    if (!formData.purchaseDate) {
      newErrors.purchaseDate = 'Purchase date is required.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      setIsSubmitting(true);
      const payload = {
        feedId: formData.feedId,
        quantity: Number(formData.quantity),
        unitCost: Number(formData.unitCost),
        supplier: formData.supplier.trim(),
        supplierContact: formData.supplierContact.trim(),
        invoiceNumber: formData.invoiceNumber.trim(),
        purchaseDate: formData.purchaseDate,
        expiryDate: formData.expiryDate,
        batchLotNumber: formData.batchLotNumber.trim(),
        notes: formData.notes.trim(),
      };

      await onSavePurchase(payload);
      onClose();
    } catch (err) {
      setErrors((prev) => ({
        ...prev,
        submit: err.message || 'Failed to record feed purchase.',
      }));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.titleGroup}>
            <div className={styles.iconBox}>
              <ShoppingBag size={20} />
            </div>
            <div>
              <h2 className={styles.title}>Record Feed Purchase / Stock-In</h2>
              <p className={styles.subtitle}>
                Add incoming feed inventory, supplier invoice, and price in Nigerian Naira (₦)
              </p>
            </div>
          </div>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close modal">
            <X size={20} />
          </button>
        </div>

        {errors.submit && (
          <div className={styles.errorBanner}>
            <AlertCircle size={18} />
            <span>{errors.submit}</span>
          </div>
        )}

        <div className={styles.infoNotice}>
          <ShieldCheck size={18} className={styles.noticeIcon} />
          <span>
            <strong>Atomic Transaction Guarantee:</strong> Saving this purchase will increment current
            feed stock and permanently store an audit ledger entry.
          </span>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.grid}>
            {/* Feed Product Selection */}
            <div className={`${styles.formGroup} ${styles.fullWidth}`}>
              <label className={styles.label}>
                Feed Product <span className={styles.required}>*</span>
              </label>
              <select
                name="feedId"
                value={formData.feedId}
                onChange={handleFeedChange}
                className={`${styles.select} ${errors.feedId ? styles.inputError : ''}`}
                required
              >
                <option value="">-- Select Feed Product --</option>
                {feeds.map((feed) => (
                  <option key={feed.id} value={feed.id}>
                    {feed.name} ({feed.feedId || `FEED-${feed.id}`}) — Current: {feed.currentStock} {feed.unit}
                  </option>
                ))}
              </select>
              {errors.feedId && <span className={styles.errorText}>{errors.feedId}</span>}
            </div>

            {/* Selected Feed Quick Summary Banner */}
            {selectedFeed && (
              <div className={`${styles.feedSummaryBanner} ${styles.fullWidth}`}>
                <div className={styles.summaryItem}>
                  <span className={styles.summaryLabel}>Type:</span>
                  <span className={styles.summaryValue}>{selectedFeed.type}</span>
                </div>
                <div className={styles.summaryItem}>
                  <span className={styles.summaryLabel}>Current Stock:</span>
                  <span className={styles.summaryValue}>
                    {formatNumber(selectedFeed.currentStock)} {selectedFeed.unit}
                  </span>
                </div>
                <div className={styles.summaryItem}>
                  <span className={styles.summaryLabel}>Status:</span>
                  <span className={styles.summaryValue}>{selectedFeed.status}</span>
                </div>
                <div className={styles.summaryItem}>
                  <span className={styles.summaryLabel}>Storage:</span>
                  <span className={styles.summaryValue}>
                    {selectedFeed.storageLocation || 'Main Warehouse'}
                  </span>
                </div>
              </div>
            )}

            {/* Quantity */}
            <div className={styles.formGroup}>
              <label className={styles.label}>
                Quantity Purchased ({selectedFeed?.unit || 'kg'}) <span className={styles.required}>*</span>
              </label>
              <input
                type="number"
                name="quantity"
                value={formData.quantity}
                onChange={handleChange}
                min="0.1"
                step="any"
                placeholder="e.g. 500"
                className={`${styles.input} ${errors.quantity ? styles.inputError : ''}`}
                required
              />
              {errors.quantity && <span className={styles.errorText}>{errors.quantity}</span>}
            </div>

            {/* Unit Cost in NGN */}
            <div className={styles.formGroup}>
              <label className={styles.label}>
                Unit Cost (₦ per {selectedFeed?.unit || 'kg'}) <span className={styles.required}>*</span>
              </label>
              <input
                type="number"
                name="unitCost"
                value={formData.unitCost}
                onChange={handleChange}
                min="0"
                step="any"
                placeholder="e.g. 650"
                className={`${styles.input} ${errors.unitCost ? styles.inputError : ''}`}
                required
              />
              {errors.unitCost && <span className={styles.errorText}>{errors.unitCost}</span>}
            </div>

            {/* Total Cost Display */}
            <div className={`${styles.totalCostCard} ${styles.fullWidth}`}>
              <div className={styles.totalCostInfo}>
                <span className={styles.totalCostLabel}>Total Purchase Expenditure</span>
                <span className={styles.totalCostSubtext}>
                  {formData.quantity || 0} {selectedFeed?.unit || 'kg'} × ₦{formData.unitCost || 0}
                </span>
              </div>
              <div className={styles.totalCostValue}>{formatCurrency(calculatedTotal)}</div>
            </div>

            {/* Supplier Name */}
            <div className={styles.formGroup}>
              <label className={styles.label}>
                Supplier / Feed Mill <span className={styles.required}>*</span>
              </label>
              <input
                type="text"
                name="supplier"
                value={formData.supplier}
                onChange={handleChange}
                placeholder="e.g. Vital Feeds Agro Ltd"
                className={`${styles.input} ${errors.supplier ? styles.inputError : ''}`}
                required
              />
              {errors.supplier && <span className={styles.errorText}>{errors.supplier}</span>}
            </div>

            {/* Supplier Phone / Contact */}
            <div className={styles.formGroup}>
              <label className={styles.label}>Supplier Contact / Phone</label>
              <input
                type="text"
                name="supplierContact"
                value={formData.supplierContact}
                onChange={handleChange}
                placeholder="e.g. 0802 345 6789"
                className={styles.input}
              />
            </div>

            {/* Invoice Number */}
            <div className={styles.formGroup}>
              <label className={styles.label}>Invoice / Receipt Number</label>
              <input
                type="text"
                name="invoiceNumber"
                value={formData.invoiceNumber}
                onChange={handleChange}
                placeholder="e.g. INV-2026-884"
                className={styles.input}
              />
            </div>

            {/* Purchase Date */}
            <div className={styles.formGroup}>
              <label className={styles.label}>
                Purchase Date <span className={styles.required}>*</span>
              </label>
              <input
                type="date"
                name="purchaseDate"
                value={formData.purchaseDate}
                onChange={handleChange}
                className={`${styles.input} ${errors.purchaseDate ? styles.inputError : ''}`}
                required
              />
              {errors.purchaseDate && <span className={styles.errorText}>{errors.purchaseDate}</span>}
            </div>

            {/* Feed Batch / Lot Number */}
            <div className={styles.formGroup}>
              <label className={styles.label}>Manufacturer Lot / Batch Code</label>
              <input
                type="text"
                name="batchLotNumber"
                value={formData.batchLotNumber}
                onChange={handleChange}
                placeholder="e.g. LOT-9941-B"
                className={styles.input}
              />
            </div>

            {/* Expiry Date */}
            <div className={styles.formGroup}>
              <label className={styles.label}>Shipment Expiry Date</label>
              <input
                type="date"
                name="expiryDate"
                value={formData.expiryDate}
                onChange={handleChange}
                className={styles.input}
              />
            </div>

            {/* Notes */}
            <div className={`${styles.formGroup} ${styles.fullWidth}`}>
              <label className={styles.label}>Purchase & Delivery Notes</label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={2}
                placeholder="e.g. Delivered directly to Silo A. Bags intact and inspected."
                className={styles.textarea}
              />
            </div>
          </div>

          <div className={styles.footer}>
            <button type="button" className={styles.cancelBtn} onClick={onClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" className={styles.saveBtn} disabled={isSubmitting}>
              <CheckCircle size={16} />
              {isSubmitting ? 'Recording Purchase...' : 'Confirm Stock-In'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
