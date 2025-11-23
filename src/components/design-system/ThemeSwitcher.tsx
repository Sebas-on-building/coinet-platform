import React from 'react';
import { useDesignSystem } from './DesignSystemProvider';
import styles from './ThemeSwitcher.module.css';

const themes = ['light', 'dark', 'apple', 'canva', 'tradingview', 'solana'] as const;

export const ThemeSwitcher: React.FC = () => {
  const { theme, setTheme } = useDesignSystem();
  return (
    <div className={styles.switcher}>
      {themes.map(t => (
        <button
          key={t}
          className={theme === t ? styles.active : ''}
          onClick={() => setTheme(t)}
          aria-label={`Switch to ${t} theme`}
        >
          {t}
        </button>
      ))}
    </div>
  );
}; 