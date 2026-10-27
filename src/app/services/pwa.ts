/**
 * PWA runtime: service-worker registration, update prompts, offline status and the
 * "Install app" flow. Kept framework-agnostic (tiny pub/sub) so main.tsx can start it
 * before React mounts and components can subscribe with `usePwa()`.
 */
import { useSyncExternalStore } from 'react';
import { toast } from 'sonner';

// Chrome/Edge/Android fire this before showing their own install UI.
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export interface PwaState {
  /** Native install prompt is available (Chromium browsers). */
  canPrompt: boolean;
  /** iOS/iPadOS Safari: no prompt API, user must use Share → Add to Home Screen. */
  isIosSafari: boolean;
  /** Running as an installed app (standalone window / home-screen icon). */
  isInstalled: boolean;
  online: boolean;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;
let state: PwaState = {
  canPrompt: false,
  isIosSafari: false,
  isInstalled: false,
  online: typeof navigator === 'undefined' ? true : navigator.onLine,
};
const listeners = new Set<() => void>();

function setState(patch: Partial<PwaState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

function detectInstalled() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: window-controls-overlay)').matches ||
    // iOS Safari home-screen apps
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function detectIosSafari() {
  const ua = navigator.userAgent;
  const isIos = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
  return isIos && isSafari;
}

let started = false;

/** Call once at startup (main.tsx). Safe to call in dev; SW only registers in production. */
export function initPwa() {
  if (started || typeof window === 'undefined') return;
  started = true;

  setState({ isInstalled: detectInstalled(), isIosSafari: detectIosSafari() });

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); // keep our own button instead of the mini-infobar
    deferredPrompt = e as BeforeInstallPromptEvent;
    setState({ canPrompt: true });
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    setState({ canPrompt: false, isInstalled: true });
    toast.success('FocusChecker installed — open it from your home screen or desktop.');
  });

  window.matchMedia('(display-mode: standalone)').addEventListener?.('change', () =>
    setState({ isInstalled: detectInstalled() })
  );

  window.addEventListener('online', () => {
    setState({ online: true });
    toast.success('Back online', { id: 'net' });
  });
  window.addEventListener('offline', () => {
    setState({ online: false });
    toast('You’re offline — everything still works on this device.', { id: 'net' });
  });

  if (import.meta.env.PROD && 'serviceWorker' in navigator) {
    registerServiceWorker();
  }
}

async function registerServiceWorker() {
  // Remove the cache left by the old hand-written sw.js (pre-Workbox).
  caches?.delete('focuschecker-v1').catch(() => {});

  const { registerSW } = await import('virtual:pwa-register');
  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      toast('A new version of FocusChecker is ready.', {
        id: 'sw-update',
        duration: Infinity,
        description: 'Your running timer is saved and continues after reload.',
        action: { label: 'Update', onClick: () => updateSW(true) },
      });
    },
    onOfflineReady() {
      toast.success('Ready to work offline', {
        id: 'sw-offline',
        description: 'FocusChecker is saved on this device and works without a connection.',
      });
    },
    onRegisteredSW(_url, registration) {
      // Long-lived installed windows: check for a new deploy every hour.
      if (registration) {
        setInterval(() => {
          if (navigator.onLine) registration.update().catch(() => {});
        }, 60 * 60 * 1000);
      }
    },
  });
}

/** Trigger the install flow. Returns true if the app was (or is being) installed. */
export async function promptInstall(): Promise<boolean> {
  if (deferredPrompt) {
    const evt = deferredPrompt;
    deferredPrompt = null;
    setState({ canPrompt: false });
    await evt.prompt();
    const { outcome } = await evt.userChoice;
    return outcome === 'accepted';
  }
  if (state.isIosSafari) {
    toast('Install on iPhone / iPad', {
      id: 'ios-install',
      duration: 10000,
      description: 'Tap the Share button, then “Add to Home Screen”.',
    });
  }
  return false;
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function usePwa(): PwaState {
  return useSyncExternalStore(subscribe, () => state, () => state);
}
