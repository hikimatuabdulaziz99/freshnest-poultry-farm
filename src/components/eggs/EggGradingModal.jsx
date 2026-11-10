import { useState, useEffect } from 'react';
import {
  X,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Save,
} from 'lucide-react';
import { formatNumber } from '../../utils/formatters.js';
import styles from './EggGradingModal.module.css';

/**
 * Egg Grading Quality Sorting Modal
 */
export function EggGradingModal({
  isOpen,
  onClose,
  onSubmit,
  log = null,
}) {
  const [gradeA, setGradeA] = useState('0');
  const [gradeB, setGradeB] = useState('0');
  const [smallEggs, setSmallEggs] = useState('0');
  const [notes, setNotes] = useState('');
  const [gradedBy, setGradedBy] = useState('Farm Grader');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (log) {
      if (log.graded) {
        setGradeA(String(log.gradeA || 0));
        setGradeB(String(log.gradeB || 0));
        setSmallEggs(String(log.smallEggs || 0));
        setNotes(log.gradingNotes || '');
        setGradedBy(log.gradedBy || 'Farm Grader');
      } else {
        // Pre-fill Grade A with all good eggs as starting point
        setGradeA(String(log.goodEggs || 0));
        setGradeB('0');
        setSmallEggs('0');
        setNotes('');
        setGradedBy('Farm Grader');
      }
      setErrorMsg('');
    }
  }, [log, isOpen]);

  if (!isOpen || !log) return null;

  const totalGoodEggs = Number(log.goodEggs) || 0;
  const numA = parseInt(gradeA, 10) || 0;
  const numB = parseInt(gradeB, 10) || 0;
  const numSmall = parseInt(smallEggs, 10) || 0;
  const sumGraded = numA + numB + numSmall;
  const difference = totalGoodEggs - sumGraded;
  const isValid = difference === 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!isValid) {
      setErrorMsg(`Graded eggs must equal total good eggs. Difference: ${difference > 0 ? `+${difference} unallocated` : `${difference} over-allocated`}.`);
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(log.logId || log.id, {
        gradeA: numA,
        gradeB: numB,
        smallEggs: numSmall,
        notes,
        gradedBy,
      });
      onClose();
    } catch (err) {
      console.error('Error grading egg collection:', err);
      setErrorMsg(err.message || 'Failed to save grading.');
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
              <Sliders size={20} />
            </div>
            <div>
              <h3 className={styles.modalTitle}>Grade Harvested Good Eggs</h3>
              <span className={styles.modalSubtitle}>
                Log: {log.logId} · Batch: {log.batchCode} · Date: {log.collectionDate}
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
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#dc2626', fontSize: '0.84rem' }}>
                <AlertCircle size={16} />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className={styles.logSummaryCard}>
              <div>
                <span style={{ fontSize: '0.78rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>
                  Total Good Eggs to Grade
                </span>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1b4332' }}>
                  {formatNumber(totalGoodEggs)} eggs
                </div>
              </div>
              <div style={{ textAlign: 'right', fontSize: '0.8rem', color: '#64748b' }}>
                Defects ({log.crackedEggs + log.dirtyEggs + log.damagedEggs}) excluded
              </div>
            </div>

            <div className={styles.gradesGrid}>
              <div className={styles.gradeInputRow}>
                <div className={styles.gradeLabelGroup}>
                  <span className={styles.gradeName}>Grade A (Large / Premium)</span>
                  <span className={styles.gradeHint}>Standard 58g–68g clean table eggs</span>
                </div>
                <div className={styles.gradeInputBox}>
                  <input
                    type="number"
                    min="0"
                    max={totalGoodEggs}
                    value={gradeA}
                    onChange={(e) => setGradeA(e.target.value)}
                    className={styles.input}
                  />
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>eggs</span>
                </div>
              </div>

              <div className={styles.gradeInputRow}>
                <div className={styles.gradeLabelGroup}>
                  <span className={styles.gradeName}>Grade B (Medium / Standard)</span>
                  <span className={styles.gradeHint}>Standard 50g–57g clean table eggs</span>
                </div>
                <div className={styles.gradeInputBox}>
                  <input
                    type="number"
                    min="0"
                    max={totalGoodEggs}
                    value={gradeB}
                    onChange={(e) => setGradeB(e.target.value)}
                    className={styles.input}
                  />
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>eggs</span>
                </div>
              </div>

              <div className={styles.gradeInputRow}>
                <div className={styles.gradeLabelGroup}>
                  <span className={styles.gradeName}>Small Eggs (Pullet / Early Lay)</span>
                  <span className={styles.gradeHint}>Underweight &lt; 50g eggs from young pullets</span>
                </div>
                <div className={styles.gradeInputBox}>
                  <input
                    type="number"
                    min="0"
                    max={totalGoodEggs}
                    value={smallEggs}
                    onChange={(e) => setSmallEggs(e.target.value)}
                    className={styles.input}
                  />
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>eggs</span>
                </div>
              </div>
            </div>

            {/* Live Balance Strip */}
            <div className={`${styles.balanceStrip} ${isValid ? styles.balanceValid : styles.balanceInvalid}`}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {isValid ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                <span>
                  {isValid
                    ? 'All good eggs perfectly allocated!'
                    : difference > 0
                    ? `${difference} unallocated eggs remaining`
                    : `${Math.abs(difference)} eggs over-allocated!`}
                </span>
              </div>
              <span>Allocated: {sumGraded} / {totalGoodEggs}</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 4, color: '#475569' }}>
                  Graded By
                </label>
                <input
                  type="text"
                  value={gradedBy}
                  onChange={(e) => setGradedBy(e.target.value)}
                  className={styles.input}
                  style={{ textAlign: 'left' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 4, color: '#475569' }}>
                  Grading Notes
                </label>
                <input
                  type="text"
                  placeholder="e.g. Uniform size, excellent shell thickness"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className={styles.input}
                  style={{ textAlign: 'left' }}
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
              disabled={isSubmitting || !isValid}
              className={styles.btnSubmit}
            >
              <Save size={16} />
              <span>{isSubmitting ? 'Saving...' : 'Apply Grading'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
