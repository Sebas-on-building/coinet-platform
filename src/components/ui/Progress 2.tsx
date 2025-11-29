import React, { useEffect, useState, useRef } from "react";
import { cn } from "@/lib/utils";

/**
 * Progress component
 * - Features: ARIA role, analytics event on mount, a11y, microinteractions
 */
export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number;
  max?: number;
  className?: string;
  analyticsEvent?: string; // Analytics event name
  children?: React.ReactNode;
}

export const Progress: React.FC<ProgressProps> & {
  Circular: typeof ProgressCircular;
  Segmented: typeof ProgressSegmented;
  Label: typeof ProgressLabel;
  Confetti: typeof ProgressConfetti;
  ContextMenu: typeof ProgressContextMenu;
  ExportShare: typeof ProgressExportShare;
  PinButton: typeof ProgressPinButton;
  UndoRedo: typeof ProgressUndoRedo;
  EventLog: typeof ProgressEventLog;
} = ({ value, max = 100, className, analyticsEvent, children, ...props }) => {
  useEffect(() => {
    if (analyticsEvent && (window as any)?.gtag) {
      (window as any).gtag("event", analyticsEvent, { label: "Progress" });
    }
  }, [analyticsEvent]);

  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div
      className={cn(
        "h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700",
        className,
      )}
      role="progressbar"
      aria-label="Progress bar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      {...props}
    >
      <div
        className="h-full bg-primary transition-all duration-300 ease-in-out dark:bg-primary"
        style={{ width: `${percentage}%` }}
      />
      {children}
    </div>
  );
};

export interface ProgressCircularProps {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
  style?: React.CSSProperties;
  ariaLabel?: string;
}

export const ProgressCircular: React.FC<ProgressCircularProps> = ({ value, max = 100, size = 48, strokeWidth = 6, className, style, ariaLabel }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(100, Math.max(0, (value / max) * 100));
  const offset = circumference - (progress / 100) * circumference;
  return (
    <svg width={size} height={size} className={className} style={style} aria-label={ariaLabel || "Circular progress"}>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke="var(--color-border)"
        strokeWidth={strokeWidth}
        fill="none"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke="var(--color-primary)"
        strokeWidth={strokeWidth}
        fill="none"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.5s cubic-bezier(0.4,0,0.2,1)' }}
      />
    </svg>
  );
};

export interface ProgressSegmentedProps {
  value: number;
  max?: number;
  segments?: number;
  className?: string;
  style?: React.CSSProperties;
}

export const ProgressSegmented: React.FC<ProgressSegmentedProps> = ({ value, max = 100, segments = 5, className, style }) => {
  const active = Math.round((value / max) * segments);
  return (
    <div className={cn("flex gap-1", className)} style={style} aria-label="Segmented progress">
      {Array.from({ length: segments }).map((_, i) => (
        <div
          key={i}
          style={{ flex: 1, height: 8, borderRadius: 4, background: i < active ? 'var(--color-primary)' : 'var(--color-border)', transition: 'background 0.3s' }}
        />
      ))}
    </div>
  );
};

