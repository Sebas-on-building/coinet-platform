import React from 'react';
import { tokens } from 'design-tokens/tokens';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  color?: 'primary' | 'success' | 'warning' | 'danger' | 'info';
  children: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({ color = 'primary', children, ...props }) => (
  <span
    {...props}
    className={`co-badge co-badge-${color}`}
    style={{
      background: tokens.colors[color],
      color: tokens.colors.textOn[color] || tokens.colors.text,
      borderRadius: tokens.radius.sm,
      padding: `${tokens.spacing.xs} ${tokens.spacing.sm}`,
      fontWeight: 600,
      fontSize: tokens.typography.fontSize.sm,
      ...props.style,
    }}
    aria-label={typeof children === 'string' ? children : undefined}
  >
    {children}
  </span>
); 