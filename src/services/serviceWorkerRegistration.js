/**
 * FreshNest Service Worker Registration Helper
 * Safe client registration, update notification listener, and skipWaiting protocol
 */

export function registerServiceWorker(config = {}) {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      const swUrl = '/sw.js';

      navigator.serviceWorker
        .register(swUrl)
        .then((registration) => {
          // Check if there is already a worker waiting to activate
          if (registration.waiting && config.onUpdate) {
            config.onUpdate(registration);
          }

          registration.onupdatefound = () => {
            const installingWorker = registration.installing;
            if (!installingWorker) return;

            installingWorker.onstatechange = () => {
              if (installingWorker.state === 'installed') {
                if (navigator.serviceWorker.controller) {
                  // An updated version is ready
                  if (config.onUpdate) {
                    config.onUpdate(registration);
                  }
                } else {
                  // Content is precached for offline use
                  if (config.onSuccess) {
                    config.onSuccess(registration);
                  }
                }
              }
            };
          };
        })
        .catch((error) => {
          console.warn('[ServiceWorker] Registration failed:', error);
        });
    });

    // Listen for controllerchange event to reload on skipWaiting
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });
  }
}

/**
 * Triggers the waiting service worker to take control and reloads the application
 */
export function skipWaitingAndReload(registration) {
  if (registration && registration.waiting) {
    registration.waiting.postMessage({ type: 'SKIP_WAITING' });
  } else {
    window.location.reload();
  }
}

/**
 * Unregister service worker (if ever required for clean resets)
 */
export function unregisterServiceWorker() {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then((registration) => registration.unregister())
      .catch((error) => console.error(error.message));
  }
}
