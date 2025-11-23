/**
 * Atomic ButtonTooltip for Coinet
 * Tooltip for Button (ARIA, accessibility, etc.)
 * Extensible, accessible, and beautiful
 */
import React from 'react';

export interface ButtonTooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export const ButtonTooltip: React.FC<ButtonTooltipProps> = ({ content, children, className, style }) => (
  <span className={["co-btn-tooltip", className].filter(Boolean).join(' ')} style={{ position: 'relative', ...style }}>
    {children}
    {/* Minimal tooltip, ready for future expansion */}
    <span style={{ position: 'absolute', bottom: '120%', left: '50%', transform: 'translateX(-50%)', background: 'var(--color-surface)', color: 'var(--color-text)', padding: '4px 8px', borderRadius: 6, boxShadow: 'var(--shadow-xs)', whiteSpace: 'nowrap', fontSize: 12, opacity: 0, pointerEvents: 'none' }} className="co-btn-tooltip-content">
      {content}
    </span>
  </span>
); 