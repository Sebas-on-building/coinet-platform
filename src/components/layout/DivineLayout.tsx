import React, { PropsWithChildren } from 'react';
import { colors, radii, shadows, typography } from 'packages/design-tokens/tokens/design-tokens';

export function DivineLayout({ children }: PropsWithChildren) {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: colors.background,
        fontFamily: typography.fontFamily,
        color: colors.textPrimary,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <header
        style={{
          background: colors.surface,
          boxShadow: shadows.md,
          borderBottom: `1px solid ${colors.border}`,
          padding: '2rem 3rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ fontWeight: 700, fontSize: typography.h2.fontSize, letterSpacing: '-0.01em' }}>
          <span style={{ background: colors.accentGradient, WebkitBackgroundClip: 'text', color: 'transparent' }}>
            Coinet
          </span>
        </div>
        {/* Navigation and user menu slots */}
      </header>
      <main style={{ flex: 1, padding: '3rem', maxWidth: 1440, margin: '0 auto' }}>
        {children}
      </main>
      <footer
        style={{
          background: colors.surface,
          borderTop: `1px solid ${colors.border}`,
          padding: '1.5rem 3rem',
          textAlign: 'center',
          color: colors.textSecondary,
        }}
      >
        © {new Date().getFullYear()} Coinet. All rights reserved.
      </footer>
    </div>
  );
} 