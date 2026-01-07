import { useEffect, useCallback } from 'react';

// Register service worker
let swRegistration: ServiceWorkerRegistration | null = null;

export const registerServiceWorker = async () => {
  if ('serviceWorker' in navigator) {
    try {
      swRegistration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker registered successfully');
      return swRegistration;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      return null;
    }
  }
  return null;
};

export const useAppBadge = () => {
  useEffect(() => {
    registerServiceWorker();
  }, []);

  const setAppBadge = useCallback(async (count: number) => {
    // Try direct API first (works on supported browsers)
    if ('setAppBadge' in navigator) {
      try {
        if (count > 0) {
          await (navigator as any).setAppBadge(count);
        } else {
          await (navigator as any).clearAppBadge();
        }
        console.log('App badge set to:', count);
      } catch (error) {
        console.log('setAppBadge not supported or failed:', error);
      }
    }
    
    // Also send to service worker
    if (navigator.serviceWorker && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'SET_BADGE',
        count: count
      });
    }
  }, []);

  const clearAppBadge = useCallback(async () => {
    if ('clearAppBadge' in navigator) {
      try {
        await (navigator as any).clearAppBadge();
        console.log('App badge cleared');
      } catch (error) {
        console.log('clearAppBadge not supported or failed:', error);
      }
    }
    
    if (navigator.serviceWorker && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'CLEAR_BADGE'
      });
    }
  }, []);

  return { setAppBadge, clearAppBadge };
};

export default useAppBadge;
