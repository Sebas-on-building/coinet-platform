import { useCallback } from 'react';

export type ComplianceProvider = 'custom' | 'backend';

export interface ComplianceEvent {
  type: string;
  payload?: Record<string, any>;
  timestamp?: number;
  [key: string]: any;
}

export interface UseComplianceEventOptions {
  provider?: ComplianceProvider;
  async?: boolean;
  onError?: (err: any) => void;
  gdprConsent?: boolean;
  ccpaConsent?: boolean;
}

export function useComplianceEvent(options: UseComplianceEventOptions = {}) {
  const { provider = 'custom', async = false, onError, gdprConsent = true, ccpaConsent = true } = options;

  const logCompliance = useCallback((type: string, payload?: Record<string, any>) => {
    if (!gdprConsent || !ccpaConsent) return;
    const event: ComplianceEvent = {
      type,
      payload,
      timestamp: Date.now(),
      provider,
    };
    try {
      if (provider === 'backend') {
        if (async) {
          fetch('/api/compliance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(event),
          }).catch(onError);
        } else {
          // Synchronous: could push to a local array, Redux, etc.
          // For demo, just log
          // eslint-disable-next-line no-console
          console.log('[Compliance]', event);
        }
      } else {
        // Custom: local log or other
        // eslint-disable-next-line no-console
        console.log('[Compliance]', event);
      }
    } catch (err) {
      onError?.(err);
    }
  }, [provider, async, onError, gdprConsent, ccpaConsent]);

  return logCompliance;
} 