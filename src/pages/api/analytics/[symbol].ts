import type { NextApiRequest, NextApiResponse } from "next";

// Mock data generator
function generateMockData() {
  const now = Math.floor(Date.now() / 1000);
  const data = [];
  let value = 100 + Math.random() * 20;
  for (let i = 0; i < 100; i++) {
    value += (Math.random() - 0.5) * 2;
    data.push({
      time: now - (100 - i) * 60,
      value: parseFloat(value.toFixed(2)),
    });
  }
  return data;
}

function movingAverage(data: { value: number }[], window: number) {
  return data.map((_, i, arr) => {
    if (i < window - 1) return null;
    const slice = arr.slice(i - window + 1, i + 1);
    const avg = slice.reduce((sum, d) => sum + d.value, 0) / window;
    return parseFloat(avg.toFixed(2));
  });
}

function volatility(data: { value: number }[], window: number) {
  return data.map((_, i, arr) => {
    if (i < window - 1) return null;
    const slice = arr.slice(i - window + 1, i + 1);
    const avg = slice.reduce((sum, d) => sum + d.value, 0) / window;
    const variance =
      slice.reduce((sum, d) => sum + Math.pow(d.value - avg, 2), 0) / window;
    return parseFloat(Math.sqrt(variance).toFixed(2));
  });
}

function anomalyFlags(
  data: { value: number }[],
  ma: (number | null)[],
  vol: (number | null)[],
) {
  return data.map((d, i) => {
    if (ma[i] === null || vol[i] === null) return false;
    // Flag if value deviates >2*volatility from MA
    return Math.abs(d.value - (ma[i] as number)) > 2 * (vol[i] as number);
  });
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const { symbol } = req.query;
  const data = generateMockData();
  const ma20 = movingAverage(data, 20);
  const vol20 = volatility(data, 20);
  const anomalies = anomalyFlags(data, ma20, vol20);
  res.status(200).json({
    symbol,
    data,
    ma20,
    vol20,
    anomalies,
  });
}
