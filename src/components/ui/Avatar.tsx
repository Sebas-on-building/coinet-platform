/**
 * Atomic Avatar component for Coinet
 * Inspired by Apple, Canva, TradingView, Solana
 * All props are documented and extensible
 */
import React, { useRef } from 'react';
import clsx from 'clsx';
import { colors } from 'src/styles/tokens/colors';
import { spacing } from 'src/styles/tokens/spacing';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number;
export type AvatarShape = 'circle' | 'rounded' | 'square';
export type AvatarStatus = 'online' | 'offline' | 'busy' | 'away' | 'custom';

interface AvatarProps {
  /**
   * Image source URL
   */
  src?: string;
  /**
   * Alt text for image
   */
  alt?: string;
  /**
   * Avatar size (token or px)
   */
  size?: AvatarSize;
  /**
   * Avatar shape
   */
  shape?: AvatarShape;
  /**
   * Fallback (initials, icon, or custom node)
   */
  fallback?: string | React.ReactNode;
  /**
   * Status badge (online, offline, busy, away, custom)
   */
  status?: AvatarStatus;
  /**
   * Custom status color (for custom status)
   */
  statusColor?: string;
  /**
   * Show upload button (for user/team avatars)
   */
  upload?: boolean;
  /**
   * Upload handler
   */
  onUpload?: (file: File) => void;
  /**
   * Badge (icon, number, etc.)
   */
  badge?: React.ReactNode;
  /**
   * Show border
   */
  border?: boolean;
  /**
   * Show shadow
   */
  shadow?: boolean;
  /**
   * Glassmorphism effect
   */
  glass?: boolean;
  /**
   * Render as a different element (e.g. span, div, button)
   */
  as?: React.ElementType;
  /**
   * Additional className
   */
  className?: string;
  /**
   * Additional style
   */
  style?: React.CSSProperties;
  /**
   * Any other props
   */
  [key: string]: any;
}

const sizeMap: Record<string, number> = {
  xs: 24,
  sm: 32,
  md: 40,
  lg: 56,
  xl: 72,
};

/**
 * Atomic AvatarFallback subcomponent
 */
const AvatarFallback: React.FC<{ fallback: string | React.ReactNode; size: number }> = ({ fallback, size }) => (
  <span
    className="co-avatar-fallback"
    style={{
      width: size,
      height: size,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: size * 0.42,
      fontWeight: 700,
      color: 'var(--color-accent-blue)',
      background: 'var(--color-surface)',
      borderRadius: '50%',
      userSelect: 'none',
    }}
    aria-hidden="true"
  >
    {typeof fallback === 'string' ? fallback.slice(0, 2).toUpperCase() : fallback}
  </span>
);

/**
 * Atomic AvatarStatusBadge subcomponent
 */
const statusColorMap: Record<AvatarStatus, string> = {
  online: '#22c55e',
  offline: '#a1a1aa',
  busy: '#ef4444',
  away: '#fbbf24',
  custom: 'var(--color-accent-blue)',
};
const AvatarStatusBadge: React.FC<{ status: AvatarStatus; color?: string; size: number }> = ({ status, color, size }) => (
  <span
    className="co-avatar-status"
    style={{
      position: 'absolute',
      bottom: 2,
      right: 2,
      width: Math.max(8, size * 0.28),
      height: Math.max(8, size * 0.28),
      borderRadius: '50%',
      background: color || statusColorMap[status],
      border: '2px solid var(--color-surface)',
      boxShadow: '0 0 0 2px var(--color-background)',
      zIndex: 2,
      transition: 'background 0.2s',
    }}
    aria-label={status}
  />
);

/**
 * Atomic AvatarUploadButton subcomponent
 */
