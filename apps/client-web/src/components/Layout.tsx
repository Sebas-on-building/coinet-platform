import React, { ReactNode } from 'react';

interface LayoutProps {
  children: ReactNode;
  theme: string;
  setTheme: (theme: string) => void;
}

export const Layout = ({ children, theme, setTheme }: LayoutProps) => (
  <div style={{ display: 'flex', minHeight: '100vh' }}>
    <aside style={{ width: 240, background: theme === 'dark' ? '#1C1C1E' : '#F2F2F7', padding: 24, boxShadow: '2px 0 8px rgba(0,0,0,0.04)' }}>
      <div style={{ fontWeight: 700, fontSize: 24, marginBottom: 32 }}>Coinet</div>
      <nav>
        <a href="/dashboard" style={{ display: 'block', margin: '16px 0' }}>Dashboard</a>
        <a href="/charts/BTC" style={{ display: 'block', margin: '16px 0' }}>Charts</a>
        <a href="/portfolio" style={{ display: 'block', margin: '16px 0' }}>Portfolio</a>
        <a href="/strategy" style={{ display: 'block', margin: '16px 0' }}>Strategy Lab</a>
        <a href="/alerts" style={{ display: 'block', margin: '16px 0' }}>Alerts</a>
      </nav>
      <div style={{ marginTop: 32 }}>
        <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} style={{ padding: 8, borderRadius: 8, border: 'none', background: '#0A84FF', color: '#fff', cursor: 'pointer' }}>
          Switch to {theme === 'dark' ? 'Light' : 'Dark'} Mode
        </button>
      </div>
    </aside>
    <main style={{ flex: 1, padding: 32 }}>{children}</main>
  </div>
); 