import React, { createContext, useContext, useState, ReactNode } from "react";

export type OverlayType = {
  id: string;
  render: () => ReactNode;
};

const OverlayRegistryContext = createContext<{
  overlays: OverlayType[];
  register: (overlay: OverlayType) => void;
  unregister: (id: string) => void;
}>({ overlays: [], register: () => { }, unregister: () => { } });

export const MultiChartOverlayRegistryProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [overlays, setOverlays] = useState<OverlayType[]>([]);
  const register = (overlay: OverlayType) => setOverlays(prev => [...prev, overlay]);
  const unregister = (id: string) => setOverlays(prev => prev.filter(o => o.id !== id));
  return (
    <OverlayRegistryContext.Provider value={{ overlays, register, unregister }}>
      {children}
    </OverlayRegistryContext.Provider>
  );
};

export const useMultiChartOverlayRegistry = () => useContext(OverlayRegistryContext); 