const AvatarUploadButton: React.FC<{ onUpload: (file: File) => void; size: number }> = ({ onUpload, size }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <button
      type="button"
      className="co-avatar-upload-btn"
      style={{
        position: 'absolute',
        bottom: 2,
        left: 2,
        width: Math.max(20, size * 0.38),
        height: Math.max(20, size * 0.38),
        borderRadius: '50%',
        background: 'var(--color-accent-blue)',
        color: '#fff',
        border: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size * 0.22,
        boxShadow: '0 2px 8px 0 rgb(0 0 0 / 8%)',
        cursor: 'pointer',
        zIndex: 2,
        transition: 'background 0.2s',
      }}
      aria-label="Upload avatar"
      onClick={() => inputRef.current?.click()}
      tabIndex={0}
    >
      <svg width={size * 0.22} height={size * 0.22} viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M10 2v12m0 0l-4-4m4 4l4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="2" /></svg>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={e => {
          if (e.target.files && e.target.files[0]) onUpload(e.target.files[0]);
        }}
        tabIndex={-1}
        aria-label="Avatar file input"
      />
    </button>
  );
};

/**
 * Atomic AvatarBadge subcomponent
 */
const AvatarBadge: React.FC<{ badge: React.ReactNode; size: number }> = ({ badge, size }) => (
  <span
    className="co-avatar-badge"
    style={{
      position: 'absolute',
      top: 2,
      right: 2,
      minWidth: Math.max(16, size * 0.32),
      height: Math.max(16, size * 0.32),
      borderRadius: '999px',
      background: 'var(--color-accent-purple)',
      color: '#fff',
      fontSize: size * 0.22,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontWeight: 700,
      zIndex: 2,
      boxShadow: '0 2px 8px 0 rgb(0 0 0 / 8%)',
      padding: '0 0.4em',
      transition: 'background 0.2s',
    }}
    aria-label="Avatar badge"
  >
    {badge}
  </span>
);

/**
 * Atomic Avatar component
 */
export const Avatar: React.FC<AvatarProps> = ({
  src,
  alt = 'Avatar',
  size = 'md',
  shape = 'circle',
  fallback,
  status,
  statusColor,
  upload = false,
  onUpload,
  badge,
  border = false,
  shadow = false,
  glass = false,
  as: Comp = 'span',
  className,
  style,
  ...rest
}) => {
  const px = typeof size === 'number' ? size : sizeMap[size] || sizeMap.md;
  const [imgError, setImgError] = React.useState(false);
  return (
    <Comp
      className={clsx(
        'co-avatar',
        shape === 'circle' && 'rounded-full',
        shape === 'rounded' && 'rounded-xl',
        shape === 'square' && 'rounded-none',
        border && 'ring-2 ring-accent-blue',
        shadow && 'shadow-lg',
        glass && 'backdrop-blur-md',
        className
      )}
      style={{
        width: px,
        height: px,
        display: 'inline-block',
        position: 'relative',
        overflow: 'hidden',
        background: 'var(--color-surface)',
        borderRadius: shape === 'circle' ? '50%' : shape === 'rounded' ? 'var(--radius-xl)' : '0',
        boxShadow: shadow ? 'var(--shadow-lg)' : undefined,
        border: border ? '2px solid var(--color-accent-blue)' : undefined,
        ...style,
      }}
      aria-label={alt}
      tabIndex={0}
      {...rest}
    >
      {src && !imgError ? (
        <img
          src={src}
          alt={alt}
          style={{
            width: px,
            height: px,
            borderRadius: '50%',
            border: `2px solid ${colors.gradients.solana}`,
            boxShadow: `0 2px 8px ${colors.gradients.solana}`,
            objectFit: 'cover',
            background: colors.dark.surface,
          }}
          onError={() => setImgError(true)}
          draggable={false}
        />
      ) : (
        <AvatarFallback fallback={fallback || (typeof alt === 'string' ? alt[0] : '?')} size={px} />
      )}
      {status && <AvatarStatusBadge status={status} color={statusColor} size={px} />}
      {badge && <AvatarBadge badge={badge} size={px} />}
      {upload && onUpload && <AvatarUploadButton onUpload={onUpload} size={px} />}
    </Comp>
  );
}; 