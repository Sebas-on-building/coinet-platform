import React from 'react';
import tokens from 'src/design-system/tokens';

export interface PluginIconProps {
  src: string;
  alt: string;
  size?: number;
  isInstalling?: boolean;
  theme?: 'light' | 'dark';
}

export const PluginIcon: React.FC<PluginIconProps> = ({ src, alt, size = 48, isInstalling = false, theme = 'light' }) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: tokens.radius.lg,
      background: tokens.colors.surface[theme],
      boxShadow: tokens.shadows.sm,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      position: 'relative',
      transition: `background ${tokens.motion.duration.short}`,
      border: `2px solid ${tokens.colors.border[theme]}`,
    }}
    aria-label={alt}
  >
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      style={{
        objectFit: 'cover',
        width: '100%',
        height: '100%',
        filter: isInstalling ? 'grayscale(1) blur(1px)' : 'none',
        opacity: isInstalling ? 0.5 : 1,
        transition: `filter ${tokens.motion.duration.short}`,
      }}
      onError={e => {
        (e.target as HTMLImageElement).src = '/default-plugin-icon.svg';
      }}
    />
    {isInstalling && (
      <span
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'rgba(255,255,255,0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: tokens.radius.lg,
        }}
        aria-label="Installing"
      >
        <span className="spinner" />
      </span>
    )}
  </div>
); 