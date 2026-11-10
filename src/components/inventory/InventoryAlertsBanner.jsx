import { AlertCircle, AlertTriangle, Clock, XCircle } from 'lucide-react';
import styles from './InventoryAlertsBanner.module.css';

export function InventoryAlertsBanner({ alerts = [] }) {
  if (!alerts || alerts.length === 0) return null;

  const getAlertClass = (severity) => {
    switch (severity) {
      case 'critical':
        return styles.alertCritical;
      case 'warning':
        return styles.alertWarning;
      case 'danger':
        return styles.alertDanger;
      default:
        return styles.alertInfo;
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'OUT_OF_STOCK':
        return <XCircle size={18} className={styles.alertIcon} />;
      case 'EXPIRED':
        return <AlertTriangle size={18} className={styles.alertIcon} />;
      case 'NEAR_EXPIRY':
        return <Clock size={18} className={styles.alertIcon} />;
      default:
        return <AlertCircle size={18} className={styles.alertIcon} />;
    }
  };

  // Show top 4 most critical alerts
  const displayAlerts = alerts.slice(0, 4);

  return (
    <div className={styles.alertsContainer}>
      {displayAlerts.map((alert) => (
        <div key={alert.id} className={`${styles.alertItem} ${getAlertClass(alert.severity)}`}>
          <div className={styles.alertLeft}>
            {getIcon(alert.type)}
            <div>
              <h5 className={styles.alertTitle}>{alert.title}</h5>
              <p className={styles.alertMessage}>{alert.message}</p>
            </div>
          </div>
          {alert.location && (
            <span className={styles.alertBadge}>
              {alert.location}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
