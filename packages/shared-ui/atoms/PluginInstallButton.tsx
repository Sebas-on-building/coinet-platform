import React from 'react';
import tokens from 'src/design-system/tokens';

export type PluginInstallState = 'install' | 'uninstall' | 'update' | 'loading' | 'success';

export interface PluginInstallButtonProps {
  state: PluginInstallState;
  onClick: () => void;
  disabled?: boolean;
  theme?: 'light' | 'dark';
}

export const PluginInstallButton: React.FC<PluginInstallButtonProps> = ({ state, onClick, disabled, theme = 'light' }) => {
  const label =
    state === 'install' ? 'Install' :
      state === 'uninstall' ? 'Uninstall' :
        state === 'update' ? 'Update' :
          state === 'loading' ? 'Installing…' :
            state === 'success' ? 'Installed' : '';
  let background = tokens.colors.accent.blue[theme];
  if (state === 'success') background = tokens.colors.success[theme];
  if (state === 'uninstall') background = tokens.colors.error[theme];
  return (
    <button
      onClick={onClick}
      disabled={disabled || state === 'loading' || state === 'success'}
      style={{
        padding: tokens.spacing.xs,
        borderRadius: tokens.radius.sm,
        background,
        color: tokens.colors.text[theme],
        fontWeight: 600,
        fontSize: tokens.typography.fontSize.sm,
        boxShadow: tokens.shadows.xs,
        minWidth: 80,
        transition: `background ${tokens.motion.duration.short}`,
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
        outline: 'none',
        border: 'none',
        position: 'relative',
      }}
      aria-label={label}
    >
      {state === 'loading' ? <span className="spinner" /> : null}
      {state === 'success' ? <span role="img" aria-label="Installed">✅</span> : null}
      {label}
    </button>
  );
}; 