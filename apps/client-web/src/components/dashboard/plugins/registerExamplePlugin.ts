import { PluginExampleWidget } from './PluginExample';

export function registerExamplePlugin() {
  if (window.CoinetDashboard && window.CoinetDashboard.registerWidget) {
    window.CoinetDashboard.registerWidget({
      id: 'plugin-example',
      name: 'Plugin Example',
      icon: '🧩',
      size: 'md',
      component: PluginExampleWidget,
      category: 'Demo',
    });
  }
} 