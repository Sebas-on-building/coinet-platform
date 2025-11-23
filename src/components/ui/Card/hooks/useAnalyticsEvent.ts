import { useCallback } from 'react';

export type AnalyticsProvider = 'amplitude' | 'segment' | 'custom';

export interface AnalyticsEvent {
  type: string;
  payload?: Record<string, any>;
  timestamp?: number;
  [key: string]: any;
}

export interface UseAnalyticsEventOptions {
  provider?: AnalyticsProvider;
  async?: boolean;
  onError?: (err: any) => void;
}

export function useAnalyticsEvent(options: UseAnalyticsEventOptions = {}) {
  const { provider = 'custom', async = false, onError } = options;

  const logEvent = useCallback((type: string, payload?: Record<string, any>) => {
    const event: AnalyticsEvent = {
      type,
      payload,
      timestamp: Date.now(),
      provider,
    };
    try {
      if (provider === 'amplitude' && (window as any).amplitude) {
        (window as any).amplitude.getInstance().logEvent(type, payload);
      } else if (provider === 'segment' && (window as any).analytics) {
        (window as any).analytics.track(type, payload);
      } else {
        // Custom: send to backend or local log
        if (async) {
          fetch('/api/analytics', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(event),
          }).catch(onError);
        } else {
          // Synchronous: could push to a local array, Redux, etc.
          // For demo, just log
          // eslint-disable-next-line no-console
          console.log('[Analytics]', event);
        }
      }
    } catch (err) {
      onError?.(err);
    }
  }, [provider, async, onError]);

  return logEvent;
} 