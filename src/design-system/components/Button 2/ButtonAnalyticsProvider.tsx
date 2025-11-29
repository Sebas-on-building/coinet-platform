/**
 * Atomic ButtonAnalyticsProvider for Coinet
 * Analytics context provider for Button (event tracking, etc.)
 * Extensible, accessible, and beautiful
 */
import React, { createContext, useContext } from 'react';

export interface ButtonAnalyticsProviderProps {
  children: React.ReactNode;
  trackEvent?: (event: string, data?: Record<string, any>) => void;
}

const ButtonAnalyticsContext = createContext<{ trackEvent?: (event: string, data?: Record<string, any>) => void }>({});

export const ButtonAnalyticsProvider: React.FC<ButtonAnalyticsProviderProps> = ({ children, trackEvent }) => (
  <ButtonAnalyticsContext.Provider value={{ trackEvent }}>
    {children}
  </ButtonAnalyticsContext.Provider>
);

export function useButtonAnalytics() {
  return useContext(ButtonAnalyticsContext);
} 