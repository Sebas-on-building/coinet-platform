import React, { useState, useRef } from 'react';

export interface StepperProps {
  steps: StepperStepProps[];
  activeStep?: number;
  onStepChange?: (step: number) => void;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}

export interface StepperStepProps {
  id: string | number;
  label?: React.ReactNode;
  content?: React.ReactNode;
  completed?: boolean;
  active?: boolean;
  actions?: React.ReactNode;
  onPin?: (pinned: boolean) => void;
  pinned?: boolean;
}

export const Stepper: React.FC<StepperProps> & {
  Step: typeof StepperStep;
  Indicator: typeof StepperIndicator;
  Label: typeof StepperLabel;
  Content: typeof StepperContent;
  Actions: typeof StepperActions;
  ContextMenu: typeof StepperContextMenu;
  ExportShare: typeof StepperExportShare;
  PinButton: typeof StepperPinButton;
  UndoRedo: typeof StepperUndoRedo;
  EventLog: typeof StepperEventLog;
} = ({ steps, activeStep = 0, onStepChange, className, style, children }) => (
  <div className={["co-stepper", className].filter(Boolean).join(' ')} style={{ display: 'flex', flexDirection: 'column', gap: 0, ...style }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
      {steps.map((step, i) => (
        <StepperStep key={step.id} {...step} active={i === activeStep} completed={i < activeStep} />
      ))}
    </div>
    {steps[activeStep]?.content && <StepperContent>{steps[activeStep].content}</StepperContent>}
    {steps[activeStep]?.actions && <StepperActions>{steps[activeStep].actions}</StepperActions>}
    {children}
  </div>
);

export const StepperStep: React.FC<StepperStepProps> = ({ id, label, completed, active, actions, pinned, onPin }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, position: 'relative', minWidth: 64, padding: '0 8px' }}>
    <StepperIndicator completed={completed} active={active} />
    {label && <StepperLabel>{label}</StepperLabel>}
    {actions && <StepperActions>{actions}</StepperActions>}
    <StepperPinButton pinned={pinned} onToggle={onPin} />
  </div>
);

export const StepperIndicator: React.FC<{ completed?: boolean; active?: boolean }> = ({ completed, active }) => (
  <span style={{ width: 22, height: 22, borderRadius: '50%', background: completed ? 'var(--color-success)' : active ? 'var(--color-primary)' : 'var(--color-border)', border: active ? '3px solid var(--color-primary)' : '2px solid var(--color-border)', boxShadow: active ? '0 0 0 4px var(--color-primary)' : 'none', display: 'inline-block', marginBottom: 4, transition: 'all 0.2s' }} />
);

export const StepperLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 2 }}>{children}</div>
);

export const StepperContent: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ fontSize: 15, color: 'var(--color-text-secondary)', margin: '16px 0' }}>{children}</div>
);

export const StepperActions: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>{children}</div>
);

export const StepperContextMenu: React.FC<{ actions?: { label: string; onClick: () => void; icon?: React.ReactNode }[] }> = ({ actions = [] }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div style={{ position: 'relative', display: 'inline-block' }} ref={ref}>
      <button
        aria-label="Open stepper menu"
        onClick={e => { e.stopPropagation(); setOpen(v => !v); }}
        style={{ background: 'none', border: 'none', color: 'var(--color-text-secondary)', fontSize: 15, marginLeft: 2, cursor: 'pointer' }}
      >⋮</button>
      {open && (
        <div style={{ position: 'absolute', top: 20, right: 0, background: 'var(--color-surface)', borderRadius: 8, boxShadow: 'var(--shadow-lg)', zIndex: 100, minWidth: 90 }}>
          {actions.map((a, i) => (
            <button key={i} onClick={a.onClick} style={{ display: 'flex', alignItems: 'center', width: '100%', background: 'none', border: 'none', padding: '5px 10px', color: 'var(--color-text)', fontSize: 13, cursor: 'pointer' }}>
              {a.icon && <span style={{ marginRight: 7 }}>{a.icon}</span>}{a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export const StepperExportShare: React.FC<{ onExport?: () => void; onShare?: () => void }> = ({ onExport, onShare }) => (
  <span style={{ display: 'inline-flex', gap: 2, marginLeft: 2 }}>
    <button aria-label="Export stepper" onClick={e => { e.stopPropagation(); onExport?.(); }} style={{ background: 'none', border: 'none', color: 'var(--color-info)', fontSize: 13, cursor: 'pointer' }}>⤓</button>
    <button aria-label="Share stepper" onClick={e => { e.stopPropagation(); onShare?.(); }} style={{ background: 'none', border: 'none', color: 'var(--color-accent-blue)', fontSize: 13, cursor: 'pointer' }}>🔗</button>
  </span>
);

export const StepperPinButton: React.FC<{ pinned?: boolean; onToggle?: (pinned: boolean) => void }> = ({ pinned, onToggle }) => (
  <button
    aria-label={pinned ? 'Unpin stepper' : 'Pin stepper'}
    onClick={e => { e.stopPropagation(); onToggle?.(!pinned); }}
    style={{ background: 'none', border: 'none', color: pinned ? 'var(--color-warning)' : 'var(--color-text-secondary)', fontSize: 13, marginLeft: 2, cursor: 'pointer', transition: 'color 0.2s' }}
  >
    {pinned ? '📌' : '📍'}
  </button>
);

export const StepperUndoRedo: React.FC<{ canUndo?: boolean; canRedo?: boolean; onUndo?: () => void; onRedo?: () => void }> = ({ canUndo, canRedo, onUndo, onRedo }) => (
  <span style={{ display: 'inline-flex', gap: 1, marginLeft: 2 }}>
    <button aria-label="Undo" onClick={e => { e.stopPropagation(); onUndo?.(); }} disabled={!canUndo} style={{ background: 'none', border: 'none', color: canUndo ? 'var(--color-primary)' : 'var(--color-border)', fontSize: 12, cursor: canUndo ? 'pointer' : 'not-allowed' }}>↺</button>
    <button aria-label="Redo" onClick={e => { e.stopPropagation(); onRedo?.(); }} disabled={!canRedo} style={{ background: 'none', border: 'none', color: canRedo ? 'var(--color-primary)' : 'var(--color-border)', fontSize: 12, cursor: canRedo ? 'pointer' : 'not-allowed' }}>↻</button>
  </span>
);

export interface StepperEvent {
  type: string;
  timestamp: number;
  meta?: any;
}

export const StepperEventLog: React.FC<{ events: StepperEvent[]; onClear?: () => void }> = ({ events, onClear }) => (
  <div style={{ background: 'var(--color-surface)', borderRadius: 8, boxShadow: 'var(--shadow-xs)', padding: 5, marginTop: 5, maxHeight: 70, overflowY: 'auto', fontSize: 11 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
      <span style={{ fontWeight: 700 }}>Event Log</span>
      <button aria-label="Clear event log" onClick={onClear} style={{ background: 'none', border: 'none', color: 'var(--color-error)', fontSize: 11, cursor: 'pointer' }}>Clear</button>
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

Stepper.Step = StepperStep;
Stepper.Indicator = StepperIndicator;
Stepper.Label = StepperLabel;
Stepper.Content = StepperContent;
Stepper.Actions = StepperActions;
Stepper.ContextMenu = StepperContextMenu;
Stepper.ExportShare = StepperExportShare;
Stepper.PinButton = StepperPinButton;
Stepper.UndoRedo = StepperUndoRedo;
Stepper.EventLog = StepperEventLog; 