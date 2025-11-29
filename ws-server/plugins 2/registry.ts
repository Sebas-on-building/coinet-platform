export class PluginRegistry {
  private plugins: Record<string, any> = {};

  register(plugin: any) {
    if (!plugin.id) throw new Error('Plugin must have an id');
    this.plugins[plugin.id] = plugin;
  }

  get(id: string) {
    return this.plugins[id];
  }

  getAll() {
    return Object.values(this.plugins);
  }
} 