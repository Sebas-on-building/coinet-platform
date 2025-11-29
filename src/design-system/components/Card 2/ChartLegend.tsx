import React, { useState } from 'react';

export interface ChartLegendProps {
  items: { label: string; color: string; visible?: boolean }[];
  onToggle?: (index: number) => void;
  onColorChange?: (index: number, color: string) => void;
  onReorder?: (newOrder: number[]) => void;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}

export const ChartLegend: React.FC<ChartLegendProps> & {
  Item: typeof ChartLegendItem;
  ColorPicker: typeof ChartLegendColorPicker;
  ContextMenu: typeof ChartLegendContextMenu;
  ExportShare: typeof ChartLegendExportShare;
  PinButton: typeof ChartLegendPinButton;
  UndoRedo: typeof ChartLegendUndoRedo;
  EventLog: typeof ChartLegendEventLog;
} = ({ items, onToggle, onColorChange, className, style, children }) => {
  return (
    <div className={["co-chart-legend", className].filter(Boolean).join(' ')} style={{ display: 'flex', alignItems: 'center', gap: 16, ...style }}>
      {items.map((item, i) => (
        <ChartLegendItem
          key={i}
          label={item.label}
          color={item.color}
          visible={item.visible}
          onToggle={() => onToggle?.(i)}
          onColorChange={color => onColorChange?.(i, color)}
        />
      ))}
      {children}
    </div>
  );
};

export interface ChartLegendItemProps {
  label: string;
  color: string;
  visible?: boolean;
  onToggle?: () => void;
  onColorChange?: (color: string) => void;
}

export const ChartLegendItem: React.FC<ChartLegendItemProps> = ({ label, color, visible = true, onToggle, onColorChange }) => {
  const [pickerOpen, setPickerOpen] = useState(false);
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 8, opacity: visible ? 1 : 0.5, cursor: 'pointer', userSelect: 'none' }}>
      <span
        role="button"
        aria-label={`Toggle ${label}`}
        tabIndex={0}
        onClick={onToggle}
        onKeyPress={e => (e.key === 'Enter' || e.key === ' ') && onToggle?.()}
        style={{ width: 18, height: 18, borderRadius: 6, background: color, border: '2px solid var(--color-border)', marginRight: 6, boxShadow: 'var(--shadow-xs)' }}
      />
      <span style={{ fontWeight: 600, fontSize: 14 }}>{label}</span>
      <button
        aria-label={`Change color for ${label}`}
        style={{ background: 'none', border: 'none', marginLeft: 4, cursor: 'pointer' }}
        onClick={() => setPickerOpen(v => !v)}
      >🎨</button>
      {pickerOpen && <ChartLegendColorPicker color={color} onChange={onColorChange} onClose={() => setPickerOpen(false)} />}
    </span>
  );
};

export interface ChartLegendColorPickerProps {
  color: string;
  onChange?: (color: string) => void;
  onClose?: () => void;
}

export const ChartLegendColorPicker: React.FC<ChartLegendColorPickerProps> = ({ color, onChange, onClose }) => {
  const colors = [
    '#2563eb', '#9333ea', '#22c55e', '#ec4899', '#eab308', '#ef4444', '#0ea5e9', '#64748b', '#18181b', '#f8fafc'
  ];
  return (
    <div style={{ position: 'absolute', zIndex: 100, background: 'var(--color-surface)', borderRadius: 8, boxShadow: 'var(--shadow-lg)', padding: 8, display: 'flex', gap: 6 }}>
      {colors.map(c => (
        <button
          key={c}
          aria-label={`Pick color ${c}`}
          style={{ width: 20, height: 20, borderRadius: 6, background: c, border: c === color ? '2px solid var(--color-primary)' : '2px solid var(--color-border)', cursor: 'pointer' }}
          onClick={() => { onChange?.(c); onClose?.(); }}
        />
      ))}
    </div>
  );
};

export const ChartLegendContextMenu: React.FC = () => null; // TODO: Implement context menu
export const ChartLegendExportShare: React.FC = () => null; // TODO: Implement export/share
export const ChartLegendPinButton: React.FC = () => null; // TODO: Implement pin button
export const ChartLegendUndoRedo: React.FC = () => null; // TODO: Implement undo/redo
export const ChartLegendEventLog: React.FC = () => null; // TODO: Implement event log

ChartLegend.Item = ChartLegendItem;
ChartLegend.ColorPicker = ChartLegendColorPicker;
ChartLegend.ContextMenu = ChartLegendContextMenu;
ChartLegend.ExportShare = ChartLegendExportShare;
ChartLegend.PinButton = ChartLegendPinButton;
ChartLegend.UndoRedo = ChartLegendUndoRedo;
ChartLegend.EventLog = ChartLegendEventLog; 