import React, { useState } from 'react';
// =========================
// Sidebar Navigation
// =========================
const navItems = [
  { label: 'Dashboard', icon: '🏠', route: '/dashboard' },
  { label: 'Portfolio', icon: '💼', route: '/dashboard/portfolio' },
  { label: 'Trading', icon: '📈', route: '/dashboard/trading' },
  { label: 'Analytics', icon: '📊', route: '/dashboard/analytics' },
  { label: 'News', icon: '📰', route: '/dashboard/news' },
  { label: 'Social', icon: '💬', route: '/dashboard/social' },
];

const Sidebar: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <aside style={{
      width: collapsed ? 64 : 220,
      transition: 'width 0.2s',
      background: 'var(--sidebar-bg)',
      color: 'var(--sidebar-text)',
      display: 'flex',
      flexDirection: 'column',
      borderRight: '1px solid var(--sidebar-border)',
      minHeight: '100vh',
    }}>
      <button
        aria-label="Toggle sidebar"
        onClick={() => setCollapsed(c => !c)}
        style={{ margin: 16, alignSelf: 'flex-end', background: 'none', border: 'none', cursor: 'pointer' }}
      >
        {collapsed ? '➡️' : '⬅️'}
      </button>
      <nav style={{ flex: 1 }}>
        {navItems.map(item => (
          <a
            key={item.route}
            href={item.route}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '12px 20px',
              textDecoration: 'none',
              color: 'inherit',
              fontWeight: 500,
              fontSize: 16,
              borderRadius: 8,
              margin: '4px 8px',
              transition: 'background 0.15s',
            }}
          >
            <span style={{ fontSize: 20 }}>{item.icon}</span>
            {!collapsed && item.label}
          </a>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar; 