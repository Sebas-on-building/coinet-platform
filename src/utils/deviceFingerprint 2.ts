import FingerprintJS, { type Agent } from '@fingerprintjs/fingerprintjs';
import { useEffect, useState } from 'react';

let fpPromise: Promise<Agent> | null = null;

declare global {
  interface Window {
    __co_fingerprint?: string;
  }
}

/**
 * getDeviceFingerprint - Returns a unique device fingerprint using FingerprintJS, with fallback stub.
 * @returns {Promise<string>} - Device fingerprint string.
 */
export async function getDeviceFingerprint(): Promise<string> {
  try {
    if (!fpPromise) fpPromise = FingerprintJS.load();
    const fp = await fpPromise;
    const result = await fp.get();
    return result.visitorId;
  } catch (e) {
    // Fallback stub
    if (typeof window !== 'undefined') {
      if (!(window as any).__co_fingerprint) {
        (window as any).__co_fingerprint = `stub-fp-${Math.random().toString(36).slice(2)}-${Date.now()}`;
      }
      return (window as any).__co_fingerprint;
    }
    return 'stub-fp-server';
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