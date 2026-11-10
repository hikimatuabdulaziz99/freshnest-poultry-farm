import { useState, useEffect } from 'react';
import { X, Save, AlertCircle, Syringe } from 'lucide-react';
import {
  VACCINE_TYPES,
  ADMINISTRATION_METHODS,
  VACCINE_UNITS,
  STORAGE_TEMPERATURES,
  TARGET_DISEASES,
} from '../../services/vaccineService.js';
import styles from './VaccineFormModal.module.css';

/**
 * Add / Edit Vaccine Product Modal
 */
export function VaccineFormModal({
  isOpen,
  onClose,
  onSubmit,
  initialData = null,
  isEdit = false,
}) {
  const [formData, setFormData] = useState({
    name: '',
    targetDisease: TARGET_DISEASES[0],
    manufacturer: '',
    vaccineType: 'Live Attenuated',
    administrationMethod: 'Drinking Water',
    dosageInstructions: '',
    recommendedAgeDays: '14',
    unit: 'doses',
    packSize: '1,000 doses/vial',
    currentStock: '0',
    reorderLevel: '1000',
    unitPrice: '0',
    supplier: '',
    lotNumber: '',
    expiryDate: '',
    storageTemperature: STORAGE_TEMPERATURES[0],
    notes: '',
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        targetDisease: initialData.targetDisease || TARGET_DISEASES[0],
        manufacturer: initialData.manufacturer || '',
        vaccineType: initialData.vaccineType || 'Live Attenuated',
        administrationMethod: initialData.administrationMethod || 'Drinking Water',
        dosageInstructions: initialData.dosageInstructions || '',
        recommendedAgeDays: String(initialData.recommendedAgeDays ?? 14),
        unit: initialData.unit || 'doses',
        packSize: initialData.packSize || '1,000 doses/vial',
        currentStock: String(initialData.currentStock ?? 0),
        reorderLevel: String(initialData.reorderLevel ?? 1000),
        unitPrice: String(initialData.unitPrice ?? 0),
        supplier: initialData.supplier || '',
        lotNumber: initialData.lotNumber || '',
        expiryDate: initialData.expiryDate || '',
        storageTemperature: initialData.storageTemperature || STORAGE_TEMPERATURES[0],
        notes: initialData.notes || '',
      });
    } else {
      setFormData({
        name: '',
        targetDisease: TARGET_DISEASES[0],
        manufacturer: '',
        vaccineType: 'Live Attenuated',
        administrationMethod: 'Drinking Water',
        dosageInstructions: '',
        recommendedAgeDays: '14',
        unit: 'doses',
        packSize: '1,000 doses/vial',
        currentStock: '0',
        reorderLevel: '1000',
        unitPrice: '0',
        supplier: '',
        lotNumber: '',
        expiryDate: '',
        storageTemperature: STORAGE_TEMPERATURES[0],
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
        recommendedAgeDays: parseInt(formData.recommendedAgeDays, 10) || 0,
        currentStock: parseFloat(formData.currentStock) || 0,
        reorderLevel: parseFloat(formData.reorderLevel) || 0,
        unitPrice: parseFloat(formData.unitPrice) || 0,
      };

      await onSubmit(payload);
      onClose();
    } catch (err) {
      console.error('Vaccine submission error:', err);
      if (err.errors) {
        setErrors(err.errors);
      } else {
        setErrors({ general: err.message || 'Failed to save vaccine product.' });
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
              <Syringe size={20} />
            </div>
            <div>
              <h2 className={styles.modalTitle}>
                {isEdit ? `Edit Vaccine: ${initialData?.vaccineId}` : 'Register New Vaccine'}
              </h2>
              <p className={styles.modalSubtitle}>
                Cold chain immunisation product record for poultry flock protection.
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
            {/* 1. Identification */}
            <h3 className={styles.sectionHeading}>1. Vaccine Identification</h3>
            <div className={styles.formRow}>
              <div className={`${styles.formGroup} ${styles.col12}`}>
                <label className={styles.label}>
                  Vaccine Name <span className={styles.required}>*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  className={`${styles.input} ${errors.name ? styles.inputError : ''}`}
                  placeholder="e.g. Newcastle Disease Vaccine (LaSota Strain)"
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
                  Target Disease <span className={styles.required}>*</span>
                </label>
                <select
                  name="targetDisease"
                  className={styles.select}
                  value={formData.targetDisease}
                  onChange={handleChange}
                  required
                >
                  {TARGET_DISEASES.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Manufacturer</label>
                <input
                  type="text"
                  name="manufacturer"
                  className={styles.input}
                  placeholder="e.g. NVRI Vom, Hipra, Boehringer Ingelheim"
                  value={formData.manufacturer}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className={styles.formGrid2}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Vaccine Type</label>
                <select
                  name="vaccineType"
                  className={styles.select}
                  value={formData.vaccineType}
                  onChange={handleChange}
                >
                  {VACCINE_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Administration Method</label>
                <select
                  name="administrationMethod"
                  className={styles.select}
                  value={formData.administrationMethod}
                  onChange={handleChange}
                >
                  {ADMINISTRATION_METHODS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className={styles.formRow}>
              <div className={`${styles.formGroup} ${styles.col12}`}>
                <label className={styles.label}>Dosage Instructions & Reconstitution</label>
                <input
                  type="text"
                  name="dosageInstructions"
                  className={styles.input}
                  placeholder="e.g. 1 vial in 20L cool non-chlorinated water with 2g/L skim milk stabilizer"
                  value={formData.dosageInstructions}
                  onChange={handleChange}
                />
              </div>
            </div>

            {/* 2. Inventory, Packaging & Cost */}
            <h3 className={styles.sectionHeading}>2. Packaging, Stock & Cost</h3>
            <div className={styles.formGrid3}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Unit of Measure</label>
                <select
                  name="unit"
                  className={styles.select}
                  value={formData.unit}
                  onChange={handleChange}
                >
                  {VACCINE_UNITS.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Pack / Vial Size</label>
                <input
                  type="text"
                  name="packSize"
                  className={styles.input}
                  placeholder="e.g. 1,000 doses/vial"
                  value={formData.packSize}
                  onChange={handleChange}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Target Bird Age (Days)</label>
                <input
                  type="number"
                  min="0"
                  name="recommendedAgeDays"
                  className={styles.input}
                  placeholder="14"
                  value={formData.recommendedAgeDays}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className={styles.formGrid3}>
              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Current Stock <span className={styles.required}>*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  name="currentStock"
                  className={`${styles.input} ${errors.currentStock ? styles.inputError : ''}`}
                  value={formData.currentStock}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Reorder Threshold <span className={styles.required}>*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  name="reorderLevel"
                  className={styles.input}
                  value={formData.reorderLevel}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Unit Cost in ₦ (per dose/unit)</label>
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
            </div>

            {/* 3. Cold Chain, Lot & Storage */}
            <h3 className={styles.sectionHeading}>3. Cold Chain & Quality Control</h3>
            <div className={styles.formGrid3}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Lot / Batch Number</label>
                <input
                  type="text"
                  name="lotNumber"
                  className={styles.input}
                  placeholder="e.g. NVRI-2026-A1"
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
                <label className={styles.label}>Supplier / Distributor</label>
                <input
                  type="text"
                  name="supplier"
                  className={styles.input}
                  placeholder="e.g. Animal Care Konsult, NVRI"
                  value={formData.supplier}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className={styles.formRow}>
              <div className={`${styles.formGroup} ${styles.col12}`}>
                <label className={styles.label}>
                  Cold Chain Storage Temperature <span className={styles.required}>*</span>
                </label>
                <select
                  name="storageTemperature"
                  className={styles.select}
                  value={formData.storageTemperature}
                  onChange={handleChange}
                  required
                >
                  {STORAGE_TEMPERATURES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className={styles.formRow}>
              <div className={`${styles.formGroup} ${styles.col12}`}>
                <label className={styles.label}>Veterinary Notes & Cold Chain Precautions</label>
                <textarea
                  name="notes"
                  rows={2}
                  className={styles.textarea}
                  placeholder="Transport protocol, water withdrawal requirements, diluent instructions..."
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
              <span>{isSubmitting ? 'Saving...' : isEdit ? 'Update Vaccine' : 'Save Vaccine'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
