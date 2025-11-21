import React, { createContext, useContext, useState } from 'react';
import { themeTokens, ThemeName } from '@/styles/tokens/design-tokens';

const DesignSystemContext = createContext<{
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;
  tokens: typeof themeTokens['light'];
}>({
  theme: 'light',
  setTheme: () => { },
  tokens: themeTokens.light,
});

export const DesignSystemProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<ThemeName>('light');
  const tokens = themeTokens[theme];
  return (
    <DesignSystemContext.Provider value={{ theme, setTheme, tokens }}>
      <div data-theme={theme}>{children}</div>
    </DesignSystemContext.Provider>
  );
};

export const useDesignSystem = () => useContext(DesignSystemContext); 