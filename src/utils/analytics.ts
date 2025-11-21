import { init as amplitudeInit, track as amplitudeTrack } from '@amplitude/analytics-browser';
import { AnalyticsBrowser } from '@segment/analytics-next';

amplitudeInit('AMPLITUDE_API_KEY'); // TODO: Replace with your Amplitude API key
const segment = AnalyticsBrowser.load({ writeKey: 'SEGMENT_WRITE_KEY' }); // TODO: Replace with your Segment write key

/**
 * logEvent - Atomic analytics event logger for Amplitude and Segment.
 * @param {string} event - Event name.
 * @param {Record<string, any>} [data] - Event data.
 * @returns {void}
 */
export function logEvent(event: string, data?: Record<string, any>) {
  amplitudeTrack(event, data);
  segment.track(event, data);
  if (process.env.NODE_ENV === 'development') {
    // eslint-disable-next-line no-console
    console.log(`[Analytics] Event: ${event}`, data);
  }
} 