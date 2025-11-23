import * as tf from '@tensorflow/tfjs-node';

export async function anomalyDetection(data: number[]): Promise<{ anomalies: number[] }> {
  // Simple z-score anomaly detection
  const mean = tf.mean(data).arraySync() as number;
  const std = tf.moments(tf.tensor1d(data)).variance.sqrt().arraySync() as number;
  const anomalies = data.filter(x => Math.abs((x - mean) / std) > 2);
  return { anomalies };
}

export async function forecast(data: number[], steps: number): Promise<{ forecast: number[] }> {
  // Simple moving average forecast
  const window = 3;
  const forecast: number[] = [];
  for (let i = 0; i < steps; i++) {
    const slice = data.slice(-window);
    const avg = slice.reduce((a, b) => a + b, 0) / slice.length;
    forecast.push(avg);
    data.push(avg);
  }
  return { forecast };
}

// Advanced models (mocked for now)
export async function lstmForecast(data: number[], steps: number): Promise<{ forecast: number[] }> {
  // TODO: Plug in real LSTM model logic
  return forecast(data, steps);
}

export async function arimaForecast(data: number[], steps: number): Promise<{ forecast: number[] }> {
  // TODO: Plug in real ARIMA model logic
  return forecast(data, steps);
}

export async function prophetForecast(data: number[], steps: number): Promise<{ forecast: number[] }> {
  // TODO: Plug in real Prophet model logic
  return forecast(data, steps);
} 