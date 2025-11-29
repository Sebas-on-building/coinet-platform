// =========================
// Coinet Design Tokens v2
// =========================
// Inspired by Apple, Canva, TradingView, Solana
// Supports: light, dark, solana, tradingview, apple, canva themes
// Each token is documented for clarity and future-proofing

// Theme color palettes
export const themeColors = {
  light: {
    primary: '#0057FF', // Solana blue
    secondary: '#00FFA3', // Solana green
    accent: '#FF2D55', // Apple pink
    background: '#F8F9FB', // Apple/Canva light
    surface: '#FFFFFF',
    border: '#E5E7EB',
    text: '#1A1A1A',
    muted: '#6B7280',
    success: '#34C759',
    warning: '#FF9500',
    error: '#FF3B30',
    info: '#5AC8FA',
    chartGrid: '#E0E6ED', // TradingView grid
    chartCandleUp: '#26A69A',
    chartCandleDown: '#EF5350',
    focus: '#0057FF33',
    hover: '#F0F4FF',
    active: '#E5EDFF',
    disabled: '#F3F4F6',
  },
  dark: {
    primary: '#0057FF',
    secondary: '#00FFA3',
    accent: '#FF2D55',
    background: '#131722', // TradingView dark
    surface: '#1E222D',
    border: '#2A2E39',
    text: '#D1D4DC',
    muted: '#787B86',
    success: '#34C759',
    warning: '#FF9500',
    error: '#FF3B30',
    info: '#5AC8FA',
    chartGrid: '#23263B',
    chartCandleUp: '#26A69A',
    chartCandleDown: '#EF5350',
    focus: '#0057FF66',
    hover: '#23263B',
    active: '#23263B',
    disabled: '#23263B',
  },
  solana: {
    primary: '#00FFA3',
    secondary: '#0057FF',
    accent: '#9945FF',
    background: '#000000',
    surface: '#1E1E1E',
    border: '#333333',
    text: '#00FFA3',
    muted: '#787B86',
    success: '#19FB9B',
    warning: '#FFD600',
    error: '#FF2D55',
    info: '#5AC8FA',
    chartGrid: '#23263B',
    chartCandleUp: '#19FB9B',
    chartCandleDown: '#FF2D55',
    focus: '#00FFA366',
    hover: '#1E1E1E',
    active: '#333333',
    disabled: '#23263B',
  },
  tradingview: {
    primary: '#2962FF',
    secondary: '#00BFAE',
    accent: '#FF6D00',
    background: '#131722',
    surface: '#1E222D',
    border: '#2A2E39',
    text: '#D1D4DC',
    muted: '#787B86',
    success: '#26A69A',
    warning: '#FFD600',
    error: '#FF3B30',
    info: '#5AC8FA',
    chartGrid: '#23263B',
    chartCandleUp: '#26A69A',
    chartCandleDown: '#EF5350',
    focus: '#2962FF66',
    hover: '#23263B',
    active: '#23263B',
    disabled: '#23263B',
  },
  apple: {
    primary: '#007AFF',
    secondary: '#34C759',
    accent: '#FF2D55',
    background: '#F8F9FB',
    surface: '#FFFFFF',
    border: '#E5E7EB',
    text: '#1A1A1A',
    muted: '#6B7280',
    success: '#34C759',
    warning: '#FF9500',
    error: '#FF3B30',
    info: '#5AC8FA',
    chartGrid: '#E0E6ED',
    chartCandleUp: '#34C759',
    chartCandleDown: '#FF3B30',
    focus: '#007AFF33',
    hover: '#F0F4FF',
    active: '#E5EDFF',
    disabled: '#F3F4F6',
  },
  canva: {
    primary: '#00C4CC',
    secondary: '#FF6F61',
    accent: '#FFB900',
    background: '#F8F9FB',
    surface: '#FFFFFF',
    border: '#E5E7EB',
    text: '#1A1A1A',
    muted: '#6B7280',
    success: '#34C759',
    warning: '#FF9500',
    error: '#FF3B30',
    info: '#5AC8FA',
    chartGrid: '#E0E6ED',
    chartCandleUp: '#00C4CC',
    chartCandleDown: '#FF6F61',
    focus: '#00C4CC33',
    hover: '#E0F7FA',
    active: '#B2EBF2',
    disabled: '#F3F4F6',
  },
};

