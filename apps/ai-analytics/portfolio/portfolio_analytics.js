const { Pool } = require('pg');
const db = new Pool({
  user: 'ai',
  host: 'localhost',
  database: 'timescale',
  password: 'ai',
  port: 5432,
});
const math = require('mathjs');

async function getPortfolioHistory(portfolioId, window = 30) {
  // Assume portfolio_value_history table: portfolio_id, value, time
  const { rows } = await db.query(
    'SELECT value FROM portfolio_value_history WHERE portfolio_id=$1 ORDER BY time DESC LIMIT $2',
    [portfolioId, window]
  );
  return rows.map(r => Number(r.value)).reverse();
}

async function timeWeightedReturn(portfolioId, window = 30) {
  const values = await getPortfolioHistory(portfolioId, window);
  if (values.length < 2) return null;
  let twr = 1;
  for (let i = 1; i < values.length; i++) {
    twr *= values[i] / values[i - 1];
  }
  return (twr - 1) * 100;
}

async function sharpeRatio(portfolioId, window = 30, riskFreeRate = 0.01) {
  const values = await getPortfolioHistory(portfolioId, window + 1);
  if (values.length < window + 1) return null;
  let returns = [];
  for (let i = 1; i < values.length; i++) {
    returns.push((values[i] - values[i - 1]) / values[i - 1]);
  }
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const stdDev = Math.sqrt(returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length);
  return (mean - riskFreeRate / 252) / stdDev * Math.sqrt(252);
}

async function sortinoRatio(portfolioId, window = 30, riskFreeRate = 0.01) {
  const values = await getPortfolioHistory(portfolioId, window + 1);
  if (values.length < window + 1) return null;
  let returns = [];
  for (let i = 1; i < values.length; i++) {
    returns.push((values[i] - values[i - 1]) / values[i - 1]);
  }
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const downside = returns.filter(r => r < 0);
  const downsideDev = Math.sqrt(downside.reduce((a, b) => a + b * b, 0) / (downside.length || 1));
  return (mean - riskFreeRate / 252) / downsideDev * Math.sqrt(252);
}

async function maxDrawdown(portfolioId, window = 30) {
  const values = await getPortfolioHistory(portfolioId, window);
  if (values.length < window) return null;
  let maxDD = 0, peak = values[0];
  for (let v of values) {
    if (v > peak) peak = v;
    const dd = (peak - v) / peak;
    if (dd > maxDD) maxDD = dd;
  }
  return maxDD;
}

async function diversificationScore(portfolioId) {
  // Score based on number of unique symbols and evenness of allocation
  const { rows } = await db.query('SELECT symbol, quantity FROM holdings WHERE portfolio_id=$1', [portfolioId]);
  if (!rows.length) return null;
  const total = rows.reduce((a, b) => a + Number(b.quantity), 0);
  const weights = rows.map(r => Number(r.quantity) / total);
  // Herfindahl-Hirschman Index (lower is more diversified)
  const hhi = weights.reduce((a, b) => a + b * b, 0);
  return 1 - hhi;
}

async function sectorExposure(portfolioId) {
  // Assume holdings table has sector column
  const { rows } = await db.query('SELECT sector, SUM(quantity) as qty FROM holdings WHERE portfolio_id=$1 GROUP BY sector', [portfolioId]);
  return rows.map(r => ({ sector: r.sector, weight: Number(r.qty) }));
}

async function riskMetrics(portfolioId, window = 30) {
  // Value at Risk (VaR) and Conditional VaR (CVaR)
  const values = await getPortfolioHistory(portfolioId, window + 1);
  if (values.length < window + 1) return null;
  let returns = [];
  for (let i = 1; i < values.length; i++) {
    returns.push((values[i] - values[i - 1]) / values[i - 1]);
  }
  returns.sort((a, b) => a - b);
  const var95 = returns[Math.floor(returns.length * 0.05)];
  const cvar95 = returns.filter(r => r <= var95).reduce((a, b) => a + b, 0) / (returns.filter(r => r <= var95).length || 1);
  return { var95, cvar95 };
}

async function customFormula(portfolioId, formula, window = 30) {
  // Provide context: value, cost, pnl, history, holdings
  const values = await getPortfolioHistory(portfolioId, window);
  const { rows: holdings } = await db.query('SELECT * FROM holdings WHERE portfolio_id=$1', [portfolioId]);
  let value = 0, cost = 0;
  for (const h of holdings) {
    value += h.quantity * (h.price || 1);
    cost += h.quantity * h.avg_cost;
  }
  const pnl = value - cost;
  const context = { value, cost, pnl, history: values, holdings };
  try {
    // Only allow safe math evaluation
    return math.evaluate(formula, context);
  } catch (e) {
    return null;
  }
}

module.exports = { timeWeightedReturn, sharpeRatio, sortinoRatio, maxDrawdown, diversificationScore, sectorExposure, riskMetrics, customFormula }; 