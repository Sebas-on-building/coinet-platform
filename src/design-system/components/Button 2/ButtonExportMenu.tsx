/**
 * ButtonExportMenu – Atomic export/share menu for Coinet
 * Extensible, accessible, themeable
 */
import React from 'react';
import { ButtonExportOption } from './ButtonExportOption';
import { ButtonShareMenu } from './ButtonShareMenu';

export interface ButtonExportMenuProps {
  data: any;
  onClose: () => void;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Atomic ButtonExportMenu for export/share options
 */
export const ButtonExportMenu: React.FC<ButtonExportMenuProps> = ({
  data,
  onClose,
  className,
  style,
}) => (
  <div
    className={["co-btn-export-menu", className].filter(Boolean).join(' ')}
    style={{
      position: 'absolute',
      top: 40,
      right: 0,
      background: 'var(--color-surface)',
      borderRadius: 10,
      boxShadow: 'var(--shadow-lg)',
      zIndex: 100,
      minWidth: 180,
      padding: 12,
      ...style,
    }}
    role="menu"
    aria-label="Export/Share Menu"
  >
    <ButtonExportOption type="csv" data={data} onClose={onClose} />
    <ButtonExportOption type="pdf" data={data} onClose={onClose} />
    <ButtonExportOption type="json" data={data} onClose={onClose} />
    <ButtonShareMenu data={data} onClose={onClose} />
    <button onClick={onClose} style={{ marginTop: 10, borderRadius: 8, padding: '6px 12px', fontWeight: 700, background: 'var(--color-border)', color: 'var(--color-text)', border: 'none', cursor: 'pointer' }}>Close</button>
  </div>
); 