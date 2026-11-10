import { useState, useEffect } from 'react';
import { X, Bird, AlertCircle, Sparkles } from 'lucide-react';
import {
  BIRD_TYPES,
  BIRD_GENDERS,
  BIRD_STATUSES,
  POPULAR_BREEDS,
  birdService,
} from '../../services/birdService.js';
import { Button } from '../common/Button.jsx';
import styles from './BirdFormModal.module.css';

/**
 * Bird Registration and Editing Modal Form
 * Full 14-field validation adhering to FreshNest standards.
 */
export function BirdFormModal({
  isOpen,
  onClose,
  onSave,
  birdToEdit = null,
  batches = [],
  houses = [],
}) {
  const isEditing = Boolean(birdToEdit);

  // Form State
  const [birdId, setBirdId] = useState('');
  const [tagNumber, setTagNumber] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState('Layer');
  const [breed, setBreed] = useState('Isa Brown');
  const [gender, setGender] = useState('Female');
  const [hatchDate, setHatchDate] = useState('');
  const [acquisitionDate, setAcquisitionDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [source, setSource] = useState('Farm Hatched / Internal');
  const [purchasePrice, setPurchasePrice] = useState('0');
  const [status, setStatus] = useState('Active');
  const [batchId, setBatchId] = useState('');
  const [houseNumber, setHouseNumber] = useState('Pen 1');
  const [notes, setNotes] = useState('');

  // UI & Validation State
  const [errors, setErrors] = useState({});
  const [globalError, setGlobalError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tagChecking, setTagChecking] = useState(false);

  // Populate or reset form on open / mode change
  useEffect(() => {
    if (!isOpen) return;

    if (birdToEdit) {
      setBirdId(birdToEdit.birdId || `BRD-${String(birdToEdit.id).padStart(4, '0')}`);
      setTagNumber(birdToEdit.tagNumber || '');
      setName(birdToEdit.name || '');
      setType(birdToEdit.type || 'Layer');
      setBreed(birdToEdit.breed || '');
      setGender(birdToEdit.gender || 'Female');
      setHatchDate(birdToEdit.hatchDate || '');
      setAcquisitionDate(
        birdToEdit.acquisitionDate || (birdToEdit.createdAt ? birdToEdit.createdAt.slice(0, 10) : new Date().toISOString().slice(0, 10))
      );
      setSource(birdToEdit.source || '');
      setPurchasePrice(birdToEdit.purchasePrice !== undefined ? String(birdToEdit.purchasePrice) : '0');
      setStatus(birdToEdit.status || 'Active');
      setBatchId(birdToEdit.batchId ? String(birdToEdit.batchId) : '');
      setHouseNumber(birdToEdit.houseNumber || 'Pen 1');
      setNotes(birdToEdit.notes || '');
      setErrors({});
      setGlobalError('');
    } else {
      // Auto-generate next Bird ID for new bird
      birdService.generateNextBirdId().then((generatedId) => {
        setBirdId(generatedId);
      });
      setTagNumber('');
      setName('');
      setType('Layer');
      setBreed('Isa Brown');
      setGender('Female');
      setHatchDate('');
      setAcquisitionDate(new Date().toISOString().slice(0, 10));
      setSource('Farm Hatched / Internal');
      setPurchasePrice('0');
      setStatus('Active');
      setBatchId('');
      setHouseNumber(houses.length > 0 ? houses[0] : 'Pen 1');
      setNotes('');
      setErrors({});
      setGlobalError('');
    }
  }, [isOpen, birdToEdit, houses]);

  // Check tag uniqueness on blur
  const handleTagBlur = async () => {
    if (!tagNumber.trim()) {
      setErrors((prev) => ({ ...prev, tagNumber: null }));
      return;
    }
    setTagChecking(true);
    try {
      const isAvailable = await birdService.checkTagNumberAvailable(
        tagNumber,
        birdToEdit?.id
      );
      if (!isAvailable) {
        setErrors((prev) => ({
          ...prev,
          tagNumber: `Tag number "${tagNumber.trim()}" is already assigned to another bird.`,
        }));
      } else {
        setErrors((prev) => ({ ...prev, tagNumber: null }));
      }
    } catch {
      // fallback
    } finally {
      setTagChecking(false);
    }
  };

  const validate = () => {
    const errs = {};
    if (!type) errs.type = 'Bird Type is required';
    if (!breed.trim()) errs.breed = 'Breed is required';
    if (!gender) errs.gender = 'Gender is required';
    if (!status) errs.status = 'Status is required';
    if (!houseNumber.trim()) errs.houseNumber = 'Poultry House or Pen is required';
    if (!acquisitionDate) errs.acquisitionDate = 'Acquisition date is required';
    if (purchasePrice && isNaN(Number(purchasePrice))) {
      errs.purchasePrice = 'Please enter a valid numeric amount';
    }
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setGlobalError('');

    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    // Verify tag uniqueness if entered
    if (tagNumber.trim()) {
      const isAvailable = await birdService.checkTagNumberAvailable(
        tagNumber,
        birdToEdit?.id
      );
      if (!isAvailable) {
        setErrors((prev) => ({
          ...prev,
          tagNumber: `Tag number "${tagNumber.trim()}" is already in use by another bird.`,
        }));
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const payload = {
        birdId,
        tagNumber: tagNumber.trim() || null,
        name: name.trim(),
        type,
        breed: breed.trim(),
        gender,
        hatchDate: hatchDate || null,
        acquisitionDate,
        source: source.trim() || 'Farm Raised / Hatched',
        purchasePrice: parseFloat(purchasePrice) || 0,
        status,
        batchId: batchId ? Number(batchId) : null,
        houseNumber: houseNumber.trim(),
        notes: notes.trim(),
      };

      await onSave(payload, birdToEdit?.id);
      onClose();
    } catch (err) {
      setGlobalError(err.message || 'Failed to save bird record.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const agePreview = hatchDate ? birdService.calculateAge(hatchDate) : null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className={styles.header}>
          <div className={styles.titleArea}>
            <div className={styles.headerIcon}>
              <Bird size={22} />
            </div>
            <div>
              <h3 className={styles.title}>
                {isEditing ? `Edit Bird ${birdId}` : 'Register New Individual Bird'}
              </h3>
              <p className={styles.subtitle}>
                {isEditing
                  ? 'Update tag number, housing location, health status or lineage notes'
                  : 'Assign automated ID, tag index, breed profile and cohort assignment'}
              </p>
            </div>
          </div>
          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className={styles.formContent}>
          {globalError && (
            <div className={styles.errorBanner}>
              <AlertCircle size={18} />
              <span>{globalError}</span>
            </div>
          )}

          {/* SECTION 1: IDENTIFICATION */}
          <div className={styles.sectionHeader}>1. Identification & Naming</div>
          <div className={styles.grid3}>
            {/* 1. Bird ID */}
            <div className={styles.formGroup}>
              <label className={styles.label}>
                <span>Bird ID <span className={styles.requiredMark}>*</span></span>
                <span className={styles.optionalTag}>Auto-Generated</span>
              </label>
              <input
                type="text"
                value={birdId}
                readOnly
                className={`${styles.input} ${styles.inputReadOnly}`}
                title="System-generated sequential Bird ID"
              />
            </div>

            {/* 2. Tag Number */}
            <div className={styles.formGroup}>
              <label className={styles.label}>
                <span>Tag Number</span>
                <span className={styles.optionalTag}>Optional (Unique)</span>
              </label>
              <input
                type="text"
                value={tagNumber}
                onChange={(e) => {
                  setTagNumber(e.target.value);
                  if (errors.tagNumber) setErrors((prev) => ({ ...prev, tagNumber: null }));
                }}
                onBlur={handleTagBlur}
                placeholder="e.g. WING-104 or LEG-02"
                className={`${styles.input} ${errors.tagNumber ? styles.inputError : ''}`}
              />
              {tagChecking && <span className={styles.optionalTag}>Checking availability...</span>}
              {errors.tagNumber && (
                <span className={styles.fieldError}>{errors.tagNumber}</span>
              )}
            </div>

            {/* 3. Name or Reference */}
            <div className={styles.formGroup}>
              <label className={styles.label}>
                <span>Name or Reference</span>
                <span className={styles.optionalTag}>Optional</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Bella, Alpha Rooster"
                className={styles.input}
              />
            </div>
          </div>

          {/* SECTION 2: BIOLOGICAL PROFILE */}
          <div className={styles.sectionHeader}>2. Biological Profile & Genetics</div>
          <div className={styles.grid3}>
            {/* 4. Bird Type */}
            <div className={styles.formGroup}>
              <label className={styles.label}>
                <span>Bird Type <span className={styles.requiredMark}>*</span></span>
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className={styles.select}
              >
                {BIRD_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            {/* 5. Breed */}
            <div className={styles.formGroup}>
              <label className={styles.label}>
                <span>Breed <span className={styles.requiredMark}>*</span></span>
              </label>
              <input
                type="text"
                value={breed}
                onChange={(e) => {
                  setBreed(e.target.value);
                  if (errors.breed) setErrors((prev) => ({ ...prev, breed: null }));
                }}
                placeholder="e.g. Isa Brown, Cobb 500"
                className={`${styles.input} ${errors.breed ? styles.inputError : ''}`}
                list="popular-breeds-list"
              />
              <datalist id="popular-breeds-list">
                {POPULAR_BREEDS.map((b) => (
                  <option key={b} value={b} />
                ))}
              </datalist>
              {errors.breed && <span className={styles.fieldError}>{errors.breed}</span>}
              <div className={styles.quickTags}>
                {POPULAR_BREEDS.slice(0, 4).map((b) => (
                  <button
                    key={b}
                    type="button"
                    className={styles.quickTagBtn}
                    onClick={() => setBreed(b)}
                  >
                    {b}
                  </button>
                ))}
              </div>
            </div>

            {/* 6. Gender */}
            <div className={styles.formGroup}>
              <label className={styles.label}>
                <span>Gender <span className={styles.requiredMark}>*</span></span>
              </label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className={styles.select}
              >
                {BIRD_GENDERS.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* SECTION 3: TIMELINE & ACQUISITION */}
          <div className={styles.sectionHeader}>3. Timeline, Acquisition & Cost</div>
          <div className={styles.grid3}>
            {/* 7. Hatch Date */}
            <div className={styles.formGroup}>
              <label className={styles.label}>
                <span>Hatch Date</span>
                <span className={styles.optionalTag}>Optional</span>
              </label>
              <input
                type="date"
                value={hatchDate}
                onChange={(e) => setHatchDate(e.target.value)}
                className={styles.input}
              />
              {agePreview && (
                <div className={styles.ageIndicator}>
                  Estimated Age: {agePreview}
                </div>
              )}
            </div>

            {/* 8. Acquisition Date */}
            <div className={styles.formGroup}>
              <label className={styles.label}>
                <span>Acquisition Date <span className={styles.requiredMark}>*</span></span>
              </label>
              <input
                type="date"
                value={acquisitionDate}
                onChange={(e) => setAcquisitionDate(e.target.value)}
                className={`${styles.input} ${errors.acquisitionDate ? styles.inputError : ''}`}
              />
              {errors.acquisitionDate && (
                <span className={styles.fieldError}>{errors.acquisitionDate}</span>
              )}
            </div>

            {/* 9. Source or Supplier */}
            <div className={styles.formGroup}>
              <label className={styles.label}>
                <span>Source / Supplier</span>
              </label>
              <input
                type="text"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder="e.g. Chi Farms, Hatchery, Zartech"
                className={styles.input}
              />
            </div>
          </div>

          <div className={styles.grid2}>
            {/* 10. Purchase Price in NGN (₦) */}
            <div className={styles.formGroup}>
              <label className={styles.label}>
                <span>Purchase Price (₦)</span>
                <span className={styles.optionalTag}>Nigerian Naira</span>
              </label>
              <div className={styles.currencyInputWrapper}>
                <span className={styles.currencyPrefix}>₦</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={purchasePrice}
                  onChange={(e) => {
                    setPurchasePrice(e.target.value);
                    if (errors.purchasePrice) setErrors((prev) => ({ ...prev, purchasePrice: null }));
                  }}
                  placeholder="0.00"
                  className={`${styles.input} ${styles.currencyInput} ${errors.purchasePrice ? styles.inputError : ''}`}
                />
              </div>
              {errors.purchasePrice && (
                <span className={styles.fieldError}>{errors.purchasePrice}</span>
              )}
            </div>

            {/* 11. Status */}
            <div className={styles.formGroup}>
              <label className={styles.label}>
                <span>Current Status <span className={styles.requiredMark}>*</span></span>
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className={styles.select}
              >
                {BIRD_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* SECTION 4: HOUSING & BATCH ASSIGNMENT */}
          <div className={styles.sectionHeader}>4. Pen Location & Cohort Assignment</div>
          <div className={styles.grid2}>
            {/* 12. Batch Assignment */}
            <div className={styles.formGroup}>
              <label className={styles.label}>
                <span>Flock Batch Assignment</span>
                <span className={styles.optionalTag}>Optional</span>
              </label>
              <select
                value={batchId}
                onChange={(e) => setBatchId(e.target.value)}
                className={styles.select}
              >
                <option value="">None (Standalone Individual Stock)</option>
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.batchCode || `Batch #${b.id}`} ({b.birdType || 'Cohort'}) - Status: {b.status || 'Active'}
                  </option>
                ))}
              </select>
              <span className={styles.optionalTag} style={{ marginTop: 2 }}>
                {batchId
                  ? 'Counts toward assigned cohort batch. Not double-counted.'
                  : 'Independent stock, counts directly in farm total headcount.'}
              </span>
            </div>

            {/* 13. Poultry House or Pen */}
            <div className={styles.formGroup}>
              <label className={styles.label}>
                <span>Poultry House or Pen <span className={styles.requiredMark}>*</span></span>
              </label>
              <input
                type="text"
                value={houseNumber}
                onChange={(e) => {
                  setHouseNumber(e.target.value);
                  if (errors.houseNumber) setErrors((prev) => ({ ...prev, houseNumber: null }));
                }}
                placeholder="e.g. Pen 1, House A, Quarantine Bay"
                className={`${styles.input} ${errors.houseNumber ? styles.inputError : ''}`}
                list="houses-datalist"
              />
              <datalist id="houses-datalist">
                {houses.map((h) => (
                  <option key={h} value={h} />
                ))}
              </datalist>
              {errors.houseNumber && (
                <span className={styles.fieldError}>{errors.houseNumber}</span>
              )}
            </div>
          </div>

          {/* SECTION 5: NOTES */}
          <div className={styles.sectionHeader}>5. Clinical & Pedigree Notes</div>
          {/* 14. Additional Notes */}
          <div className={styles.formGroup}>
            <label className={styles.label}>
              <span>Additional Notes & Observations</span>
              <span className={styles.optionalTag}>Optional</span>
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Pedigree sire #14, vaccinated on arrival, high egg yield potential, distinct feather pattern..."
              className={styles.textarea}
            />
          </div>

          {/* Form Actions */}
          <div className={styles.footer}>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting || Boolean(errors.tagNumber)}
              icon={<Sparkles size={16} />}
            >
              {isSubmitting
                ? 'Saving Record...'
                : isEditing
                ? 'Update Bird Record'
                : 'Register Bird'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
