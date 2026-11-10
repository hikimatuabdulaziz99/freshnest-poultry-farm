import { useState, useEffect } from 'react';
import { X, Home, AlertCircle } from 'lucide-react';
import {
  PEN_TYPES,
  PEN_STATUSES,
  penService,
} from '../../services/penService.js';
import { Button } from '../common/Button.jsx';
import styles from './PenFormModal.module.css';

/**
 * Pen Registration & Editing Modal
 */
export function PenFormModal({
  isOpen,
  onClose,
  onSave,
  penToEdit = null,
}) {
  const isEditing = Boolean(penToEdit);

  // Form State
  const [penId, setPenId] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState('Layer');
  const [capacity, setCapacity] = useState('1000');
  const [location, setLocation] = useState('');
  const [status, setStatus] = useState('Available');
  const [notes, setNotes] = useState('');

  // Validation State
  const [errors, setErrors] = useState({});
  const [globalError, setGlobalError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    if (penToEdit) {
      setPenId(penToEdit.penId || '');
      setName(penToEdit.name || '');
      setType(penToEdit.type || 'Layer');
      setCapacity(String(penToEdit.capacity || 1000));
      setLocation(penToEdit.location || '');
      setStatus(penToEdit.status || 'Available');
      setNotes(penToEdit.notes || '');
      setErrors({});
      setGlobalError('');
    } else {
      penService.generateNextPenId().then((generated) => {
        setPenId(generated);
      });
      setName('');
      setType('Layer');
      setCapacity('1000');
      setLocation('');
      setStatus('Available');
      setNotes('');
      setErrors({});
      setGlobalError('');
    }
  }, [isOpen, penToEdit]);

  const validate = () => {
    const errs = {};
    if (!name.trim()) errs.name = 'Pen / House Name is required';
    if (!type) errs.type = 'Pen Type is required';

    const capNum = parseInt(capacity, 10);
    if (isNaN(capNum) || capNum <= 0) {
      errs.capacity = 'Capacity must be a positive integer greater than zero';
    } else if (isEditing && penToEdit && penToEdit.occupiedCount > capNum) {
      errs.capacity = `Capacity cannot be lower than currently occupied ${penToEdit.occupiedCount.toLocaleString()} birds`;
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

    setIsSubmitting(true);
    try {
      const payload = {
        penId: penId.trim().toUpperCase(),
        name: name.trim(),
        type,
        capacity: parseInt(capacity, 10),
        location: location.trim(),
        status,
        notes: notes.trim(),
      };

      await onSave(payload, penToEdit?.id);
      onClose();
    } catch (err) {
      setGlobalError(err.message || 'Failed to save pen record');
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
              <Home size={22} />
            </div>
            <div>
              <h3 className={styles.modalTitle}>
                {isEditing ? `Edit Housing Unit #${penId}` : 'Add New Poultry House / Pen'}
              </h3>
              <p className={styles.modalSubtitle}>
                {isEditing
                  ? 'Update housing specifications, capacity, or maintenance status'
                  : 'Register a poultry house, brooding room, or quarantine pen with capacity limits'}
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

          {isEditing && penToEdit && penToEdit.occupiedCount > 0 && (
            <div className={styles.occupiedInfo}>
              Currently occupied by <strong>{penToEdit.occupiedCount.toLocaleString()} birds</strong> across {penToEdit.batchCount || 0} active batch(es). Minimum capacity allowed is {penToEdit.occupiedCount.toLocaleString()}.
            </div>
          )}

          <div className={styles.formGrid2}>
            <div className={styles.formGroup}>
              <label className={styles.label}>
                Pen ID <span className={styles.requiredStar}>*</span>
              </label>
              <input
                type="text"
                value={penId}
                onChange={(e) => setPenId(e.target.value.toUpperCase())}
                placeholder="PEN-001"
                className={styles.input}
                style={{ fontFamily: 'monospace', fontWeight: 600 }}
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>
                Pen / House Name <span className={styles.requiredStar}>*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Pen 1 - North Wing, House A"
                className={`${styles.input} ${errors.name ? styles.inputError : ''}`}
                required
              />
              {errors.name && <span className={styles.fieldError}>{errors.name}</span>}
            </div>
          </div>

          <div className={styles.formGrid2}>
            <div className={styles.formGroup}>
              <label className={styles.label}>
                Pen Type <span className={styles.requiredStar}>*</span>
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className={styles.select}
              >
                {PEN_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>
                Maximum Capacity (Birds) <span className={styles.requiredStar}>*</span>
              </label>
              <input
                type="number"
                min="1"
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                placeholder="1000"
                className={`${styles.input} ${errors.capacity ? styles.inputError : ''}`}
                required
              />
              {errors.capacity && (
                <span className={styles.fieldError}>{errors.capacity}</span>
              )}
            </div>
          </div>

          <div className={styles.formGrid2}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Location / Physical Sector</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. North Brooder Bay, Sector 2"
                className={styles.input}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Operational Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className={styles.select}
              >
                {PEN_STATUSES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Equipment & Bio-security Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Record ventilation details, drinker nipple models, disinfection status..."
              className={styles.textarea}
            />
          </div>
        </form>

        {/* Footer */}
        <div className={styles.modalFooter}>
          <Button variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Saving Pen...' : isEditing ? 'Update Pen' : 'Create Pen'}
          </Button>
        </div>
      </div>
    </div>
  );
}
