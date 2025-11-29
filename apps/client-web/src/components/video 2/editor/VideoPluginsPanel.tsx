import React from 'react';

interface Plugin {
  id: number;
  name: string;
}

interface VideoPluginsPanelProps {
  plugins: Plugin[];
  setPlugins: React.Dispatch<React.SetStateAction<Plugin[]>>;
}

export const VideoPluginsPanel: React.FC<VideoPluginsPanelProps> = ({ plugins, setPlugins }) => {
  return (
    <div style={{
      display: 'flex',
      gap: 12,
      alignItems: 'center'
    }}>
      <span style={{ fontWeight: 500 }}>Plugins:</span>
      {plugins.map((plugin: Plugin) => (
        <span key={plugin.id} style={{ background: '#E5E5EA', borderRadius: 8, padding: '4px 12px' }}>
          {plugin.name}
        </span>
      ))}
      <button onClick={() => setPlugins([...plugins, { id: Date.now(), name: 'New Plugin' }])}>
        + Add Plugin
      </button>
    </div>
  );
}; 