const { Pool } = require('pg');
const db = new Pool({
  user: 'ai',
  host: 'localhost',
  database: 'timescale',
  password: 'ai',
  port: 5432,
});
const { SafeExpressionEvaluator } = require('../../../src/lib/security/SafeExpressionEvaluator');

async function getPrices(symbol, window = 14) {
  const { rows } = await db.query(
    'SELECT price FROM market_data WHERE symbol=$1 ORDER BY time DESC LIMIT $2',
    [symbol, window]
  );
  return rows.map(r => Number(r.price)).reverse();
}

async function volatility(symbol, window = 14) {
  const prices = await getPrices(symbol, window);
  if (prices.length < window) return null;
  const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
  const variance = prices.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / prices.length;
  return Math.sqrt(variance);
}

async function rsi(symbol, window = 14) {
  const prices = await getPrices(symbol, window + 1);
  if (prices.length < window + 1) return null;
  let gains = 0, losses = 0;
  for (let i = 1; i < prices.length; i++) {
    const diff = prices[i] - prices[i - 1];
    if (diff > 0) gains += diff;
    else losses -= diff;
  }
  const avgGain = gains / window;
  const avgLoss = losses / window;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

async function macd(symbol, shortWindow = 12, longWindow = 26, signalWindow = 9) {
  const prices = await getPrices(symbol, longWindow + signalWindow);
  if (prices.length < longWindow + signalWindow) return null;
  function ema(prices, window) {
    const k = 2 / (window + 1);
    let ema = prices[0];
    for (let i = 1; i < prices.length; i++) {
      ema = prices[i] * k + ema * (1 - k);
    }
    return ema;
  }
  const shortEMA = ema(prices.slice(-shortWindow), shortWindow);
  const longEMA = ema(prices.slice(-longWindow), longWindow);
  const macdValue = shortEMA - longEMA;
  const signal = ema(prices.slice(-signalWindow), signalWindow);
  return { macd: macdValue, signal };
}

async function bollingerBands(symbol, window = 20, numStdDev = 2) {
  const prices = await getPrices(symbol, window);
  if (prices.length < window) return null;
  const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
  const variance = prices.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / prices.length;
  const stdDev = Math.sqrt(variance);
  return {
    upper: mean + numStdDev * stdDev,
    lower: mean - numStdDev * stdDev,
    mean,
  };
}

async function anomalyDetection(symbol, window = 30) {
  const prices = await getPrices(symbol, window);
  if (prices.length < window) return null;
  const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
  const stdDev = Math.sqrt(prices.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / prices.length);
  const latest = prices[prices.length - 1];
  return Math.abs(latest - mean) > 2 * stdDev;
}

async function atr(symbol, window = 14) {
  const { rows } = await db.query(
    'SELECT high, low, price as close FROM market_data WHERE symbol=$1 ORDER BY time DESC LIMIT $2',
    [symbol, window + 1]
  );
  if (rows.length < window + 1) return null;
  let trs = [];
  for (let i = 1; i < rows.length; i++) {
    const high = Number(rows[i].high);
    const low = Number(rows[i].low);
    const prevClose = Number(rows[i - 1].close);
    trs.push(Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose)));
  }
  return trs.reduce((a, b) => a + b, 0) / window;
}

async function stochastic(symbol, kWindow = 14, dWindow = 3) {
  const { rows } = await db.query(
    'SELECT high, low, price as close FROM market_data WHERE symbol=$1 ORDER BY time DESC LIMIT $2',
    [symbol, kWindow]
  );
  if (rows.length < kWindow) return null;
  const highs = rows.map(r => Number(r.high));
  const lows = rows.map(r => Number(r.low));
  const closes = rows.map(r => Number(r.close));
  const highestHigh = Math.max(...highs);
  const lowestLow = Math.min(...lows);
  const k = 100 * ((closes[closes.length - 1] - lowestLow) / (highestHigh - lowestLow));
  // D is the SMA of K over dWindow
  let d = null;
  if (rows.length >= dWindow) {
    let kVals = [];
    for (let i = closes.length - dWindow; i < closes.length; i++) {
      const hh = Math.max(...highs.slice(i - dWindow + 1, i + 1));
      const ll = Math.min(...lows.slice(i - dWindow + 1, i + 1));
      kVals.push(100 * ((closes[i] - ll) / (hh - ll)));
    }
    d = kVals.reduce((a, b) => a + b, 0) / kVals.length;
  }
  return { k, d };
}

