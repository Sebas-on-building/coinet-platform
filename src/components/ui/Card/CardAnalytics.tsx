/**
 * Atomic CardAnalytics for Coinet Card system
 * Analytics hook/context for Card events (click, drag, resize, context menu, etc)
 * Supports Amplitude, Segment, custom, etc. Extensible and documented
 */
import React, { createContext, useContext, useCallback } from 'react';

export type CardAnalyticsEvent =
  | { type: 'click'; cardId?: string; meta?: any }
  | { type: 'drag'; cardId?: string; meta?: any }
  | { type: 'resize'; cardId?: string; size: { width: number; height: number }; meta?: any }
  | { type: 'contextMenu'; cardId?: string; meta?: any }
  | { type: 'custom'; name: string; cardId?: string; meta?: any };

export interface CardAnalyticsContextValue {
  track: (event: CardAnalyticsEvent) => void;
}

const CardAnalyticsContext = createContext<CardAnalyticsContextValue>({
  track: () => { },
});

export const useCardAnalytics = () => useContext(CardAnalyticsContext);

export const CardAnalyticsProvider: React.FC<{
  children: React.ReactNode;
  onEvent?: (event: CardAnalyticsEvent) => void;
}> = ({ children, onEvent }) => {
  const track = useCallback((event: CardAnalyticsEvent) => {
    // Integrate with Amplitude, Segment, or custom analytics here
    if (onEvent) onEvent(event);
    // Example: window.amplitude?.getInstance().logEvent(event.type, event)
  }, [onEvent]);
  return (
    <CardAnalyticsContext.Provider value={{ track }}>
      {children}
    </CardAnalyticsContext.Provider>
  );
}; 