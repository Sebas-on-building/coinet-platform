type Plugin = {
  id: string;
  name: string;
  handler: (params: any) => Promise<any>;
};

const plugins: Plugin[] = [];

export function registerPlugin(plugin: Plugin) {
  plugins.push(plugin);
}

export async function runPlugin(id: string, params: any) {
  const plugin = plugins.find(p => p.id === id);
  if (!plugin) throw new Error('Plugin not found');
  return plugin.handler(params);
}

import { registerPlugin } from './plugins';

// Example: Simple moving average plugin
registerPlugin({
  id: 'sma',
  name: 'Simple Moving Average',
  handler: async ({ symbol, from, to, window = 5 }) => {
    const data = await import('./clickhouse').then(m => m.queryMarketTicks({ symbol, from, to, limit: 1000 }));
    const prices = data.map((d: any) => d.price);
    const sma = prices.map((_, i, arr) =>
      i >= window - 1 ? arr.slice(i - window + 1, i + 1).reduce((a, b) => a + b, 0) / window : null
    );
    return data.map((d: any, i: number) => ({ ...d, sma: sma[i] }));
  }
}); 