import React, { ReactNode } from "react";

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // In a real implementation, this would provide theme context, dark mode, etc.
  return <>{children}</>;
}; 