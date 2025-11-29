import { usePlugins } from '../../hooks/usePlugins';

export function PluginMarketplace() {
  const { plugins, install } = usePlugins();

  return (
    <aside className="w-80 bg-white/90 border-r border-gray-200 p-6 overflow-y-auto">
      <h2 className="text-2xl font-bold mb-4">Marketplace</h2>
      <ul>
        {plugins.map(plugin => (
          <li key={plugin.id} className="mb-4">
            <div className="flex items-center justify-between">
              <span className="font-medium">{plugin.name}</span>
              <button
                className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-3 py-1 rounded-lg shadow"
                onClick={() => install(plugin.id)}
              >
                Install
              </button>
            </div>
            <p className="text-gray-500 text-sm">{plugin.description}</p>
          </li>
        ))}
      </ul>
    </aside>
  );
} 