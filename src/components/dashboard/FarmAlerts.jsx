import {
  Bell,
  AlertTriangle,
  Wheat,
  Pill,
  Syringe,
  CheckCircle2,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { Card } from '../common/Card.jsx';
import styles from './FarmAlerts.module.css';

const ICON_MAP = {
  low_feed: Wheat,
  low_med: Pill,
  expired_med: ShieldAlert,
  upcoming_vax: Syringe,
  high_mortality: AlertTriangle,
};

export function FarmAlerts({ alerts = [], onSelectModule }) {
  return (
    <Card
      title="Flock Health, Feed & Veterinary Alerts"
      subtitle="Critical biosecurity thresholds and inventory reorder reminders from IndexedDB"
      icon={<Bell size={20} />}
      action={
        alerts.length > 0 ? (
          <span className={styles.alertCounterActive}>
            {alerts.length} Action Required
          </span>
        ) : (
          <span className={styles.alertCounterNominal}>
            All Schedules Nominal
          </span>
        )
      }
    >
      {alerts.length === 0 ? (
        <div className={styles.nominalState}>
          <div className={styles.nominalIconBox}>
            <CheckCircle2 size={32} className={styles.nominalIcon} />
          </div>
          <div className={styles.nominalText}>
            <h5 className={styles.nominalTitle}>All Veterinary & Stock Checks Passing</h5>
            <p className={styles.nominalDesc}>
              No feed inventory stockouts, expired pharmaceutical bottles, or urgent vaccinations
              scheduled for today. Threshold warnings will automatically trigger here as levels change.
            </p>
          </div>
        </div>
      ) : (
        <div className={styles.alertsGrid}>
          {alerts.map((alert) => {
            const Icon = ICON_MAP[alert.type] || AlertTriangle;
            return (
              <div
                key={alert.id}
                className={`${styles.alertCard} ${styles[alert.severity] || styles.warning}`}
                onClick={() => onSelectModule && onSelectModule(alert.module)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    onSelectModule && onSelectModule(alert.module);
                  }
                }}
              >
                <div className={styles.alertHeader}>
                  <div className={styles.iconTagRow}>
                    <div className={styles.alertIcon}>
                      <Icon size={16} />
                    </div>
                    <span className={styles.severityTag}>
                      {alert.severity === 'danger' ? 'Urgent Warning' : 'Attention Needed'}
                    </span>
                  </div>
                  <ArrowRight size={14} className={styles.arrow} />
                </div>

                <h5 className={styles.alertTitle}>{alert.title}</h5>
                <p className={styles.alertMessage}>{alert.message}</p>

                <div className={styles.alertFooter}>
                  <span className={styles.moduleLink}>
                    Manage in {alert.module} module →
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
