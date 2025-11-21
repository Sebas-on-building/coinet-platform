import React, { createContext, useContext, useState } from 'react';
import { themeColors } from '../../styles/tokens/design-tokens';

const DashboardThemeContext = createContext({
  theme: 'light',
  setTheme: (theme: string) => { },
});

export const useDashboardTheme = () => useContext(DashboardThemeContext);

const themeVars = (theme: keyof typeof themeColors) => {
  const c = themeColors[theme];
  return {
    '--dashboard-bg': c.background,
    '--sidebar-bg': c.surface,
    '--sidebar-text': c.text,
    '--sidebar-border': c.border,
    '--header-bg': c.surface,
    '--header-border': c.border,
    '--widgetarea-bg': c.background,
  } as React.CSSProperties;
};

export const DashboardThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<keyof typeof themeColors>('light');
  return (
    <DashboardThemeContext.Provider value={{ theme, setTheme }}>
      <div style={themeVars(theme)}>{children}</div>
    </DashboardThemeContext.Provider>
  );
}; 