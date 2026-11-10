import { useState, useEffect, useMemo } from 'react';
import {
  X,
  TrendingDown,
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  ShieldCheck,
  Scale,
  Bird,
} from 'lucide-react';
import { FEEDING_SESSIONS } from '../../services/feedService.js';
import { formatNumber } from '../../utils/formatters.js';
import styles from './FeedConsumptionModal.module.css';

/**
 * Record Feed Consumption / Stock-Out Modal
 */
export function FeedConsumptionModal({
  isOpen,
  feeds = [],
  batches = [],
  preselectedFeed,
  preselectedBatch,
  onClose,
  onSaveConsumption,
}) {
  const [formData, setFormData] = useState({
    feedId: '',
    batchId: '',
    quantity: '',
    date: new Date().toISOString().slice(0, 10),
    session: 'Morning',
    birdsFed: '',
    notes: '',
    allowExpired: false,
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const selectedF = preselectedFeed || (feeds.length > 0 ? feeds[0] : null);
      const selectedB = preselectedBatch || (batches.length > 0 ? batches[0] : null);

      const birdCount = selectedB?.currentCount ?? selectedB?.initialCount ?? '';

      setFormData({
        feedId: selectedF ? String(selectedF.id) : '',
        batchId: selectedB ? String(selectedB.id) : '',
        quantity: '',
        date: new Date().toISOString().slice(0, 10),
        session: 'Morning',
        birdsFed: birdCount ? String(birdCount) : '',
        notes: '',
        allowExpired: false,
      });
      setErrors({});
    }
  }, [isOpen, preselectedFeed, preselectedBatch, feeds, batches]);

  const selectedFeed = useMemo(() => {
    return feeds.find((f) => String(f.id) === String(formData.feedId) || f.feedId === formData.feedId);
  }, [feeds, formData.feedId]);

  const selectedBatch = useMemo(() => {
    return batches.find((b) => String(b.id) === String(formData.batchId) || b.batchId === formData.batchId);
  }, [batches, formData.batchId]);

  // Check if feed is expired
  const isFeedExpired = useMemo(() => {
    if (!selectedFeed?.expiryDate) return false;
    const today = new Date().toISOString().slice(0, 10);
    return selectedFeed.expiryDate < today;
  }, [selectedFeed]);

  // Calculate grams per bird
  const gramsPerBird = useMemo(() => {
    const qty = Number(formData.quantity);
    const birds = Number(formData.birdsFed);
    if (!isNaN(qty) && qty > 0 && !isNaN(birds) && birds > 0) {
      let multiplier = 1000; // kg to grams
      if (selectedFeed?.unit === 'bag') multiplier = 25 * 1000;
      if (selectedFeed?.unit === 'ton') multiplier = 1000 * 1000;
      return Number(((qty * multiplier) / birds).toFixed(1));
    }
    return 0;
  }, [formData.quantity, formData.birdsFed, selectedFeed]);

  if (!isOpen) return null;

  const handleFeedChange = (e) => {
    const newFeedId = e.target.value;
    setFormData((prev) => ({
      ...prev,
      feedId: newFeedId,
      allowExpired: false,
    }));
    if (errors.feedId || errors.quantity) {
      setErrors((prev) => ({ ...prev, feedId: null, quantity: null }));
    }
  };

  const handleBatchChange = (e) => {
    const newBatchId = e.target.value;
    const batch = batches.find((b) => String(b.id) === String(newBatchId) || b.batchId === newBatchId);
    setFormData((prev) => ({
      ...prev,
      batchId: newBatchId,
      birdsFed: batch?.currentCount ? String(batch.currentCount) : prev.birdsFed,
    }));
    if (errors.batchId) setErrors((prev) => ({ ...prev, batchId: null }));
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.feedId) {
      newErrors.feedId = 'Please select a feed product.';
    }

    const qty = Number(formData.quantity);
    if (isNaN(qty) || qty <= 0) {
      newErrors.quantity = 'Disbursement quantity must be greater than zero.';
    } else if (selectedFeed && qty > Number(selectedFeed.currentStock)) {
      newErrors.quantity = `Insufficient stock! Only ${selectedFeed.currentStock} ${selectedFeed.unit || 'kg'} available in inventory.`;
    }

    if (!formData.date) {
      newErrors.date = 'Feeding date is required.';
    }

    if (isFeedExpired && !formData.allowExpired) {
      newErrors.allowExpired = 'Biosecurity confirmation is required to dispense expired feed.';
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
        batchId: formData.batchId,
        quantity: Number(formData.quantity),
        date: formData.date,
        session: formData.session,
        birdsFed: formData.birdsFed ? Number(formData.birdsFed) : null,
        notes: formData.notes.trim(),
      };

      await onSaveConsumption(payload, { allowExpired: formData.allowExpired });
      onClose();
    } catch (err) {
      setErrors((prev) => ({
        ...prev,
        submit: err.message || 'Failed to record feeding disbursement.',
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
              <TrendingDown size={20} />
            </div>
            <div>
              <h2 className={styles.title}>Record Feed Consumption (Stock-Out)</h2>
              <p className={styles.subtitle}>
                Disburse feed ration to flock batches with automated consumption per bird
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
            <strong>Atomic Transaction Guarantee:</strong> Dispensing feed will deduct stock and record
            consumption in a single transaction. Negative stock is strictly prevented.
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
                    {feed.name} ({feed.feedId || `FEED-${feed.id}`}) — Stock: {feed.currentStock} {feed.unit}
                    {Number(feed.currentStock) <= 0 ? ' [OUT OF STOCK]' : ''}
                  </option>
                ))}
              </select>
              {errors.feedId && <span className={styles.errorText}>{errors.feedId}</span>}
            </div>

            {/* Selected Feed Stock Level Banner */}
            {selectedFeed && (
              <div
                className={`${styles.stockStatusBanner} ${styles.fullWidth} ${
                  Number(selectedFeed.currentStock) <= 0 ? styles.bannerDanger : styles.bannerActive
                }`}
              >
                <div className={styles.stockStatusItem}>
                  <Scale size={16} />
                  <span>
                    Available Stock:{' '}
                    <strong>
                      {formatNumber(selectedFeed.currentStock)} {selectedFeed.unit}
                    </strong>
                  </span>
                </div>
                <div className={styles.stockStatusItem}>
                  <span>Reorder Level: {formatNumber(selectedFeed.reorderLevel)} {selectedFeed.unit}</span>
                </div>
                <div className={styles.stockStatusItem}>
                  <span>Location: {selectedFeed.storageLocation || 'Store 1'}</span>
                </div>
              </div>
            )}

            {/* Expiry Warning Override Banner */}
            {isFeedExpired && (
              <div className={`${styles.expiryBanner} ${styles.fullWidth}`}>
                <div className={styles.expiryWarningHeader}>
                  <AlertTriangle size={18} className={styles.expiryIcon} />
                  <span>
                    <strong>Caution: Expired Feed!</strong> This product expired on{' '}
                    <strong>{selectedFeed.expiryDate}</strong>.
                  </span>
                </div>
                <label className={styles.overrideCheckboxLabel}>
                  <input
                    type="checkbox"
                    name="allowExpired"
                    checked={formData.allowExpired}
                    onChange={handleChange}
                    className={styles.checkbox}
                  />
                  <span>I confirm this feed has been inspected and cleared by the farm manager for feeding.</span>
                </label>
                {errors.allowExpired && <span className={styles.errorText}>{errors.allowExpired}</span>}
              </div>
            )}

            {/* Batch Selection */}
            <div className={styles.formGroup}>
              <label className={styles.label}>Recipient Flock Batch</label>
              <select
                name="batchId"
                value={formData.batchId}
                onChange={handleBatchChange}
                className={styles.select}
              >
                <option value="">-- General Flock / No Specific Batch --</option>
                {batches.map((batch) => (
                  <option key={batch.id} value={batch.id}>
                    {batch.batchCode || batch.batchId || `Batch #${batch.id}`} ({batch.birdType || 'Birds'} ·{' '}
                    {batch.currentCount ?? batch.initialCount} birds)
                  </option>
                ))}
              </select>
            </div>

            {/* Feeding Session */}
            <div className={styles.formGroup}>
              <label className={styles.label}>
                Feeding Session <span className={styles.required}>*</span>
              </label>
              <select
                name="session"
                value={formData.session}
                onChange={handleChange}
                className={styles.select}
                required
              >
                {FEEDING_SESSIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            {/* Quantity to Disburse */}
            <div className={styles.formGroup}>
              <label className={styles.label}>
                Quantity to Disburse ({selectedFeed?.unit || 'kg'}) <span className={styles.required}>*</span>
              </label>
              <input
                type="number"
                name="quantity"
                value={formData.quantity}
                onChange={handleChange}
                min="0.1"
                step="any"
                max={selectedFeed ? selectedFeed.currentStock : undefined}
                placeholder="e.g. 50"
                className={`${styles.input} ${errors.quantity ? styles.inputError : ''}`}
                required
              />
              {errors.quantity && <span className={styles.errorText}>{errors.quantity}</span>}
            </div>

            {/* Feeding Date */}
            <div className={styles.formGroup}>
              <label className={styles.label}>
                Disbursement Date <span className={styles.required}>*</span>
              </label>
              <input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleChange}
                className={`${styles.input} ${errors.date ? styles.inputError : ''}`}
                required
              />
              {errors.date && <span className={styles.errorText}>{errors.date}</span>}
            </div>

            {/* Birds Fed */}
            <div className={styles.formGroup}>
              <label className={styles.label}>Number of Birds Fed</label>
              <input
                type="number"
                name="birdsFed"
                value={formData.birdsFed}
                onChange={handleChange}
                min="1"
                placeholder={selectedBatch?.currentCount ? String(selectedBatch.currentCount) : 'e.g. 500'}
                className={styles.input}
              />
            </div>

            {/* Consumption Calculation Card */}
            <div className={styles.formGroup}>
              <label className={styles.label}>Ration Rate per Bird</label>
              <div className={styles.perBirdCard}>
                <Bird size={16} className={styles.birdIcon} />
                <span className={styles.perBirdValue}>
                  {gramsPerBird > 0 ? `${gramsPerBird} g/bird` : '—'}
                </span>
                <span className={styles.perBirdSubtext}>
                  {gramsPerBird > 0 ? 'Optimal feeding rate' : 'Enter quantity and birds count'}
                </span>
              </div>
            </div>

            {/* Notes */}
            <div className={`${styles.formGroup} ${styles.fullWidth}`}>
              <label className={styles.label}>Feeding Observations & Appetite Notes</label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={2}
                placeholder="e.g. Excellent flock appetite; troughs cleared in 40 minutes."
                className={styles.textarea}
              />
            </div>
          </div>

          <div className={styles.footer}>
            <button type="button" className={styles.cancelBtn} onClick={onClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button
              type="submit"
              className={styles.saveBtn}
              disabled={isSubmitting || Number(selectedFeed?.currentStock) <= 0}
            >
              <CheckCircle size={16} />
              {isSubmitting ? 'Processing...' : 'Disburse Feed'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
