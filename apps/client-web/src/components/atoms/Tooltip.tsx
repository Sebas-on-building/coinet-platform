import React, { useState } from 'react';
import { tokens } from 'design-tokens/tokens';

export interface TooltipProps extends React.HTMLAttributes<HTMLDivElement> {
  content: React.ReactNode;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  children: React.ReactNode;
}

export const Tooltip: React.FC<TooltipProps> = ({ content, placement = 'top', children, ...props }) => {
  const [visible, setVisible] = useState(false);
  return (
    <span
      style={{ position: 'relative', display: 'inline-block' }}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      tabIndex={0}
      aria-label={typeof content === 'string' ? content : undefined}
    >
      {children}
      {visible && (
        <div
          {...props}
          className={`co-tooltip co-tooltip-${placement}`}
          style={{
            position: 'absolute',
            zIndex: tokens.zIndex.tooltip,
            background: tokens.colors.surface,
            color: tokens.colors.text,
            borderRadius: tokens.radius.sm,
            padding: tokens.spacing.xs,
            boxShadow: tokens.shadows.md,
            fontSize: tokens.typography.fontSize.sm,
            whiteSpace: 'nowrap',
            top: placement === 'top' ? '-2.5em' : placement === 'bottom' ? '2.5em' : '50%',
            left: placement === 'left' ? '-8em' : placement === 'right' ? '2.5em' : '50%',
            transform: 'translate(-50%, 0)',
            ...props.style,
          }}
          role="tooltip"
        >
          {content}
        </div>
      )}
    </span>
  );
}; 