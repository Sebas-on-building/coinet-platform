export class PluginManager {
  private plugins: any[] = [];

  public register(plugin: any) {
    this.plugins.push(plugin);
  }

  public async runAll(event: string, ...args: any[]) {
    for (const plugin of this.plugins) {
      if (typeof plugin[event] === 'function') {
        await plugin[event](...args);
      }
    }
  }
} 