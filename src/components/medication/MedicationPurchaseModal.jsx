import { useState, useEffect, useMemo } from 'react';
import { X, PlusCircle, AlertCircle, ShoppingCart } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters.js';
import styles from './MedicationPurchaseModal.module.css';

/**
 * Stock-In / Medication Purchase Modal
 * Restocks pharmacy inventory atomically and updates lot/expiration records
 */
export function MedicationPurchaseModal({
  isOpen,
  onClose,
  onSubmit,
  medications = [],
  selectedMedication = null,
}) {
  const [formData, setFormData] = useState({
    medicationId: '',
    quantity: '',
    unitCost: '',
    purchaseDate: new Date().toISOString().slice(0, 10),
    supplier: '',
    invoiceNumber: '',
    lotNumber: '',
    expiryDate: '',
    notes: '',
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (selectedMedication) {
      setFormData({
        medicationId: selectedMedication.medicationId,
        quantity: '',
        unitCost: String(selectedMedication.unitPrice || ''),
        purchaseDate: new Date().toISOString().slice(0, 10),
        supplier: selectedMedication.supplier || '',
        lotNumber: '',
        expiryDate: selectedMedication.expiryDate || '',
        notes: '',
        invoiceNumber: '',
      });
    } else if (medications.length > 0) {
      const first = medications[0];
      setFormData({
        medicationId: first.medicationId,
        quantity: '',
        unitCost: String(first.unitPrice || ''),
        purchaseDate: new Date().toISOString().slice(0, 10),
        supplier: first.supplier || '',
        lotNumber: '',
        expiryDate: first.expiryDate || '',
        notes: '',
        invoiceNumber: '',
      });
    }
    setErrors({});
  }, [selectedMedication, medications, isOpen]);

  const activeMed = useMemo(() => {
    return medications.find((m) => m.medicationId === formData.medicationId) || null;
  }, [medications, formData.medicationId]);

  const totalCost = useMemo(() => {
    const qty = parseFloat(formData.quantity) || 0;
    const cost = parseFloat(formData.unitCost) || 0;
    return qty * cost;
  }, [formData.quantity, formData.unitCost]);

  const projectedStock = useMemo(() => {
    const current = Number(activeMed?.currentStock) || 0;
    const qty = parseFloat(formData.quantity) || 0;
    return current + qty;
  }, [activeMed, formData.quantity]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const handleMedChange = (e) => {
    const id = e.target.value;
    const med = medications.find((m) => m.medicationId === id);
    setFormData((prev) => ({
      ...prev,
      medicationId: id,
      unitCost: med ? String(med.unitPrice || '') : prev.unitCost,
      supplier: med?.supplier || prev.supplier,
      expiryDate: med?.expiryDate || prev.expiryDate,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors({});

    try {
      const payload = {
        medicationId: formData.medicationId,
        quantity: parseFloat(formData.quantity) || 0,
        unitCost: parseFloat(formData.unitCost) || 0,
        purchaseDate: formData.purchaseDate,
        supplier: formData.supplier.trim(),
        invoiceNumber: formData.invoiceNumber.trim(),
        lotNumber: formData.lotNumber.trim(),
        expiryDate: formData.expiryDate,
        notes: formData.notes.trim(),
      };

      await onSubmit(payload);
      onClose();
    } catch (err) {
      console.error('Stock-in error:', err);
      setErrors({ general: err.message || 'Failed to record medication purchase.' });
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
              <h2 className={styles.modalTitle}>Medication Stock-In (Purchase)</h2>
              <p className={styles.modalSubtitle}>
                Add received pharmaceutical stock to inventory with supplier and lot tracking.
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
            {/* Select Product */}
            <div className={styles.formGroup}>
              <label className={styles.label}>
                Select Medication Product <span className={styles.required}>*</span>
              </label>
              <select
                name="medicationId"
                className={styles.select}
                value={formData.medicationId}
                onChange={handleMedChange}
                required
              >
                {medications.map((m) => (
                  <option key={m.medicationId} value={m.medicationId}>
                    {m.name} ({m.medicationId}) — In Stock: {m.currentStock} {m.unit}
                  </option>
                ))}
              </select>
            </div>

            {/* Current vs Projected Stock Preview */}
            {activeMed && (
              <div className={styles.stockPreviewBox}>
                <div className={styles.previewItem}>
                  <span className={styles.previewLabel}>Current Stock:</span>
                  <span className={styles.previewVal}>
                    {activeMed.currentStock} {activeMed.unit}
                  </span>
                </div>
                <div className={styles.previewItem}>
                  <span className={styles.previewLabel}>Restock Quantity:</span>
                  <span className={styles.previewValAdd}>
                    +{formData.quantity || 0} {activeMed.unit}
                  </span>
                </div>
                <div className={styles.previewItem}>
                  <span className={styles.previewLabel}>Projected Total:</span>
                  <span className={styles.previewValFinal}>
                    {projectedStock} {activeMed.unit}
                  </span>
                </div>
              </div>
            )}

            {/* Quantity and Unit Price */}
            <div className={styles.formGrid2}>
              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Quantity Received ({activeMed?.unit || 'units'}) <span className={styles.required}>*</span>
                </label>
                <input
                  type="number"
                  step="any"
                  min="0.01"
                  name="quantity"
                  className={styles.input}
                  placeholder="e.g. 10"
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
                  name="unitCost"
                  className={styles.input}
                  placeholder="0.00"
                  value={formData.unitCost}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            {/* Total Spend Banner */}
            <div className={styles.totalSpendBanner}>
              <span>Total Purchase Value:</span>
              <strong>{formatCurrency(totalCost)}</strong>
            </div>

            {/* Supplier & Invoice */}
            <div className={styles.formGrid2}>
              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Supplier / Distributor <span className={styles.required}>*</span>
                </label>
                <input
                  type="text"
                  name="supplier"
                  className={styles.input}
                  placeholder="e.g. Animal Care Konsult Ltd"
                  value={formData.supplier}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Invoice / Waybill Number</label>
                <input
                  type="text"
                  name="invoiceNumber"
                  className={styles.input}
                  placeholder="e.g. INV-2026-904"
                  value={formData.invoiceNumber}
                  onChange={handleChange}
                />
              </div>
            </div>

            {/* Lot & Expiration */}
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
                  placeholder="e.g. LOT-2026-A1"
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

            <div className={styles.formGroup}>
              <label className={styles.label}>Receiving Notes</label>
              <textarea
                name="notes"
                rows={2}
                className={styles.textarea}
                placeholder="Quality inspection upon delivery, seal intact, cold chain condition..."
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
              <span>{isSubmitting ? 'Recording...' : 'Confirm Stock-In'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
