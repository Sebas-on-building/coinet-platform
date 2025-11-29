import '../src/styles/tokens/animations.css';
import { themes } from '@storybook/theming';
import React from 'react';
import tokens from '../src/design-system/tokens';

export const parameters = {
  actions: { argTypesRegex: "^on[A-Z].*" },
  controls: { expanded: true },
  a11y: { element: '#root' },
  docs: { theme: themes.light },
  backgrounds: {
    default: 'light',
    values: [
      { name: 'light', value: '#f8fafc' },
      { name: 'dark', value: '#18192b' },
      { name: 'solana', value: 'linear-gradient(90deg, #23234d 0%, #00ffa3 100%)' },
      { name: 'canva', value: 'linear-gradient(90deg, #00c4cc 0%, #0057ff 100%)' },
    ],
  },
};

export const decorators = [
  (Story) => (
    <div style={{ minHeight: '100vh', background: 'var(--co-bg, #F8FAFC)', color: 'var(--co-text, #18181b)', fontFamily: 'var(--co-font-sans, sans-serif)' }}>
      <div style={{ position: 'fixed', top: 0, right: 0, zIndex: 9999, background: 'rgba(255,255,255,0.95)', borderBottomLeftRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', padding: '8px 16px', fontSize: 14 }}>
        <a href="https://www.figma.com/file/EXAMPLE/COINET-DESIGN-SYSTEM" target="_blank" rel="noopener" style={{ color: '#0057FF', fontWeight: 600, textDecoration: 'none', marginRight: 16 }}>Figma Design File</a>
        <a href="https://bradfrost.com/blog/post/atomic-web-design/" target="_blank" rel="noopener" style={{ color: '#9333ea', fontWeight: 600, textDecoration: 'none', marginRight: 16 }}>Atomic Design</a>
        <a href="/design-tokens" target="_blank" rel="noopener" style={{ color: '#22c55e', fontWeight: 600, textDecoration: 'none' }}>Design Tokens</a>
      </div>
      <div style={{ marginTop: 48 }}>
        <Story />
      </div>
      <footer style={{ marginTop: 48, padding: 16, textAlign: 'center', fontSize: 13, color: '#64748b' }}>
        Coinet Design System · Inspired by Apple, Canva, TradingView, Solana · Live sync with Figma/Storybook/Zeroheight
      </footer>
    </div>
  ),
];

// Design token panel (for /design-tokens route or as a Storybook addon)
export const DesignTokenPanel = () => (
  <div style={{ padding: 24 }}>
    <h2>Design Tokens</h2>
    <pre style={{ background: '#f3f4f6', borderRadius: 8, padding: 16, fontSize: 13 }}>
      {JSON.stringify(tokens, null, 2)}
    </pre>
    <p style={{ color: '#64748b', fontSize: 13, marginTop: 8 }}>
      Tokens are exported to CSS variables and JSON for live sync between design and code.
    </p>
  </div>
); 