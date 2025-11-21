import React, { useRef } from 'react';
import { PluginIcon } from '../atoms/PluginIcon';
import { PluginName } from '../atoms/PluginName';
import { PluginAuthor } from '../atoms/PluginAuthor';
import { PluginRating } from '../atoms/PluginRating';
import { PluginInstallButton, PluginInstallState } from '../atoms/PluginInstallButton';
import { PluginVersionTag } from '../atoms/PluginVersionTag';
import { PluginSecurityBadge, PluginSecurityStatus } from '../atoms/PluginSecurityBadge';
import tokens from 'src/design-system/tokens';

export interface PluginCardProps {
  icon: string;
  name: string;
  author: string;
  rating: number;
  ratingCount?: number;
  version: string;
  security: PluginSecurityStatus;
  securityDetails?: string;
  installState: PluginInstallState;
  onInstallClick: () => void;
  isInstalling?: boolean;
  theme?: 'light' | 'dark';
  actions?: React.ReactNode;
  badges?: React.ReactNode;
  tabIndex?: number;
  onKeyDown?: React.KeyboardEventHandler<HTMLDivElement>;
}

/**
 * PluginCard molecule: pixel-perfect, accessible, extensible, keyboard-navigable
 * Inspired by Apple, Canva, TradingView, Solana
 */
export const PluginCard: React.FC<PluginCardProps> = ({
  icon,
  name,
  author,
  rating,
  ratingCount,
  version,
  security,
  securityDetails,
  installState,
  onInstallClick,
  isInstalling = false,
  theme = 'light',
  actions,
  badges,
  tabIndex = 0,
  onKeyDown,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  return (
    <div
      ref={cardRef}
      tabIndex={tabIndex}
      onKeyDown={onKeyDown}
      style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: tokens.spacing.sm,
        background: tokens.colors.surface[theme],
        borderRadius: tokens.radius.lg,
        boxShadow: tokens.shadows.sm,
        border: `1.5px solid ${tokens.colors.border[theme]}`,
        padding: tokens.spacing.sm,
        minWidth: 320,
        maxWidth: 480,
        width: '100%',
        outline: 'none',
        transition: `box-shadow ${tokens.motion.duration.short}`,
      }}
      aria-label={`Plugin: ${name}`}
      className="co-plugin-card"
      onFocus={e => {
        if (cardRef.current) cardRef.current.style.boxShadow = tokens.shadows.lg;
      }}
      onBlur={e => {
        if (cardRef.current) cardRef.current.style.boxShadow = tokens.shadows.sm;
      }}
    >
      <PluginIcon src={icon} alt={name} isInstalling={isInstalling} theme={theme} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing.xs }}>
          <PluginName name={name} theme={theme} />
          <PluginVersionTag version={version} />
          <PluginSecurityBadge status={security} details={securityDetails} />
          {badges}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing.xs, marginTop: 2 }}>
          <PluginAuthor author={author} theme={theme} />
          <PluginRating rating={rating} count={ratingCount} theme={theme} />
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: tokens.spacing.xs }}>
        <PluginInstallButton state={installState} onClick={onInstallClick} theme={theme} />
        {actions}
      </div>
    </div>
  );
}; 