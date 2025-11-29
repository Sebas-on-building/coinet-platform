/**
 * Atomic ButtonEventLog for Coinet
 * Event log for Button (analytics, compliance, etc.)
 * Extensible, accessible, and beautiful
 */
import React from 'react';

export interface ButtonEvent {
  type: string;
  timestamp: number;
  meta?: any;
}

export interface ButtonEventLogProps {
  events: ButtonEvent[];
  onClear?: () => void;
  className?: string;
  style?: React.CSSProperties;
}

export const ButtonEventLog: React.FC<ButtonEventLogProps> = ({ events, onClear, className, style }) => (
  <div className={["co-btn-event-log", className].filter(Boolean).join(' ')} style={{ background: 'var(--color-surface)', borderRadius: 8, boxShadow: 'var(--shadow-xs)', padding: 8, marginTop: 8, maxHeight: 90, overflowY: 'auto', fontSize: 13, ...style }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
      <span style={{ fontWeight: 700 }}>Event Log</span>
      <button aria-label="Clear event log" onClick={onClear} style={{ background: 'none', border: 'none', color: 'var(--color-error)', fontSize: 13, cursor: 'pointer' }}>Clear</button>
    </div>
    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
      {events.map((e, i) => (
        <li key={i} style={{ marginBottom: 2 }}>
          <span style={{ color: 'var(--color-text-secondary)' }}>{new Date(e.timestamp).toLocaleTimeString()}:</span> {e.type}
        </li>
      ))}
    </ul>
  </div>
); 