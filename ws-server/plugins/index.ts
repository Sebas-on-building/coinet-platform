import { PluginRegistry } from './registry';

export class PluginSDK {
  private registry: PluginRegistry;

  constructor() {
    this.registry = new PluginRegistry();
  }

  register(plugin) {
    this.registry.register(plugin);
  }

  getRegisteredPlugins() {
    return this.registry.getAll();
  }
}

export const pluginSDK = new PluginSDK(); 