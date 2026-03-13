import FingerprintJS, { type Agent } from '@fingerprintjs/fingerprintjs';
import { useEffect, useState } from 'react';

let fpPromise: Promise<Agent> | null = null;

declare global {
  interface Window {
    __co_fingerprint?: string;
  }
}

/** Fallback when FingerprintJS fails (SSR, privacy, unsupported). Not a real fingerprint. */
const FALLBACK_PREFIX = 'fp-fallback-';

/**
 * getDeviceFingerprint - Uses FingerprintJS when available; fallback when not.
 * Fallback: session-only, non-persistent ID when FingerprintJS fails (SSR, privacy, unsupported).
 */
export async function getDeviceFingerprint(): Promise<string> {
  try {
    if (!fpPromise) fpPromise = FingerprintJS.load();
    const fp = await fpPromise;
    const result = await fp.get();
    return result.visitorId;
  } catch {
    if (typeof window !== 'undefined') {
      if (!(window as any).__co_fingerprint) {
        (window as any).__co_fingerprint =
          FALLBACK_PREFIX + Math.random().toString(36).slice(2) + '-' + Date.now();
      }
      return (window as any).__co_fingerprint;
    }
    return FALLBACK_PREFIX + 'server';
  }
}

/**
 * useDeviceFingerprint - React hook for device fingerprint.
 * @returns {string | null} - Device fingerprint or null while loading.
 */
export function useDeviceFingerprint() {
  const [fingerprint, setFingerprint] = useState<string | null>(null);
  useEffect(() => {
    getDeviceFingerprint().then(setFingerprint);
  }, []);
  return fingerprint;
} 