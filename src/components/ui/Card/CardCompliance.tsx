/**
 * Atomic CardCompliance for Coinet Card system
 * Compliance/audit hook/context for Card actions (click, drag, resize, export, etc)
 * Supports export to CSV/PDF, audit trail, and compliance hooks. Extensible and documented
 */
import React, { createContext, useContext, useCallback } from 'react';

export type CardComplianceEvent =
  | { type: 'click'; cardId?: string; meta?: any }
  | { type: 'drag'; cardId?: string; meta?: any }
  | { type: 'resize'; cardId?: string; size: { width: number; height: number }; meta?: any }
  | { type: 'contextMenu'; cardId?: string; meta?: any }
  | { type: 'export'; cardId?: string; format: 'csv' | 'pdf' | 'image'; meta?: any }
  | { type: 'custom'; name: string; cardId?: string; meta?: any };

export interface CardComplianceContextValue {
  log: (event: CardComplianceEvent) => void;
  exportData?: (format: 'csv' | 'pdf' | 'image', data: any) => void;
}

const CardComplianceContext = createContext<CardComplianceContextValue>({
  log: () => { },
});

export const useCardCompliance = () => useContext(CardComplianceContext);

export const CardComplianceProvider: React.FC<{
  children: React.ReactNode;
  onEvent?: (event: CardComplianceEvent) => void;
  exportData?: (format: 'csv' | 'pdf' | 'image', data: any) => void;
}> = ({ children, onEvent, exportData }) => {
  const log = useCallback((event: CardComplianceEvent) => {
    // Integrate with audit log, compliance, or export here
    if (onEvent) onEvent(event);
    // Example: window.auditTrail?.log(event.type, event)
  }, [onEvent]);
  return (
    <CardComplianceContext.Provider value={{ log, exportData }}>
      {children}
    </CardComplianceContext.Provider>
  );
}; 