// Temporary type stubs until ../models/types is implemented
export type AnalyticsPlugin = {
  id: string;
  run: (input: any) => Promise<any>;
};
export type AnalyticsJob = { pluginId: string; input: any };
export type AnalyticsResult = any;

// PluginRegistry implementation
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

export class AnalyticsEngine {
  public plugins: PluginRegistry;

  constructor() {
    this.plugins = new PluginRegistry();
  }

  async runJob(job: AnalyticsJob): Promise<AnalyticsResult> {
    const plugin = this.plugins.get(job.pluginId);
    if (!plugin) throw new Error('Plugin not found');
    return plugin.run(job.input);
  }

  async runBatch(jobs: AnalyticsJob[]): Promise<AnalyticsResult[]> {
    return Promise.all(jobs.map(job => this.runJob(job)));
  }

  registerPlugin(plugin: AnalyticsPlugin) {
    this.plugins.register(plugin);
  }
} 