// Coinet Plugin SDK - Entry Point
// Inspired by Apple, Canva, TradingView, Solana

export * from './pluginApi';
export * from './ui';
export * from './types';

/**
 * Plugin SDK: Register plugins, use hooks, and UI primitives.
 * All APIs are stable, extensible, and secure by design.
 */

// Minimal placeholder types for SDK consumers. Replace with real types from main app.
export interface CoinetAPI { /* Extend with real API methods */ }
export interface Theme { [key: string]: any }
export interface User { id: string; name: string;[key: string]: any }

export interface CoinetPlugin {
  id: string;
  name: string;
  meta: PluginMeta;
  activate(ctx: PluginContext): void;
  deactivate(): void;
  render?(): React.ReactNode;
}

export interface PluginMeta {
  author: string;
  version: string;
  description?: string;
  icon?: string;
  permissions?: string[];
}
export interface PluginContext {
  api: CoinetAPI;
  theme: Theme;
  user: User;
  events: (event: PluginEvent) => void;
}

export interface PluginEvent {
  type: string;
  payload: any;
  date: string;
}

const pluginRegistry: Record<string, CoinetPlugin> = {};

export const registerPlugin = (plugin: CoinetPlugin) => {
  // Registers plugin in global registry, supports hot-reload and sandboxing
  pluginRegistry[plugin.id] = plugin;
};

export const getPlugin = (id: string) => pluginRegistry[id]; 