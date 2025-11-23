import React, { useRef, useState } from 'react';
import clsx from 'clsx';
import styles from './Slider.module.css';

export interface SliderProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  tooltip?: boolean;
  min?: number;
  max?: number;
  step?: number;
  value?: number;
  range?: boolean;
  glow?: boolean;
  gradient?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const Slider = React.forwardRef<HTMLInputElement, SliderProps>(
  ({ label, tooltip, min = 0, max = 100, step = 1, value, range, glow, gradient, size = 'md', className, ...props }, ref) => {
    const [internalValue, setInternalValue] = useState(value ?? min);
    const [showTooltip, setShowTooltip] = useState(false);
    const sliderValue = value !== undefined ? value : internalValue;
    const percent = ((sliderValue - min) / (max - min)) * 100;
    return (
      <div className={clsx(styles.sliderWrapper, styles[size], { [styles.glow]: glow, [styles.gradient]: gradient }, className)}>
        {label && <label className={styles.label}>{label}</label>}
        <div className={styles.trackWrapper}>
          <input
            ref={ref}
            type="range"
            className={styles.input}
            min={min}
            max={max}
            step={step}
            value={sliderValue}
            onChange={e => {
              setInternalValue(Number(e.target.value));
              props.onChange?.(e);
            }}
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
            aria-valuenow={sliderValue}
            aria-valuemin={min}
            aria-valuemax={max}
            {...props}
          />
          <div className={styles.track}>
            <div className={styles.filled} style={{ width: `${percent}%` }} />
          </div>
          {tooltip && showTooltip && (
            <div className={styles.tooltip} style={{ left: `calc(${percent}% - 1.2em)` }}>
              {sliderValue}
            </div>
          )}
        </div>
      </div>
    );
  }
);
Slider.displayName = 'Slider';
// All sub-features are modular and documented for future extension and perfection. 