async function vwap(symbol, window = 20) {
  const { rows } = await db.query(
    'SELECT price, volume FROM market_data WHERE symbol=$1 ORDER BY time DESC LIMIT $2',
    [symbol, window]
  );
  if (rows.length < window) return null;
  let totalPV = 0, totalVolume = 0;
  for (const r of rows) {
    totalPV += Number(r.price) * Number(r.volume);
    totalVolume += Number(r.volume);
  }
  return totalPV / totalVolume;
}

async function zScore(symbol, window = 20) {
  const prices = await getPrices(symbol, window);
  if (prices.length < window) return null;
  const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
  const stdDev = Math.sqrt(prices.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / prices.length);
  const latest = prices[prices.length - 1];
  return (latest - mean) / stdDev;
}

async function sharpeRatio(symbol, window = 30, riskFreeRate = 0.01) {
  const prices = await getPrices(symbol, window + 1);
  if (prices.length < window + 1) return null;
  let returns = [];
  for (let i = 1; i < prices.length; i++) {
    returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
  }
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const stdDev = Math.sqrt(returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length);
  return (mean - riskFreeRate / 252) / stdDev * Math.sqrt(252);
}

async function sortinoRatio(symbol, window = 30, riskFreeRate = 0.01) {
  const prices = await getPrices(symbol, window + 1);
  if (prices.length < window + 1) return null;
  let returns = [];
  for (let i = 1; i < prices.length; i++) {
    returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
  }
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const downside = returns.filter(r => r < 0);
  const downsideDev = Math.sqrt(downside.reduce((a, b) => a + b * b, 0) / (downside.length || 1));
  return (mean - riskFreeRate / 252) / downsideDev * Math.sqrt(252);
}

async function maxDrawdown(symbol, window = 30) {
  const prices = await getPrices(symbol, window);
  if (prices.length < window) return null;
  let maxDD = 0, peak = prices[0];
  for (let price of prices) {
    if (price > peak) peak = price;
    const dd = (peak - price) / peak;
    if (dd > maxDD) maxDD = dd;
  }
  return maxDD;
}

async function alphaBeta(symbol, benchmark = 'SPY', window = 30) {
  const prices = await getPrices(symbol, window);
  const bench = await getPrices(benchmark, window);
  if (prices.length < window || bench.length < window) return null;
  let returns = [], benchReturns = [];
  for (let i = 1; i < window; i++) {
    returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
    benchReturns.push((bench[i] - bench[i - 1]) / bench[i - 1]);
  }
  const meanR = returns.reduce((a, b) => a + b, 0) / returns.length;
  const meanB = benchReturns.reduce((a, b) => a + b, 0) / benchReturns.length;
  let cov = 0, varB = 0;
  for (let i = 0; i < returns.length; i++) {
    cov += (returns[i] - meanR) * (benchReturns[i] - meanB);
    varB += Math.pow(benchReturns[i] - meanB, 2);
  }
  cov /= returns.length;
  varB /= returns.length;
  const beta = cov / varB;
  const alpha = meanR - beta * meanB;
  return { alpha, beta };
}

async function customFormula(symbol, formula, window = 30) {
  // formula: string, e.g. '(price - mean) / stdDev'
  const prices = await getPrices(symbol, window);
  if (prices.length < window) return null;
  const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
  const stdDev = Math.sqrt(prices.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / prices.length);
  const price = prices[prices.length - 1];
  const context = { price, mean, stdDev };
  return evaluateFormula(formula, context);
}

function evaluateFormula(formula, context = {}) {
  try {
    const evaluator = new SafeExpressionEvaluator();
    return evaluator.evaluateFormula(formula, context);
  } catch (error) {
    console.error('Formula evaluation error:', error.message);
    return 0; // Safe fallback
  }
}

module.exports = { volatility, rsi, macd, bollingerBands, anomalyDetection, atr, stochastic, vwap, zScore, sharpeRatio, sortinoRatio, maxDrawdown, alphaBeta, customFormula }; 