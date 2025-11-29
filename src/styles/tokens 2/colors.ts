/**
 * Color tokens for Coinet design system
 * Inspired by Apple, Canva, TradingView, Solana
 * Each color has light and dark variants
 */
export const colors = {
  light: {
    primary: '#0057FF',
    secondary: '#00C2B7',
    accent: '#FFB800',
    background: '#F8FAFC',
    backgroundGradient: 'linear-gradient(135deg, #F8FAFC 0%, #E0E7FF 100%)',
    surface: '#FFFFFF',
    surfaceGlow: '0 0 24px 0 #B3D1FF',
    border: '#E5E7EB',
    text: '#1A1A1A',
    success: '#22C55E',
    warning: '#F59E42',
    error: '#EF4444',
    info: '#3B82F6',
    shadow: 'rgba(0,0,0,0.08)',
    glow: '0 0 16px 2px #0057FF44',
    badge: '#FFB800',
    notification: '#FF3B30',
  },
  dark: {
    primary: '#3399FF',
    secondary: '#00E6D2',
    accent: '#FFD600',
    background: '#10141A',
    backgroundGradient: 'linear-gradient(135deg, #10141A 0%, #23272F 100%)',
    surface: '#181C23',
    surfaceGlow: '0 0 24px 0 #3399FF55',
    border: '#23272F',
    text: '#F8FAFC',
    success: '#4ADE80',
    warning: '#FBBF24',
    error: '#F87171',
    info: '#60A5FA',
    shadow: 'rgba(0,0,0,0.32)',
    glow: '0 0 16px 2px #3399FF44',
    badge: '#FFD600',
    notification: '#FF453A',
  },
  primary: {
    light: '#2563eb', // Apple blue
    dark: '#60a5fa',
    description: 'Primary brand color (blue)'
  },
  secondary: {
    light: '#9333ea', // Solana purple
    dark: '#c084fc',
    description: 'Secondary accent color (purple)'
  },
  accent: {
    blue: {
      light: '#2563eb',
      dark: '#60a5fa',
      description: 'Accent blue'
    },
    purple: {
      light: '#9333ea',
      dark: '#c084fc',
      description: 'Accent purple'
    },
    green: {
      light: '#22c55e',
      dark: '#4ade80',
      description: 'Accent green'
    },
    pink: {
      light: '#ec4899',
      dark: '#f472b6',
      description: 'Accent pink'
    },
    yellow: {
      light: '#eab308',
      dark: '#fde047',
      description: 'Accent yellow'
    },
  },
  background: {
    light: '#f8fafc', // Apple/Canva light
    dark: '#18181b', // TradingView/Solana dark
    description: 'App background color'
  },
  surface: {
    light: '#ffffff',
    dark: '#23272f',
    description: 'Surface (card, modal) background'
  },
  error: {
    light: '#ef4444',
    dark: '#f87171',
    description: 'Error color'
  },
  success: {
    light: '#22c55e',
    dark: '#4ade80',
    description: 'Success color'
  },
  warning: {
    light: '#f59e42',
    dark: '#fbbf24',
    description: 'Warning color'
  },
  info: {
    light: '#0ea5e9',
    dark: '#38bdf8',
    description: 'Info color'
  },
  text: {
    light: '#18181b',
    dark: '#f8fafc',
    description: 'Primary text color'
  },
  textSecondary: {
    light: '#64748b',
    dark: '#a1a1aa',
    description: 'Secondary text color'
  },
  border: {
    light: '#e5e7eb',
    dark: '#334155',
    description: 'Border color'
  },
  glass: {
    light: 'rgba(255,255,255,0.6)',
    dark: 'rgba(36,37,38,0.6)',
    description: 'Glassmorphism background'
  },
  gradients: {
    solana: 'linear-gradient(90deg, #9945FF 0%, #14F195 100%)',
    apple: 'linear-gradient(90deg, #2563eb 0%, #60a5fa 100%)',
    tradingview: 'linear-gradient(90deg, #0057FF 0%, #00BFFF 100%)',
    canva: 'linear-gradient(90deg, #00C2B7 0%, #FFB800 100%)',
    vibrant: 'linear-gradient(90deg, #19FB9B 0%, #9945FF 100%)',
    description: 'Brand gradients for backgrounds, buttons, and highlights.'
  },
}; 