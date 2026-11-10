import { useState, useEffect, useMemo } from 'react';
import {
  X,
  Syringe,
  AlertOctagon,
  AlertCircle,
  Layers,
  Bird,
  Thermometer,
} from 'lucide-react';
import { formatDate } from '../../utils/formatters.js';
import { ADMINISTRATION_METHODS } from '../../services/vaccineService.js';
import styles from './VaccineAdminModal.module.css';

/**
 * Administer Vaccination Modal
 * Records flock/bird immunisation with stock deduction, schedule status updating,
 * and strict biosecurity blocks on expired vaccines.
 */
export function VaccineAdminModal({
  isOpen,
  onClose,
  onSubmit,
  vaccines = [],
  batches = [],
  birds = [],
  schedules = [],
  selectedVaccine = null,
  selectedSchedule = null,
  currentAdminName = 'Farm Administrator',
}) {
  const [formData, setFormData] = useState({
    targetType: 'batch', // 'batch' or 'bird'
    batchId: '',
    birdId: '',
    vaccineId: '',
    scheduleId: '',
    quantity: '',
    birdsVaccinated: '',
    administrationMethod: 'Drinking Water',
    administeredDate: new Date().toISOString().slice(0, 16), // YYYY-MM-DDTHH:mm
    administeredBy: currentAdminName || 'Farm Administrator',
    lotNumber: '',
    reactionsObserved: '',
    notes: '',
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let initialVacId = '';
    let initialMethod = 'Drinking Water';
    let initialLot = '';
    let initialBatchId = batches.length > 0 ? (batches[0].batchId || batches[0].id) : '';
    let initialScheduleId = '';
    let initialQty = '';

    if (selectedSchedule) {
      initialScheduleId = selectedSchedule.scheduleId;
      initialBatchId = selectedSchedule.batchId;
      initialVacId = selectedSchedule.vaccineId;
      initialMethod = selectedSchedule.recommendedMethod || 'Drinking Water';

      const matchBatch = batches.find((b) => String(b.batchId || b.id) === String(selectedSchedule.batchId));
      if (matchBatch) {
        initialQty = String(matchBatch.currentCount ?? matchBatch.initialCount ?? 1000);
      }
    } else if (selectedVaccine) {
      initialVacId = selectedVaccine.vaccineId;
      initialMethod = selectedVaccine.administrationMethod || 'Drinking Water';
      initialLot = selectedVaccine.lotNumber || '';
    } else if (vaccines.length > 0) {
      initialVacId = vaccines[0].vaccineId;
      initialMethod = vaccines[0].administrationMethod || 'Drinking Water';
      initialLot = vaccines[0].lotNumber || '';
    }

    const defaultBirdId = birds.length > 0 ? (birds[0].birdId || birds[0].id) : '';

    setFormData({
      targetType: 'batch',
      batchId: initialBatchId,
      birdId: defaultBirdId,
      vaccineId: initialVacId,
      scheduleId: initialScheduleId,
      quantity: initialQty,
      birdsVaccinated: initialQty,
      administrationMethod: initialMethod,
      administeredDate: new Date().toISOString().slice(0, 16),
      administeredBy: currentAdminName || 'Farm Administrator',
      lotNumber: initialLot,
      reactionsObserved: '',
      notes: '',
    });
    setErrors({});
  }, [selectedVaccine, selectedSchedule, vaccines, batches, birds, isOpen, currentAdminName]);

  const activeVac = useMemo(() => {
    return vaccines.find((v) => v.vaccineId === formData.vaccineId) || null;
  }, [vaccines, formData.vaccineId]);

  // Check if expired using administration date
  const isVacExpired = useMemo(() => {
    if (!activeVac || !activeVac.expiryDate) return false;
    const adminDateStr = formData.administeredDate ? formData.administeredDate.slice(0, 10) : new Date().toISOString().slice(0, 10);
    const todayStr = new Date().toISOString().slice(0, 10);
    return activeVac.expiryDate < adminDateStr || activeVac.expiryDate < todayStr;
  }, [activeVac, formData.administeredDate]);

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
      administrationMethod: vac?.administrationMethod || prev.administrationMethod,
      lotNumber: vac?.lotNumber || prev.lotNumber,
    }));
  };

  const handleBatchChange = (e) => {
    const bId = e.target.value;
    const b = batches.find((item) => String(item.batchId || item.id) === String(bId));
    const birdCount = b ? String(b.currentCount ?? b.initialCount ?? '') : '';
    setFormData((prev) => ({
      ...prev,
      batchId: bId,
      quantity: prev.quantity || birdCount,
      birdsVaccinated: prev.birdsVaccinated || birdCount,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors({});

    const qty = parseFloat(formData.quantity);
    if (!qty || qty <= 0) {
      setErrors({ quantity: 'Administered doses must be greater than zero.' });
      setIsSubmitting(false);
      return;
    }

    if (activeVac && qty > Number(activeVac.currentStock)) {
      setErrors({
        quantity: `Insufficient stock! Current stock is ${activeVac.currentStock} ${activeVac.unit}.`,
      });
      setIsSubmitting(false);
      return;
    }

    // Strict biosecurity check: expired vaccines never allowed
    if (isVacExpired) {
      setErrors({
        expired: `Vaccine "${activeVac?.name}" expired on ${activeVac?.expiryDate}. Expired vaccines lose potency and must NEVER be administered.`,
      });
      setIsSubmitting(false);
      return;
    }

    // Validate batch living population limit
    if (formData.targetType === 'batch') {
      const b = batches.find((item) => String(item.batchId || item.id) === String(formData.batchId));
      const livingPop = b ? Number(b.currentCount !== undefined && b.currentCount !== null ? b.currentCount : b.initialCount) : Infinity;
      const birdsVac = parseInt(formData.birdsVaccinated, 10) || qty;
      if (b && birdsVac > livingPop) {
        setErrors({
          birdsVaccinated: `Number of birds vaccinated (${birdsVac}) cannot exceed the living batch population (${livingPop} birds).`,
        });
        setIsSubmitting(false);
        return;
      }
    } else {
      const selectedBird = birds.find((item) => String(item.birdId || item.id) === String(formData.birdId));
      if (selectedBird && (selectedBird.status === 'Dead' || selectedBird.status === 'Sold')) {
        setErrors({
          general: `Cannot vaccinate bird #${selectedBird.birdId || selectedBird.tagNumber} because its status is "${selectedBird.status}".`,
        });
        setIsSubmitting(false);
        return;
      }
    }

    try {
      const payload = {
        targetType: formData.targetType,
        batchId: formData.targetType === 'batch' ? formData.batchId : null,
        birdId: formData.targetType === 'bird' ? formData.birdId : null,
        vaccineId: formData.vaccineId,
        scheduleId: formData.scheduleId || null,
        quantity: qty,
        birdsVaccinated: parseInt(formData.birdsVaccinated, 10) || qty,
        administrationMethod: formData.administrationMethod,
        administeredDate: formData.administeredDate,
        administeredBy: formData.administeredBy.trim(),
        lotNumber: (formData.lotNumber || activeVac?.lotNumber || '').trim(),
        reactionsObserved: formData.reactionsObserved.trim(),
        notes: formData.notes.trim(),
      };

      await onSubmit(payload);
      onClose();
    } catch (err) {
      console.error('Vaccination administration error:', err);
      setErrors({ general: err.message || 'Failed to record vaccination.' });
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
              <h2 className={styles.modalTitle}>Administer Vaccination</h2>
              <p className={styles.modalSubtitle}>
                Log administered doses, deduct cold chain inventory, and mark schedule completed.
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
            {/* Target Type Toggle */}
            <div className={styles.targetTypeToggle}>
              <button
                type="button"
                className={`${styles.toggleBtn} ${formData.targetType === 'batch' ? styles.toggleBtnActive : ''}`}
                onClick={() => setFormData((prev) => ({ ...prev, targetType: 'batch' }))}
              >
                <Layers size={16} />
                <span>Flock Batch</span>
              </button>
              <button
                type="button"
                className={`${styles.toggleBtn} ${formData.targetType === 'bird' ? styles.toggleBtnActive : ''}`}
                onClick={() => setFormData((prev) => ({ ...prev, targetType: 'bird' }))}
              >
                <Bird size={16} />
                <span>Individual Bird</span>
              </button>
            </div>

            {/* Target Dropdown */}
            {formData.targetType === 'batch' ? (
              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Select Treated Flock Batch <span className={styles.required}>*</span>
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
                        {b.batchCode || b.name || `Batch #${b.id}`} — {b.birdType} ({b.currentCount ?? b.initialCount ?? 0} birds)
                      </option>
                    ))
                  )}
                </select>
              </div>
            ) : (
              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Select Treated Bird <span className={styles.required}>*</span>
                </label>
                <select
                  name="birdId"
                  className={styles.select}
                  value={formData.birdId}
                  onChange={handleChange}
                  required
                >
                  {birds.length === 0 ? (
                    <option value="">No individual birds registered</option>
                  ) : (
                    birds.map((b) => (
                      <option key={b.birdId || b.id} value={b.birdId || b.id}>
                        {b.tagNumber || b.birdId} — {b.name || b.breed || 'Bird'} ({b.status})
                      </option>
                    ))
                  )}
                </select>
              </div>
            )}

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
                    {v.name} ({v.targetDisease}) — Stock: {v.currentStock} {v.unit}
                  </option>
                ))}
              </select>
            </div>

            {/* Live Vaccine Status & Cold Chain Bar */}
            {activeVac && (
              <div className={styles.statusCard}>
                <div className={styles.statusRow}>
                  <div className={styles.statusPill}>
                    <span>Available Stock:</span>
                    <strong>{activeVac.currentStock} {activeVac.unit}</strong>
                  </div>
                  <div className={styles.statusPill}>
                    <span>Expiry Date:</span>
                    <strong className={isVacExpired ? styles.textRed : undefined}>
                      {formatDate(activeVac.expiryDate)}
                    </strong>
                  </div>
                  <div className={styles.statusPill}>
                    <span>Cold Chain:</span>
                    <span className={styles.coldChainTag}>
                      <Thermometer size={12} />
                      {activeVac.storageTemperature?.includes('2°C') ? '2-8°C' : 'Verified'}
                    </span>
                  </div>
                </div>

                {/* Biosecurity Block if Expired */}
                {isVacExpired && (
                  <div className={styles.expiredBlockBanner}>
                    <AlertOctagon size={20} className={styles.expiredIcon} />
                    <div>
                      <strong>BIOSECURITY BLOCK: VACCINE EXPIRED</strong>
                      <p>
                        This vaccine expired on {formatDate(activeVac.expiryDate)}. Expired vaccines lose viral/bacterial antigen titer and must NEVER be administered. Administration is strictly blocked.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
            {errors.expired && <span className={styles.fieldError}>{errors.expired}</span>}

            {/* Quantity and Birds Vaccinated */}
            <div className={styles.formGrid2}>
              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Doses Administered <span className={styles.required}>*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  name="quantity"
                  className={`${styles.input} ${errors.quantity ? styles.inputError : ''}`}
                  placeholder="e.g. 1000"
                  value={formData.quantity}
                  onChange={handleChange}
                  required
                />
                {errors.quantity && <span className={styles.fieldError}>{errors.quantity}</span>}
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Number of Birds Immunised</label>
                <input
                  type="number"
                  min="1"
                  name="birdsVaccinated"
                  className={styles.input}
                  placeholder="e.g. 980"
                  value={formData.birdsVaccinated}
                  onChange={handleChange}
                />
              </div>
            </div>

            {/* Method & Vaccinator */}
            <div className={styles.formGrid2}>
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

              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Administered By <span className={styles.required}>*</span>
                </label>
                <input
                  type="text"
                  name="administeredBy"
                  className={styles.input}
                  value={formData.administeredBy}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            {/* Date Time & Lot */}
            <div className={styles.formGrid2}>
              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Date & Time Administered <span className={styles.required}>*</span>
                </label>
                <input
                  type="datetime-local"
                  name="administeredDate"
                  className={styles.input}
                  value={formData.administeredDate}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Vaccine Lot / Batch Number</label>
                <input
                  type="text"
                  name="lotNumber"
                  className={styles.input}
                  placeholder="e.g. NVRI-2026-08"
                  value={formData.lotNumber}
                  onChange={handleChange}
                />
              </div>
            </div>

            {/* Link to Schedule (if available) */}
            {schedules.length > 0 && !selectedSchedule && (
              <div className={styles.formGroup}>
                <label className={styles.label}>Link to Scheduled Event (Optional)</label>
                <select
                  name="scheduleId"
                  className={styles.select}
                  value={formData.scheduleId}
                  onChange={handleChange}
                >
                  <option value="">No linked schedule (Ad-hoc vaccination)</option>
                  {schedules
                    .filter((s) => s.status !== 'Completed' && s.status !== 'Cancelled')
                    .map((s) => (
                      <option key={s.scheduleId} value={s.scheduleId}>
                        {s.scheduleId} — {s.batchName}: {s.vaccineName} (Scheduled: {formatDate(s.scheduledDate)})
                      </option>
                    ))}
                </select>
              </div>
            )}

            {/* Reactions / Observations */}
            <div className={styles.formGroup}>
              <label className={styles.label}>Observations / Flock Reactions</label>
              <textarea
                name="reactionsObserved"
                rows={2}
                className={styles.textarea}
                placeholder="Flock post-vaccination behavior, water uptake, respiratory signs, or wing takes..."
                value={formData.reactionsObserved}
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
              disabled={
                isSubmitting ||
                !formData.quantity ||
                parseFloat(formData.quantity) <= 0 ||
                isVacExpired
              }
            >
              <Syringe size={16} />
              <span>{isSubmitting ? 'Recording...' : 'Record Vaccination'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
