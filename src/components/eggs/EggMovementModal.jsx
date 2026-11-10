import { useState } from 'react';
import {
  X,
  Boxes,
  Save,
  AlertCircle,
} from 'lucide-react';
import { formatNumber } from '../../utils/formatters.js';
import { EGG_GRADES } from '../../services/eggProductionService.js';
import styles from './EggMovementModal.module.css';

/**
 * Record Manual Egg Stock Movement Modal
 * Features: Sale, Damage, Disposal, Adjustment with strict available stock checks
 */
export function EggMovementModal({
  isOpen,
  onClose,
  onSubmit,
  stock = {},
}) {
  const todayStr = new Date().toISOString().slice(0, 10);

  const [movementType, setMovementType] = useState('SALE');
  const [grade, setGrade] = useState('Grade A');
  const [destinationGrade, setDestinationGrade] = useState('Grade B');
  const [quantity, setQuantity] = useState('');
  const [referenceId, setReferenceId] = useState('');
  const [movementDate, setMovementDate] = useState(todayStr);
  const [recordedBy, setRecordedBy] = useState('Farm Staff');
  const [notes, setNotes] = useState('');

  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const byGrade = stock?.byGrade || {};
  const availableInGrade = byGrade[grade] || 0;
  const numQty = parseInt(quantity, 10) || 0;
  const isDeduction = ['SALE', 'DAMAGE', 'DISPOSAL', 'TRANSFER'].includes(movementType);

  const isOverdrawn = isDeduction && numQty > availableInGrade;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (numQty <= 0) {
      setErrorMsg('Quantity must be an integer greater than zero.');
      return;
    }

    if (movementType === 'TRANSFER' && grade === destinationGrade) {
      setErrorMsg('Source grade and destination grade must be different for a transfer.');
      return;
    }

    if (isOverdrawn) {
      setErrorMsg(`Cannot remove ${numQty} eggs. Only ${availableInGrade} eggs available in ${grade}.`);
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        movementType,
        grade,
        destinationGrade: movementType === 'TRANSFER' ? destinationGrade : undefined,
        quantity: numQty,
        referenceId: referenceId || (movementType === 'SALE' ? 'Direct Sale' : movementType === 'TRANSFER' ? `Transfer to ${destinationGrade}` : 'Inventory Adjust'),
        movementDate,
        recordedBy,
        notes,
      });
      onClose();
    } catch (err) {
      console.error('Error recording stock movement:', err);
      setErrorMsg(err.message || 'Failed to record movement.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const crates = Math.floor(numQty / 30);
  const loose = numQty % 30;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div className={styles.headerTitleGroup}>
            <div className={styles.headerIcon}>
              <Boxes size={20} />
            </div>
            <div>
              <h3 className={styles.modalTitle}>Record Egg Stock Movement</h3>
              <span className={styles.modalSubtitle}>
                Log sales, storage breakage, disposal of rejects, or inventory adjustments
              </span>
            </div>
          </div>
          <button type="button" onClick={onClose} className={styles.closeButton}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className={styles.modalBody}>
            {errorMsg && (
              <div className={styles.alertBox}>
                <AlertCircle size={18} />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Movement Type</label>
                <select
                  value={movementType}
                  onChange={(e) => setMovementType(e.target.value)}
                  className={styles.select}
                >
                  <option value="SALE">SALE (Outgoing egg sale)</option>
                  <option value="DAMAGE">DAMAGE (Broken in storage/handling)</option>
                  <option value="DISPOSAL">DISPOSAL (Culling/sanitary disposal)</option>
                  <option value="ADJUSTMENT">ADJUSTMENT (Count reconciliation)</option>
                  <option value="TRANSFER">TRANSFER (Movement between stores)</option>
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>
                  {movementType === 'TRANSFER' ? 'Source Grade' : 'Egg Grade'}
                </label>
                <select
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  className={styles.select}
                >
                  {EGG_GRADES.map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>

              {movementType === 'TRANSFER' && (
                <div className={styles.formGroup} style={{ gridColumn: 'span 2' }}>
                  <label className={styles.label}>Destination Grade (Transfer To)</label>
                  <select
                    value={destinationGrade}
                    onChange={(e) => setDestinationGrade(e.target.value)}
                    className={styles.select}
                  >
                    {EGG_GRADES.filter((g) => g !== grade).map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Available Stock Indicator */}
            <div className={styles.stockPreviewBox}>
              <div>
                <span className={styles.stockAvailLabel}>Current Available Stock ({grade})</span>
                <div className={styles.stockAvailValue}>
                  {formatNumber(availableInGrade)} eggs
                </div>
              </div>
              <div className={styles.stockCrateValue}>
                {Math.floor(availableInGrade / 30)} crates ({availableInGrade % 30} loose)
              </div>
            </div>

            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Quantity (Number of Eggs)</label>
                <input
                  type="number"
                  min="1"
                  placeholder="e.g. 150 (5 crates)"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className={styles.input}
                />
                {numQty > 0 && (
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    Equivalent: {crates} crates{loose > 0 ? `, ${loose} loose` : ''}
                  </span>
                )}
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Movement Date</label>
                <input
                  type="date"
                  value={movementDate}
                  onChange={(e) => setMovementDate(e.target.value)}
                  className={styles.input}
                />
              </div>
            </div>

            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Reference / Reason</label>
                <input
                  type="text"
                  placeholder="e.g. Invoice #INV-104 or Routine Spoilage"
                  value={referenceId}
                  onChange={(e) => setReferenceId(e.target.value)}
                  className={styles.input}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Recorded By</label>
                <input
                  type="text"
                  value={recordedBy}
                  onChange={(e) => setRecordedBy(e.target.value)}
                  className={styles.input}
                />
              </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Additional Notes (Optional)</label>
              <input
                type="text"
                placeholder="Details regarding customer, batch or damage cause"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className={styles.input}
              />
            </div>
          </div>

          <div className={styles.modalFooter}>
            <button type="button" onClick={onClose} className={styles.btnCancel}>
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || numQty <= 0 || isOverdrawn}
              className={styles.btnSubmit}
            >
              <Save size={16} />
              <span>{isSubmitting ? 'Recording...' : 'Record Movement'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