export interface ProgressLabelProps {
  value: number;
  max?: number;
  format?: (value: number, max: number) => React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export const ProgressLabel: React.FC<ProgressLabelProps> = ({ value, max = 100, format, className, style }) => (
  <span className={className} style={style} aria-live="polite">
    {format ? format(value, max) : `${Math.round((value / max) * 100)}%`}
  </span>
);

export const ProgressConfetti: React.FC<{ trigger: boolean }> = ({ trigger }) => {
  // TODO: Integrate with ConfettiBurst or similar
  return trigger ? <span aria-live="polite">🎉</span> : null;
};

export const ProgressContextMenu: React.FC<{ actions?: { label: string; onClick: () => void; icon?: React.ReactNode }[] }> = ({ actions = [] }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div style={{ position: 'relative', display: 'inline-block' }} ref={ref}>
      <button
        aria-label="Open progress menu"
        onClick={e => { e.stopPropagation(); setOpen(v => !v); }}
        style={{ background: 'none', border: 'none', color: 'var(--color-text-secondary)', fontSize: 16, marginLeft: 2, cursor: 'pointer' }}
      >⋮</button>
      {open && (
        <div style={{ position: 'absolute', top: 22, right: 0, background: 'var(--color-surface)', borderRadius: 8, boxShadow: 'var(--shadow-lg)', zIndex: 100, minWidth: 100 }}>
          {actions.map((a, i) => (
            <button key={i} onClick={a.onClick} style={{ display: 'flex', alignItems: 'center', width: '100%', background: 'none', border: 'none', padding: '6px 12px', color: 'var(--color-text)', fontSize: 14, cursor: 'pointer' }}>
              {a.icon && <span style={{ marginRight: 8 }}>{a.icon}</span>}{a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export const ProgressExportShare: React.FC<{ onExport?: () => void; onShare?: () => void }> = ({ onExport, onShare }) => (
  <span style={{ display: 'inline-flex', gap: 2, marginLeft: 2 }}>
    <button aria-label="Export progress" onClick={e => { e.stopPropagation(); onExport?.(); }} style={{ background: 'none', border: 'none', color: 'var(--color-info)', fontSize: 14, cursor: 'pointer' }}>⤓</button>
    <button aria-label="Share progress" onClick={e => { e.stopPropagation(); onShare?.(); }} style={{ background: 'none', border: 'none', color: 'var(--color-accent-blue)', fontSize: 14, cursor: 'pointer' }}>🔗</button>
  </span>
);

export const ProgressPinButton: React.FC<{ pinned?: boolean; onToggle?: (pinned: boolean) => void }> = ({ pinned, onToggle }) => (
  <button
    aria-label={pinned ? 'Unpin progress' : 'Pin progress'}
    onClick={e => { e.stopPropagation(); onToggle?.(!pinned); }}
    style={{ background: 'none', border: 'none', color: pinned ? 'var(--color-warning)' : 'var(--color-text-secondary)', fontSize: 14, marginLeft: 2, cursor: 'pointer', transition: 'color 0.2s' }}
  >
    {pinned ? '📌' : '📍'}
  </button>
);

export const ProgressUndoRedo: React.FC<{ canUndo?: boolean; canRedo?: boolean; onUndo?: () => void; onRedo?: () => void }> = ({ canUndo, canRedo, onUndo, onRedo }) => (
  <span style={{ display: 'inline-flex', gap: 1, marginLeft: 2 }}>
    <button aria-label="Undo" onClick={e => { e.stopPropagation(); onUndo?.(); }} disabled={!canUndo} style={{ background: 'none', border: 'none', color: canUndo ? 'var(--color-primary)' : 'var(--color-border)', fontSize: 13, cursor: canUndo ? 'pointer' : 'not-allowed' }}>↺</button>
    <button aria-label="Redo" onClick={e => { e.stopPropagation(); onRedo?.(); }} disabled={!canRedo} style={{ background: 'none', border: 'none', color: canRedo ? 'var(--color-primary)' : 'var(--color-border)', fontSize: 13, cursor: canRedo ? 'pointer' : 'not-allowed' }}>↻</button>
  </span>
);

export interface ProgressEvent {
  type: string;
  timestamp: number;
  meta?: any;
}

export const ProgressEventLog: React.FC<{ events: ProgressEvent[]; onClear?: () => void }> = ({ events, onClear }) => (
  <div style={{ background: 'var(--color-surface)', borderRadius: 8, boxShadow: 'var(--shadow-xs)', padding: 6, marginTop: 6, maxHeight: 80, overflowY: 'auto', fontSize: 12 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
      <span style={{ fontWeight: 700 }}>Event Log</span>
      <button aria-label="Clear event log" onClick={onClear} style={{ background: 'none', border: 'none', color: 'var(--color-error)', fontSize: 12, cursor: 'pointer' }}>Clear</button>
    </div>
    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
      {events.map((e, i) => (
        <li key={i} style={{ marginBottom: 1 }}>
          <span style={{ color: 'var(--color-text-secondary)' }}>{new Date(e.timestamp).toLocaleTimeString()}:</span> {e.type}
        </li>
      ))}
    </ul>
  </div>
);

Progress.Circular = ProgressCircular;
Progress.Segmented = ProgressSegmented;
Progress.Label = ProgressLabel;
Progress.Confetti = ProgressConfetti;
Progress.ContextMenu = ProgressContextMenu;
Progress.ExportShare = ProgressExportShare;
Progress.PinButton = ProgressPinButton;
Progress.UndoRedo = ProgressUndoRedo;
Progress.EventLog = ProgressEventLog;
export default Progress;
