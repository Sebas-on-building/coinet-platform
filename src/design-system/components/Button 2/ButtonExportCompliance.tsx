/**
 * ButtonExportCompliance – Atomic compliance logger for export/share (Coinet)
 * Extensible, accessible, themeable
 */
import React from 'react';

export interface ButtonExportComplianceProps {
  event?: string;
  data?: any;
  meta?: Record<string, any>;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Atomic ButtonExportCompliance for compliance logging (stub)
 */
export const ButtonExportCompliance: React.FC<ButtonExportComplianceProps> = ({
  event,
  data,
  meta,
  className,
  style,
}) => (
  <div
    className={["co-btn-export-compliance", className].filter(Boolean).join(' ')}
    style={{ fontSize: 12, color: 'var(--color-text-secondary)', ...style }}
    aria-live="polite"
    role="log"
  >
    Compliance event: <span style={{ fontWeight: 700 }}>{event}</span>
    {meta && <pre style={{ fontSize: 10, margin: 0 }}>{JSON.stringify(meta, null, 2)}</pre>}
  </div>
); 