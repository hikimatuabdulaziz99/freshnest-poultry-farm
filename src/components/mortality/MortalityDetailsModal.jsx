import { X, Skull } from 'lucide-react';
import styles from './MortalityDetailsModal.module.css';

export function MortalityDetailsModal({ isOpen, onClose, log }) {
  if (!isOpen || !log) return null;

  const isBatch = log.recordType === 'BATCH';

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div className={styles.headerTitleGroup}>
            <div className={styles.headerIcon}>
              <Skull size={20} />
            </div>
            <div>
              <h3 className={styles.modalTitle}>Mortality Record Details</h3>
              <p className={styles.modalSubtitle}>
                Log ID: {log.mortalityId || `MORT-${log.id}`}
              </p>
            </div>
          </div>
          <button type="button" className={styles.closeButton} onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className={styles.modalBody}>
          {/* Summary Banner */}
          <div className={styles.bannerSummary}>
            <div>
              <div className={styles.bannerLabel}>Mortality Event</div>
              <h4 className={styles.bannerValue}>
                {log.quantity || log.count || 1} {isBatch ? 'Birds (Batch)' : 'Bird (Individual)'}
              </h4>
            </div>
            <div className={styles.bannerDate}>
              Date: <strong>{log.date}</strong>
            </div>
          </div>

          {/* Details Grid */}
          <div className={styles.detailsGrid}>
            <div className={styles.detailItem}>
              <span className={styles.itemLabel}>Target Type</span>
              <span className={styles.itemValue}>
                {isBatch ? 'Flock / Cohort Batch' : 'Individual Bird'}
              </span>
            </div>

            <div className={styles.detailItem}>
              <span className={styles.itemLabel}>{isBatch ? 'Batch Code' : 'Bird Tag / ID'}</span>
              <span className={styles.itemValue}>{log.targetCode}</span>
            </div>

            <div className={styles.detailItem}>
              <span className={styles.itemLabel}>Description / Breed</span>
              <span className={styles.itemValue}>{log.targetName || log.breed}</span>
            </div>

            <div className={styles.detailItem}>
              <span className={styles.itemLabel}>Housing Pen</span>
              <span className={styles.itemValue}>{log.penName || 'General Pen'}</span>
            </div>

            <div className={styles.detailItem}>
              <span className={styles.itemLabel}>Reported Cause</span>
              <span className={styles.itemValue} style={{ color: '#b91c1c' }}>
                {log.cause}
              </span>
            </div>

            <div className={styles.detailItem}>
              <span className={styles.itemLabel}>Suspected Disease</span>
              <span className={styles.itemValue}>
                {log.suspectedDisease || 'None noted'}
              </span>
            </div>

            <div className={styles.detailItem}>
              <span className={styles.itemLabel}>Estimated Age at Death</span>
              <span className={styles.itemValue}>
                {log.ageAtDeathDays !== null && log.ageAtDeathDays !== undefined
                  ? `${log.ageAtDeathDays} days (${log.ageAtDeathWeeks} wks)`
                  : 'Not recorded'}
              </span>
            </div>

            <div className={styles.detailItem}>
              <span className={styles.itemLabel}>Biosecurity Disposal</span>
              <span className={styles.itemValue}>{log.disposalMethod || 'Burial'}</span>
            </div>

            <div className={`${styles.detailItem} ${styles.fullWidth}`}>
              <span className={styles.itemLabel}>Symptoms Observed</span>
              <span className={styles.itemValue} style={{ fontWeight: 400 }}>
                {log.symptoms || 'No specific pathological symptoms described.'}
              </span>
            </div>

            <div className={`${styles.detailItem} ${styles.fullWidth}`}>
              <span className={styles.itemLabel}>Autopsy & Biosecurity Notes</span>
              <span className={styles.itemValue} style={{ fontWeight: 400 }}>
                {log.notes || 'No extra notes provided.'}
              </span>
            </div>

            <div className={styles.detailItem}>
              <span className={styles.itemLabel}>Recorded By</span>
              <span className={styles.itemValue}>{log.recordedBy || 'Farm Staff'}</span>
            </div>

            <div className={styles.detailItem}>
              <span className={styles.itemLabel}>Logged Timestamp</span>
              <span className={styles.itemValue}>
                {log.createdAt ? new Date(log.createdAt).toLocaleString() : 'N/A'}
              </span>
            </div>
          </div>
        </div>

        <div className={styles.modalFooter}>
          <button type="button" className={styles.btnClose} onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
