import React from 'react';
import clsx from 'clsx';

export interface ErrorMessageProps {
  message: string;
  code?: string | number;
  onRetry?: () => void;
  theme?: 'light' | 'dark';
  className?: string;
  style?: React.CSSProperties;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({ message, code, onRetry, theme = 'light', className, style }) => (
  <div
    className={clsx('co-errormessage', `co-errormessage-${theme}`, className)}
    role="alert"
    aria-live="assertive"
    style={style}
  >
    <span className="co-errormessage-icon" aria-hidden="true">⚠️</span>
    <span className="co-errormessage-text">{message}</span>
    {code && <span className="co-errormessage-code">(Error {code})</span>}
    {onRetry && (
      <button className="co-errormessage-retry" onClick={onRetry} aria-label="Retry">Retry</button>
    )}
  </div>
); 