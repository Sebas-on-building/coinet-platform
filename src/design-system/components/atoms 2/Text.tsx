import React from 'react';
import clsx from 'clsx';

export type TextVariant = 'body' | 'caption' | 'headline' | 'title' | 'subtitle' | 'mono' | 'label';
export type TextWeight = 'regular' | 'medium' | 'bold' | 'semibold' | 'light';
export type TextColor = 'primary' | 'secondary' | 'muted' | 'success' | 'danger' | 'warning' | 'info' | 'custom';

export type TextElement = 'span' | 'p' | 'div' | 'label' | 'strong' | 'em' | 'b' | 'i' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'small';

export interface TextProps {
  as?: TextElement;
  variant?: TextVariant;
  weight?: TextWeight;
  color?: TextColor;
  customColor?: string;
  truncate?: boolean;
  animated?: boolean;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
  [key: string]: any; // Allow other props like id, data-*, etc.
}

export const Text: React.FC<TextProps> = ({
  as = 'span',
  variant = 'body',
  weight = 'regular',
  color = 'primary',
  customColor,
  truncate = false,
  animated = false,
  className,
  style,
  children,
  ...rest
}) => {
  const Comp = as;
  return (
    <Comp
      className={clsx(
        'co-text',
        `co-text-${variant}`,
        `co-text-${weight}`,
        `co-text-${color}`,
        truncate && 'co-text-truncate',
        animated && 'co-text-animated',
        className
      )}
      style={customColor ? { ...style, color: customColor } : style}
      {...rest}
    >
      {children}
    </Comp>
  );
}; 