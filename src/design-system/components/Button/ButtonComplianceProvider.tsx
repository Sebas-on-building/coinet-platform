/**
 * Atomic ButtonComplianceProvider for Coinet
 * Compliance context provider for Button (event tracking, GDPR, etc.)
 * Extensible, accessible, and beautiful
 */
import React, { createContext, useContext } from 'react';

export interface ButtonComplianceProviderProps {
  children: React.ReactNode;
  trackComplianceEvent?: (event: string, data?: Record<string, any>) => void;
}

const ButtonComplianceContext = createContext<{ trackComplianceEvent?: (event: string, data?: Record<string, any>) => void }>({});

export const ButtonComplianceProvider: React.FC<ButtonComplianceProviderProps> = ({ children, trackComplianceEvent }) => (
  <ButtonComplianceContext.Provider value={{ trackComplianceEvent }}>
    {children}
  </ButtonComplianceContext.Provider>
);

export function useButtonCompliance() {
  return useContext(ButtonComplianceContext);
} 