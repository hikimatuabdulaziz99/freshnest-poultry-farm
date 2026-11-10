import { useState } from 'react';
import { Download, Smartphone, X, Share2, PlusSquare } from 'lucide-react';
import { usePWA } from '../../hooks/usePWA.js';
import styles from './PWAInstallButton.module.css';

export function PWAInstallButton({ variant = 'default', className = '' }) {
  const { isInstallable, isInstalled, isIOS, installApp } = usePWA();
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  // If already running in standalone mode or installed, hide the button
  if (isInstalled) {
    return null;
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    const handleInstallClick = async () => {
      setIsInstalling(true);
      try {
        await installApp();
      } finally {
        setIsInstalling(false);
      }
    };

    return (
      <button
        type="button"
        onClick={handleInstallClick}
        disabled={isInstalling}
        className={`${styles.installBtn} ${variant === 'compact' ? styles.compactBtn : ''} ${className}`}
        title="Install FreshNest Poultry Farm app on this device"
      >
        <Download size={14} className={styles.btnIcon} />
        <span>Install App</span>
      </button>
    );
  }

  // iOS Safari flow (beforeinstallprompt is not supported by WebKit)
  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSModal(true)}
          className={`${styles.installBtn} ${styles.iosBtn} ${variant === 'compact' ? styles.compactBtn : ''} ${className}`}
          title="Install on iPhone / iPad"
        >
          <Smartphone size={14} className={styles.btnIcon} />
          <span>Install on iOS</span>
        </button>

        {showIOSModal && (
          <div className={styles.modalBackdrop} onClick={() => setShowIOSModal(false)}>
            <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <div className={styles.headerTitleGroup}>
                  <Smartphone size={20} className={styles.modalIcon} />
                  <h4 className={styles.modalTitle}>Install on iPhone or iPad</h4>
                </div>
                <button
                  type="button"
                  className={styles.closeBtn}
                  onClick={() => setShowIOSModal(false)}
                  aria-label="Close dialog"
                >
                  <X size={18} />
                </button>
              </div>

              <div className={styles.modalBody}>
                <p className={styles.stepIntro}>
                  You can install <strong>FreshNest Poultry Farm</strong> directly to your home screen using Safari:
                </p>

                <ol className={styles.stepList}>
                  <li className={styles.stepItem}>
                    <div className={styles.stepIconBox}>
                      <Share2 size={16} />
                    </div>
                    <div className={styles.stepText}>
                      Tap the <strong>Share</strong> button at the bottom of Safari toolbar.
                    </div>
                  </li>
                  <li className={styles.stepItem}>
                    <div className={styles.stepIconBox}>
                      <PlusSquare size={16} />
                    </div>
                    <div className={styles.stepText}>
                      Scroll down and tap <strong>Add to Home Screen</strong>.
                    </div>
                  </li>
                  <li className={styles.stepItem}>
                    <div className={styles.stepIconBox}>
                      <span>3</span>
                    </div>
                    <div className={styles.stepText}>
                      Tap <strong>Add</strong> in the top-right corner to finish.
                    </div>
                  </li>
                </ol>

                <div className={styles.offlineNote}>
                  Once added, FreshNest opens in full standalone mode and works completely offline without internet!
                </div>
              </div>

              <div className={styles.modalFooter}>
                <button
                  type="button"
                  className={styles.gotItBtn}
                  onClick={() => setShowIOSModal(false)}
                >
                  Got It
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  // Not supported or already installed
  return null;
}
