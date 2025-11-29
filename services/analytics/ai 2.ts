import { queryMarketTicks } from './clickhouse';
import * as tf from '@tensorflow/tfjs-node';

export async function detectAnomalies(symbol: string, from: string, to: string) {
  const data = await queryMarketTicks({ symbol, from, to, limit: 1000 });
  const prices = data.map((d: any) => d.price);
  const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
  const std = Math.sqrt(prices.map(p => (p - mean) ** 2).reduce((a, b) => a + b, 0) / prices.length);
  return data.map((d: any) => ({ ...d, anomaly: Math.abs((d.price - mean) / std) > 3 }));
}

export async function forecastPrices(symbol: string, from: string, to: string) {
  const data = await queryMarketTicks({ symbol, from, to, limit: 1000 });
  const xs = tf.tensor1d(data.map((_, i) => i));
  const ys = tf.tensor1d(data.map((d: any) => d.price));
  const model = tf.sequential();
  model.add(tf.layers.dense({ units: 1, inputShape: [1] }));
  model.compile({ loss: 'meanSquaredError', optimizer: 'sgd' });
  await model.fit(xs, ys, { epochs: 100 });
  const forecast = model.predict(tf.tensor1d([data.length, data.length + 1, data.length + 2])).arraySync();
  return { forecast };
} 