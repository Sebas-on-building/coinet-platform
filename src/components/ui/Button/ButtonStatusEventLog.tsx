/**
 * ButtonStatusEventLog – Atomic event log for status changes (Coinet)
 * Extensible, accessible, analytics/compliance-ready
 */
import React from 'react';

export interface ButtonStatusEventLogProps {
  status: string;
  event: string;
  timestamp?: number;
  meta?: Record<string, any>;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Atomic ButtonStatusEventLog for logging status events
 */
export const ButtonStatusEventLog: React.FC<ButtonStatusEventLogProps> = ({
  status,
  event,
  timestamp = Date.now(),
  meta,
  className,
  style,
}) => (
  <div
    className={["co-btn-status-event-log", className].filter(Boolean).join(' ')}
    style={{
      fontSize: 12,
      color: 'var(--color-text-secondary)',
      padding: '2px 0',
      ...style,
    }}
    aria-live="polite"
    role="log"
  >
    <span style={{ fontWeight: 700 }}>{event}</span> for <span style={{ color: 'var(--color-status-' + status + ')', fontWeight: 700 }}>{status}</span> at {new Date(timestamp).toLocaleTimeString()}
    {/* TODO: Integrate analytics/compliance hooks, export/share, filter/search */}
    {meta && <pre style={{ fontSize: 10, margin: 0 }}>{JSON.stringify(meta, null, 2)}</pre>}
  </div>
); 