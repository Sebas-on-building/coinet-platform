import React, { useState } from 'react';
import { useTheme } from '../../../packages/shared-ui/themes/useTheme';

export interface ErrorMessageProps {
  message: string;
  onRetry?: () => void;
  details?: string;
  onReport?: () => void;
}

const ErrorMessage: React.FC<ErrorMessageProps> = ({ message, onRetry, details, onReport }) => {
  const { colors, radii, spacing, typography, shadows } = useTheme();
  const [showDetails, setShowDetails] = useState(false);
  return (
    <div
      role="alert"
      style={{
        background: colors.error,
        color: colors.text,
        borderRadius: radii.md,
        boxShadow: shadows.md,
        padding: spacing.md,
        display: 'flex',
        gap: spacing.md,
        fontWeight: typography.fontWeightBold,
        fontSize: typography.body.fontSize,
        margin: `${spacing.md}px 0`,
        animation: 'fadeIn 0.5s',
        flexDirection: 'column',
        alignItems: 'flex-start',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
        <svg width="24" height="24" fill="none" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="12" fill="#FF1744" />
          <path d="M12 7v5" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
          <circle cx="12" cy="16" r="1" fill="#fff" />
        </svg>
        <span>{message}</span>
      </div>
      <div style={{ display: 'flex', gap: spacing.sm, marginTop: spacing.sm }}>
        {onRetry && (
          <button
            onClick={onRetry}
            style={{
              background: colors.surface,
              color: colors.error,
              border: 'none',
              borderRadius: radii.sm,
              padding: `${spacing.xs}px ${spacing.md}px`,
              fontWeight: typography.fontWeightMedium,
              cursor: 'pointer',
              boxShadow: shadows.sm,
              transition: 'background 0.2s',
            }}
          >
            Retry
          </button>
        )}
        {details && (
          <button
            onClick={() => setShowDetails(v => !v)}
            style={{
              background: 'transparent',
              color: colors.text,
              border: 'none',
              borderRadius: radii.sm,
              padding: `${spacing.xs}px ${spacing.md}px`,
              fontWeight: typography.fontWeightMedium,
              cursor: 'pointer',
              textDecoration: 'underline',
            }}
          >
            {showDetails ? 'Hide Details' : 'Show Details'}
          </button>
        )}
        {onReport && (
          <button
            onClick={onReport}
            style={{
              background: colors.accent,
              color: colors.text,
              border: 'none',
              borderRadius: radii.sm,
              padding: `${spacing.xs}px ${spacing.md}px`,
              fontWeight: typography.fontWeightMedium,
              cursor: 'pointer',
              boxShadow: shadows.sm,
              transition: 'background 0.2s',
            }}
          >
            Report
          </button>
        )}
      </div>
      {showDetails && details && (
        <pre style={{
          background: colors.surface,
          color: colors.textSecondary,
          borderRadius: radii.sm,
          padding: spacing.sm,
          marginTop: spacing.sm,
          fontSize: 13,
          maxWidth: 600,
          overflowX: 'auto',
        }}>{details}</pre>
      )}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: none; }
        }
      `}</style>
    </div>
  );
};

export default ErrorMessage; 