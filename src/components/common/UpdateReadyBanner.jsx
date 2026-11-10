import { useState } from 'react';
import { RefreshCw, Sparkles, X } from 'lucide-react';
import { usePWA } from '../../hooks/usePWA.js';
import styles from './UpdateReadyBanner.module.css';

export function UpdateReadyBanner() {
  const { updateAvailable, applyUpdate } = usePWA();
  const [dismissed, setDismissed] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  if (!updateAvailable || dismissed) {
    return null;
  }

  const handleUpdate = () => {
    setIsUpdating(true);
    applyUpdate();
  };

  return (
    <div className={styles.updateBanner} role="status">
      <div className={styles.leftGroup}>
        <Sparkles size={16} className={styles.sparkleIcon} />
        <span className={styles.bannerText}>
          <strong>New Version Available:</strong> An updated version of FreshNest Poultry Farm is ready to activate.
        </span>
      </div>
      <div className={styles.actionGroup}>
        <button
          type="button"
          onClick={handleUpdate}
          disabled={isUpdating}
          className={styles.updateBtn}
        >
          <RefreshCw size={13} className={isUpdating ? styles.spinning : ''} />
          <span>{isUpdating ? 'Updating...' : 'Reload & Update Now'}</span>
        </button>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className={styles.dismissBtn}
          title="Dismiss update notice"
          aria-label="Dismiss update notification"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
