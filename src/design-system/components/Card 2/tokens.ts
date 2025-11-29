// Coinet Design Tokens — Apple/Canva/TradingView/Solana hybrid
// Atomic, extensible, world-class

export const tokens = {
  color: {
    background: '#f8fafc',
    surface: '#fff',
    surfaceGlass: 'rgba(255,255,255,0.82)',
    surfaceHover: 'rgba(0,0,0,0.03)',
    accentBlue: '#2563eb',
    accentBlueOpaque: 'rgba(37,99,235,0.10)',
    accentBlueDark: '#1e40af',
    accentPurple: '#a21caf',
    accentGreen: '#059669',
    accentYellow: '#facc15',
    accentYellowOpaque: 'rgba(250,204,21,0.13)',
    accentYellowDark: '#b45309',
    accentPink: '#ec4899',
    accentOrange: '#f97316',
    accentCyan: '#06b6d4',
    text: '#1e293b',
    textSecondary: '#64748b',
    border: '#e2e8f0',
    shadow: 'rgba(30,41,59,0.10)',
    error: '#ef4444',
    ...{
      // Gradients
      gradientBlue: 'linear-gradient(90deg, #2563eb 0%, #60a5fa 100%)',
      gradientPurple: 'linear-gradient(90deg, #a21caf 0%, #f472b6 100%)',
      gradientGreen: 'linear-gradient(90deg, #059669 0%, #6ee7b7 100%)',
      gradientYellow: 'linear-gradient(90deg, #facc15 0%, #fde68a 100%)',
      glass: 'rgba(255,255,255,0.82) backdrop-filter: blur(16px);',
    },
  },
  radius: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 18,
    xl: 28,
    '2xl': 40,
  },
  shadow: {
    sm: '0 1px 2px 0 rgba(30,41,59,0.04)',
    md: '0 2px 8px 0 rgba(30,41,59,0.10)',
    lg: '0 4px 16px 0 rgba(30,41,59,0.13)',
    xl: '0 8px 32px 0 rgba(30,41,59,0.16)',
    '2xl': '0 16px 48px 0 rgba(30,41,59,0.18)',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    '2xl': 48,
  },
  motion: {
    fast: '0.18s cubic-bezier(0.4,0,0.2,1)',
    normal: '0.28s cubic-bezier(0.4,0,0.2,1)',
    slow: '0.44s cubic-bezier(0.4,0,0.2,1)',
  },
};

// Export as CSS variables for global theming
export const tokensCSS = `
  :root {
    --color-background: ${tokens.color.background};
    --color-surface: ${tokens.color.surface};
    --color-surface-glass: ${tokens.color.surfaceGlass};
    --color-surface-hover: ${tokens.color.surfaceHover};
    --color-accent-blue: ${tokens.color.accentBlue};
    --color-accent-blue-opaque: ${tokens.color.accentBlueOpaque};
    --color-accent-blue-dark: ${tokens.color.accentBlueDark};
    --color-accent-purple: ${tokens.color.accentPurple};
    --color-accent-green: ${tokens.color.accentGreen};
    --color-accent-yellow: ${tokens.color.accentYellow};
    --color-accent-yellow-opaque: ${tokens.color.accentYellowOpaque};
    --color-accent-yellow-dark: ${tokens.color.accentYellowDark};
    --color-accent-pink: ${tokens.color.accentPink};
    --color-accent-orange: ${tokens.color.accentOrange};
    --color-accent-cyan: ${tokens.color.accentCyan};
    --color-text: ${tokens.color.text};
    --color-text-secondary: ${tokens.color.textSecondary};
    --color-border: ${tokens.color.border};
    --color-shadow: ${tokens.color.shadow};
    --color-error: ${tokens.color.error};
    --gradient-blue: ${tokens.color.gradientBlue};
    --gradient-purple: ${tokens.color.gradientPurple};
    --gradient-green: ${tokens.color.gradientGreen};
    --gradient-yellow: ${tokens.color.gradientYellow};
    --glass: ${tokens.color.glass};
    --radius-xs: ${tokens.radius.xs}px;
    --radius-sm: ${tokens.radius.sm}px;
    --radius-md: ${tokens.radius.md}px;
    --radius-lg: ${tokens.radius.lg}px;
    --radius-xl: ${tokens.radius.xl}px;
    --radius-2xl: ${tokens.radius['2xl']}px;
    --shadow-sm: ${tokens.shadow.sm};
    --shadow-md: ${tokens.shadow.md};
    --shadow-lg: ${tokens.shadow.lg};
    --shadow-xl: ${tokens.shadow.xl};
    --shadow-2xl: ${tokens.shadow['2xl']};
    --spacing-xs: ${tokens.spacing.xs}px;
    --spacing-sm: ${tokens.spacing.sm}px;
    --spacing-md: ${tokens.spacing.md}px;
    --spacing-lg: ${tokens.spacing.lg}px;
    --spacing-xl: ${tokens.spacing.xl}px;
    --spacing-2xl: ${tokens.spacing['2xl']}px;
    --motion-fast: ${tokens.motion.fast};
    --motion-normal: ${tokens.motion.normal};
    --motion-slow: ${tokens.motion.slow};
  }
`; 