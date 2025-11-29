import React from 'react';
import { PresenceBar } from '@/components/collab/PresenceBar';
// =========================
// Dashboard Header
// =========================
const Header: React.FC = () => {
  return (
    <header style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '16px 32px',
      background: 'var(--header-bg)',
      borderBottom: '1px solid var(--header-border)',
      minHeight: 64,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
        <div style={{ fontWeight: 700, fontSize: 20 }}>Coinet Dashboard</div>
        <PresenceBar />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
        {/* Notifications */}
        <button aria-label="Notifications" style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer' }}>🔔</button>
        {/* Theme Switcher */}
        <button aria-label="Switch theme" style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer' }}>🌓</button>
        {/* User Info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontWeight: 500 }}>User</span>
          <span style={{ fontSize: 22 }}>👤</span>
        </div>
      </div>
    </header>
  );
};

export default Header; 