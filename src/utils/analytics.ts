import { init as amplitudeInit, track as amplitudeTrack } from '@amplitude/analytics-browser';
import { AnalyticsBrowser } from '@segment/analytics-next';

const AMPLITUDE_KEY = process.env.NEXT_PUBLIC_AMPLITUDE_API_KEY;
const SEGMENT_KEY = process.env.NEXT_PUBLIC_SEGMENT_WRITE_KEY;

const PLACEHOLDER_VALUES = new Set([
  'AMPLITUDE_API_KEY',
  'SEGMENT_WRITE_KEY',
  'NEXT_PUBLIC_AMPLITUDE_API_KEY',
  'NEXT_PUBLIC_SEGMENT_WRITE_KEY',
  '',
  undefined,
]);

const isPlaceholder = (v: string | undefined): boolean =>
  !v || PLACEHOLDER_VALUES.has(v) || v.startsWith('your_') || v.includes('_here');

const amplitudeEnabled = AMPLITUDE_KEY && !isPlaceholder(AMPLITUDE_KEY);
const segmentEnabled = SEGMENT_KEY && !isPlaceholder(SEGMENT_KEY);

if (amplitudeEnabled) {
  amplitudeInit(AMPLITUDE_KEY);
} else if (process.env.NODE_ENV !== 'test') {
  console.warn('[Analytics] Amplitude disabled – set NEXT_PUBLIC_AMPLITUDE_API_KEY');
}

const segment = segmentEnabled
  ? AnalyticsBrowser.load({ writeKey: SEGMENT_KEY })
  : null;

if (!segmentEnabled && process.env.NODE_ENV !== 'test') {
  console.warn('[Analytics] Segment disabled – set NEXT_PUBLIC_SEGMENT_WRITE_KEY');
}

/**
 * logEvent - Atomic analytics event logger for Amplitude and Segment.
 * Fails silently if providers are unavailable or misconfigured.
 * @param {string} event - Event name.
 * @param {Record<string, any>} [data] - Event data.
 * @returns {void}
 */
export function logEvent(event: string, data?: Record<string, any>) {
  try {
    if (amplitudeEnabled) {
      amplitudeTrack(event, data);
    }
    if (segment && typeof segment.track === 'function') {
      segment.track(event, data);
    }
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.log(`[Analytics] Event: ${event}`, data);
    }
  } catch (err) {
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.warn('[Analytics] logEvent failed:', err);
    }
  }
} 