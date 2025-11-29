import React, { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { colors } from '@/styles/tokens/colors';
import { shadows } from '@/styles/tokens/shadows';
import { radius } from '@/styles/tokens/radius';
import { spacing } from '@/styles/tokens/spacing';
import { typography } from '@/styles/tokens/typography';
import { Tooltip } from './Tooltip/Tooltip';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Badge variant types for world-class atomic design
 */
export type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'secondary' | 'gradient' | 'glow';

export interface BadgeProps {
  children?: React.ReactNode;
  color?: string;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
  /**
   * Atomic badge variant (default, success, warning, danger, info)
   */
  variant?: BadgeVariant;
  /**
   * Optional icon to render before children
   */
  icon?: React.ReactNode;
  gradient?: boolean;
  glow?: boolean;
  tooltip?: React.ReactNode;
  tabIndex?: number;
  ariaLabel?: string;
  onClick?: () => void;
  role?: string;
}

const variantColor: Record<BadgeVariant, string> = {
  default: colors.light.accent,
  success: colors.light.success,
  warning: colors.light.warning,
  danger: colors.light.error,
  info: colors.light.info,
  secondary: colors.light.secondary,
  gradient: `linear-gradient(90deg, ${colors.light.primary} 0%, ${colors.light.secondary} 100%)`,
  glow: colors.light.primary,
};

// =========================
// Badge Tooltip (Accessible)
// =========================
export const BadgeTooltip: React.FC<{ content: React.ReactNode; children: React.ReactNode }> = ({ content, children }) => (
  <Tooltip content={content}>{children}</Tooltip>
);

// =========================
// Badge Confetti (Particles)
// =========================
export const BadgeConfetti: React.FC = () => (
  <span style={{ position: 'absolute', left: '50%', top: '50%', pointerEvents: 'none', zIndex: 10 }}>
    {[...Array(12)].map((_, i) => (
      <motion.span
        key={i}
        initial={{ opacity: 1, x: 0, y: 0, scale: 1 }}
        animate={{
          opacity: 0,
          x: 24 * Math.cos((i / 12) * 2 * Math.PI),
          y: 24 * Math.sin((i / 12) * 2 * Math.PI),
          scale: 0.7 + 0.6 * Math.random(),
        }}
        transition={{ duration: 1.1, delay: 0.05 * i }}
        style={{
          position: 'absolute',
          width: 6,
          height: 6,
          borderRadius: 3,
          background: `hsl(${i * 30}, 90%, 60%)`,
        }}
      />
    ))}
  </span>
);

export const Badge: React.FC<BadgeProps> & {
  Dot: typeof BadgeDot;
  Icon: typeof BadgeIcon;
  Count: typeof BadgeCount;
  Status: typeof BadgeStatus;
  ContextMenu: typeof BadgeContextMenu;
  ExportShare: typeof BadgeExportShare;
  PinButton: typeof BadgePinButton;
  UndoRedo: typeof BadgeUndoRedo;
  EventLog: typeof BadgeEventLog;
  NotificationDot: typeof NotificationDot;
  Group: typeof BadgeGroup;
  Progress: typeof BadgeProgress;
  Avatar: typeof BadgeAvatar;
  Confetti: typeof BadgeConfetti;
} = ({
  children,
  color,
  size = 18,
  className,
  style,
  variant = 'default',
  icon,
  gradient,
  glow,
  tooltip,
  tabIndex = 0,
  ariaLabel,
  onClick,
  role = 'status',
  ...props
}) => {
    const badgeColor = gradient
      ? variantColor.gradient
      : glow
        ? variantColor.glow
        : color || variantColor[variant] || variantColor.default;
    const [isFocused, setIsFocused] = useState(false);
    const [isActive, setIsActive] = useState(false);
    const [showConfetti, setShowConfetti] = useState(false);

    // Micro-interaction: Confetti burst on click
    const handleClick = (e: React.MouseEvent) => {
      setIsActive(true);
      setShowConfetti(true);
      onClick && onClick();
      setTimeout(() => setIsActive(false), 120);
      setTimeout(() => setShowConfetti(false), 1200);
    };

    const badgeContent = (
      <motion.span
        className={cn("co-badge", className)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: badgeColor,
          color: '#fff',
          borderRadius: radius.badge,
          fontSize: size * 0.7,
          fontWeight: typography.fontWeight.badge,
          minWidth: size,
          height: size,
          padding: `0 ${spacing.badge}`,
          boxShadow: `${shadows.xs}${glow ? ", " + shadows.glow : ''}`,
          outline: isFocused ? shadows.focus : 'none',
          transition: 'box-shadow 0.18s, background 0.18s, transform 0.12s',
          transform: isActive ? 'scale(0.96)' : isFocused ? 'scale(1.04)' : 'scale(1)',
          cursor: onClick ? 'pointer' : 'default',
          ...style,
        }}
        tabIndex={tabIndex}
        aria-label={ariaLabel}
        role={role}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        onMouseDown={handleClick}
        onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && handleClick(e as any)}
        {...props}
      >
        {icon && <span style={{ display: 'inline-flex', alignItems: 'center', marginRight: 6 }}>{icon}</span>}
        {children}
        {showConfetti && <BadgeConfetti />}
      </motion.span>
    );
    return tooltip ? <BadgeTooltip content={tooltip}>{badgeContent}</BadgeTooltip> : badgeContent;
  };

