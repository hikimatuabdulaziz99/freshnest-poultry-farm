import { useState, useEffect } from 'react';
import {
  X,
  Save,
  Egg,
  AlertCircle,
} from 'lucide-react';
import { calculateHDP } from '../../services/eggProductionService.js';
import styles from './EggCollectionModal.module.css';

/**
 * Log Daily Egg Collection Modal
 * Features: 3-period collection breakdown (Morning, Afternoon, Evening),
 * defect breakdown, good eggs auto-calculation, and live HDP % preview.
 */
export function EggCollectionModal({
  isOpen,
  onClose,
  onSubmit,
  batches = [],
  initialData = null,
}) {
  const todayStr = new Date().toISOString().slice(0, 10);

  const [formData, setFormData] = useState({
    batchId: '',
    collectionDate: todayStr,
    morningCollection: '0',
    afternoonCollection: '0',
    eveningCollection: '0',
    crackedEggs: '0',
    dirtyEggs: '0',
    damagedEggs: '0',
    recordedBy: 'Farm Staff',
    notes: '',
  });

  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize or reset form
  useEffect(() => {
    if (initialData) {
      setFormData({
        batchId: initialData.batchId || '',
        collectionDate: initialData.collectionDate || initialData.date || todayStr,
        morningCollection: String(initialData.morningCollection ?? 0),
        afternoonCollection: String(initialData.afternoonCollection ?? 0),
        eveningCollection: String(initialData.eveningCollection ?? 0),
        crackedEggs: String(initialData.crackedEggs ?? 0),
        dirtyEggs: String(initialData.dirtyEggs ?? 0),
        damagedEggs: String(initialData.damagedEggs ?? 0),
        recordedBy: initialData.recordedBy || 'Farm Staff',
        notes: initialData.notes || '',
      });
    } else {
      // Pick first active layer batch by default if available
      const defaultBatch = batches.find((b) => b.birdType === 'Layer' && b.status === 'Active') || batches[0];
      setFormData({
        batchId: defaultBatch ? String(defaultBatch.id) : '',
        collectionDate: todayStr,
        morningCollection: '0',
        afternoonCollection: '0',
        eveningCollection: '0',
        crackedEggs: '0',
        dirtyEggs: '0',
        damagedEggs: '0',
        recordedBy: 'Farm Staff',
        notes: '',
      });
    }
    setErrors({});
    setSubmitError('');
  }, [initialData, isOpen, batches, todayStr]);

  if (!isOpen) return null;

  // Selected batch details
  const selectedBatchObj = batches.find((b) => String(b.id) === String(formData.batchId));
  const livingHens = selectedBatchObj ? (Number(selectedBatchObj.currentCount ?? selectedBatchObj.initialCount) || 0) : 0;

  // Live Calculations
  const morning = parseInt(formData.morningCollection, 10) || 0;
  const afternoon = parseInt(formData.afternoonCollection, 10) || 0;
  const evening = parseInt(formData.eveningCollection, 10) || 0;
  const totalCollected = morning + afternoon + evening;

  const cracked = parseInt(formData.crackedEggs, 10) || 0;
  const dirty = parseInt(formData.dirtyEggs, 10) || 0;
  const damaged = parseInt(formData.damagedEggs, 10) || 0;
  const totalDefects = cracked + dirty + damaged;
  const goodEggs = Math.max(0, totalCollected - totalDefects);

  const estimatedHDP = calculateHDP(totalCollected, livingHens);

  const crates = Math.floor(totalCollected / 30);
  const loose = totalCollected % 30;

  const validate = () => {
    const newErrors = {};

    if (!formData.batchId) {
      newErrors.batchId = 'Please select a flock cohort batch.';
    }
    if (!formData.collectionDate) {
      newErrors.collectionDate = 'Collection date is required.';
    }
    if (totalCollected <= 0) {
      newErrors.sessions = 'At least one session count must be greater than zero.';
    }
    if (totalDefects > totalCollected) {
      newErrors.defects = 'Defect eggs cannot exceed total eggs collected.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');

    if (!validate()) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        batchId: formData.batchId,
        collectionDate: formData.collectionDate,
        morningCollection: morning,
        afternoonCollection: afternoon,
        eveningCollection: evening,
        totalCollected,
        goodEggs,
        crackedEggs: cracked,
        dirtyEggs: dirty,
        damagedEggs: damaged,
        recordedBy: formData.recordedBy,
        notes: formData.notes,
      });
      onClose();
    } catch (err) {
      console.error('Error submitting collection log:', err);
      setSubmitError(err.message || 'Failed to record egg collection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div className={styles.headerTitleGroup}>
            <div className={styles.headerIcon}>
              <Egg size={22} />
            </div>
            <div>
              <h3 className={styles.modalTitle}>
                {initialData ? 'Edit Egg Collection Log' : 'Log Daily Egg Collection'}
              </h3>
              <span className={styles.modalSubtitle}>
                Record morning, afternoon, and evening harvests per flock
              </span>
            </div>
          </div>
          <button type="button" onClick={onClose} className={styles.closeButton}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className={styles.modalBody}>
            {submitError && (
              <div className={styles.alertBox}>
                <AlertCircle size={18} />
                <span>{submitError}</span>
              </div>
            )}

            {/* 1. Batch & Date Row */}
            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Cohort Batch <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <select
                  value={formData.batchId}
                  onChange={(e) => setFormData({ ...formData, batchId: e.target.value })}
                  className={`${styles.select} ${errors.batchId ? styles.inputError : ''}`}
                >
                  <option value="">-- Select Batch --</option>
                  {batches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.batchCode || b.name} ({b.birdType} · {b.breed}) - {b.currentCount ?? b.initialCount} hens
                    </option>
                  ))}
                </select>
                {errors.batchId && <span className={styles.errorText}>{errors.batchId}</span>}
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Collection Date <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="date"
                  value={formData.collectionDate}
                  onChange={(e) => setFormData({ ...formData, collectionDate: e.target.value })}
                  className={`${styles.input} ${errors.collectionDate ? styles.inputError : ''}`}
                />
                {errors.collectionDate && <span className={styles.errorText}>{errors.collectionDate}</span>}
              </div>
            </div>

            {/* 2. Collection Sessions (Morning, Afternoon, Evening) */}
            <div className={styles.sectionBox}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className={styles.sectionBoxTitle}>Collection Sessions (Egg Count)</span>
                {errors.sessions && <span className={styles.errorText}>{errors.sessions}</span>}
              </div>

              <div className={styles.sessionsGrid}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Morning (06:00 – 10:00)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.morningCollection}
                    onChange={(e) => setFormData({ ...formData, morningCollection: e.target.value })}
                    className={styles.input}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Afternoon (12:00 – 15:00)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.afternoonCollection}
                    onChange={(e) => setFormData({ ...formData, afternoonCollection: e.target.value })}
                    className={styles.input}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Evening (16:00 – 18:30)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.eveningCollection}
                    onChange={(e) => setFormData({ ...formData, eveningCollection: e.target.value })}
                    className={styles.input}
                  />
                </div>
              </div>
            </div>

            {/* 3. Defects Breakdown */}
            <div className={styles.sectionBox} style={{ backgroundColor: '#fffaf0', borderColor: '#fed7aa' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className={styles.sectionBoxTitle} style={{ color: '#9a3412' }}>
                  Defects & Rejects Breakdown
                </span>
                {errors.defects && <span className={styles.errorText}>{errors.defects}</span>}
              </div>

              <div className={styles.sessionsGrid}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Cracked Eggs</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.crackedEggs}
                    onChange={(e) => setFormData({ ...formData, crackedEggs: e.target.value })}
                    className={styles.input}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Dirty / Soiled Eggs</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.dirtyEggs}
                    onChange={(e) => setFormData({ ...formData, dirtyEggs: e.target.value })}
                    className={styles.input}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Damaged / Broken</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.damagedEggs}
                    onChange={(e) => setFormData({ ...formData, damagedEggs: e.target.value })}
                    className={styles.input}
                  />
                </div>
              </div>
            </div>

            {/* 4. Live Calculation Strip */}
            <div className={styles.summaryStrip}>
              <div className={styles.summaryCol}>
                <span className={styles.summaryLabel}>Total Harvested</span>
                <span className={styles.summaryValue}>
                  {totalCollected} eggs ({crates} crates{loose > 0 ? `, ${loose} loose` : ''})
                </span>
              </div>

              <div className={styles.summaryCol}>
                <span className={styles.summaryLabel}>Good Sellable Eggs</span>
                <span className={styles.summaryValue} style={{ color: '#166534' }}>
                  {goodEggs} eggs
                </span>
              </div>

              <div className={styles.summaryCol}>
                <span className={styles.summaryLabel}>Laying Rate (HDP)</span>
                <span className={styles.summaryValue} style={{ color: estimatedHDP >= 80 ? '#1b4332' : '#d97706' }}>
                  {estimatedHDP}%
                </span>
              </div>
            </div>

            {/* 5. Notes & Recorded By */}
            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Recorded By</label>
                <input
                  type="text"
                  value={formData.recordedBy}
                  onChange={(e) => setFormData({ ...formData, recordedBy: e.target.value })}
                  className={styles.input}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Flock Observations / Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Temperature warm, feeding normal"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className={styles.input}
                />
              </div>
            </div>
          </div>

          <div className={styles.modalFooter}>
            <button type="button" onClick={onClose} className={styles.btnCancel}>
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || totalCollected <= 0 || totalDefects > totalCollected}
              className={styles.btnSubmit}
            >
              <Save size={16} />
              <span>{isSubmitting ? 'Recording...' : 'Save Collection Log'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
