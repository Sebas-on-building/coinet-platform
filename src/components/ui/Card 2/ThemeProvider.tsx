import React, { useEffect } from 'react';
import { tokensCSS, tokens } from './tokens';

export interface ThemeProviderProps {
  children: React.ReactNode;
  mode?: 'light' | 'dark' | 'auto';
  customTokens?: Partial<typeof tokens>;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children, mode = 'auto', customTokens }) => {
  useEffect(() => {
    // Inject CSS variables
    let styleTag = document.getElementById('co-tokens-css') as HTMLStyleElement | null;
    if (!styleTag) {
      styleTag = document.createElement('style');
      styleTag.id = 'co-tokens-css';
      document.head.appendChild(styleTag);
    }
    styleTag.innerHTML = tokensCSS;
    // TODO: Merge customTokens and support dark mode
    if (mode === 'dark') {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
  }, [mode, customTokens]);

  return <>{children}</>;
}; 