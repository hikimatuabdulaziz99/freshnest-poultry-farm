import { AlertOctagon, ShieldAlert, Clock, ArrowRight } from 'lucide-react';
import { formatDate } from '../../utils/formatters.js';
import styles from './WithdrawalWarningsBanner.module.css';

/**
 * Withdrawal Warnings & Food Safety Notice
 * Flags any batch or bird currently under medication withdrawal to prevent selling contaminated meat or eggs.
 */
export function WithdrawalWarningsBanner({ activeRestrictions = [], onSelectTarget }) {
  if (!activeRestrictions || activeRestrictions.length === 0) {
    return (
      <div className={styles.clearCard}>
        <div className={styles.clearIconBox}>
          <ShieldAlert size={22} className={styles.clearIcon} />
        </div>
        <div className={styles.clearContent}>
          <h4 className={styles.clearTitle}>Food Safety Cleared: No Active Drug Withdrawal Holds</h4>
          <p className={styles.clearDescription}>
            All recent medication withdrawal periods have expired. All flock eggs and birds are cleared for harvest, sale, and consumption.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.bannerContainer}>
      <div className={styles.bannerHeader}>
        <div className={styles.bannerTitleGroup}>
          <div className={styles.iconPulseBox}>
            <AlertOctagon size={22} className={styles.alertIcon} />
          </div>
          <div>
            <h3 className={styles.bannerTitle}>
              Active Food Safety Withdrawal Notice ({activeRestrictions.length} Restricted Flock{activeRestrictions.length === 1 ? '' : 's'})
            </h3>
            <p className={styles.bannerSubtitle}>
              Strict veterinary hold: Do NOT harvest, sell, or consume eggs or meat from treated birds until withdrawal periods elapse.
            </p>
          </div>
        </div>
      </div>

      <div className={styles.restrictionList}>
        {activeRestrictions.map((item) => (
          <div key={item.id || item.logId} className={styles.restrictionCard}>
            <div className={styles.targetInfo}>
              <span className={styles.targetBadge}>
                {item.targetType === 'batch' ? 'Flock Batch' : 'Individual Bird'}
              </span>
              <strong className={styles.targetName}>{item.targetDisplay}</strong>
              <span className={styles.medicationUsed}>Treated with: <em>{item.medicationName}</em></span>
            </div>

            <div className={styles.timelineInfo}>
              <div className={styles.dateBlock}>
                <span className={styles.dateLabel}>Administered:</span>
                <span className={styles.dateValue}>{formatDate(item.administeredDate)}</span>
              </div>
              <div className={styles.dateBlock}>
                <span className={styles.dateLabel}>Clearance Date:</span>
                <span className={styles.clearanceDate}>{formatDate(item.withdrawalEndDate)}</span>
              </div>
            </div>

            <div className={styles.countdownBadge}>
              <Clock size={15} />
              <span>
                {item.daysRemaining === 0 ? 'Expires Today' : `${item.daysRemaining} day${item.daysRemaining === 1 ? '' : 's'} remaining`}
              </span>
            </div>

            {onSelectTarget && (
              <button
                type="button"
                className={styles.viewTargetBtn}
                onClick={() => onSelectTarget(item)}
                title="View Treatment Record"
              >
                <span>Details</span>
                <ArrowRight size={14} />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
