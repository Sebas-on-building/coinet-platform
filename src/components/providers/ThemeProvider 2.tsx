import React, { createContext, useContext, useEffect, useState } from 'react';

const lightTheme = {
  mode: 'light',
  colors: {
    background: '#f8fafc',
    surface: '#fff',
    primary: '#0A84FF',
    secondary: '#30D158',
    accent: '#FFD60A',
    text: '#111',
    textSecondary: '#555',
    border: '#e5e7eb',
    error: '#ff453a',
    success: '#30D158',
    info: '#0A84FF',
    warning: '#FFD60A',
  },
  radii: { sm: 8, md: 16, lg: 24 },
  spacing: { xs: 4, sm: 8, md: 16, lg: 32, xl: 48 },
  typography: {
    h1: { fontSize: 40, fontWeight: 700 },
    h2: { fontSize: 32, fontWeight: 700 },
    h3: { fontSize: 24, fontWeight: 600 },
    h4: { fontSize: 20, fontWeight: 600 },
    body: { fontSize: 16, fontWeight: 400 },
    caption: { fontSize: 13, fontWeight: 400 },
  },
  shadows: { sm: '0 1px 4px #0001', md: '0 4px 16px #0002' },
};
const darkTheme = {
  ...lightTheme,
  mode: 'dark',
  colors: {
    ...lightTheme.colors,
    background: '#18181b',
    surface: '#23232b',
    primary: '#0A84FF',
    secondary: '#30D158',
    accent: '#FFD60A',
    text: '#fff',
    textSecondary: '#bbb',
    border: '#333',
  },
};
const ThemeContext = createContext({
  theme: lightTheme,
  toggleTheme: () => { },
});
export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [theme, setTheme] = useState(lightTheme);
  useEffect(() => {
    const stored = localStorage.getItem('theme');
    if (stored === 'dark') setTheme(darkTheme);
  }, []);
  useEffect(() => {
    const root = document.documentElement;
    Object.entries(theme.colors).forEach(([k, v]) => root.style.setProperty(`--color-${k}`, v));
    Object.entries(theme.radii).forEach(([k, v]) => root.style.setProperty(`--radii-${k}`, v + 'px'));
    Object.entries(theme.spacing).forEach(([k, v]) => root.style.setProperty(`--spacing-${k}`, v + 'px'));
    Object.entries(theme.typography).forEach(([k, v]) => {
      Object.entries(v).forEach(([tk, tv]) => root.style.setProperty(`--typography-${k}-${tk}`, tv + ''));
    });
    Object.entries(theme.shadows).forEach(([k, v]) => root.style.setProperty(`--shadow-${k}`, v));
    root.setAttribute('data-theme', theme.mode);
  }, [theme]);
  const toggleTheme = () => {
    setTheme(t => {
      const next = t.mode === 'light' ? darkTheme : lightTheme;
      localStorage.setItem('theme', next.mode);
      return next;
    });
  };
  return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>;
};
export const useTheme = () => useContext(ThemeContext);
