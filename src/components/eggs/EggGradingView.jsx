import {
  Sliders,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Egg,
} from 'lucide-react';
import { formatNumber } from '../../utils/formatters.js';
import styles from './EggGradingView.module.css';

/**
 * Egg Grading & Sorting View
 * Commercial grading specifications, quality standards, and batch grading queue
 */
export function EggGradingView({
  logs = [],
  onOpenGradingModal,
}) {
  const ungradedLogs = logs.filter((l) => !l.graded);
  const gradedLogs = logs.filter((l) => l.graded);

  const totalGoodEggsGraded = gradedLogs.reduce((sum, l) => sum + (Number(l.goodEggs) || 0), 0);
  const totalGradeA = gradedLogs.reduce((sum, l) => sum + (Number(l.gradeA) || 0), 0);
  const totalGradeB = gradedLogs.reduce((sum, l) => sum + (Number(l.gradeB) || 0), 0);
  const totalSmall = gradedLogs.reduce((sum, l) => sum + (Number(l.smallEggs) || 0), 0);

  const gradeAPct = totalGoodEggsGraded > 0 ? ((totalGradeA / totalGoodEggsGraded) * 100).toFixed(1) : 0;
  const gradeBPct = totalGoodEggsGraded > 0 ? ((totalGradeB / totalGoodEggsGraded) * 100).toFixed(1) : 0;
  const smallPct = totalGoodEggsGraded > 0 ? ((totalSmall / totalGoodEggsGraded) * 100).toFixed(1) : 0;

  return (
    <div className={styles.gradingContainer}>
      {/* 1. Quality Standards Grid */}
      <div className={styles.standardsGrid}>
        <div className={styles.standardCard}>
          <div className={styles.cardHeader}>
            <span className={styles.badgeGradeA}>Grade A · Premium</span>
            <ShieldCheck size={18} color="#1b4332" />
          </div>
          <h4 className={styles.standardTitle}>Large Clean Table Eggs</h4>
          <p className={styles.standardDesc}>
            Firm, smooth shell without micro-fissures or stains. Premium wholesale crate pricing.
          </p>
          <div className={styles.standardMetric}>
            Standard Weight: 58g – 68g / egg · {gradeAPct}% of graded harvest
          </div>
        </div>

        <div className={styles.standardCard}>
          <div className={styles.cardHeader}>
            <span className={styles.badgeGradeB}>Grade B · Standard</span>
            <CheckCircle2 size={18} color="#0369a1" />
          </div>
          <h4 className={styles.standardTitle}>Medium Table Eggs</h4>
          <p className={styles.standardDesc}>
            Clean, structurally intact eggs with minor shell asymmetry. Commercial bakery & retail standard.
          </p>
          <div className={styles.standardMetric}>
            Standard Weight: 50g – 57g / egg · {gradeBPct}% of graded harvest
          </div>
        </div>

        <div className={styles.standardCard}>
          <div className={styles.cardHeader}>
            <span className={styles.badgeSmall}>Small / Pullet</span>
            <Egg size={18} color="#b45309" />
          </div>
          <h4 className={styles.standardTitle}>Early Lay Pullet Eggs</h4>
          <p className={styles.standardDesc}>
            Small eggs harvested from young flocks entering point of lay (weeks 18-22).
          </p>
          <div className={styles.standardMetric}>
            Standard Weight: &lt; 50g / egg · {smallPct}% of graded harvest
          </div>
        </div>

        <div className={styles.standardCard}>
          <div className={styles.cardHeader}>
            <span className={styles.badgeDefect}>Defects (Excluded)</span>
            <AlertCircle size={18} color="#dc2626" />
          </div>
          <h4 className={styles.standardTitle}>Cracked, Soiled & Damaged</h4>
          <p className={styles.standardDesc}>
            Hairline shell fractures, severe fecal staining, or broken shells. Strictly excluded from sellable table egg inventory.
          </p>
          <div className={styles.standardMetric} style={{ borderColor: '#dc2626', color: '#991b1b' }}>
            Biosecurity quarantine · Tracked separately for disposal
          </div>
        </div>
      </div>

      {/* 2. Collections Pending Grading */}
      <div className={styles.logsSection}>
        <div className={styles.sectionHeader}>
          <h3 className={styles.sectionTitle}>
            Collections Pending Quality Grading ({ungradedLogs.length})
          </h3>
          <span style={{ fontSize: '0.84rem', color: '#64748b' }}>
            Unsorted collections are temporarily credited as Grade A until graded
          </span>
        </div>

        {ungradedLogs.length > 0 ? (
          <div className={styles.logList}>
            {ungradedLogs.map((log) => (
              <div key={log.id || log.logId} className={styles.logItem}>
                <div className={styles.logMainInfo}>
                  <span className={styles.logIdPill}>{log.logId}</span>
                  <div>
                    <span className={styles.batchText}>{log.batchCode} ({log.breed})</span>
                    <div className={styles.dateText}>
                      Collected: {log.collectionDate} · Good Eggs to Grade: <strong>{formatNumber(log.goodEggs)}</strong>
                    </div>
                  </div>
                </div>

                <div className={styles.gradeBreakdown}>
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                    Total Collected: {log.totalCollected} (Defects: {log.crackedEggs + log.dirtyEggs + log.damagedEggs})
                  </span>
                  <button
                    type="button"
                    className={styles.btnGrade}
                    onClick={() => onOpenGradingModal(log)}
                  >
                    <Sliders size={14} style={{ display: 'inline', marginRight: 4, verticalAlign: -2 }} />
                    Grade This Collection
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>
            <CheckCircle2 size={32} color="#16a34a" style={{ margin: '0 auto 8px' }} />
            <p>All recorded egg collections have been graded! Outstanding job keeping inventory sorted.</p>
          </div>
        )}
      </div>

      {/* 3. Recent Graded Collections */}
      {gradedLogs.length > 0 && (
        <div className={styles.logsSection}>
          <div className={styles.sectionHeader}>
            <h3 className={styles.sectionTitle}>
              Recently Graded Collections ({gradedLogs.length})
            </h3>
          </div>

          <div className={styles.logList}>
            {gradedLogs.slice(0, 10).map((log) => (
              <div key={log.id || log.logId} className={styles.logItem}>
                <div className={styles.logMainInfo}>
                  <span className={styles.logIdPill}>{log.logId}</span>
                  <div>
                    <span className={styles.batchText}>{log.batchCode}</span>
                    <div className={styles.dateText}>
                      Collection Date: {log.collectionDate} · Grader: {log.gradedBy || log.recordedBy}
                    </div>
                  </div>
                </div>

                <div className={styles.gradeBreakdown}>
                  <span className={`${styles.gradeChip} ${styles.badgeGradeA}`}>
                    Grade A: {formatNumber(log.gradeA || 0)}
                  </span>
                  <span className={`${styles.gradeChip} ${styles.badgeGradeB}`}>
                    Grade B: {formatNumber(log.gradeB || 0)}
                  </span>
                  <span className={`${styles.gradeChip} ${styles.badgeSmall}`}>
                    Small: {formatNumber(log.smallEggs || 0)}
                  </span>
                  <button
                    type="button"
                    className={styles.btnGrade}
                    style={{ backgroundColor: '#ffffff', color: '#1b4332', border: '1px solid #cbd5e1' }}
                    onClick={() => onOpenGradingModal(log)}
                  >
                    Re-Grade
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
