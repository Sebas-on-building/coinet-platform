import React, { useState, useRef } from 'react';
import clsx from 'clsx';
import styles from './Avatar.module.css';
import { NotificationDot } from '../NotificationDot/NotificationDot';
import { Badge } from '../Badge/Badge';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type AvatarVariant = 'default' | 'glass' | 'tradingview' | 'solana' | 'apple' | 'canva';

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string;
  alt?: string;
  initials?: string;
  status?: 'online' | 'offline' | 'busy' | 'away';
  badge?: React.ReactNode;
  ring?: boolean;
  size?: AvatarSize;
  variant?: AvatarVariant;
  fallback?: React.ReactNode;
  uploadable?: boolean;
  notificationDot?: boolean;
  glow?: boolean;
  gradient?: boolean;
  group?: boolean;
  onUpload?: (file: File) => void;
}

const StatusDot = ({ status }: { status: AvatarProps['status'] }) => (
  <span className={clsx(styles.status, styles[status || 'offline'])} aria-label={status} />
);

const AvatarRing = () => <span className={styles.ring} aria-hidden="true" />;

const AvatarUpload = ({ onUpload }: { onUpload: (file: File) => void }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <button
      className={styles.uploadBtn}
      aria-label="Upload avatar"
      onClick={() => inputRef.current?.click()}
      type="button"
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={e => {
          if (e.target.files && e.target.files[0]) onUpload(e.target.files[0]);
        }}
      />
      <span className={styles.uploadIcon}>⬆️</span>
    </button>
  );
};

export const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  ({
    src,
    alt,
    initials,
    status,
    badge,
    ring,
    size = 'md',
    variant = 'default',
    fallback,
    uploadable,
    notificationDot,
    glow,
    gradient,
    group,
    onUpload,
    className,
    ...props
  }, ref) => {
    const [errored, setErrored] = useState(false);
    const showInitials = !src || errored;
    const displayInitials = initials || (alt ? alt[0] : '?');
    return (
      <div
        ref={ref}
        className={clsx(
          styles.avatar,
          styles[size],
          styles[variant],
          {
            [styles.glow]: glow,
            [styles.gradient]: gradient,
            [styles.group]: group,
          },
          className
        )}
        aria-label={alt || initials || 'Avatar'}
        {...props}
      >
        {ring && <AvatarRing />}
        {src && !errored && (
          <img
            src={src}
            alt={alt || 'Avatar'}
            className={styles.img}
            onError={() => setErrored(true)}
            draggable={false}
          />
        )}
        {showInitials && (
          <span className={styles.initials}>{displayInitials}</span>
        )}
        {status && <StatusDot status={status} />}
        {badge && <span className={styles.badge}><Badge>{badge}</Badge></span>}
        {notificationDot && <NotificationDot className={styles.notificationDot} />}
        {uploadable && onUpload && <AvatarUpload onUpload={onUpload} />}
        {fallback && showInitials && fallback}
      </div>
    );
  }
);
Avatar.displayName = 'Avatar';
// All sub-features are modular and documented for future extension and perfection. 