export const BadgeDot: React.FC<{ color?: string; size?: number; className?: string; style?: React.CSSProperties }> = ({ color = colors.light.accent, size = 8, className, style }) => (
  <span className={className} style={{ width: size, height: size, borderRadius: '50%', background: color, display: 'inline-block', ...style }} />
);

export const BadgeIcon: React.FC<{ icon: React.ReactNode; color?: string; size?: number; className?: string; style?: React.CSSProperties }> = ({ icon, color = colors.light.accent, size = 16, className, style }) => (
  <span className={className} style={{ color, fontSize: size, display: 'inline-flex', alignItems: 'center', ...style }}>{icon}</span>
);

export const BadgeCount: React.FC<{ count: number; color?: string; size?: number; className?: string; style?: React.CSSProperties }> = ({ count, color = colors.light.accent, size = 18, className, style }) => (
  <Badge color={color} size={size} className={className} style={style}>{count}</Badge>
);

export const BadgeStatus: React.FC<{ status: 'success' | 'error' | 'warning' | 'info'; size?: number; className?: string; style?: React.CSSProperties }> = ({ status, size = 10, className, style }) => {
  const color = {
    success: colors.light.success,
    error: colors.light.error,
    warning: colors.light.warning,
    info: colors.light.info,
  }[status];
  return <BadgeDot color={color} size={size} className={className} style={style} />;
};

