import React from 'react';

export interface AvatarProps {
  src?: string;
  alt?: string;
  size?: number;
  status?: 'online' | 'offline' | 'busy' | 'away';
  badge?: React.ReactNode;
  onUpload?: (file: File) => void;
  className?: string;
  style?: React.CSSProperties;
}

export const Avatar: React.FC<AvatarProps> & {
  Image: typeof AvatarImage;
  Fallback: typeof AvatarFallback;
  Status: typeof AvatarStatus;
  Badge: typeof AvatarBadge;
  Upload: typeof AvatarUpload;
} = ({ src, alt, size = 40, status, badge, onUpload, className, style, children }) => {
  return (
    <span
      className={["co-avatar", className].filter(Boolean).join(' ')}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', position: 'relative', width: size, height: size, borderRadius: '50%', background: 'var(--color-surface)', boxShadow: 'var(--shadow-md)', ...style,
      }}
      aria-label={alt || 'Avatar'}
    >
      {src ? <AvatarImage src={src} alt={alt} size={size} /> : <AvatarFallback size={size} />}
      {status && <AvatarStatus status={status} />}
      {badge && <AvatarBadge>{badge}</AvatarBadge>}
      {onUpload && <AvatarUpload onUpload={onUpload} size={size} />}
      {children}
    </span>
  );
};

export const AvatarImage: React.FC<{ src: string; alt?: string; size?: number }> = ({ src, alt, size = 40 }) => (
  <img src={src} alt={alt} width={size} height={size} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover' }} />
);

export const AvatarFallback: React.FC<{ size?: number }> = ({ size = 40 }) => (
  <span style={{ width: size, height: size, borderRadius: '50%', background: 'var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-secondary)', fontWeight: 700, fontSize: size * 0.44 }}>?</span>
);

export const AvatarStatus: React.FC<{ status: 'online' | 'offline' | 'busy' | 'away' }> = ({ status }) => {
  const color = {
    online: 'var(--color-accent-green)',
    offline: 'var(--color-border)',
    busy: 'var(--color-accent-red)',
    away: 'var(--color-accent-yellow)',
  }[status];
  return <span style={{ position: 'absolute', bottom: 2, right: 2, width: 12, height: 12, borderRadius: '50%', background: color, border: '2px solid #fff', boxShadow: '0 1px 4px rgba(0,0,0,0.10)' }} aria-label={status} />;
};

export const AvatarBadge: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span style={{ position: 'absolute', top: -4, right: -4, background: 'var(--color-accent-blue)', color: '#fff', borderRadius: 8, padding: '2px 6px', fontSize: 12, fontWeight: 700, boxShadow: 'var(--shadow-md)' }}>{children}</span>
);

export const AvatarUpload: React.FC<{ onUpload: (file: File) => void; size?: number }> = ({ onUpload, size = 40 }) => (
  <label style={{ position: 'absolute', bottom: 0, left: 0, width: size / 2, height: size / 2, background: 'var(--color-surface)', borderRadius: '50%', boxShadow: 'var(--shadow-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
    <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { if (e.target.files?.[0]) onUpload(e.target.files[0]); }} />
    <span style={{ fontSize: 14, color: 'var(--color-accent-blue)' }}>⬆️</span>
  </label>
);

Avatar.Image = AvatarImage;
Avatar.Fallback = AvatarFallback;
Avatar.Status = AvatarStatus;
Avatar.Badge = AvatarBadge;
Avatar.Upload = AvatarUpload; 