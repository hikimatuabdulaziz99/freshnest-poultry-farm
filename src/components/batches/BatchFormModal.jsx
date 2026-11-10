import { useState, useEffect } from 'react';
import {
  X,
  Layers,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import {
  BATCH_TYPES,
  BATCH_STATUSES,
  PRODUCTION_PURPOSES,
  batchService,
} from '../../services/batchService.js';
import { penService } from '../../services/penService.js';
import { POPULAR_BREEDS } from '../../services/birdService.js';
import { Button } from '../common/Button.jsx';
import styles from './BatchFormModal.module.css';

/**
 * Batch Registration & Editing Modal with Strict Live Pen Capacity Validation
 */
export function BatchFormModal({
  isOpen,
  onClose,
  onSave,
  batchToEdit = null,
  pens = [],
}) {
  const isEditing = Boolean(batchToEdit);

  // Form State
  const [batchId, setBatchId] = useState('');
  const [name, setName] = useState('');
  const [birdType, setBirdType] = useState('Layer');
  const [breed, setBreed] = useState('Isa Brown');
  const [initialCount, setInitialCount] = useState('500');
  const [currentCount, setCurrentCount] = useState('500');
  const [arrivalDate, setArrivalDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [supplier, setSupplier] = useState('Local Certified Hatchery');
  const [costPerBird, setCostPerBird] = useState('450');
  const [totalCost, setTotalCost] = useState('225000');
  const [purpose, setPurpose] = useState('Table Egg Production');
  const [penId, setPenId] = useState('');
  const [expectedMarketDate, setExpectedMarketDate] = useState('');
  const [status, setStatus] = useState('Active');
  const [notes, setNotes] = useState('');

  // UI & Validation State
  const [errors, setErrors] = useState({});
  const [globalError, setGlobalError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [capacityFeedback, setCapacityFeedback] = useState(null);

  // Initialize or reset form on open / mode change
  useEffect(() => {
    if (!isOpen) return;

    if (batchToEdit) {
      setBatchId(batchToEdit.batchId || batchToEdit.batchCode || '');
      setName(batchToEdit.name || '');
      setBirdType(batchToEdit.birdType || 'Layer');
      setBreed(batchToEdit.breed || 'Isa Brown');
      setInitialCount(String(batchToEdit.initialCount ?? 500));
      setCurrentCount(String(batchToEdit.currentCount ?? batchToEdit.initialCount ?? 500));
      setArrivalDate(batchToEdit.arrivalDate || new Date().toISOString().slice(0, 10));
      setSupplier(batchToEdit.supplier || '');
      setCostPerBird(String(batchToEdit.costPerBird ?? 0));
      setTotalCost(String(batchToEdit.totalCost ?? 0));
      setPurpose(batchToEdit.purpose || 'Table Egg Production');
      setPenId(batchToEdit.penId || batchToEdit.houseId || (pens[0]?.penId || ''));
      setExpectedMarketDate(batchToEdit.expectedMarketDate || '');
      setStatus(batchToEdit.status || 'Active');
      setNotes(batchToEdit.notes || '');
      setErrors({});
      setGlobalError('');
    } else {
      batchService.generateNextBatchId().then((generated) => {
        setBatchId(generated);
      });
      setName('');
      setBirdType('Layer');
      setBreed('Isa Brown');
      setInitialCount('500');
      setCurrentCount('500');
      setArrivalDate(new Date().toISOString().slice(0, 10));
      setSupplier('Local Certified Hatchery');
      setCostPerBird('450');
      setTotalCost('225000');
      setPurpose('Table Egg Production');
      setPenId(pens.length > 0 ? pens[0].penId : '');
      setExpectedMarketDate('');
      setStatus('Active');
      setNotes('');
      setErrors({});
      setGlobalError('');
    }
  }, [isOpen, batchToEdit, pens]);

  // Auto-calculate Total Cost when costPerBird or initialCount changes
  const handleCostPerBirdChange = (val) => {
    setCostPerBird(val);
    const parsedCost = parseFloat(val) || 0;
    const parsedCount = parseInt(initialCount, 10) || 0;
    if (parsedCost >= 0 && parsedCount >= 0) {
      setTotalCost(String(Math.round(parsedCost * parsedCount)));
    }
  };

  const handleInitialCountChange = (val) => {
    setInitialCount(val);
    if (!isEditing) {
      setCurrentCount(val);
    }
    const parsedCount = parseInt(val, 10) || 0;
    const parsedCost = parseFloat(costPerBird) || 0;
    if (parsedCost >= 0 && parsedCount >= 0) {
      setTotalCost(String(Math.round(parsedCost * parsedCount)));
    }
  };

  // Real-time Live Pen Capacity Validation
  useEffect(() => {
    if (!penId || !isOpen) {
      setCapacityFeedback(null);
      return;
    }

    const checkCount = isEditing
      ? parseInt(currentCount, 10) || 0
      : parseInt(initialCount, 10) || 0;

    let isMounted = true;
    penService
      .validatePenCapacity(penId, checkCount, batchToEdit?.id)
      .then((res) => {
        if (isMounted) {
          setCapacityFeedback(res);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setCapacityFeedback({
            valid: false,
            message: err.message,
          });
        }
      });

    return () => {
      isMounted = false;
    };
  }, [penId, initialCount, currentCount, isEditing, batchToEdit, isOpen]);

  const validate = () => {
    const errs = {};
    if (!name.trim()) errs.name = 'Batch Name or Description is required';
    if (!birdType) errs.birdType = 'Batch Type is required';
    if (!breed.trim()) errs.breed = 'Breed is required';

    const initNum = parseInt(initialCount, 10);
    if (isNaN(initNum) || initNum <= 0) {
      errs.initialCount = 'Initial bird count must be a positive integer';
    }

    const curNum = parseInt(currentCount, 10);
    if (isNaN(curNum) || curNum < 0) {
      errs.currentCount = 'Current live count must be 0 or greater';
    }

    if (!arrivalDate) errs.arrivalDate = 'Arrival date is required';
    if (!penId) errs.penId = 'Assigned Poultry House/Pen is required';

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

    // Verify Capacity
    const checkCount = isEditing
      ? parseInt(currentCount, 10) || 0
      : parseInt(initialCount, 10) || 0;

    if (status === 'Active' || status === 'Planned') {
      const capCheck = await penService.validatePenCapacity(penId, checkCount, batchToEdit?.id);
      if (!capCheck.valid) {
        setGlobalError(capCheck.message);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const payload = {
        batchId: batchId.trim().toUpperCase(),
        name: name.trim(),
        birdType,
        breed: breed.trim(),
        initialCount: parseInt(initialCount, 10),
        currentCount: parseInt(currentCount, 10),
        arrivalDate,
        supplier: supplier.trim(),
        costPerBird: parseFloat(costPerBird) || 0,
        totalCost: parseFloat(totalCost) || 0,
        purpose,
        penId,
        expectedMarketDate: expectedMarketDate || null,
        status,
        notes: notes.trim(),
      };

      await onSave(payload, batchToEdit?.id);
      onClose();
    } catch (err) {
      setGlobalError(err.message || 'Failed to save batch record');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.modalHeader}>
          <div className={styles.titleArea}>
            <div className={styles.headerIcon}>
              <Layers size={22} />
            </div>
            <div>
              <h3 className={styles.modalTitle}>
                {isEditing ? `Edit Batch #${batchId || batchToEdit.id}` : 'Create New Flock Batch'}
              </h3>
              <p className={styles.modalSubtitle}>
                {isEditing
                  ? 'Update cohort parameters, live headcount, or pen assignment'
                  : 'Register day-old chick (DOC) arrival, breed specs, and housing'}
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className={styles.modalBody}>
          {globalError && (
            <div className={styles.globalAlert}>
              <AlertCircle size={18} />
              <span>{globalError}</span>
            </div>
          )}

          {/* Row 1: Identification & Name */}
          <div className={styles.formGrid2}>
            <div className={styles.formGroup}>
              <label className={styles.label}>
                Batch ID <span className={styles.requiredStar}>*</span>
              </label>
              <input
                type="text"
                value={batchId}
                onChange={(e) => setBatchId(e.target.value.toUpperCase())}
                placeholder="e.g. BAT-0001"
                className={styles.input}
                style={{ fontFamily: 'monospace', fontWeight: 600 }}
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>
                Batch Name / Title <span className={styles.requiredStar}>*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. 2026 Q1 Layer Pullets"
                className={`${styles.input} ${errors.name ? styles.inputError : ''}`}
                required
              />
              {errors.name && <span className={styles.fieldError}>{errors.name}</span>}
            </div>
          </div>

          {/* Row 2: Type, Breed, Purpose */}
          <div className={styles.formGrid3}>
            <div className={styles.formGroup}>
              <label className={styles.label}>
                Batch Type <span className={styles.requiredStar}>*</span>
              </label>
              <select
                value={birdType}
                onChange={(e) => setBirdType(e.target.value)}
                className={styles.select}
              >
                {BATCH_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>
                Breed <span className={styles.requiredStar}>*</span>
              </label>
              <input
                type="text"
                list="batch-breeds-list"
                value={breed}
                onChange={(e) => setBreed(e.target.value)}
                placeholder="e.g. Isa Brown, Cobb 500"
                className={`${styles.input} ${errors.breed ? styles.inputError : ''}`}
                required
              />
              <datalist id="batch-breeds-list">
                {POPULAR_BREEDS.map((b) => (
                  <option key={b} value={b} />
                ))}
              </datalist>
              {errors.breed && <span className={styles.fieldError}>{errors.breed}</span>}
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Production Purpose</label>
              <select
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                className={styles.select}
              >
                {PRODUCTION_PURPOSES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 3: Housing Placement & Strict Capacity Display */}
          <div className={styles.formGrid2}>
            <div className={styles.formGroup}>
              <label className={styles.label}>
                Assigned Poultry House / Pen <span className={styles.requiredStar}>*</span>
              </label>
              <select
                value={penId}
                onChange={(e) => setPenId(e.target.value)}
                className={`${styles.select} ${errors.penId ? styles.inputError : ''}`}
                required
              >
                <option value="">-- Select Pen / House --</option>
                {pens
                  .filter((p, idx, arr) => arr.findIndex((x) => x.penId === p.penId) === idx)
                  .map((p, idx) => (
                    <option
                      key={`pen-opt-${p.penId}-${p.id || idx}`}
                      value={p.penId}
                      disabled={p.status === 'Maintenance' || p.status === 'Closed'}
                    >
                      {p.penId} - {p.name} (Cap: {p.capacity.toLocaleString()} · Avail: {p.availableCapacity.toLocaleString()})
                      {p.status === 'Maintenance' ? ' [MAINTENANCE]' : ''}
                      {p.status === 'Closed' ? ' [CLOSED]' : ''}
                    </option>
                  ))}
              </select>
              {errors.penId && <span className={styles.fieldError}>{errors.penId}</span>}
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>
                Batch Lifecycle Status <span className={styles.requiredStar}>*</span>
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className={styles.select}
              >
                {BATCH_STATUSES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Live Capacity Feedback Box */}
          {capacityFeedback && (
            <div
              className={
                capacityFeedback.valid
                  ? styles.capacityBoxValid
                  : styles.capacityBoxError
              }
            >
              {capacityFeedback.valid ? (
                <CheckCircle2 size={18} style={{ flexShrink: 0, marginTop: 1 }} />
              ) : (
                <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: 1 }} />
              )}
              <div className={styles.capacityDetails}>
                <span className={styles.capacityTitle}>
                  {capacityFeedback.valid
                    ? 'Pen Capacity Validated'
                    : 'Pen Capacity Constraint Violation'}
                </span>
                <span>{capacityFeedback.message}</span>
              </div>
            </div>
          )}

          {/* Row 4: Bird Headcount (Initial vs Live Current) */}
          <div className={styles.formGrid2}>
            <div className={styles.formGroup}>
              <label className={styles.label}>
                Initial Placement Count <span className={styles.requiredStar}>*</span>
              </label>
              <input
                type="number"
                min="1"
                value={initialCount}
                onChange={(e) => handleInitialCountChange(e.target.value)}
                placeholder="500"
                className={`${styles.input} ${errors.initialCount ? styles.inputError : ''}`}
                required
              />
              <span style={{ fontSize: 11, color: '#6b7280' }}>
                Immutable historical intake; never reduced by mortality.
              </span>
              {errors.initialCount && (
                <span className={styles.fieldError}>{errors.initialCount}</span>
              )}
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>
                Current Live Bird Count <span className={styles.requiredStar}>*</span>
              </label>
              <input
                type="number"
                min="0"
                value={currentCount}
                onChange={(e) => setCurrentCount(e.target.value)}
                placeholder="500"
                className={`${styles.input} ${errors.currentCount ? styles.inputError : ''}`}
                required
              />
              <span style={{ fontSize: 11, color: '#6b7280' }}>
                Active birds in pen; directly determines occupied capacity.
              </span>
              {errors.currentCount && (
                <span className={styles.fieldError}>{errors.currentCount}</span>
              )}
            </div>
          </div>

          {/* Row 5: Financials & Cost in Nigerian Naira */}
          <div className={styles.formGrid3}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Cost per Bird (₦)</label>
              <div className={styles.inputWithPrefix}>
                <span className={styles.inputPrefix}>₦</span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={costPerBird}
                  onChange={(e) => handleCostPerBirdChange(e.target.value)}
                  placeholder="0"
                  className={styles.input}
                />
              </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Total Batch Cost (₦)</label>
              <div className={styles.inputWithPrefix}>
                <span className={styles.inputPrefix}>₦</span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={totalCost}
                  onChange={(e) => setTotalCost(e.target.value)}
                  placeholder="0"
                  className={styles.input}
                />
              </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Supplier or Hatchery</label>
              <input
                type="text"
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                placeholder="e.g. Amo Hatchery, Zartech"
                className={styles.input}
              />
            </div>
          </div>

          {/* Row 6: Dates */}
          <div className={styles.formGrid2}>
            <div className={styles.formGroup}>
              <label className={styles.label}>
                Arrival / Placement Date <span className={styles.requiredStar}>*</span>
              </label>
              <input
                type="date"
                value={arrivalDate}
                onChange={(e) => setArrivalDate(e.target.value)}
                className={`${styles.input} ${errors.arrivalDate ? styles.inputError : ''}`}
                required
              />
              {errors.arrivalDate && (
                <span className={styles.fieldError}>{errors.arrivalDate}</span>
              )}
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Expected Market / Lay Date</label>
              <input
                type="date"
                value={expectedMarketDate}
                onChange={(e) => setExpectedMarketDate(e.target.value)}
                className={styles.input}
              />
            </div>
          </div>

          {/* Row 7: Notes */}
          <div className={styles.formGroup}>
            <label className={styles.label}>Clinical & Batch Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Record vaccination notes, supplier batch numbers, or placement conditions..."
              className={styles.textarea}
            />
          </div>
        </form>

        {/* Footer Actions */}
        <div className={styles.modalFooter}>
          <Button variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSubmit}
            disabled={isSubmitting || (capacityFeedback && !capacityFeedback.valid && (status === 'Active' || status === 'Planned'))}
          >
            {isSubmitting ? 'Saving Batch...' : isEditing ? 'Update Batch' : 'Create Batch'}
          </Button>
        </div>
      </div>
    </div>
  );
}