export const BadgeContextMenu: React.FC<{ actions?: { label: string; onClick: () => void; icon?: React.ReactNode }[] }> = ({ actions = [] }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div style={{ position: 'relative', display: 'inline-block' }} ref={ref}>
      <button
        aria-label="Open badge menu"
        onClick={e => { e.stopPropagation(); setOpen(v => !v); }}
        style={{ background: 'none', border: 'none', color: colors.light.secondary, fontSize: 16, marginLeft: 2, cursor: 'pointer' }}
      >⋮</button>
      {open && (
        <div style={{ position: 'absolute', top: 22, right: 0, background: colors.light.surface, borderRadius: radius.md, boxShadow: shadows.lg, zIndex: 100, minWidth: 100 }}>
          {actions.map((a, i) => (
            <button key={i} onClick={a.onClick} style={{ display: 'flex', alignItems: 'center', width: '100%', background: 'none', border: 'none', padding: '6px 12px', color: colors.light.text, fontSize: 14, cursor: 'pointer' }}>
              {a.icon && <span style={{ marginRight: 8 }}>{a.icon}</span>}{a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export const BadgeExportShare: React.FC<{ onExport?: () => void; onShare?: () => void }> = ({ onExport, onShare }) => (
  <span style={{ display: 'inline-flex', gap: 2, marginLeft: 2 }}>
    <button aria-label="Export badge" onClick={e => { e.stopPropagation(); onExport?.(); }} style={{ background: 'none', border: 'none', color: colors.light.info, fontSize: 14, cursor: 'pointer' }}>⤓</button>
    <button aria-label="Share badge" onClick={e => { e.stopPropagation(); onShare?.(); }} style={{ background: 'none', border: 'none', color: colors.light.accent, fontSize: 14, cursor: 'pointer' }}>🔗</button>
  </span>
);

export const BadgePinButton: React.FC<{ pinned?: boolean; onToggle?: (pinned: boolean) => void }> = ({ pinned, onToggle }) => (
  <button
    aria-label={pinned ? 'Unpin badge' : 'Pin badge'}
    onClick={e => { e.stopPropagation(); onToggle?.(!pinned); }}
    style={{ background: 'none', border: 'none', color: pinned ? colors.light.warning : colors.light.secondary, fontSize: 14, marginLeft: 2, cursor: 'pointer', transition: 'color 0.2s' }}
  >
    {pinned ? '📌' : '📍'}
  </button>
);

export const BadgeUndoRedo: React.FC<{ canUndo?: boolean; canRedo?: boolean; onUndo?: () => void; onRedo?: () => void }> = ({ canUndo, canRedo, onUndo, onRedo }) => (
  <span style={{ display: 'inline-flex', gap: 1, marginLeft: 2 }}>
    <button aria-label="Undo" onClick={e => { e.stopPropagation(); onUndo?.(); }} disabled={!canUndo} style={{ background: 'none', border: 'none', color: canUndo ? colors.light.primary : colors.light.border, fontSize: 13, cursor: canUndo ? 'pointer' : 'not-allowed' }}>↺</button>
    <button aria-label="Redo" onClick={e => { e.stopPropagation(); onRedo?.(); }} disabled={!canRedo} style={{ background: 'none', border: 'none', color: canRedo ? colors.light.primary : colors.light.border, fontSize: 13, cursor: canRedo ? 'pointer' : 'not-allowed' }}>↻</button>
  </span>
);

export interface BadgeEvent {
  type: string;
  timestamp: number;
  meta?: any;
}

export const BadgeEventLog: React.FC<{ events: BadgeEvent[]; onClear?: () => void }> = ({ events, onClear }) => (
  <div style={{ background: colors.light.surface, borderRadius: radius.md, boxShadow: shadows.xs, padding: 6, marginTop: 6, maxHeight: 80, overflowY: 'auto', fontSize: 12 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
      <span style={{ fontWeight: 700 }}>Event Log</span>
      <button aria-label="Clear event log" onClick={onClear} style={{ background: 'none', border: 'none', color: colors.light.error, fontSize: 12, cursor: 'pointer' }}>Clear</button>
    </div>
    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
      {events.map((e, i) => (
        <li key={i} style={{ marginBottom: 1 }}>
          <span style={{ color: colors.light.secondary }}>{new Date(e.timestamp).toLocaleTimeString()}:</span> {e.type}
        </li>
      ))}
    </ul>
  </div>
);

export const NotificationDot: React.FC<{ color?: string; size?: number; pulse?: boolean; ariaLabel?: string; style?: React.CSSProperties }> = ({ color = colors.light.notification, size = 8, pulse = true, ariaLabel, style }) => (
  <span
    aria-label={ariaLabel || 'Notification'}
    role="status"
    style={{
      width: size,
      height: size,
      borderRadius: '50%',
      background: color,
      display: 'inline-block',
      boxShadow: shadows.glow,
      position: 'relative',
      marginLeft: 2,
      ...style,
    }}
  >
    {pulse && (
      <span
        style={{
          position: 'absolute',
          top: -4,
          left: -4,
          width: size * 2,
          height: size * 2,
          borderRadius: '50%',
          background: color,
          opacity: 0.4,
          animation: 'badge-pulse 1.2s infinite',
          zIndex: 0,
        }}
      />
    )}
    <style>{`
      @keyframes badge-pulse {
        0% { transform: scale(1); opacity: 0.4; }
        50% { transform: scale(1.6); opacity: 0.1; }
        100% { transform: scale(1); opacity: 0.4; }
      }
    `}</style>
  </span>
);

export const BadgeGroup: React.FC<{ children: React.ReactNode; gap?: number }> = ({ children, gap = 4 }) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap }}>{children}</span>
);

export const BadgeProgress: React.FC<{ value: number; max?: number; color?: string; size?: number; showValue?: boolean }> = ({ value, max = 100, color = colors.light.success, size = 24, showValue = false }) => (
  <span style={{ position: 'relative', display: 'inline-block', width: size, height: size }}>
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={size / 2 - 4} fill="none" stroke="#eee" strokeWidth={4} />
      <circle cx={size / 2} cy={size / 2} r={size / 2 - 4} fill="none" stroke={color} strokeWidth={4} strokeDasharray={2 * Math.PI * (size / 2 - 4)} strokeDashoffset={2 * Math.PI * (size / 2 - 4) * (1 - value / max)} style={{ transition: 'stroke-dashoffset 0.4s' }} />
    </svg>
    {showValue && <span style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', fontSize: size * 0.4, fontWeight: 700 }}>{value}</span>}
  </span>
);

export const BadgeAvatar: React.FC<{ src: string; alt?: string; size?: number; status?: 'success' | 'error' | 'warning' | 'info'; notification?: boolean }> = ({ src, alt, size = 32, status, notification }) => (
  <span style={{ position: 'relative', display: 'inline-block', width: size, height: size }}>
    <img src={src} alt={alt} width={size} height={size} style={{ borderRadius: radius.circle, boxShadow: shadows.sm, width: size, height: size, objectFit: 'cover' }} />
    {status && <BadgeStatus status={status} size={size / 4} style={{ position: 'absolute', bottom: 2, right: 2, border: '2px solid #fff' }} />}
    {notification && <NotificationDot size={size / 4} style={{ position: 'absolute', top: 2, right: 2 }} />}
  </span>
);

Badge.Dot = BadgeDot;
Badge.Icon = BadgeIcon;
Badge.Count = BadgeCount;
Badge.Status = BadgeStatus;
Badge.ContextMenu = BadgeContextMenu;
Badge.ExportShare = BadgeExportShare;
Badge.PinButton = BadgePinButton;
Badge.UndoRedo = BadgeUndoRedo;
Badge.EventLog = BadgeEventLog;
Badge.NotificationDot = NotificationDot;
Badge.Group = BadgeGroup;
Badge.Progress = BadgeProgress;
Badge.Avatar = BadgeAvatar;
Badge.Confetti = BadgeConfetti;
