import React from 'react';

interface Plugin {
  id: string;
  name: string;
  description: string;
  installed: boolean;
  enabled: boolean;
}

interface PluginMarketplaceProps {
  plugins: Plugin[];
  onInstall: (id: string) => void;
  onToggle: (id: string) => void;
  onUpdate: (id: string) => void;
}

export const PluginMarketplace: React.FC<PluginMarketplaceProps> = ({ plugins, onInstall, onToggle, onUpdate }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {plugins.map(plugin => (
        <div key={plugin.id} className="rounded-xl shadow p-5 bg-white/80 border border-gray-200 flex flex-col gap-2">
          <div className="font-semibold text-lg text-gray-800">{plugin.name}</div>
          <div className="text-gray-500 text-sm mb-2">{plugin.description}</div>
          <div className="flex gap-2 mt-auto">
            {!plugin.installed ? (
              <button onClick={() => onInstall(plugin.id)} className="px-3 py-1 rounded bg-green-500 text-white hover:bg-green-600 transition">Install</button>
            ) : (
              <>
                <button onClick={() => onToggle(plugin.id)} className={`px-3 py-1 rounded ${plugin.enabled ? 'bg-yellow-500 text-white' : 'bg-gray-300 text-gray-700'} transition`}>{plugin.enabled ? 'Disable' : 'Enable'}</button>
                <button onClick={() => onUpdate(plugin.id)} className="px-3 py-1 rounded bg-blue-500 text-white hover:bg-blue-600 transition">Update</button>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}; 