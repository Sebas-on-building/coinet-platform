import { useCallback } from "react";

/**
 * useAnalyticsEvent
 * Standardized analytics event hook for Coinet widgets and UI components.
 * Supports event name, label, and additional data. Gracefully degrades if gtag is not present.
 *
 * @returns {trackEvent} - Function to trigger analytics events
 */
export interface AnalyticsEventData {
  event: string;
  label?: string;
  value?: string | number;
  [key: string]: any;
}

export function useAnalyticsEvent() {
  /**
   * Triggers an analytics event using gtag if available
   * @param {AnalyticsEventData} data - Event data
   */
  const trackEvent = useCallback((data: AnalyticsEventData) => {
    if ((window as any)?.gtag) {
      (window as any).gtag("event", data.event, data);
    } else if (process.env.NODE_ENV === "development") {
      // eslint-disable-next-line no-console
      console.log("[AnalyticsEvent]", data);
    }
  }, []);

  return trackEvent;
}
