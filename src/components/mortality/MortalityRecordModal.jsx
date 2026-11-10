import { useState, useEffect, useMemo } from 'react';
import {
  X,
  Skull,
  Layers,
  Bird,
  AlertTriangle,
} from 'lucide-react';
import {
  COMMON_CAUSES,
  DISPOSAL_METHODS,
  getLocalDateString,
} from '../../services/mortalityService.js';
import styles from './MortalityRecordModal.module.css';

export function MortalityRecordModal({
  isOpen,
  onClose,
  onSave,
  batches = [],
  birds = [],
  initialData = null,
}) {
  const [recordType, setRecordType] = useState('BATCH'); // 'BATCH' | 'BIRD'
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [selectedBirdId, setSelectedBirdId] = useState('');
  const [mortalityDate, setMortalityDate] = useState(getLocalDateString());
  const [quantity, setQuantity] = useState('1');
  const [causeSelect, setCauseSelect] = useState('Disease');
  const [customCause, setCustomCause] = useState('');
  const [symptoms, setSymptoms] = useState('');
  const [suspectedDisease, setSuspectedDisease] = useState('');
  const [disposalMethod, setDisposalMethod] = useState('Burial');
  const [notes, setNotes] = useState('');
  const [recordedBy, setRecordedBy] = useState('Farm Staff');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter batches to active batches only
  const activeBatches = useMemo(() => {
    return batches.filter(
      (b) => b.status === 'Active' || b.status === 'Planned' || (initialData && String(b.id) === String(initialData.batchId))
    );
  }, [batches, initialData]);

  // Filter birds to living birds only (Active, Sick, Quarantined)
  const livingBirds = useMemo(() => {
    return birds.filter(
      (b) => (b.status !== 'Dead' && b.status !== 'Sold') || (initialData && String(b.id) === String(initialData.birdId))
    );
  }, [birds, initialData]);

  // Selected batch object
  const currentBatch = useMemo(() => {
    if (!selectedBatchId) return null;
    return batches.find((b) => String(b.id) === String(selectedBatchId));
  }, [batches, selectedBatchId]);

  // Selected bird object
  const currentBird = useMemo(() => {
    if (!selectedBirdId) return null;
    return birds.find((b) => String(b.id) === String(selectedBirdId));
  }, [birds, selectedBirdId]);

  // Initialize or reset form
  useEffect(() => {
    if (initialData) {
      setRecordType(initialData.recordType || 'BATCH');
      setSelectedBatchId(initialData.batchId ? String(initialData.batchId) : '');
      setSelectedBirdId(initialData.birdId ? String(initialData.birdId) : '');
      setMortalityDate(initialData.date || initialData.mortalityDate || getLocalDateString());
      setQuantity(String(initialData.quantity || initialData.count || 1));

      if (COMMON_CAUSES.includes(initialData.cause)) {
        setCauseSelect(initialData.cause);
        setCustomCause('');
      } else {
        setCauseSelect('Other');
        setCustomCause(initialData.cause || '');
      }

      setSymptoms(initialData.symptoms || '');
      setSuspectedDisease(initialData.suspectedDisease || '');
      setDisposalMethod(initialData.disposalMethod || initialData.disposedMethod || 'Burial');
      setNotes(initialData.notes || '');
      setRecordedBy(initialData.recordedBy || 'Farm Staff');
      setError('');
    } else {
      setRecordType('BATCH');
      setSelectedBatchId(activeBatches.length > 0 ? String(activeBatches[0].id) : '');
      setSelectedBirdId(livingBirds.length > 0 ? String(livingBirds[0].id) : '');
      setMortalityDate(getLocalDateString());
      setQuantity('1');
      setCauseSelect('Disease');
      setCustomCause('');
      setSymptoms('');
      setSuspectedDisease('');
      setDisposalMethod('Burial');
      setNotes('');
      setRecordedBy('Farm Staff');
      setError('');
    }
    setIsSubmitting(false);
  }, [initialData, isOpen, activeBatches, livingBirds]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const finalCause = causeSelect === 'Other' && customCause.trim()
      ? customCause.trim()
      : causeSelect;

    if (!finalCause) {
      setError('Cause of death is required.');
      return;
    }

    if (!mortalityDate) {
      setError('Date of death is required.');
      return;
    }

    if (recordType === 'BATCH') {
      if (!selectedBatchId) {
        setError('Please select an active flock / batch.');
        return;
      }

      const parsedQty = parseInt(quantity, 10);
      if (isNaN(parsedQty) || parsedQty <= 0) {
        setError('Mortality quantity must be a positive integer greater than zero.');
        return;
      }

      if (currentBatch) {
        const availableLiving = Number(currentBatch.currentCount !== undefined ? currentBatch.currentCount : currentBatch.initialCount);
        // When editing, restored living allows the old quantity
        const effectiveLiving = initialData
          ? availableLiving + Number(initialData.quantity || initialData.count || 0)
          : availableLiving;

        if (parsedQty > effectiveLiving) {
          setError(`Mortality quantity (${parsedQty}) cannot exceed current living batch count (${effectiveLiving} birds).`);
          return;
        }
      }
    } else {
      if (!selectedBirdId) {
        setError('Please select a living individual bird.');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const payload = {
        recordType,
        batchId: recordType === 'BATCH' ? selectedBatchId : null,
        birdId: recordType === 'BIRD' ? selectedBirdId : null,
        date: mortalityDate,
        mortalityDate,
        quantity: recordType === 'BIRD' ? 1 : parseInt(quantity, 10),
        count: recordType === 'BIRD' ? 1 : parseInt(quantity, 10),
        cause: finalCause,
        symptoms,
        suspectedDisease,
        disposalMethod,
        notes,
        recordedBy,
      };

      await onSave(payload);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to record mortality event.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.modalHeader}>
          <div className={styles.headerTitleGroup}>
            <div className={styles.headerIcon}>
              <Skull size={20} />
            </div>
            <div>
              <h3 className={styles.modalTitle}>
                {initialData ? 'Edit Mortality Record' : 'Record Flock Mortality'}
              </h3>
              <p className={styles.modalSubtitle}>
                {initialData
                  ? `Modifying entry ${initialData.mortalityId || `MORT-${initialData.id}`}`
                  : 'Document flock loss, autopsy notes, and update population counts'}
              </p>
            </div>
          </div>
          <button type="button" className={styles.closeButton} onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit}>
          <div className={styles.modalBody}>
            {error && (
              <div className={styles.errorBanner}>
                <AlertTriangle size={18} />
                <span>{error}</span>
              </div>
            )}

            {/* Target Type Selector (Batch vs Bird) */}
            {!initialData && (
              <div className={styles.typeSelectorRow}>
                <button
                  type="button"
                  className={`${styles.typeBtn} ${recordType === 'BATCH' ? styles.typeBtnActive : ''}`}
                  onClick={() => setRecordType('BATCH')}
                >
                  <Layers size={15} />
                  Flock / Cohort Batch
                </button>
                <button
                  type="button"
                  className={`${styles.typeBtn} ${recordType === 'BIRD' ? styles.typeBtnActive : ''}`}
                  onClick={() => {
                    setRecordType('BIRD');
                    setQuantity('1');
                  }}
                >
                  <Bird size={15} />
                  Individual Bird
                </button>
              </div>
            )}

            {/* Target Selection */}
            {recordType === 'BATCH' ? (
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  Select Batch / Flock <span className={styles.required}>*</span>
                </label>
                <select
                  className={styles.formSelect}
                  value={selectedBatchId}
                  onChange={(e) => setSelectedBatchId(e.target.value)}
                  disabled={!!initialData}
                  required
                >
                  <option value="">-- Choose Active Batch --</option>
                  {activeBatches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.batchCode || b.name} ({b.birdType} - {b.breed}) - {b.currentCount ?? b.initialCount} live birds
                    </option>
                  ))}
                </select>

                {currentBatch && (
                  <div className={styles.infoBanner}>
                    <span>
                      Batch Initial Count:{' '}
                      <strong className={styles.infoHighlight}>{currentBatch.initialCount}</strong>
                    </span>
                    <span>
                      Current Living Population:{' '}
                      <strong className={styles.infoHighlight}>
                        {currentBatch.currentCount ?? currentBatch.initialCount}
                      </strong>
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  Select Living Bird <span className={styles.required}>*</span>
                </label>
                <select
                  className={styles.formSelect}
                  value={selectedBirdId}
                  onChange={(e) => setSelectedBirdId(e.target.value)}
                  disabled={isSubmitting}
                  required
                >
                  <option value="">-- Choose Individual Bird --</option>
                  {livingBirds.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.tagNumber || b.birdId || `Bird #${b.id}`} ({b.type} - {b.breed}) · Status: {b.status}
                    </option>
                  ))}
                </select>

                {currentBird && (
                  <div className={styles.infoBanner}>
                    <span>
                      Tag: <strong>{currentBird.tagNumber || 'Untagged'}</strong>
                    </span>
                    <span>
                      Breed: <strong>{currentBird.breed}</strong>
                    </span>
                    <span>
                      House: <strong>{currentBird.houseNumber || 'General Pen'}</strong>
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Date and Quantity */}
            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  Date of Death <span className={styles.required}>*</span>
                </label>
                <input
                  type="date"
                  className={styles.formInput}
                  value={mortalityDate}
                  onChange={(e) => setMortalityDate(e.target.value)}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  Number of Deaths <span className={styles.required}>*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  className={styles.formInput}
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  disabled={recordType === 'BIRD'}
                  required
                />
              </div>
            </div>

            {/* Cause of Death */}
            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  Cause of Death <span className={styles.required}>*</span>
                </label>
                <select
                  className={styles.formSelect}
                  value={causeSelect}
                  onChange={(e) => setCauseSelect(e.target.value)}
                  required
                >
                  {COMMON_CAUSES.map((cause) => (
                    <option key={cause} value={cause}>
                      {cause}
                    </option>
                  ))}
                </select>
              </div>

              {causeSelect === 'Other' ? (
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>
                    Custom Cause Description <span className={styles.required}>*</span>
                  </label>
                  <input
                    type="text"
                    className={styles.formInput}
                    placeholder="e.g. Asphyxiation, Smothering"
                    value={customCause}
                    onChange={(e) => setCustomCause(e.target.value)}
                    required
                  />
                </div>
              ) : (
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Suspected Disease (Optional)</label>
                  <input
                    type="text"
                    className={styles.formInput}
                    placeholder="e.g. Coccidiosis, Newcastle, CRD"
                    value={suspectedDisease}
                    onChange={(e) => setSuspectedDisease(e.target.value)}
                  />
                </div>
              )}
            </div>

            {/* Symptoms and Disposal Method */}
            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Symptoms Observed</label>
                <input
                  type="text"
                  className={styles.formInput}
                  placeholder="e.g. Bloody droppings, gasping, lethargy"
                  value={symptoms}
                  onChange={(e) => setSymptoms(e.target.value)}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Disposal Method</label>
                <select
                  className={styles.formSelect}
                  value={disposalMethod}
                  onChange={(e) => setDisposalMethod(e.target.value)}
                >
                  {DISPOSAL_METHODS.map((method) => (
                    <option key={method} value={method}>
                      {method}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Notes and Recorded By */}
            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Recorded By</label>
                <input
                  type="text"
                  className={styles.formInput}
                  value={recordedBy}
                  onChange={(e) => setRecordedBy(e.target.value)}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Autopsy & Biosecurity Notes</label>
                <input
                  type="text"
                  className={styles.formInput}
                  placeholder="Action taken, disinfection applied..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className={styles.modalFooter}>
            <button
              type="button"
              className={styles.btnCancel}
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={styles.btnSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting
                ? 'Processing...'
                : initialData
                ? 'Update Record'
                : 'Confirm & Record Mortality'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
