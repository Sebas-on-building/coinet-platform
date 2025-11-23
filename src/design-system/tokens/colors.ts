/**
 * Color tokens for Coinet design system
 * Inspired by Apple, Canva, TradingView, Solana
 * Each color has light and dark variants
 */
export const colors = {
  light: {
    background: '#f8fafc',
    surface: '#fff',
    primary: '#0A84FF',
    secondary: '#30D158',
    accent: '#FFD60A',
    text: '#111',
    textSecondary: '#555',
    border: '#e5e7eb',
    error: '#ff453a',
    success: '#30D158',
    info: '#0A84FF',
    warning: '#FFD60A',
    gradient: 'linear-gradient(90deg, #00ffa3 0%, #0057ff 100%)',
    glass: 'rgba(255,255,255,0.7)',
  },
  dark: {
    background: '#18181b',
    surface: '#23232b',
    primary: '#0A84FF',
    secondary: '#30D158',
    accent: '#FFD60A',
    text: '#fff',
    textSecondary: '#bbb',
    border: '#333',
    error: '#ff453a',
    success: '#30D158',
    info: '#0A84FF',
    warning: '#FFD60A',
    gradient: 'linear-gradient(90deg, #00ffa3 0%, #0057ff 100%)',
    glass: 'rgba(24,24,27,0.7)',
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

export const redisSuiteColors = {
  primary: '#0A84FF', // Apple blue
  accent: '#00FFA3', // Solana green
  background: '#1A1A1A', // TradingView dark
  surface: '#23272F',
  text: '#FFFFFF',
  error: '#FF453A',
  warning: '#FFD60A',
  success: '#30D158',
}; 