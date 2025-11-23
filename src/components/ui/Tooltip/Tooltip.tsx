import React, { useState, useRef } from 'react';
import clsx from 'clsx';
import styles from './Tooltip.module.css';

export interface TooltipProps extends React.HTMLAttributes<HTMLDivElement> {
  content: React.ReactNode;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  glow?: boolean;
  gradient?: boolean;
}

export const Tooltip = React.forwardRef<HTMLDivElement, TooltipProps>(
  ({ content, placement = 'top', glow, gradient, className, children, ...props }, ref) => {
    const [visible, setVisible] = useState(false);
    const triggerRef = useRef<HTMLDivElement>(null);

    return (
      <div
        ref={triggerRef}
        className={clsx(styles.trigger, className)}
        tabIndex={0}
        onFocus={() => setVisible(true)}
        onBlur={() => setVisible(false)}
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        aria-describedby={visible ? 'tooltip' : undefined}
        {...props}
      >
        {children}
        {visible && (
          <div
            ref={ref}
            className={clsx(
              styles.tooltip,
              styles[placement],
              { [styles.glow]: glow, [styles.gradient]: gradient }
            )}
            role="tooltip"
            id="tooltip"
          >
            {content}
          </div>
        )}
      </div>
    );
  }
);
Tooltip.displayName = 'Tooltip';

// All sub-features are modular and documented for future extension and perfection. 