import { useState, useEffect } from 'react';
import { X, Wheat, AlertCircle, Save } from 'lucide-react';
import {
  FEED_TYPES,
  FEED_FORMS,
  FEED_UNITS,
  TARGET_BIRD_TYPES,
  feedService,
} from '../../services/feedService.js';
import styles from './FeedFormModal.module.css';

/**
 * Add / Edit Feed Product Modal
 */
export function FeedFormModal({ isOpen, feedToEdit, onClose, onSave }) {
  const isEditing = Boolean(feedToEdit);

  const [formData, setFormData] = useState({
    feedId: '',
    name: '',
    type: 'Broiler Starter',
    brand: '',
    form: 'Mash',
    unit: 'kg',
    targetBirdType: 'Broiler',
    currentStock: '0',
    reorderLevel: '100',
    unitCost: '0',
    storageLocation: '',
    expiryDate: '',
    crudeProtein: '',
    energyKcal: '',
    supplier: '',
    notes: '',
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function initForm() {
      if (feedToEdit) {
        setFormData({
          feedId: feedToEdit.feedId || '',
          name: feedToEdit.name || '',
          type: feedToEdit.type || 'Broiler Starter',
          brand: feedToEdit.brand || '',
          form: feedToEdit.form || 'Mash',
          unit: feedToEdit.unit || 'kg',
          targetBirdType: feedToEdit.targetBirdType || 'Broiler',
          currentStock: String(feedToEdit.currentStock ?? 0),
          reorderLevel: String(feedToEdit.reorderLevel ?? 100),
          unitCost: String(feedToEdit.unitCost ?? 0),
          storageLocation: feedToEdit.storageLocation || '',
          expiryDate: feedToEdit.expiryDate || '',
          crudeProtein: feedToEdit.crudeProtein || '',
          energyKcal: feedToEdit.energyKcal || '',
          supplier: feedToEdit.supplier || '',
          notes: feedToEdit.notes || '',
        });
        setErrors({});
      } else {
        // Generate next sequential Feed ID
        try {
          const nextId = await feedService.generateNextFeedId();
          if (isMounted) {
            setFormData({
              feedId: nextId,
              name: '',
              type: 'Broiler Starter',
              brand: '',
              form: 'Mash',
              unit: 'kg',
              targetBirdType: 'Broiler',
              currentStock: '0',
              reorderLevel: '100',
              unitCost: '0',
              storageLocation: 'Feed Store 1',
              expiryDate: '',
              crudeProtein: '',
              energyKcal: '',
              supplier: '',
              notes: '',
            });
            setErrors({});
          }
        } catch {
          // Fallback
        }
      }
    }

    if (isOpen) {
      initForm();
    }

    return () => {
      isMounted = false;
    };
  }, [isOpen, feedToEdit]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const validate = async () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Feed Name is required.';
    }
    if (!formData.type) {
      newErrors.type = 'Feed Type is required.';
    }

    const stock = Number(formData.currentStock);
    if (isNaN(stock) || stock < 0) {
      newErrors.currentStock = 'Stock cannot be negative.';
    }

    const reorder = Number(formData.reorderLevel);
    if (isNaN(reorder) || reorder < 0) {
      newErrors.reorderLevel = 'Reorder level cannot be negative.';
    }

    const cost = Number(formData.unitCost);
    if (isNaN(cost) || cost < 0) {
      newErrors.unitCost = 'Unit cost in ₦ cannot be negative.';
    }

    if (formData.feedId.trim()) {
      const isAvailable = await feedService.checkFeedIdAvailable(
        formData.feedId,
        feedToEdit ? feedToEdit.id : null
      );
      if (!isAvailable) {
        newErrors.feedId = `Feed ID "${formData.feedId}" is already registered.`;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const isValid = await validate();
    if (!isValid) return;

    try {
      setIsSubmitting(true);
      const payload = {
        ...formData,
        currentStock: Number(formData.currentStock),
        reorderLevel: Number(formData.reorderLevel),
        unitCost: Number(formData.unitCost),
      };

      await onSave(payload, feedToEdit ? feedToEdit.id : null);
      onClose();
    } catch (err) {
      setErrors((prev) => ({
        ...prev,
        submit: err.message || 'Failed to save feed product.',
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
              <Wheat size={20} />
            </div>
            <div>
              <h2 className={styles.title}>
                {isEditing ? `Edit Feed: ${feedToEdit.name}` : 'Register New Feed Product'}
              </h2>
              <p className={styles.subtitle}>
                Catalog poultry feed formulations, nutrition specs, and inventory pricing in ₦
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

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.grid}>
            {/* Feed ID */}
            <div className={styles.formGroup}>
              <label className={styles.label}>
                Feed ID <span className={styles.required}>*</span>
              </label>
              <input
                type="text"
                name="feedId"
                value={formData.feedId}
                onChange={handleChange}
                placeholder="e.g. FEED-0001"
                className={`${styles.input} ${errors.feedId ? styles.inputError : ''}`}
                required
              />
              {errors.feedId && <span className={styles.errorText}>{errors.feedId}</span>}
            </div>

            {/* Feed Name */}
            <div className={styles.formGroup}>
              <label className={styles.label}>
                Feed Name <span className={styles.required}>*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g. Premier Layer Mash Phase 1"
                className={`${styles.input} ${errors.name ? styles.inputError : ''}`}
                required
              />
              {errors.name && <span className={styles.errorText}>{errors.name}</span>}
            </div>

            {/* Feed Type */}
            <div className={styles.formGroup}>
              <label className={styles.label}>
                Feed Type <span className={styles.required}>*</span>
              </label>
              <select
                name="type"
                value={formData.type}
                onChange={handleChange}
                className={styles.select}
                required
              >
                {FEED_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            {/* Physical Form */}
            <div className={styles.formGroup}>
              <label className={styles.label}>Feed Form</label>
              <select
                name="form"
                value={formData.form}
                onChange={handleChange}
                className={styles.select}
              >
                {FEED_FORMS.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>

            {/* Target Bird Type */}
            <div className={styles.formGroup}>
              <label className={styles.label}>Target Bird Category</label>
              <select
                name="targetBirdType"
                value={formData.targetBirdType}
                onChange={handleChange}
                className={styles.select}
              >
                {TARGET_BIRD_TYPES.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>

            {/* Unit of Measurement */}
            <div className={styles.formGroup}>
              <label className={styles.label}>Measurement Unit</label>
              <select
                name="unit"
                value={formData.unit}
                onChange={handleChange}
                className={styles.select}
              >
                {FEED_UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>

            {/* Brand / Manufacturer */}
            <div className={styles.formGroup}>
              <label className={styles.label}>Brand or Manufacturer</label>
              <input
                type="text"
                name="brand"
                value={formData.brand}
                onChange={handleChange}
                placeholder="e.g. Vital Feed, TopFeed, Chikun"
                className={styles.input}
              />
            </div>

            {/* Storage Location */}
            <div className={styles.formGroup}>
              <label className={styles.label}>Storage Location</label>
              <input
                type="text"
                name="storageLocation"
                value={formData.storageLocation}
                onChange={handleChange}
                placeholder="e.g. Silo A, Store 1, Warehouse"
                className={styles.input}
              />
            </div>

            {/* Current Stock */}
            <div className={styles.formGroup}>
              <label className={styles.label}>
                Current Stock ({formData.unit}) <span className={styles.required}>*</span>
              </label>
              <input
                type="number"
                name="currentStock"
                value={formData.currentStock}
                onChange={handleChange}
                min="0"
                step="any"
                className={`${styles.input} ${errors.currentStock ? styles.inputError : ''}`}
                required
              />
              {errors.currentStock && <span className={styles.errorText}>{errors.currentStock}</span>}
            </div>

            {/* Reorder Level Threshold */}
            <div className={styles.formGroup}>
              <label className={styles.label}>
                Reorder Level ({formData.unit}) <span className={styles.required}>*</span>
              </label>
              <input
                type="number"
                name="reorderLevel"
                value={formData.reorderLevel}
                onChange={handleChange}
                min="0"
                step="any"
                className={`${styles.input} ${errors.reorderLevel ? styles.inputError : ''}`}
                required
              />
              {errors.reorderLevel && <span className={styles.errorText}>{errors.reorderLevel}</span>}
            </div>

            {/* Unit Cost in Nigerian Naira */}
            <div className={styles.formGroup}>
              <label className={styles.label}>
                Unit Cost (₦ per {formData.unit}) <span className={styles.required}>*</span>
              </label>
              <input
                type="number"
                name="unitCost"
                value={formData.unitCost}
                onChange={handleChange}
                min="0"
                step="any"
                placeholder="0.00"
                className={`${styles.input} ${errors.unitCost ? styles.inputError : ''}`}
                required
              />
              {errors.unitCost && <span className={styles.errorText}>{errors.unitCost}</span>}
            </div>

            {/* Expiry Date */}
            <div className={styles.formGroup}>
              <label className={styles.label}>Expiry / Best Before Date</label>
              <input
                type="date"
                name="expiryDate"
                value={formData.expiryDate}
                onChange={handleChange}
                className={styles.input}
              />
            </div>

            {/* Crude Protein */}
            <div className={styles.formGroup}>
              <label className={styles.label}>Crude Protein (CP %)</label>
              <input
                type="text"
                name="crudeProtein"
                value={formData.crudeProtein}
                onChange={handleChange}
                placeholder="e.g. 18.5%"
                className={styles.input}
              />
            </div>

            {/* Energy Kcal */}
            <div className={styles.formGroup}>
              <label className={styles.label}>Metabolisable Energy (kcal/kg)</label>
              <input
                type="text"
                name="energyKcal"
                value={formData.energyKcal}
                onChange={handleChange}
                placeholder="e.g. 2950"
                className={styles.input}
              />
            </div>

            {/* Supplier Info */}
            <div className={`${styles.formGroup} ${styles.fullWidth}`}>
              <label className={styles.label}>Supplier / Distributor Info</label>
              <input
                type="text"
                name="supplier"
                value={formData.supplier}
                onChange={handleChange}
                placeholder="e.g. Premier Agro Allied Mills Ltd (0803 123 4567)"
                className={styles.input}
              />
            </div>

            {/* Notes */}
            <div className={`${styles.formGroup} ${styles.fullWidth}`}>
              <label className={styles.label}>Formulation & Handling Notes</label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={2}
                placeholder="e.g. Store in dry elevated wooden pallets. Moisture sensitive."
                className={styles.textarea}
              />
            </div>
          </div>

          <div className={styles.footer}>
            <button type="button" className={styles.cancelBtn} onClick={onClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" className={styles.saveBtn} disabled={isSubmitting}>
              <Save size={16} />
              {isSubmitting ? 'Saving...' : isEditing ? 'Update Feed Product' : 'Register Feed Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
