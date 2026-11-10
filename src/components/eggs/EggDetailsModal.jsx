import {
  X,
  Egg,
} from 'lucide-react';
import { formatNumber } from '../../utils/formatters.js';
import styles from './EggDetailsModal.module.css';

/**
 * Detailed view of an Egg Collection Record
 */
export function EggDetailsModal({
  isOpen,
  onClose,
  log = null,
}) {
  if (!isOpen || !log) return null;

  const total = Number(log.totalCollected ?? log.totalEggs ?? 0);
  const crates = Math.floor(total / 30);
  const loose = total % 30;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div className={styles.headerTitleGroup}>
            <div className={styles.headerIcon}>
              <Egg size={22} />
            </div>
            <div>
              <h3 className={styles.modalTitle}>Collection Record Details</h3>
              <span className={styles.modalSubtitle}>
                ID: {log.logId} · Date: {log.collectionDate}
              </span>
            </div>
          </div>
          <button type="button" onClick={onClose} className={styles.closeButton}>
            <X size={18} />
          </button>
        </div>

        <div className={styles.modalBody}>
          <div className={styles.overviewGrid}>
            <div className={styles.infoBlock}>
              <span className={styles.infoLabel}>Flock Batch</span>
              <span className={styles.infoValue}>{log.batchCode}</span>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{log.breed} · {log.birdType}</span>
            </div>
            <div className={styles.infoBlock}>
              <span className={styles.infoLabel}>Total Harvest</span>
              <span className={styles.infoValue}>{formatNumber(total)} eggs</span>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{crates} crates{loose > 0 ? `, ${loose} loose` : ''}</span>
            </div>
            <div className={styles.infoBlock}>
              <span className={styles.infoLabel}>Laying Rate (HDP)</span>
              <span className={styles.infoValue} style={{ color: '#1b4332' }}>{log.layingRate ?? 0}%</span>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Hen-Day Production</span>
            </div>
          </div>

          <div className={styles.detailSection}>
            <div className={styles.sectionTitle}>Daily Collection Sessions</div>
            <div className={styles.breakdownGrid}>
              <div className={styles.breakdownPill}>
                <span className={styles.infoLabel}>Morning (06:00 – 10:00)</span>
                <span className={styles.infoValue}>{formatNumber(log.morningCollection || 0)} eggs</span>
              </div>
              <div className={styles.breakdownPill}>
                <span className={styles.infoLabel}>Afternoon (12:00 – 15:00)</span>
                <span className={styles.infoValue}>{formatNumber(log.afternoonCollection || 0)} eggs</span>
              </div>
              <div className={styles.breakdownPill}>
                <span className={styles.infoLabel}>Evening (16:00 – 18:30)</span>
                <span className={styles.infoValue}>{formatNumber(log.eveningCollection || 0)} eggs</span>
              </div>
            </div>
          </div>

          <div className={styles.detailSection}>
            <div className={styles.sectionTitle}>Quality Sorting & Defects Breakdown</div>
            <div className={styles.breakdownGrid}>
              <div className={styles.breakdownPill} style={{ backgroundColor: '#e8f5e9', borderColor: '#c8e6c9' }}>
                <span className={styles.infoLabel} style={{ color: '#2e7d32' }}>Good Table Eggs</span>
                <span className={styles.infoValue} style={{ color: '#1b4332' }}>{formatNumber(log.goodEggs || 0)}</span>
              </div>
              <div className={styles.breakdownPill} style={{ backgroundColor: '#fef3c7', borderColor: '#fde68a' }}>
                <span className={styles.infoLabel} style={{ color: '#92400e' }}>Cracked Shells</span>
                <span className={styles.infoValue} style={{ color: '#b45309' }}>{formatNumber(log.crackedEggs || 0)}</span>
              </div>
              <div className={styles.breakdownPill} style={{ backgroundColor: '#fee2e2', borderColor: '#fecaca' }}>
                <span className={styles.infoLabel} style={{ color: '#991b1b' }}>Dirty / Damaged</span>
                <span className={styles.infoValue} style={{ color: '#dc2626' }}>
                  {formatNumber((log.dirtyEggs || 0) + (log.damagedEggs || 0))}
                </span>
              </div>
            </div>
          </div>

          {log.graded && (
            <div className={styles.detailSection} style={{ backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' }}>
              <div className={styles.sectionTitle} style={{ color: '#166534' }}>
                Applied Commercial Grading
              </div>
              <div className={styles.breakdownGrid}>
                <div className={styles.breakdownPill}>
                  <span className={styles.infoLabel}>Grade A (Large)</span>
                  <span className={styles.infoValue}>{formatNumber(log.gradeA || 0)}</span>
                </div>
                <div className={styles.breakdownPill}>
                  <span className={styles.infoLabel}>Grade B (Medium)</span>
                  <span className={styles.infoValue}>{formatNumber(log.gradeB || 0)}</span>
                </div>
                <div className={styles.breakdownPill}>
                  <span className={styles.infoLabel}>Small Eggs (Pullet)</span>
                  <span className={styles.infoValue}>{formatNumber(log.smallEggs || 0)}</span>
                </div>
              </div>
              <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#166534' }}>
                Graded By: {log.gradedBy || 'Farm Staff'} {log.gradingNotes ? `· "${log.gradingNotes}"` : ''}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#64748b', padding: '0 0.5rem' }}>
            <span>Recorded By: <strong>{log.recordedBy || 'Staff'}</strong></span>
            <span>Recorded At: {log.createdAt ? new Date(log.createdAt).toLocaleString() : '-'}</span>
          </div>
          {log.notes && (
            <div style={{ fontSize: '0.82rem', color: '#334155', fontStyle: 'italic', padding: '0 0.5rem' }}>
              Notes: "{log.notes}"
            </div>
          )}
        </div>

        <div className={styles.modalFooter}>
          <button type="button" onClick={onClose} className={styles.btnClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
