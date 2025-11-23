// Temporary type stub until ../models/types is implemented
export type AnalyticsPlugin = {
  id: string;
  run: (input: any) => Promise<any>;
};

export class PluginRegistry {
  private plugins: Map<string, AnalyticsPlugin> = new Map();

  register(plugin: AnalyticsPlugin) {
    this.plugins.set(plugin.id, plugin);
  }

  get(id: string): AnalyticsPlugin | undefined {
    return this.plugins.get(id);
  }

  list(): AnalyticsPlugin[] {
    return Array.from(this.plugins.values());
  }
} 