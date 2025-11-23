import React from 'react';
import clsx from 'clsx';

export interface TabBarItem {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick: () => void;
}

export interface TabBarProps {
  items: TabBarItem[];
  theme?: 'light' | 'dark';
  className?: string;
  style?: React.CSSProperties;
}

export const TabBar: React.FC<TabBarProps> = ({ items, theme = 'light', className, style }) => {
  const [focused, setFocused] = React.useState(0);
  const barRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;
    const buttons = bar.querySelectorAll('button[role="tab"]');
    if (buttons[focused]) (buttons[focused] as HTMLElement).focus();
  }, [focused]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') {
      setFocused(f => (f + 1) % items.length);
      e.preventDefault();
    } else if (e.key === 'ArrowLeft') {
      setFocused(f => (f - 1 + items.length) % items.length);
      e.preventDefault();
    }
  };

  return (
    <div
      ref={barRef}
      className={clsx('co-tabbar', `co-tabbar-${theme}`, className)}
      style={style}
      role="tablist"
      aria-label="Main navigation"
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      {items.map((item, i) => (
        <button
          key={item.label}
          className={clsx('co-tabbar-item', { 'co-tabbar-item-active': item.active })}
          role="tab"
          aria-selected={item.active}
          aria-label={item.label}
          tabIndex={i === focused ? 0 : -1}
          onClick={item.onClick}
        >
          <span className="co-tabbar-icon" aria-hidden="true">{item.icon}</span>
          <span className="co-tabbar-label">{item.label}</span>
        </button>
      ))}
    </div>
  );
}; 