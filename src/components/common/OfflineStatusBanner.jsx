import { useState, useEffect } from 'react';
import { WifiOff, Wifi, X } from 'lucide-react';
import { usePWA } from '../../hooks/usePWA.js';
import styles from './OfflineStatusBanner.module.css';

export function OfflineStatusBanner() {
  const { isOnline } = usePWA();
  const [dismissed, setDismissed] = useState(false);
  const [showRestored, setShowRestored] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      setWasOffline(true);
      setDismissed(false);
      setShowRestored(false);
    } else if (wasOffline) {
      // Transition from offline to online
      setShowRestored(true);
      const timer = setTimeout(() => {
        setShowRestored(false);
        setWasOffline(false);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, wasOffline]);

  if (dismissed && !showRestored) {
    return null;
  }

  if (showRestored) {
    return (
      <div className={styles.restoredBanner} role="status">
        <Wifi size={15} className={styles.iconRestored} />
        <span className={styles.bannerText}>
          <strong>Connection Restored:</strong> You are back online. Offline IndexedDB records remain saved.
        </span>
      </div>
    );
  }

  if (!isOnline) {
    return (
      <div className={styles.offlineBanner} role="alert">
        <div className={styles.contentGroup}>
          <WifiOff size={15} className={styles.iconOffline} />
          <span className={styles.bannerText}>
            <strong>Offline Mode Active:</strong> You are working without an internet connection. All farm operations, collections, and reports remain fully functional in local IndexedDB.
          </span>
        </div>
        <button
          type="button"
          className={styles.dismissBtn}
          onClick={() => setDismissed(true)}
          title="Dismiss notification"
          aria-label="Dismiss offline banner"
        >
          <X size={14} />
        </button>
      </div>
    );
  }

  return null;
}
