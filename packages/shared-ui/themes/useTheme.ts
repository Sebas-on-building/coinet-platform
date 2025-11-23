import { useState, useEffect } from 'react';
import themeTokens from '../../design-tokens/tokens/theme.json';
import { colors, spacing, radii, typography, shadows } from './tokens';

type ThemeMode = 'light' | 'dark';

export function useTheme() {
  const getSystemTheme = (): ThemeMode =>
    window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

  const [theme, setTheme] = useState<ThemeMode>(getSystemTheme());

  useEffect(() => {
    const listener = (e: MediaQueryListEvent) => setTheme(e.matches ? 'dark' : 'light');
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', listener);
    return () => mq.removeEventListener('change', listener);
  }, []);

  const setThemeMode = (mode: ThemeMode) => setTheme(mode);

  return {
    theme,
    tokens: themeTokens[theme],
    setTheme: setThemeMode,
    colors,
    spacing,
    radii,
    typography,
    shadows,
  };
} 