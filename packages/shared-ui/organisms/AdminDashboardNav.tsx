import React from 'react';
import tokens from 'src/design-system/tokens';

export interface AdminDashboardNavProps {
  active: string;
  onNavigate: (section: string) => void;
  theme?: 'light' | 'dark';
}

const NAV_ITEMS = [
  { key: 'moderation', label: 'Moderation' },
  { key: 'analytics', label: 'Analytics' },
  { key: 'users', label: 'Users' },
  { key: 'plugins', label: 'Plugins' },
  { key: 'settings', label: 'Settings' },
];

export const AdminDashboardNav: React.FC<AdminDashboardNavProps> = ({ active, onNavigate, theme = 'light' }) => (
  <nav
    style={{
      display: 'flex',
      gap: tokens.spacing.md,
      background: tokens.colors.surface[theme],
      borderRadius: tokens.radius.lg,
      boxShadow: tokens.shadows.sm,
      padding: tokens.spacing.sm,
      marginBottom: tokens.spacing.lg,
      alignItems: 'center',
      justifyContent: 'flex-start',
      overflowX: 'auto',
    }}
    aria-label="Admin dashboard navigation"
  >
    {NAV_ITEMS.map(item => (
      <button
        key={item.key}
        onClick={() => onNavigate(item.key)}
        style={{
          background: active === item.key ? tokens.colors.accent.blue[theme] : 'none',
          color: active === item.key ? tokens.colors.text[theme] : tokens.colors.textSecondary[theme],
          border: 'none',
          borderRadius: tokens.radius.sm,
          padding: `${tokens.spacing.xs} ${tokens.spacing.md}`,
          fontWeight: 600,
          fontSize: tokens.typography.fontSize.base,
          cursor: 'pointer',
          transition: `background ${tokens.motion.duration.short}`,
          outline: 'none',
        }}
        aria-current={active === item.key ? 'page' : undefined}
      >
        {item.label}
      </button>
    ))}
  </nav>
); 