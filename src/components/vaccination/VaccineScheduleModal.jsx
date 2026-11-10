import { useState, useEffect, useMemo } from 'react';
import { X, Calendar, AlertCircle, Save, Sparkles, AlertTriangle } from 'lucide-react';
import {
  ADMINISTRATION_METHODS,
  SUGGESTED_SCHEDULE_TEMPLATES,
  calculateExpectedVaccinationDate,
} from '../../services/vaccineService.js';
import styles from './VaccineScheduleModal.module.css';

/**
 * Vaccination Schedule Modal
 * Creates or updates planned cohort immunisation events with automatic date calculation
 * and veterinary disclaimer.
 */
export function VaccineScheduleModal({
  isOpen,
  onClose,
  onSubmit,
  batches = [],
  vaccines = [],
  initialData = null,
  isEdit = false,
}) {
  const [formData, setFormData] = useState({
    batchId: '',
    vaccineId: '',
    targetAgeDays: '14',
    scheduledDate: new Date().toISOString().slice(0, 10),
    recommendedMethod: 'Drinking Water',
    assignedStaff: 'Veterinary Team',
    notes: '',
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData({
        batchId: initialData.batchId || (batches[0]?.batchId || batches[0]?.id || ''),
        vaccineId: initialData.vaccineId || (vaccines[0]?.vaccineId || ''),
        targetAgeDays: String(initialData.targetAgeDays ?? 14),
        scheduledDate: initialData.scheduledDate || new Date().toISOString().slice(0, 10),
        recommendedMethod: initialData.recommendedMethod || 'Drinking Water',
        assignedStaff: initialData.assignedStaff || 'Veterinary Team',
        notes: initialData.notes || '',
      });
    } else {
      const defaultBatch = batches[0];
      const defaultVac = vaccines[0];
      const age = defaultVac?.recommendedAgeDays || 14;
      const baseDate = defaultBatch?.arrivalDate || defaultBatch?.createdAt || new Date().toISOString().slice(0, 10);
      const expected = calculateExpectedVaccinationDate(baseDate, age);

      setFormData({
        batchId: defaultBatch ? (defaultBatch.batchId || defaultBatch.id) : '',
        vaccineId: defaultVac ? defaultVac.vaccineId : '',
        targetAgeDays: String(age),
        scheduledDate: expected,
        recommendedMethod: defaultVac?.administrationMethod || 'Drinking Water',
        assignedStaff: 'Veterinary Team',
        notes: '',
      });
    }
    setErrors({});
  }, [initialData, batches, vaccines, isOpen]);

  const activeBatch = useMemo(() => {
    return batches.find((b) => String(b.batchId || b.id) === String(formData.batchId)) || null;
  }, [batches, formData.batchId]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const handleBatchChange = (e) => {
    const bId = e.target.value;
    const b = batches.find((item) => String(item.batchId || item.id) === String(bId));
    const expected = b ? calculateExpectedVaccinationDate(b, parseInt(formData.targetAgeDays, 10) || 0) : null;

    setFormData((prev) => ({
      ...prev,
      batchId: bId,
      scheduledDate: expected || prev.scheduledDate,
    }));
  };

  const handleVaccineChange = (e) => {
    const vId = e.target.value;
    const vac = vaccines.find((item) => item.vaccineId === vId);
    const targetAge = vac?.recommendedAgeDays || 14;
    const expected = activeBatch ? calculateExpectedVaccinationDate(activeBatch, targetAge) : null;

    setFormData((prev) => ({
      ...prev,
      vaccineId: vId,
      targetAgeDays: String(targetAge),
      recommendedMethod: vac?.administrationMethod || prev.recommendedMethod,
      scheduledDate: expected || prev.scheduledDate,
    }));
  };

  const handleAgeChange = (e) => {
    const age = parseInt(e.target.value, 10) || 0;
    const expected = activeBatch ? calculateExpectedVaccinationDate(activeBatch, age) : null;

    setFormData((prev) => ({
      ...prev,
      targetAgeDays: e.target.value,
      scheduledDate: expected || prev.scheduledDate,
    }));
  };

  const handleApplyTemplate = (tmpl) => {
    // Find matching vaccine if available
    const matchedVac = vaccines.find((v) =>
      v.targetDisease.toLowerCase().includes(tmpl.disease.toLowerCase()) ||
      v.name.toLowerCase().includes(tmpl.disease.toLowerCase())
    );

    const expected = activeBatch ? calculateExpectedVaccinationDate(activeBatch, tmpl.targetAgeDays) : null;

    setFormData((prev) => ({
      ...prev,
      vaccineId: matchedVac ? matchedVac.vaccineId : prev.vaccineId,
      targetAgeDays: String(tmpl.targetAgeDays),
      scheduledDate: expected || prev.scheduledDate,
      recommendedMethod: tmpl.method || prev.recommendedMethod,
      notes: tmpl.notes,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors({});

    try {
      const payload = {
        ...formData,
        targetAgeDays: parseInt(formData.targetAgeDays, 10) || 0,
      };

      await onSubmit(payload);
      onClose();
    } catch (err) {
      console.error('Schedule submission error:', err);
      setErrors({ general: err.message || 'Failed to save vaccination schedule.' });
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
              <Calendar size={20} />
            </div>
            <div>
              <h2 className={styles.modalTitle}>
                {isEdit ? `Edit Schedule: ${initialData?.scheduleId}` : 'Schedule Cohort Vaccination'}
              </h2>
              <p className={styles.modalSubtitle}>
                Plan scheduled immunisation based on flock age with cold chain preparation.
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
            {/* Disclaimer Banner */}
            <div className={styles.disclaimerBanner}>
              <AlertTriangle size={18} className={styles.disclaimerIcon} />
              <p className={styles.disclaimerText}>
                <strong>Veterinary Notice:</strong> Suggested schedules are template examples only. Flock immunisation protocols must always be reviewed and confirmed by your registered poultry veterinarian based on local farm disease prevalence.
              </p>
            </div>

            {/* Quick Template Selector */}
            <div className={styles.templateSection}>
              <span className={styles.templateLabel}>
                <Sparkles size={14} /> Quick Suggested Schedule Templates (Reference Examples):
              </span>
              <div className={styles.templateChips}>
                {SUGGESTED_SCHEDULE_TEMPLATES.slice(0, 5).map((tmpl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className={styles.templateChip}
                    onClick={() => handleApplyTemplate(tmpl)}
                    title={`Day ${tmpl.targetAgeDays}: ${tmpl.disease}`}
                  >
                    Day {tmpl.targetAgeDays}: {tmpl.disease.split(' ')[0]}
                  </button>
                ))}
              </div>
            </div>

            {/* Batch Selector */}
            <div className={styles.formGroup}>
              <label className={styles.label}>
                Select Target Flock Batch <span className={styles.required}>*</span>
              </label>
              <select
                name="batchId"
                className={styles.select}
                value={formData.batchId}
                onChange={handleBatchChange}
                required
              >
                {batches.length === 0 ? (
                  <option value="">No batches available</option>
                ) : (
                  batches.map((b) => (
                    <option key={b.batchId || b.id} value={b.batchId || b.id}>
                      {b.batchCode || b.name || `Batch #${b.id}`} — {b.birdType} ({b.currentCount ?? b.initialCount ?? 0} birds · Placed: {b.arrivalDate || 'N/A'})
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Vaccine Selector */}
            <div className={styles.formGroup}>
              <label className={styles.label}>
                Select Vaccine Product <span className={styles.required}>*</span>
              </label>
              <select
                name="vaccineId"
                className={styles.select}
                value={formData.vaccineId}
                onChange={handleVaccineChange}
                required
              >
                {vaccines.map((v) => (
                  <option key={v.vaccineId} value={v.vaccineId}>
                    {v.name} ({v.targetDisease}) — Stock: {v.currentStock} {v.unit}
                  </option>
                ))}
              </select>
            </div>

            {/* Age & Scheduled Date Calculation */}
            <div className={styles.formGrid2}>
              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Target Bird Age (Days) <span className={styles.required}>*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  name="targetAgeDays"
                  className={styles.input}
                  value={formData.targetAgeDays}
                  onChange={handleAgeChange}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Scheduled Date <span className={styles.required}>*</span>
                </label>
                <input
                  type="date"
                  name="scheduledDate"
                  className={styles.input}
                  value={formData.scheduledDate}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            {/* Method & Assigned Staff */}
            <div className={styles.formGrid2}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Administration Method</label>
                <select
                  name="recommendedMethod"
                  className={styles.select}
                  value={formData.recommendedMethod}
                  onChange={handleChange}
                >
                  {ADMINISTRATION_METHODS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Assigned Staff / Vaccinator</label>
                <input
                  type="text"
                  name="assignedStaff"
                  className={styles.input}
                  value={formData.assignedStaff}
                  onChange={handleChange}
                />
              </div>
            </div>

            {/* Notes */}
            <div className={styles.formGroup}>
              <label className={styles.label}>Schedule Instructions & Notes</label>
              <textarea
                name="notes"
                rows={2}
                className={styles.textarea}
                placeholder="Water starvation time, skim milk stabilizer requirement, cold chain notes..."
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
              disabled={isSubmitting}
            >
              <Save size={16} />
              <span>{isSubmitting ? 'Saving...' : isEdit ? 'Update Schedule' : 'Confirm Schedule'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
