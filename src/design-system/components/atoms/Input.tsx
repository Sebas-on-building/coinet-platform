import React, { useRef } from 'react';
import clsx from 'clsx';

export type InputType = 'text' | 'password' | 'number' | 'search' | 'email' | 'url' | 'tel' | 'date' | 'time' | 'datetime-local';
export type InputVariant = 'outlined' | 'filled' | 'underlined';
export type InputSize = 'sm' | 'md' | 'lg';
export type InputState = 'default' | 'focus' | 'error' | 'disabled' | 'success';

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  type?: InputType;
  variant?: InputVariant;
  size?: InputSize;
  state?: InputState;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  clearable?: boolean;
  animated?: boolean;
  label?: string;
  helperText?: string;
  errorText?: string;
  successText?: string;
  className?: string;
  style?: React.CSSProperties;
}

export const Input: React.FC<InputProps> = ({
  type = 'text',
  variant = 'outlined',
  size = 'md',
  state = 'default',
  leftIcon,
  rightIcon,
  clearable = false,
  animated = false,
  label,
  helperText,
  errorText,
  successText,
  className,
  style,
  ...rest
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const showError = state === 'error' && !!errorText;
  const showSuccess = state === 'success' && !!successText;
  return (
    <div className={clsx('co-input-wrap', `co-input-${variant}`, `co-input-${size}`, `co-input-${state}`, animated && 'co-input-animated', className)} style={style}>
      {label && <label className="co-input-label">{label}</label>}
      <div className="co-input-inner">
        {leftIcon && <span className="co-input-icon co-input-icon-left">{leftIcon}</span>}
        <input
          ref={inputRef}
          type={type}
          className="co-input"
          aria-invalid={showError}
          aria-describedby={showError ? 'input-error' : showSuccess ? 'input-success' : helperText ? 'input-helper' : undefined}
          disabled={state === 'disabled'}
          {...rest}
        />
        {clearable && rest.value && (
          <button type="button" className="co-input-clear" onClick={() => { if (inputRef.current) inputRef.current.value = ''; inputRef.current?.focus(); }} aria-label="Clear input">×</button>
        )}
        {rightIcon && <span className="co-input-icon co-input-icon-right">{rightIcon}</span>}
      </div>
      {showError && <div id="input-error" className="co-input-error">{errorText}</div>}
      {showSuccess && <div id="input-success" className="co-input-success">{successText}</div>}
      {helperText && !showError && !showSuccess && <div id="input-helper" className="co-input-helper">{helperText}</div>}
    </div>
  );
}; 