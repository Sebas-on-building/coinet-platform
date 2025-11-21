import React from 'react';
import clsx from 'clsx';

export type IconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number;
export type IconWeight = 'thin' | 'regular' | 'bold';
export type IconColor = 'primary' | 'secondary' | 'muted' | 'success' | 'danger' | 'warning' | 'info' | 'custom';
export type IconVariant = 'outline' | 'filled';

export interface IconProps extends React.SVGProps<SVGSVGElement> {
  name: string; // e.g. 'search', 'user', 'arrow-right', or custom
  size?: IconSize;
  color?: IconColor;
  customColor?: string;
  weight?: IconWeight;
  variant?: IconVariant;
  animated?: boolean;
  ariaLabel?: string;
  className?: string;
  style?: React.CSSProperties;
}

// Icon registry for built-in icons (expand as needed)
const ICONS: Record<string, React.ReactNode> = {
  search: (
    <path d="M15.5 15.5L19 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2" />
      <path d="M4 20c0-4 8-4 8-4s8 0 8 4" stroke="currentColor" strokeWidth="2" />
    </>
  ),
  // Add more built-in icons here
};

export const Icon: React.FC<IconProps> = ({
  name,
  size = 'md',
  color = 'primary',
  customColor,
  weight = 'regular',
  variant = 'outline',
  animated = false,
  ariaLabel,
  className,
  style,
  ...rest
}) => {
  const px = typeof size === 'number' ? size : size === 'xs' ? 16 : size === 'sm' ? 20 : size === 'md' ? 24 : size === 'lg' ? 32 : 40;
  const iconNode = ICONS[name] || null;
  return (
    <svg
      width={px}
      height={px}
      viewBox="0 0 24 24"
      fill={variant === 'filled' ? (customColor || 'currentColor') : 'none'}
      stroke={customColor || 'currentColor'}
      strokeWidth={weight === 'thin' ? 1 : weight === 'bold' ? 3 : 2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-label={ariaLabel || name}
      role="img"
      className={clsx(
        'co-icon',
        `co-icon-${name}`,
        `co-icon-${color}`,
        `co-icon-${weight}`,
        `co-icon-${variant}`,
        animated && 'co-icon-animated',
        className
      )}
      style={style}
      {...rest}
    >
      {iconNode}
    </svg>
  );
}; 