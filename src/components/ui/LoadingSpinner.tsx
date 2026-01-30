import React from 'react';
import { useTheme } from '../../../packages/shared-ui/themes/useTheme';

const LoadingSpinner: React.FC = () => {
  const { colors } = useTheme();
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
    >
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none" aria-hidden="true">
        <circle cx="24" cy="24" r="20" stroke={colors.primary} strokeWidth="6" opacity="0.2" />
        <path d="M44 24c0-11.046-8.954-20-20-20" stroke={colors.primary} strokeWidth="6" strokeLinecap="round">
          <animateTransform attributeName="transform" type="rotate" from="0 24 24" to="360 24 24" dur="0.8s" repeatCount="indefinite" />
        </path>
      </svg>
      <span style={{ marginLeft: 16, color: colors.primary, fontWeight: 500, fontSize: 18 }}>Loading…</span>
    </div>
  );
};

export { LoadingSpinner };
export default LoadingSpinner;
