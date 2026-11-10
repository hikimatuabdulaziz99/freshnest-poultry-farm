import { useState, useEffect, useMemo } from 'react';
import { X, PlusCircle, AlertCircle, ShoppingCart } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters.js';
import { STORAGE_TEMPERATURES } from '../../services/vaccineService.js';
import styles from './VaccinePurchaseModal.module.css';

/**
 * Stock-In / Vaccine Purchase Modal
 * Restocks vaccine inventory atomically and records cold chain temperature verification
 */
export function VaccinePurchaseModal({
  isOpen,
  onClose,
  onSubmit,
  vaccines = [],
  selectedVaccine = null,
}) {
  const [formData, setFormData] = useState({
    vaccineId: '',
    quantity: '',
    unitPrice: '',
    purchaseDate: new Date().toISOString().slice(0, 10),
    supplier: '',
    invoiceNumber: '',
    lotNumber: '',
    expiryDate: '',
    storageTemperature: STORAGE_TEMPERATURES[0],
    notes: '',
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (selectedVaccine) {
      setFormData({
        vaccineId: selectedVaccine.vaccineId,
        quantity: '',
        unitPrice: String(selectedVaccine.unitPrice || ''),
        purchaseDate: new Date().toISOString().slice(0, 10),
        supplier: selectedVaccine.supplier || '',
        lotNumber: '',
        expiryDate: selectedVaccine.expiryDate || '',
        storageTemperature: selectedVaccine.storageTemperature || STORAGE_TEMPERATURES[0],
        invoiceNumber: '',
        notes: '',
      });
    } else if (vaccines.length > 0) {
      const first = vaccines[0];
      setFormData({
        vaccineId: first.vaccineId,
        quantity: '',
        unitPrice: String(first.unitPrice || ''),
        purchaseDate: new Date().toISOString().slice(0, 10),
        supplier: first.supplier || '',
        lotNumber: '',
        expiryDate: first.expiryDate || '',
        storageTemperature: first.storageTemperature || STORAGE_TEMPERATURES[0],
        invoiceNumber: '',
        notes: '',
      });
    }
    setErrors({});
  }, [selectedVaccine, vaccines, isOpen]);

  const activeVac = useMemo(() => {
    return vaccines.find((v) => v.vaccineId === formData.vaccineId) || null;
  }, [vaccines, formData.vaccineId]);

  const totalCost = useMemo(() => {
    const qty = parseFloat(formData.quantity) || 0;
    const cost = parseFloat(formData.unitPrice) || 0;
    return qty * cost;
  }, [formData.quantity, formData.unitPrice]);

  const projectedStock = useMemo(() => {
    const current = Number(activeVac?.currentStock) || 0;
    const qty = parseFloat(formData.quantity) || 0;
    return current + qty;
  }, [activeVac, formData.quantity]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const handleVacChange = (e) => {
    const id = e.target.value;
    const vac = vaccines.find((v) => v.vaccineId === id);
    setFormData((prev) => ({
      ...prev,
      vaccineId: id,
      unitPrice: vac ? String(vac.unitPrice || '') : prev.unitPrice,
      supplier: vac?.supplier || prev.supplier,
      expiryDate: vac?.expiryDate || prev.expiryDate,
      storageTemperature: vac?.storageTemperature || prev.storageTemperature,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors({});

    try {
      const payload = {
        vaccineId: formData.vaccineId,
        quantity: parseFloat(formData.quantity) || 0,
        unitPrice: parseFloat(formData.unitPrice) || 0,
        purchaseDate: formData.purchaseDate,
        supplier: formData.supplier.trim(),
        invoiceNumber: formData.invoiceNumber.trim(),
        lotNumber: formData.lotNumber.trim(),
        expiryDate: formData.expiryDate,
        storageTemperature: formData.storageTemperature,
        notes: formData.notes.trim(),
      };

      await onSubmit(payload);
      onClose();
    } catch (err) {
      console.error('Vaccine stock-in error:', err);
      setErrors({ general: err.message || 'Failed to record vaccine purchase.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalBackdrop} onClick={onClose} aria-hidden="true" />
      <div className={styles.modalContainer} role="dialog" aria-modal="true">
        <div className={styles.modalHeader}>
          <div className={styles.headerTitleWrap}>
            <div className={styles.headerIcon}>
              <ShoppingCart size={20} />
            </div>
            <div>
              <h2 className={styles.modalTitle}>Vaccine Stock-In (Purchase)</h2>
              <p className={styles.modalSubtitle}>
                Add received cold-chain vaccine stock to inventory with lot and invoice audit.
              </p>
            </div>
          </div>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        {errors.general && (
          <div className={styles.generalAlert}>
            <AlertCircle size={16} />
            <span>{errors.general}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.modalBody}>
            {/* Select Vaccine */}
            <div className={styles.formGroup}>
              <label className={styles.label}>
                Select Vaccine Product <span className={styles.required}>*</span>
              </label>
              <select
                name="vaccineId"
                className={styles.select}
                value={formData.vaccineId}
                onChange={handleVacChange}
                required
              >
                {vaccines.map((v) => (
                  <option key={v.vaccineId} value={v.vaccineId}>
                    {v.name} ({v.vaccineId}) — In Stock: {v.currentStock} {v.unit}
                  </option>
                ))}
              </select>
            </div>

            {/* Current vs Projected Stock Preview */}
            {activeVac && (
              <div className={styles.stockPreviewBox}>
                <div className={styles.previewItem}>
                  <span className={styles.previewLabel}>Current Stock:</span>
                  <span className={styles.previewVal}>
                    {activeVac.currentStock} {activeVac.unit}
                  </span>
                </div>
                <div className={styles.previewItem}>
                  <span className={styles.previewLabel}>Restock Quantity:</span>
                  <span className={styles.previewValAdd}>
                    +{formData.quantity || 0} {activeVac.unit}
                  </span>
                </div>
                <div className={styles.previewItem}>
                  <span className={styles.previewLabel}>Projected Total:</span>
                  <span className={styles.previewValFinal}>
                    {projectedStock} {activeVac.unit}
                  </span>
                </div>
              </div>
            )}

            {/* Quantity and Unit Price */}
            <div className={styles.formGrid2}>
              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Quantity Received ({activeVac?.unit || 'doses'}) <span className={styles.required}>*</span>
                </label>
                <input
                  type="number"
                  step="any"
                  min="1"
                  name="quantity"
                  className={styles.input}
                  placeholder="e.g. 1000"
                  value={formData.quantity}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Unit Cost in Nigerian Naira (₦) <span className={styles.required}>*</span>
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  name="unitPrice"
                  className={styles.input}
                  placeholder="0.00"
                  value={formData.unitPrice}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            {/* Total Spend Banner */}
            <div className={styles.totalSpendBanner}>
              <span>Total Purchase Expenditure:</span>
              <strong>{formatCurrency(totalCost)}</strong>
            </div>

            {/* Supplier & Invoice */}
            <div className={styles.formGrid2}>
              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Supplier / Agrovet Depot <span className={styles.required}>*</span>
                </label>
                <input
                  type="text"
                  name="supplier"
                  className={styles.input}
                  placeholder="e.g. NVRI Vom Depot, Animal Care"
                  value={formData.supplier}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Invoice / Receipt Number</label>
                <input
                  type="text"
                  name="invoiceNumber"
                  className={styles.input}
                  placeholder="e.g. INV-VAX-2026-081"
                  value={formData.invoiceNumber}
                  onChange={handleChange}
                />
              </div>
            </div>

            {/* Lot & Expiration & Date */}
            <div className={styles.formGrid3}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Purchase Date <span className={styles.required}>*</span></label>
                <input
                  type="date"
                  name="purchaseDate"
                  className={styles.input}
                  value={formData.purchaseDate}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Lot / Batch Number</label>
                <input
                  type="text"
                  name="lotNumber"
                  className={styles.input}
                  placeholder="e.g. LOT-2026-K9"
                  value={formData.lotNumber}
                  onChange={handleChange}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Expiration Date</label>
                <input
                  type="date"
                  name="expiryDate"
                  className={styles.input}
                  value={formData.expiryDate}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className={styles.formRow}>
              <div className={`${styles.formGroup} ${styles.col12}`}>
                <label className={styles.label}>Cold Chain Storage Condition</label>
                <select
                  name="storageTemperature"
                  className={styles.select}
                  value={formData.storageTemperature}
                  onChange={handleChange}
                >
                  {STORAGE_TEMPERATURES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Receiving Cold Chain Notes</label>
              <textarea
                name="notes"
                rows={2}
                className={styles.textarea}
                placeholder="Ice pack condition upon delivery, seal intact, cold chain temperature verified..."
                value={formData.notes}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className={styles.modalFooter}>
            <button
              type="button"
              className={styles.cancelBtn}
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={styles.submitBtn}
              disabled={isSubmitting || !formData.quantity || parseFloat(formData.quantity) <= 0}
            >
              <PlusCircle size={16} />
              <span>{isSubmitting ? 'Recording...' : 'Confirm Vaccine Stock-In'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