// UI State tokens (for all themes)
export const uiStates = {
  hover: 'hover',
  active: 'active',
  focus: 'focus',
  disabled: 'disabled',
  selected: 'selected',
  pressed: 'pressed',
  loading: 'loading',
  error: 'error',
  success: 'success',
  warning: 'warning',
  info: 'info',
};

// Typography (expanded)
export const typography = {
  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  fontWeightRegular: 400,
  fontWeightMedium: 500,
  fontWeightBold: 700,
  fontWeightBlack: 900,
  h1: { fontSize: '2.5rem', lineHeight: 1.2, fontWeight: 700 },
  h2: { fontSize: '2rem', lineHeight: 1.25, fontWeight: 700 },
  h3: { fontSize: '1.5rem', lineHeight: 1.3, fontWeight: 700 },
  h4: { fontSize: '1.25rem', lineHeight: 1.35, fontWeight: 500 },
  h5: { fontSize: '1.125rem', lineHeight: 1.4, fontWeight: 500 },
  h6: { fontSize: '1rem', lineHeight: 1.4, fontWeight: 500 },
  body: { fontSize: '1rem', lineHeight: 1.5, fontWeight: 400 },
  bodySm: { fontSize: '0.9375rem', lineHeight: 1.5, fontWeight: 400 },
  caption: { fontSize: '0.875rem', lineHeight: 1.4, fontWeight: 400 },
  code: { fontFamily: 'Monaco, Consolas, monospace', fontSize: '0.95em' },
};

// Spacing (Apple/Canva/TradingView scale)
export const spacing = {
  xxxs: '2px',
  xxs: '4px',
  xs: '8px',
  sm: '12px',
  md: '16px',
  lg: '24px',
  xl: '32px',
  xxl: '48px',
  xxxl: '64px',
};

// Radii (for all shapes)
export const radii = {
  none: '0',
  xs: '2px',
  sm: '6px',
  md: '12px',
  lg: '24px',
  xl: '32px',
  pill: '9999px',
  circle: '50%',
};

// Shadows (multi-layer, for all themes)
export const shadows = {
  xs: '0 1px 2px 0 rgba(60,60,60,0.04)',
  sm: '0 2px 4px 0 rgba(60,60,60,0.06)',
  md: '0 4px 12px 0 rgba(60,60,60,0.08)',
  lg: '0 8px 24px 0 rgba(60,60,60,0.12)',
  xl: '0 16px 48px 0 rgba(60,60,60,0.16)',
  focus: '0 0 0 2px #0057FF33',
};

// Motion (Apple/Canva/TradingView)
export const motion = {
  fast: '100ms cubic-bezier(0.4,0,0.2,1)',
  normal: '250ms cubic-bezier(0.4,0,0.2,1)',
  slow: '400ms cubic-bezier(0.4,0,0.2,1)',
  bounce: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  spring: 'cubic-bezier(0.22, 1, 0.36, 1)',
};

// Z-Index tokens
export const zIndex = {
  dropdown: 1000,
  sticky: 1020,
  fixed: 1030,
  modalBackdrop: 1040,
  modal: 1050,
  popover: 1060,
  tooltip: 1070,
  toast: 1080,
};

// Grid system
export const grid = {
  columns: 12,
  gutter: spacing.md,
  maxWidth: '1440px',
};

// Documentation: Each token is named and structured for easy theme extension and future-proofing. Use themeColors[theme] to access theme-specific colors. 