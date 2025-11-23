import React, { ReactNode, createContext, useContext, useState } from 'react';

type Plugin = {
  id: string;
  render: () => ReactNode;
  slot: 'panel' | 'widget' | 'action';
};

type PluginRegistry = Record<string, Plugin>;

const PluginContext = createContext<{
  plugins: PluginRegistry;
  register: (plugin: Plugin) => void;
} | null>(null);

export const PluginProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [plugins, setPlugins] = useState<PluginRegistry>({});
  const register = (plugin: Plugin) => setPlugins(p => ({ ...p, [plugin.id]: plugin }));
  return (
    <PluginContext.Provider value={{ plugins, register }}>
      {children}
    </PluginContext.Provider>
  );
};

export function usePlugins(slot: Plugin['slot']) {
  const ctx = useContext(PluginContext);
  if (!ctx) throw new Error('usePlugins must be used within PluginProvider');
  return Object.values(ctx.plugins).filter(p => p.slot === slot);
}

export function useRegisterPlugin(plugin: Plugin) {
  const ctx = useContext(PluginContext);
  if (!ctx) throw new Error('useRegisterPlugin must be used within PluginProvider');
  React.useEffect(() => { ctx.register(plugin); }, [plugin]);
} 