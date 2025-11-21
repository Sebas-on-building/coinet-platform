import { create } from '@storybook/theming/create';
import { colors, typography } from '../src/styles/tokens/design-tokens';

export const lightTheme = create({
  base: 'light',
  brandTitle: 'Coinet UI',
  brandUrl: 'https://coinet.ai',
  brandImage: '/logo.png',
  brandTarget: '_self',

  // Colors
  colorPrimary: colors.primary,
  colorSecondary: colors.secondary,

  // UI
  appBg: colors.background,
  appContentBg: colors.surface,
  appBorderColor: colors.border,
  appBorderRadius: 12,

  // Typography
  fontBase: typography.fontFamily,
  fontCode: 'Monaco, Consolas, monospace',

  // Text colors
  textColor: colors.text,
  textInverseColor: colors.surface,
  textMutedColor: colors.muted,

  // Toolbar default and active colors
  barTextColor: colors.muted,
  barSelectedColor: colors.primary,
  barBg: colors.surface,

  // Form colors
  inputBg: colors.surface,
  inputBorder: colors.border,
  inputTextColor: colors.text,
  inputBorderRadius: 6,
});

export const darkTheme = create({
  base: 'dark',
  brandTitle: 'Coinet UI',
  brandUrl: 'https://coinet.ai',
  brandImage: '/logo-dark.png',
  brandTarget: '_self',

  // Colors
  colorPrimary: colors.primary,
  colorSecondary: colors.secondary,

  // UI
  appBg: '#131722', // TradingView dark
  appContentBg: '#1E222D',
  appBorderColor: '#2A2E39',
  appBorderRadius: 12,

  // Typography
  fontBase: typography.fontFamily,
  fontCode: 'Monaco, Consolas, monospace',

  // Text colors
  textColor: '#D1D4DC',
  textInverseColor: '#1E222D',
  textMutedColor: '#787B86',

  // Toolbar default and active colors
  barTextColor: '#787B86',
  barSelectedColor: colors.primary,
  barBg: '#1E222D',

  // Form colors
  inputBg: '#131722',
  inputBorder: '#2A2E39',
  inputTextColor: '#D1D4DC',
  inputBorderRadius: 6,
}); 