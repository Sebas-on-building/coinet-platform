/// <reference types="react" />
/**
 * ButtonExportShare – Atomic export/share button for Coinet
 * Inspired by Apple, Canva, TradingView, Solana
 * Supports: export/share menu, CSV, PDF, JSON, Web Share API, clipboard, QR, social, custom
 * ARIA, micro-interactions, themeable, extensible
 * Sub-features: ExportMenu, ExportOption, ShareMenu, ShareOption, ExportPreview, ExportAnalytics, ExportCompliance, ExportEventLog
 */
import React, { useState } from 'react';
import clsx from 'clsx';
import { ButtonExportMenu } from './ButtonExportMenu';
import { ButtonExportOption } from './ButtonExportOption';
import { ButtonShareMenu } from './ButtonShareMenu';
import { ButtonShareOption } from './ButtonShareOption';
import { ButtonExportPreview } from './ButtonExportPreview';
import { ButtonExportAnalytics } from './ButtonExportAnalytics';
import { ButtonExportCompliance } from './ButtonExportCompliance';
import { ButtonExportEventLog } from './ButtonExportEventLog';

export interface ButtonExportShareProps {
  data: any;
  className?: string;
  style?: React.CSSProperties;
  'aria-label'?: string;
}

/**
 * Atomic ButtonExportShare for exporting/sharing data
 */
export const ButtonExportShare: React.FC<ButtonExportShareProps> = ({
  data,
  className,
  style,
  'aria-label': ariaLabel,
}) => {
  const [open, setOpen] = useState(false);
  return (
    <div className={clsx('co-btn-export-share', className)} style={{ display: 'inline-block', position: 'relative', ...style }}>
      <button
        className="co-btn-export-share-btn"
        aria-label={ariaLabel || 'Export/Share'}
        onClick={() => setOpen(v => !v)}
        style={{
          background: 'var(--color-accent-blue)',
          color: '#fff',
          border: 'none',
          borderRadius: 8,
          padding: '8px 16px',
          fontWeight: 700,
          fontSize: 15,
          boxShadow: 'var(--shadow-md)',
          cursor: 'pointer',
          transition: 'background 0.2s, box-shadow 0.2s',
        }}
      >
        <span style={{ marginRight: 6, fontWeight: 900 }}>⤓</span> Export/Share
      </button>
      {open && (
        <ButtonExportMenu data={data} onClose={() => setOpen(false)} />
      )}
      {/* TODO: Add micro-interactions, analytics, compliance hooks, confetti */}
    </div>
  );
};

export { ButtonExportMenu, ButtonExportOption, ButtonShareMenu, ButtonShareOption, ButtonExportPreview, ButtonExportAnalytics, ButtonExportCompliance, ButtonExportEventLog }; 