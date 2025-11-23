import React from 'react';
import { tokens } from 'design-tokens/tokens';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  helperText?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ error, helperText, ...props }, ref) => (
    <div className="co-input-wrapper">
      <input
        ref={ref}
        {...props}
        className={`co-input${error ? ' co-input-error' : ''}`}
        style={{
          padding: tokens.spacing.sm,
          borderRadius: tokens.radius.md,
          border: `1.5px solid ${error ? tokens.colors.danger : tokens.colors.border}`,
          background: tokens.colors.surface,
          color: tokens.colors.text,
          fontSize: tokens.typography.fontSize.md,
          outline: 'none',
          boxShadow: tokens.shadows.xs,
          transition: tokens.motion.normal,
          ...props.style,
        }}
        aria-invalid={error}
        aria-describedby={helperText ? 'input-helper' : undefined}
      />
      {helperText && (
        <p id="input-helper" className="co-input-helper" style={{ color: error ? tokens.colors.danger : tokens.colors.muted, fontSize: tokens.typography.fontSize.sm }}>
          {helperText}
        </p>
      )}
    </div>
  )
);
Input.displayName = 'Input'; 