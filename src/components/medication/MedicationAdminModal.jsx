import { useState, useEffect, useMemo } from 'react';
import {
  X,
  Syringe,
  AlertOctagon,
  AlertCircle,
  Clock,
  Layers,
  Bird,
  ShieldAlert,
} from 'lucide-react';
import { formatDate } from '../../utils/formatters.js';
import {
  ADMINISTRATION_ROUTES,
  calculateWithdrawalEndDate,
} from '../../services/medicationService.js';
import styles from './MedicationAdminModal.module.css';

/**
 * Administer Medication Treatment Modal
 * Assigns treatments to Batches or Individual Birds with stock deduction,
 * biosecurity expiration safeguards, and automatic withdrawal date calculations.
 */
export function MedicationAdminModal({
  isOpen,
  onClose,
  onSubmit,
  medications = [],
  batches = [],
  birds = [],
  selectedMedication = null,
  currentAdminName = 'Farm Administrator',
}) {
  const [formData, setFormData] = useState({
    targetType: 'batch', // 'batch' or 'bird'
    batchId: '',
    birdId: '',
    medicationId: '',
    quantity: '',
    dosageGiven: '',
    route: 'Oral / Drinking Water',
    reason: '',
    administeredDate: new Date().toISOString().slice(0, 10),
    administeredBy: currentAdminName || 'Farm Administrator',
    withdrawalPeriodDays: '0',
    notes: '',
    overrideExpired: false,
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize form
  useEffect(() => {
    let initialMedId = '';
    let initialWithdrawal = '0';
    let initialRoute = 'Oral / Drinking Water';

    if (selectedMedication) {
      initialMedId = selectedMedication.medicationId;
      initialWithdrawal = String(selectedMedication.withdrawalPeriodDays ?? 0);
      initialRoute = selectedMedication.route || 'Oral / Drinking Water';
    } else if (medications.length > 0) {
      initialMedId = medications[0].medicationId;
      initialWithdrawal = String(medications[0].withdrawalPeriodDays ?? 0);
      initialRoute = medications[0].route || 'Oral / Drinking Water';
    }

    const defaultBatchId = batches.length > 0 ? (batches[0].batchId || batches[0].id) : '';
    const defaultBirdId = birds.length > 0 ? (birds[0].birdId || birds[0].id) : '';

    setFormData({
      targetType: 'batch',
      batchId: defaultBatchId,
      birdId: defaultBirdId,
      medicationId: initialMedId,
      quantity: '',
      dosageGiven: '',
      route: initialRoute,
      reason: '',
      administeredDate: new Date().toISOString().slice(0, 10),
      administeredBy: currentAdminName || 'Farm Administrator',
      withdrawalPeriodDays: initialWithdrawal,
      notes: '',
      overrideExpired: false,
    });
    setErrors({});
  }, [selectedMedication, medications, batches, birds, isOpen, currentAdminName]);

  // Find active medication
  const activeMed = useMemo(() => {
    return medications.find((m) => m.medicationId === formData.medicationId) || null;
  }, [medications, formData.medicationId]);

  // Check if expired
  const isMedExpired = useMemo(() => {
    if (!activeMed || !activeMed.expiryDate) return false;
    const todayStr = new Date().toISOString().slice(0, 10);
    return activeMed.expiryDate < todayStr;
  }, [activeMed]);

  // Withdrawal end date
  const withdrawalEndDate = useMemo(() => {
    const days = parseInt(formData.withdrawalPeriodDays, 10) || 0;
    return calculateWithdrawalEndDate(formData.administeredDate, days);
  }, [formData.administeredDate, formData.withdrawalPeriodDays]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const val = type === 'checkbox' ? checked : value;
    setFormData((prev) => ({ ...prev, [name]: val }));
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
      route: med?.route || prev.route,
      withdrawalPeriodDays: String(med?.withdrawalPeriodDays ?? 0),
      overrideExpired: false, // Reset override checkbox on drug change
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors({});

    const qty = parseFloat(formData.quantity);
    if (!qty || qty <= 0) {
      setErrors({ quantity: 'Quantity used must be greater than zero.' });
      setIsSubmitting(false);
      return;
    }

    if (activeMed && qty > Number(activeMed.currentStock)) {
      setErrors({
        quantity: `Insufficient stock! Current available stock is ${activeMed.currentStock} ${activeMed.unit}.`,
      });
      setIsSubmitting(false);
      return;
    }

    if (isMedExpired && !formData.overrideExpired) {
      setErrors({
        expired: `Medication "${activeMed?.name}" has expired! You must confirm the emergency override to proceed.`,
      });
      setIsSubmitting(false);
      return;
    }

    try {
      const payload = {
        targetType: formData.targetType,
        batchId: formData.targetType === 'batch' ? formData.batchId : null,
        birdId: formData.targetType === 'bird' ? formData.birdId : null,
        medicationId: formData.medicationId,
        quantity: qty,
        dosageGiven: formData.dosageGiven.trim() || `${qty} ${activeMed?.unit || 'units'}`,
        route: formData.route,
        reason: formData.reason.trim(),
        administeredDate: formData.administeredDate,
        administeredBy: formData.administeredBy.trim(),
        withdrawalPeriodDays: parseInt(formData.withdrawalPeriodDays, 10) || 0,
        notes: formData.notes.trim(),
      };

      await onSubmit(payload, { overrideExpired: formData.overrideExpired });
      onClose();
    } catch (err) {
      console.error('Administration submission error:', err);
      setErrors({ general: err.message || 'Failed to record medication administration.' });
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
              <h2 className={styles.modalTitle}>Administer Medication Treatment</h2>
              <p className={styles.modalSubtitle}>
                Deduct from pharmacy inventory and initiate mandatory food-safety withdrawal hold.
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
            {/* Target Selection: Batch vs Individual Bird */}
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
                  onChange={handleChange}
                  required
                >
                  {batches.length === 0 ? (
                    <option value="">No batches found (Create batch first)</option>
                  ) : (
                    batches.map((b) => (
                      <option key={b.batchId || b.id} value={b.batchId || b.id}>
                        {b.batchCode || b.batchId} — {b.birdType || 'Birds'} ({b.currentCount ?? b.initialCount ?? 0} birds)
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

            {/* Select Medication */}
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
                    {m.name} ({m.type}) — Stock: {m.currentStock} {m.unit}
                  </option>
                ))}
              </select>
            </div>

            {/* Stock & Expiration Notice */}
            {activeMed && (
              <div className={styles.medStatusCard}>
                <div className={styles.medStatusRow}>
                  <div className={styles.statusPill}>
                    <span>Available Stock:</span>
                    <strong>{activeMed.currentStock} {activeMed.unit}</strong>
                  </div>
                  <div className={styles.statusPill}>
                    <span>Expiry Date:</span>
                    <strong className={isMedExpired ? styles.textRed : undefined}>
                      {formatDate(activeMed.expiryDate)}
                    </strong>
                  </div>
                  <div className={styles.statusPill}>
                    <span>Standard Hold:</span>
                    <strong>{activeMed.withdrawalPeriodDays || 0} days</strong>
                  </div>
                </div>

                {/* Biosecurity Warning if Expired */}
                {isMedExpired && (
                  <div className={styles.expiredWarningBanner}>
                    <div className={styles.warningHeader}>
                      <AlertOctagon size={18} className={styles.warningIcon} />
                      <strong>Biosecurity Alert: Medication Expired</strong>
                    </div>
                    <p className={styles.warningText}>
                      This medicine expired on {formatDate(activeMed.expiryDate)}. Administering expired drugs risks treatment failure, disease spread, and veterinary non-compliance.
                    </p>
                    <label className={styles.overrideCheckboxLabel}>
                      <input
                        type="checkbox"
                        name="overrideExpired"
                        checked={formData.overrideExpired}
                        onChange={handleChange}
                      />
                      <span>I confirm emergency biosecurity override to administer this expired batch.</span>
                    </label>
                  </div>
                )}
              </div>
            )}
            {errors.expired && <span className={styles.fieldError}>{errors.expired}</span>}

            {/* Dosage & Quantity */}
            <div className={styles.formGrid2}>
              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Stock Deducted ({activeMed?.unit || 'units'}) <span className={styles.required}>*</span>
                </label>
                <input
                  type="number"
                  step="any"
                  min="0.01"
                  name="quantity"
                  className={`${styles.input} ${errors.quantity ? styles.inputError : ''}`}
                  placeholder="e.g. 2"
                  value={formData.quantity}
                  onChange={handleChange}
                  required
                />
                {errors.quantity && <span className={styles.fieldError}>{errors.quantity}</span>}
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
                <label className={styles.label}>Specific Dosage / Dilution</label>
                <input
                  type="text"
                  name="dosageGiven"
                  className={styles.input}
                  placeholder="e.g. 2 sachets in 40L water"
                  value={formData.dosageGiven}
                  onChange={handleChange}
                />
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

            {/* Date & Reason */}
            <div className={styles.formGrid2}>
              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Treatment Date <span className={styles.required}>*</span>
                </label>
                <input
                  type="date"
                  name="administeredDate"
                  className={styles.input}
                  value={formData.administeredDate}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Diagnosed Symptoms / Reason</label>
                <input
                  type="text"
                  name="reason"
                  className={styles.input}
                  placeholder="e.g. Sneezing, swollen eyes, prophylactic deworming"
                  value={formData.reason}
                  onChange={handleChange}
                />
              </div>
            </div>

            {/* Food Safety & Withdrawal Section */}
            <div className={styles.withdrawalCard}>
              <div className={styles.withdrawalCardHeader}>
                <ShieldAlert size={18} className={styles.shieldIcon} />
                <h4 className={styles.withdrawalHeading}>Food Safety & Withdrawal Hold Calculation</h4>
              </div>

              <div className={styles.formGrid2}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    Withdrawal Period (Days)
                  </label>
                  <input
                    type="number"
                    min="0"
                    name="withdrawalPeriodDays"
                    className={styles.input}
                    value={formData.withdrawalPeriodDays}
                    onChange={handleChange}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Calculated Clearance Date</label>
                  <div className={styles.clearanceDateBox}>
                    <Clock size={16} />
                    <strong>{formatDate(withdrawalEndDate)}</strong>
                  </div>
                </div>
              </div>

              {parseInt(formData.withdrawalPeriodDays, 10) > 0 ? (
                <div className={styles.withdrawalHoldNotice}>
                  <strong>RESTRICTION NOTICE:</strong> DO NOT SELL OR CONSUME EGGS OR MEAT FROM THIS FLOCK UNTIL {formatDate(withdrawalEndDate)} ({formData.withdrawalPeriodDays} days).
                </div>
              ) : (
                <div className={styles.withdrawalZeroNotice}>
                  Zero-day withdrawal period: Eggs and meat may be safely collected and sold normally.
                </div>
              )}
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Treatment Notes</label>
              <textarea
                name="notes"
                rows={2}
                className={styles.textarea}
                placeholder="Flock behavioral response, water consumption rate, veterinary observations..."
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
              disabled={
                isSubmitting ||
                !formData.quantity ||
                parseFloat(formData.quantity) <= 0 ||
                (isMedExpired && !formData.overrideExpired)
              }
            >
              <Syringe size={16} />
              <span>{isSubmitting ? 'Recording...' : 'Record Administration'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
