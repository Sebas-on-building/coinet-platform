import React from 'react';
import { useTheme } from '../../packages/shared-ui/themes/useTheme';

const Layout = ({ children }: { children: React.ReactNode }) => {
  const { colors } = useTheme();
  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      background: colors.background,
      color: colors.text,
    }}>
      <nav style={{
        width: 80,
        background: colors.surface,
        borderRight: `1px solid ${colors.border}`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: 16,
      }}>
        {/* Nav icons/buttons here */}
      </nav>
      <main style={{ flex: 1, padding: 32 }}>
        {children}
      </main>
    </div>
  );
};

export default Layout; 