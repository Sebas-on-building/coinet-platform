import React, { createContext, useContext, ReactNode, useMemo, useState } from "react";
import { colors } from "@/tokens/colors";
import { typography } from "@/tokens/typography";

type ThemeMode = 'light' | 'dark' | 'high-contrast';

interface ThemeContextType {
  colors: typeof colors;
  typography: typeof typography;
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType>({ colors, typography, mode: "dark", setMode: () => { } });

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [mode, setMode] = useState<ThemeMode>("dark");
  // Merge base color roles with theme-specific overrides
  const themeColors = useMemo(() => ({ ...colors, ...colors[mode] }), [mode]);

  // Inject CSS variables for theme tokens
  React.useEffect(() => {
    const root = document.documentElement;
    Object.entries(themeColors).forEach(([key, value]) => {
      root.style.setProperty(`--color-${key}`, value as string);
    });
    Object.entries(typography.fontSize).forEach(([key, value]) => {
      root.style.setProperty(`--font-size-${key}`, value);
    });
    Object.entries(typography.fontWeight).forEach(([key, value]) => {
      root.style.setProperty(`--font-weight-${key}`, value.toString());
    });
    Object.entries(typography.lineHeight).forEach(([key, value]) => {
      root.style.setProperty(`--line-height-${key}`, value.toString());
    });
    root.style.setProperty(`--font-family-sans`, typography.fontFamily.sans);
    root.style.setProperty(`--font-family-mono`, typography.fontFamily.mono);
  }, [themeColors]);

  return (
    <ThemeContext.Provider value={{ colors: themeColors, typography, mode, setMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
// Extension: To add a new theme, extend ThemeMode and add to colors.ts 