import React, { useState, useRef, useId, forwardRef } from 'react';
import clsx from 'clsx';
import styles from './Input.module.css';
import { colors } from '@/styles/tokens/colors'
import { radius } from '@/styles/tokens/radius'
import { spacing } from '@/styles/tokens/spacing'
import { typography } from '@/styles/tokens/typography'

export type InputVariant = 'default' | 'glass' | 'tradingview' | 'solana' | 'apple' | 'canva';
export type InputState = 'default' | 'error' | 'success' | 'warning' | 'loading' | 'disabled';
export type InputSize = 'sm' | 'md' | 'lg';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helper?: string;
  error?: string;
  icon?: React.ReactNode;
  clearable?: boolean;
  passwordToggle?: boolean;
  loading?: boolean;
  state?: InputState;
  variant?: InputVariant;
  size?: InputSize;
  glow?: boolean;
  gradient?: boolean;
  leftSlot?: React.ReactNode;
  rightSlot?: React.ReactNode;
}

const InputIcon = ({ icon }: { icon: React.ReactNode }) => (
  <span className={styles.icon}>{icon}</span>
);

const InputClear = ({ onClick }: { onClick: () => void }) => (
  <button type="button" className={styles.clear} aria-label="Clear input" onClick={onClick}>
    ×
  </button>
);

const InputPasswordToggle = ({ visible, onClick }: { visible: boolean; onClick: () => void }) => (
  <button type="button" className={styles.toggle} aria-label={visible ? 'Hide password' : 'Show password'} onClick={onClick}>
    {visible ? '🙈' : '👁️'}
  </button>
);

const InputLoading = () => (
  <span className={styles.loading} aria-label="Loading">
    <span className={styles.spinner} />
  </span>
);

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({
    label,
    helper,
    error,
    icon,
    clearable,
    passwordToggle,
    loading,
    state = 'default',
    variant = 'default',
    size = 'md',
    glow,
    gradient,
    leftSlot,
    rightSlot,
    className,
    type = 'text',
    disabled,
    ...props
  }, ref) => {
    const [value, setValue] = useState(props.value ?? props.defaultValue ?? '');
    const [showPassword, setShowPassword] = useState(false);
    const inputId = useId();
    const isPassword = passwordToggle && (type === 'password' || type === 'text');
    const isErrored = !!error || state === 'error';
    const isLoading = loading || state === 'loading';
    const isDisabled = disabled || state === 'disabled';
    const hasValue = value !== '' && value !== undefined && value !== null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setValue(e.target.value);
      props.onChange?.(e);
    };
    const handleClear = () => {
      setValue('');
      if (props.onChange) {
        const event = { ...new Event('input'), target: { value: '' } } as unknown as React.ChangeEvent<HTMLInputElement>;
        props.onChange(event);
      }
    };
    const handleTogglePassword = () => setShowPassword(v => !v);

    return (
      <div
        className={clsx(
          styles.inputWrapper,
          styles[variant],
          styles[size],
          {
            [styles.glow]: glow,
            [styles.gradient]: gradient,
            [styles.error]: isErrored,
            [styles.success]: state === 'success',
            [styles.warning]: state === 'warning',
            [styles.loading]: isLoading,
            [styles.disabled]: isDisabled,
          },
          className
        )}
      >
        {label && (
          <label htmlFor={inputId} className={styles.label}>
            {label}
          </label>
        )}
        <div className={styles.inputFieldWrapper}>
          {leftSlot || (icon && <InputIcon icon={icon} />)}
          <input
            ref={ref}
            id={inputId}
            className={styles.input}
            type={isPassword && showPassword ? 'text' : type}
            value={value}
            onChange={handleChange}
            disabled={isDisabled}
            aria-invalid={isErrored}
            aria-describedby={helper ? `${inputId}-helper` : error ? `${inputId}-error` : undefined}
            {...props}
          />
          {isPassword && passwordToggle && (
            <InputPasswordToggle visible={showPassword} onClick={handleTogglePassword} />
          )}
          {clearable && hasValue && !isDisabled && <InputClear onClick={handleClear} />}
          {isLoading && <InputLoading />}
          {rightSlot}
          <span className={styles.underline} aria-hidden="true" />
        </div>
        {helper && !isErrored && (
          <div id={`${inputId}-helper`} className={styles.helper}>
            {helper}
          </div>
        )}
        {isErrored && (
          <div id={`${inputId}-error`} className={styles.errorMsg}>
            {error}
          </div>
        )}
      </div>
    );
  }
);
Input.displayName = 'Input';

export const InputGroup: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <div className="flex items-center gap-2">{children}</div>
}

export const PasswordInput: React.FC<Omit<InputProps, 'type'>> = (props) => {
  const [show, setShow] = useState(false)
  return (
    <Input
      {...props}
      type={show ? 'text' : 'password'}
      clearable
      label={props.label}
      icon={<button type="button" onClick={() => setShow((v) => !v)} tabIndex={0} aria-label="Toggle password visibility">{show ? '🙈' : '👁️'}</button>}
    />
  )
}

export const SearchInput: React.FC<Omit<InputProps, 'type'>> = (props) => {
  return <Input {...props} type="search" clearable icon={<span>🔍</span>} />
}

interface SliderInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  min?: number
  max?: number
  step?: number
  value: number
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
}

export const SliderInput: React.FC<SliderInputProps> = ({ min = 0, max = 100, step = 1, value, onChange, ...props }) => {
  return (
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={onChange}
      className="w-full accent-primary"
      {...props}
    />
  )
}

interface SwitchProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, React.AriaAttributes {
  checked: boolean
  onChange: (checked: boolean) => void
}

export const Switch: React.FC<SwitchProps> = ({ checked, onChange, ...props }) => {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange && onChange(!checked)}
      className={[
        'relative w-10 h-6 rounded-full transition-colors',
        checked ? 'bg-primary' : 'bg-gray-300',
      ].join(' ')}
      tabIndex={0}
      {...props}
    >
      <span
        className={[
          'absolute left-1 top-1 w-4 h-4 rounded-full bg-white shadow-md transition-transform',
          checked ? 'translate-x-4' : 'translate-x-0',
        ].join(' ')}
      />
    </button>
  )
} 