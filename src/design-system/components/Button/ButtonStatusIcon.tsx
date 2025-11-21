/**
 * ButtonStatusIcon – Atomic icon for status (Coinet)
 * Extensible, accessible, themeable
 */
import React from 'react';

export interface ButtonStatusIconProps {
  status: string;
  icon?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Atomic ButtonStatusIcon for status indication
 */
export const ButtonStatusIcon: React.FC<ButtonStatusIconProps> = ({
  status,
  icon,
  className,
  style,
}) => {
  // Default icons for status
  const icons: Record<string, React.ReactNode> = {
    success: <svg width="12" height="12" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="10" fill="var(--color-success)" /><path d="M6 10l3 3 5-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>,
    warning: <svg width="12" height="12" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="10" fill="var(--color-warning)" /><path d="M10 6v4m0 4h.01" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>,
    error: <svg width="12" height="12" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="10" fill="var(--color-error)" /><path d="M7 7l6 6m0-6l-6 6" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>,
    info: <svg width="12" height="12" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="10" fill="var(--color-info)" /><path d="M10 8v4m0-6h.01" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>,
    loading: <svg width="12" height="12" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="10" fill="var(--color-accent-blue)" opacity="0.2" /><path d="M18 10a8 8 0 1 1-8-8" stroke="var(--color-accent-blue)" strokeWidth="2" fill="none" /></svg>,
    custom: icon,
  };
  return (
    <span
      className={["co-btn-status-icon", className].filter(Boolean).join(' ')}
      style={{ display: 'inline-flex', alignItems: 'center', ...style }}
      aria-hidden="true"
    >
      {icons[status] || icon}
    </span>
  );
}; 