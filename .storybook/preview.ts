import type { Preview } from '@storybook/react';
import { themes } from '@storybook/theming';
import { colors, typography } from '../src/styles/tokens/design-tokens';

const preview: Preview = {
  parameters: {
    actions: { argTypesRegex: '^on[A-Z].*' },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/,
      },
    },
    backgrounds: {
      default: 'light',
      values: [
        { name: 'light', value: colors.background },
        { name: 'dark', value: '#1A1D1E' },
        { name: 'surface', value: colors.surface },
        { name: 'trading', value: '#131722' }, // TradingView dark
        { name: 'solana', value: '#000000' }, // Solana black
      ],
    },
    viewport: {
      viewports: {
        mobile: {
          name: 'Mobile',
          styles: { width: '360px', height: '640px' },
        },
        tablet: {
          name: 'Tablet',
          styles: { width: '768px', height: '1024px' },
        },
        desktop: {
          name: 'Desktop',
          styles: { width: '1440px', height: '900px' },
        },
      },
    },
    darkMode: {
      dark: { ...themes.dark },
      light: { ...themes.light },
    },
    layout: 'centered',
    docs: {
      theme: themes.light,
      source: {
        state: 'open',
      },
      story: {
        inline: true,
      },
    },
    designToken: {
      defaultValue: 'plain',
    },
    a11y: {
      config: {
        rules: [
          {
            id: 'color-contrast',
            enabled: true,
          },
        ],
      },
    },
    measure: {
      numbers: true,
      styles: {
        position: 'absolute',
      },
    },
    outline: {
      enabled: true,
      style: {
        color: colors.primary,
      },
    },
    performance: {
      maxDuration: 300,
      minimumMaxDuration: 150,
      disable: false,
      showSlowWarning: true,
    },
  },
};

export default preview; 