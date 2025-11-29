// Modular Strategy Types Plugin for Coinet Strategy Engine
// Each strategy type is a function: (params) => (tick, prevTick, context) => boolean

const axios = require('axios');

// --- Sub-feature: Moving Average Crossover ---
function movingAverageCrossover({ short, long, symbol }) {
  return (tick, prevTick, context) => {
    const shortMA = context.getMA(symbol, short);
    const longMA = context.getMA(symbol, long);
    return shortMA > longMA && context.prevShortMA <= context.prevLongMA;
  };
}

// --- Sub-feature: RSI Overbought/Oversold ---
function rsiSignal({ period, overbought, oversold, symbol }) {
  return (tick, prevTick, context) => {
    const rsi = context.getRSI(symbol, period);
    if (rsi > overbought) return 'overbought';
    if (rsi < oversold) return 'oversold';
    return false;
  };
}

// --- Sub-feature: Custom Formula ---
function customFormula({ formula, symbol }) {
  return (tick, prevTick, context) => {
    // Evaluate formula with context (safe eval or mathjs)
    try {
      return context.evaluateFormula(formula, { tick, prevTick, ...context });
    } catch {
      return false;
    }
  };
}

// --- Sub-feature: Price Action (Breakout, Support/Resistance) ---
function priceAction({ type, level, symbol }) {
  return (tick, prevTick, context) => {
    if (type === 'breakout') return prevTick && prevTick.price <= level && tick.price > level;
    if (type === 'support') return tick.price <= level;
    if (type === 'resistance') return tick.price >= level;
    return false;
  };
}

// --- Sub-feature: Bollinger Bands Breakout ---
function bollingerBandsBreakout({ period, stddev, symbol }) {
  return (tick, prevTick, context) => {
    const prices = context.historicalData[symbol]?.slice(-period).map(t => t.price) || [];
    if (prices.length < period) return false;
    const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
    const variance = prices.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / prices.length;
    const sd = Math.sqrt(variance);
    const upper = mean + stddev * sd;
    const lower = mean - stddev * sd;
    if (tick.price > upper) return 'breakout_above';
    if (tick.price < lower) return 'breakout_below';
    return false;
  };
}

// --- Sub-feature: MACD Crossover ---
function macdCrossover({ fast, slow, signal, symbol }) {
  return (tick, prevTick, context) => {
    const prices = context.historicalData[symbol]?.map(t => t.price) || [];
    if (prices.length < slow + signal) return false;
    const ema = (arr, period) => {
      const k = 2 / (period + 1);
      return arr.reduce((acc, val, i) => i === 0 ? val : acc * (1 - k) + val * k);
    };
    const macdLine = ema(prices.slice(-fast), fast) - ema(prices.slice(-slow), slow);
    const signalLine = ema(prices.slice(-signal), signal);
    if (macdLine > signalLine && context.prevMACD <= context.prevSignal) return 'bullish';
    if (macdLine < signalLine && context.prevMACD >= context.prevSignal) return 'bearish';
    context.prevMACD = macdLine;
    context.prevSignal = signalLine;
    return false;
  };
}

// --- Sub-feature: Stochastic Oscillator ---
function stochasticOscillator({ kPeriod, dPeriod, overbought, oversold, symbol }) {
  return (tick, prevTick, context) => {
    const bars = context.historicalData[symbol]?.slice(-kPeriod) || [];
    if (bars.length < kPeriod) return false;
    const high = Math.max(...bars.map(b => b.high));
    const low = Math.min(...bars.map(b => b.low));
    const k = ((tick.price - low) / (high - low)) * 100;
    context.kValues = context.kValues || [];
    context.kValues.push(k);
    if (context.kValues.length > dPeriod) context.kValues.shift();
    const d = context.kValues.reduce((a, b) => a + b, 0) / context.kValues.length;
    if (k > overbought && d > overbought) return 'overbought';
    if (k < oversold && d < oversold) return 'oversold';
    return false;
  };
}

// --- Sub-feature: ML Model Signal ---
function mlModelSignal({ model, symbol }) {
  return async (tick, prevTick, context) => {
    try {
      const res = await axios.post('http://localhost:4001/api/v1/analytics/predict', { symbol, model, features: { price: tick.price } });
      return res.data.signal;
    } catch {
      return false;
    }
  };
}

// --- Sub-feature: Z-Score Mean Reversion ---
function zScoreMeanReversion({ period, entry, exit, symbol }) {
  return (tick, prevTick, context) => {
    const prices = context.historicalData[symbol]?.slice(-period).map(t => t.price) || [];
    if (prices.length < period) return false;
    const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
    const std = Math.sqrt(prices.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / prices.length);
    const z = std === 0 ? 0 : (tick.price - mean) / std;
    if (z > entry) return 'short_entry';
    if (z < -entry) return 'long_entry';
    if (Math.abs(z) < exit) return 'exit';
    return false;
  };
}

// --- Sub-feature: ATR (Average True Range) Breakout ---
function atrBreakout({ period, multiplier, symbol }) {
  return (tick, prevTick, context) => {
    const bars = context.historicalData[symbol]?.slice(-period - 1) || [];
    if (bars.length < period + 1) return false;
    let trs = [];
    for (let i = 1; i < bars.length; i++) {
      const high = bars[i].high;
      const low = bars[i].low;
      const prevClose = bars[i - 1].close;
      trs.push(Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose)));
    }
    const atr = trs.reduce((a, b) => a + b, 0) / trs.length;
    const upper = bars[bars.length - 1].close + multiplier * atr;
    const lower = bars[bars.length - 1].close - multiplier * atr;
    if (tick.price > upper) return 'breakout_above';
    if (tick.price < lower) return 'breakout_below';
    return false;
  };
}

// --- Main Export: Get Strategy Type Evaluator ---
function getStrategyType(type) {
  return {
    'ma_crossover': movingAverageCrossover,
    'rsi_signal': rsiSignal,
    'custom_formula': customFormula,
    'price_action': priceAction,
    'bollinger_breakout': bollingerBandsBreakout,
    'macd_crossover': macdCrossover,
    'stochastic_oscillator': stochasticOscillator,
    'ml_model_signal': mlModelSignal,
    'zscore_mean_reversion': zScoreMeanReversion,
    'atr_breakout': atrBreakout,
  }[type];
}

module.exports = { getStrategyType }; 