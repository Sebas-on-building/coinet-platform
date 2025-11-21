/**
 * ButtonExportPreview – Atomic export preview for Coinet
 * Extensible, accessible, themeable
 */
import React from 'react';

export interface ButtonExportPreviewProps {
  type: 'csv' | 'pdf' | 'json';
  data: any;
  onClose: () => void;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Atomic ButtonExportPreview for export preview
 */
export const ButtonExportPreview: React.FC<ButtonExportPreviewProps> = ({
  type,
  data,
  onClose,
  className,
  style,
}) => (
  <div
    className={["co-btn-export-preview", className].filter(Boolean).join(' ')}
    style={{
      background: 'var(--color-surface)',
      borderRadius: 10,
      boxShadow: 'var(--shadow-lg)',
      padding: 16,
      minWidth: 240,
      minHeight: 120,
      ...style,
    }}
    role="dialog"
    aria-label={`Preview ${type.toUpperCase()}`}
  >
    <div style={{ fontWeight: 700, marginBottom: 8 }}>Preview {type.toUpperCase()}</div>
    <pre style={{ fontSize: 13, maxHeight: 120, overflow: 'auto', background: 'var(--color-background)', borderRadius: 6, padding: 8 }}>
      {/* TODO: Render preview for each type */}
      {type === 'csv' && 'CSV preview here...'}
      {type === 'pdf' && 'PDF preview not available inline.'}
      {type === 'json' && JSON.stringify(data, null, 2)}
    </pre>
    <button onClick={onClose} style={{ marginTop: 10, borderRadius: 8, padding: '6px 12px', fontWeight: 700, background: 'var(--color-border)', color: 'var(--color-text)', border: 'none', cursor: 'pointer' }}>Close</button>
  </div>
); 