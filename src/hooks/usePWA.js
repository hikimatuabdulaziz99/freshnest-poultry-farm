import { useState, useEffect, useCallback } from 'react';
import { skipWaitingAndReload } from '../services/serviceWorkerRegistration.js';

/**
 * Custom React hook for Progressive Web App capabilities:
 * - Online / Offline connectivity detection
 * - Native beforeinstallprompt capture and installation triggering
 * - Standalone display mode detection
 * - iOS Safari add-to-home-screen detection
 * - Service worker update notification and reload handling
 */
export function usePWA() {
  const [isOnline, setIsOnline] = useState(() => {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  });

  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState(null);
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    // 1. Online / Offline event listeners
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // 2. Standalone display detection
    const isStandalone =
      (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
      (typeof navigator !== 'undefined' && navigator.standalone === true);
    setIsInstalled(isStandalone);

    // 3. iOS Detection
    const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent.toLowerCase() : '';
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent) && !window.MSStream;
    setIsIOS(isIOSDevice);

    // 4. BeforeInstallPrompt handler
    const handleBeforeInstall = (e) => {
      // Prevent automatic browser mini-infobar on mobile
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    // 5. Check if service worker has an active update waiting
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then((reg) => {
        if (reg && reg.waiting) {
          setWaitingWorker(reg.waiting);
          setUpdateAvailable(true);
        }
      }).catch(() => {});
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Method to prompt user to install
  const installApp = useCallback(async () => {
    if (!deferredPrompt) return false;

    try {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult && choiceResult.outcome === 'accepted') {
        setIsInstalled(true);
        setDeferredPrompt(null);
        return true;
      }
      return false;
    } catch (err) {
      console.warn('Install prompt error:', err);
      return false;
    }
  }, [deferredPrompt]);

  // Method to activate waiting service worker and reload
  const applyUpdate = useCallback(() => {
    if (waitingWorker) {
      skipWaitingAndReload({ waiting: waitingWorker });
    } else {
      window.location.reload();
    }
  }, [waitingWorker]);

  return {
    isOnline,
    isInstallable: !!deferredPrompt,
    isInstalled,
    isIOS,
    installApp,
    updateAvailable,
    applyUpdate,
    setWaitingWorker,
    setUpdateAvailable,
  };
}
