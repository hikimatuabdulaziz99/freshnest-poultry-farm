import { useState, useEffect } from 'react';
import { X, Save, AlertCircle, Pill } from 'lucide-react';
import {
  MEDICATION_TYPES,
  ADMINISTRATION_ROUTES,
  MEDICATION_UNITS,
  STORAGE_CONDITIONS,
} from '../../services/medicationService.js';
import styles from './MedicationFormModal.module.css';

/**
 * Add / Edit Medication Product Modal
 */
export function MedicationFormModal({
  isOpen,
  onClose,
  onSubmit,
  initialData = null,
  isEdit = false,
}) {
  const [formData, setFormData] = useState({
    name: '',
    type: 'Antibiotic',
    activeIngredient: '',
    targetDisease: '',
    dosage: '',
    route: 'Oral / Drinking Water',
    unit: 'sachet',
    currentStock: '0',
    reorderLevel: '5',
    unitPrice: '0',
    supplier: '',
    lotNumber: '',
    expiryDate: '',
    storageInstructions: STORAGE_CONDITIONS[0],
    withdrawalPeriodDays: '0',
    notes: '',
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        type: initialData.type || 'Antibiotic',
        activeIngredient: initialData.activeIngredient || '',
        targetDisease: initialData.targetDisease || '',
        dosage: initialData.dosage || '',
        route: initialData.route || 'Oral / Drinking Water',
        unit: initialData.unit || 'sachet',
        currentStock: String(initialData.currentStock ?? 0),
        reorderLevel: String(initialData.reorderLevel ?? 5),
        unitPrice: String(initialData.unitPrice ?? 0),
        supplier: initialData.supplier || '',
        lotNumber: initialData.lotNumber || '',
        expiryDate: initialData.expiryDate || '',
        storageInstructions: initialData.storageInstructions || STORAGE_CONDITIONS[0],
        withdrawalPeriodDays: String(initialData.withdrawalPeriodDays ?? 0),
        notes: initialData.notes || '',
      });
    } else {
      setFormData({
        name: '',
        type: 'Antibiotic',
        activeIngredient: '',
        targetDisease: '',
        dosage: '',
        route: 'Oral / Drinking Water',
        unit: 'sachet',
        currentStock: '0',
        reorderLevel: '5',
        unitPrice: '0',
        supplier: '',
        lotNumber: '',
        expiryDate: '',
        storageInstructions: STORAGE_CONDITIONS[0],
        withdrawalPeriodDays: '0',
        notes: '',
      });
    }
    setErrors({});
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors({});

    try {
      const payload = {
        ...formData,
        currentStock: parseFloat(formData.currentStock) || 0,
        reorderLevel: parseFloat(formData.reorderLevel) || 0,
        unitPrice: parseFloat(formData.unitPrice) || 0,
        withdrawalPeriodDays: parseInt(formData.withdrawalPeriodDays, 10) || 0,
      };

      await onSubmit(payload);
      onClose();
    } catch (err) {
      console.error('Submission error:', err);
      if (err.errors) {
        setErrors(err.errors);
      } else {
        setErrors({ general: err.message || 'Failed to save medication product.' });
      }
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
              <Pill size={20} />
            </div>
            <div>
              <h2 className={styles.modalTitle}>
                {isEdit ? `Edit Medication: ${initialData?.medicationId}` : 'Register New Medication'}
              </h2>
              <p className={styles.modalSubtitle}>
                Veterinary pharmacy catalog record with biosecurity controls & withdrawal tracking.
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
            {/* Section 1: Identification */}
            <h3 className={styles.sectionHeading}>1. Product Identification</h3>
            <div className={styles.formRow}>
              <div className={`${styles.formGroup} ${styles.col12}`}>
                <label className={styles.label}>
                  Medication Name <span className={styles.required}>*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  className={`${styles.input} ${errors.name ? styles.inputError : ''}`}
                  placeholder="e.g. Tylodox Powder Fortified"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
                {errors.name && <span className={styles.fieldError}>{errors.name}</span>}
              </div>
            </div>

            <div className={styles.formGrid2}>
              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Medication Category <span className={styles.required}>*</span>
                </label>
                <select
                  name="type"
                  className={styles.select}
                  value={formData.type}
                  onChange={handleChange}
                  required
                >
                  {MEDICATION_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Administration Route</label>
                <select
                  name="route"
                  className={styles.select}
                  value={formData.route}
                  onChange={handleChange}
                >
                  {ADMINISTRATION_ROUTES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className={styles.formGrid2}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Active Ingredient(s)</label>
                <input
                  type="text"
                  name="activeIngredient"
                  className={styles.input}
                  placeholder="e.g. Tylosin Tartrate 10% + Doxycycline HCl 10%"
                  value={formData.activeIngredient}
                  onChange={handleChange}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Target Disease / Condition</label>
                <input
                  type="text"
                  name="targetDisease"
                  className={styles.input}
                  placeholder="e.g. CRD, Colibacillosis, Coccidiosis"
                  value={formData.targetDisease}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className={styles.formRow}>
              <div className={`${styles.formGroup} ${styles.col12}`}>
                <label className={styles.label}>Standard Dosage Instructions</label>
                <input
                  type="text"
                  name="dosage"
                  className={styles.input}
                  placeholder="e.g. 100g in 200 Litres of drinking water for 3 to 5 days"
                  value={formData.dosage}
                  onChange={handleChange}
                />
              </div>
            </div>

            {/* Section 2: Inventory, Units & Costs */}
            <h3 className={styles.sectionHeading}>2. Inventory, Units & Pricing</h3>
            <div className={styles.formGrid3}>
              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Unit of Measure <span className={styles.required}>*</span>
                </label>
                <select
                  name="unit"
                  className={styles.select}
                  value={formData.unit}
                  onChange={handleChange}
                  required
                >
                  {MEDICATION_UNITS.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Current Stock <span className={styles.required}>*</span>
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  name="currentStock"
                  className={`${styles.input} ${errors.currentStock ? styles.inputError : ''}`}
                  value={formData.currentStock}
                  onChange={handleChange}
                  required
                />
                {errors.currentStock && (
                  <span className={styles.fieldError}>{errors.currentStock}</span>
                )}
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Reorder Threshold <span className={styles.required}>*</span>
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  name="reorderLevel"
                  className={styles.input}
                  value={formData.reorderLevel}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className={styles.formGrid2}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Unit Price in Nigerian Naira (₦)</label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  name="unitPrice"
                  className={styles.input}
                  placeholder="0.00"
                  value={formData.unitPrice}
                  onChange={handleChange}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Supplier / Distributor</label>
                <input
                  type="text"
                  name="supplier"
                  className={styles.input}
                  placeholder="e.g. Animal Care Konsult, Kepro Holland"
                  value={formData.supplier}
                  onChange={handleChange}
                />
              </div>
            </div>

            {/* Section 3: Food Safety, Lot & Biosecurity */}
            <h3 className={styles.sectionHeading}>3. Food Safety, Lot & Biosecurity</h3>
            <div className={styles.formGrid3}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Batch / Lot Number</label>
                <input
                  type="text"
                  name="lotNumber"
                  className={styles.input}
                  placeholder="e.g. TYL-2025-09B"
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

              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Withdrawal Period (Days)
                  <span className={styles.hintBadge}>Meat & Egg Safety</span>
                </label>
                <input
                  type="number"
                  min="0"
                  name="withdrawalPeriodDays"
                  className={styles.input}
                  placeholder="0 (None)"
                  value={formData.withdrawalPeriodDays}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className={styles.formRow}>
              <div className={`${styles.formGroup} ${styles.col12}`}>
                <label className={styles.label}>Storage Condition</label>
                <select
                  name="storageInstructions"
                  className={styles.select}
                  value={formData.storageInstructions}
                  onChange={handleChange}
                >
                  {STORAGE_CONDITIONS.map((cond) => (
                    <option key={cond} value={cond}>
                      {cond}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className={styles.formRow}>
              <div className={`${styles.formGroup} ${styles.col12}`}>
                <label className={styles.label}>Veterinary Notes & Contraindications</label>
                <textarea
                  name="notes"
                  rows={2}
                  className={styles.textarea}
                  placeholder="Special usage rules, water withdrawal requirements, or layer warnings..."
                  value={formData.notes}
                  onChange={handleChange}
                />
              </div>
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
              disabled={isSubmitting}
            >
              <Save size={16} />
              <span>{isSubmitting ? 'Saving...' : isEdit ? 'Update Medication' : 'Save Medication'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
