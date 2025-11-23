/**
 * ThemeContext for Coinet
 * Provides theme (light/dark/system), toggleTheme, and color tokens
 * Animates transitions between themes
 */
import React, { createContext, useContext, useEffect, useState } from 'react';
import { colors } from '@/styles/tokens/colors';
import { theme as baseTokens } from '@/styles/tokens/theme';

export type Theme = 'light' | 'dark' | 'system';

interface ThemeContextProps {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  tokens: typeof baseTokens;
}

const ThemeContext = createContext<ThemeContextProps | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>('system');
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const getSystemTheme = () => (mq.matches ? 'dark' : 'light');
    const updateTheme = () => {
      setResolvedTheme(theme === 'system' ? getSystemTheme() : theme);
    };
    updateTheme();
    mq.addEventListener('change', updateTheme);
    return () => mq.removeEventListener('change', updateTheme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(resolvedTheme);
    document.body.style.transition = 'background 0.4s cubic-bezier(0.4,0,0.2,1), color 0.4s cubic-bezier(0.4,0,0.2,1)';
  }, [resolvedTheme]);

  const setTheme = (t: Theme) => setThemeState(t);
  const toggleTheme = () => setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark'));

  // Provide the correct tokens for the current theme
  const themedTokens = {
    ...baseTokens,
    colors: {
      ...baseTokens.colors,
      ...(resolvedTheme === 'dark' ? { background: '#18181b', text: '#fff' } : {})
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, tokens: themedTokens }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}; 