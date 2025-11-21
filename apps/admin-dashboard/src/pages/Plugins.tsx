import React from 'react';
import { PluginMarketplace } from '../components/PluginMarketplace';

const plugins = [
  { id: '1', name: 'AI Analytics', description: 'Advanced AI-powered analytics.', installed: true, enabled: true },
  { id: '2', name: 'WebAuthn', description: 'Passwordless authentication.', installed: false, enabled: false },
  { id: '3', name: 'Real-Time Alerts', description: 'Customizable alerting engine.', installed: true, enabled: false },
];

export default function Plugins() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-100 p-8">
      <h1 className="text-3xl font-bold mb-8 text-gray-800">Plugin Marketplace</h1>
      <PluginMarketplace
        plugins={plugins}
        onInstall={id => alert(`Install plugin ${id}`)}
        onToggle={id => alert(`Toggle plugin ${id}`)}
        onUpdate={id => alert(`Update plugin ${id}`)}
      />
    </div>
  );
} 