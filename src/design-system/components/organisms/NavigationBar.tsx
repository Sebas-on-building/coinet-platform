import React from "react";

interface NavItem {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
}

interface NavigationBarProps {
  items: NavItem[];
}

const NavigationBar: React.FC<NavigationBarProps> = ({ items }) => (
  <nav style={{ padding: 16, fontWeight: 600 }}>
    <ul style={{ display: 'flex', gap: 16, listStyle: 'none', margin: 0, padding: 0 }}>
      {items.map((item, idx) => (
        <li key={item.label} style={{ fontWeight: item.active ? 700 : 400 }}>
          <button onClick={item.onClick} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 }}>
            <span style={{ marginRight: 8 }}>{item.icon}</span>
            {item.label}
          </button>
        </li>
      ))}
    </ul>
  </nav>
);

export default NavigationBar; 