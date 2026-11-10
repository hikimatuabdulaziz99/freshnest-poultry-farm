import { AlertTriangle, AlertOctagon, Info } from 'lucide-react';
import styles from './MortalityAlertsBanner.module.css';

export function MortalityAlertsBanner({ alerts = [] }) {
  if (!alerts || alerts.length === 0) return null;

  return (
    <div className={styles.container}>
      {alerts.map((alert) => {
        const isCritical = alert.severity === 'danger';
        return (
          <div
            key={alert.id}
            className={`${styles.alertCard} ${isCritical ? styles.danger : styles.warning}`}
          >
            <div className={styles.iconCol}>
              {isCritical ? (
                <AlertOctagon size={20} />
              ) : alert.type === 'repeated_cause' ? (
                <Info size={20} />
              ) : (
                <AlertTriangle size={20} />
              )}
            </div>
            <div className={styles.contentCol}>
              <h4 className={styles.title}>{alert.title}</h4>
              <p className={styles.message}>{alert.message}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
