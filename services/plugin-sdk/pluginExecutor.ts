import path from 'path';
import vm from 'vm';
import fs from 'fs';

export interface Plugin {
  type: 'analytics' | 'ui';
  run(input: any): Promise<any>;
  schema?: any;
  widget?: string;
}

export function loadPlugin(pluginName: string): Plugin {
  const pluginPath = path.join(__dirname, 'plugins', pluginName + '.js');
  if (!fs.existsSync(pluginPath)) throw new Error('Plugin not found');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require(pluginPath) as Plugin;
}

export function validateInput(input: any, schema: any): boolean {
  // Simple schema validation (replace with AJV for production)
  for (const key of Object.keys(schema)) {
    if (typeof input[key] !== schema[key]) return false;
  }
  return true;
}

export async function runPlugin(plugin: Plugin, input: any): Promise<any> {
  if (plugin.type === 'analytics') {
    return runAnalyticsPlugin(plugin, input);
  } else if (plugin.type === 'ui') {
    return registerUIWidget(plugin);
  }
  throw new Error('Unsupported plugin type');
}

async function runAnalyticsPlugin(plugin: Plugin, input: any): Promise<any> {
  // Run in a VM sandbox for isolation
  const context = { plugin, input, result: null };
  vm.createContext(context);
  await vm.runInContext('result = plugin.run(input)', context);
  return context.result;
}

function registerUIWidget(plugin: Plugin): string {
  // Register widget for frontend use (mocked)
  if (!plugin.widget) throw new Error('UI plugin missing widget');
  // In production, store widget metadata in DB or registry
  return plugin.widget;
} 