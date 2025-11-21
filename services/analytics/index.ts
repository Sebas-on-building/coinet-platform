import express, { Request } from 'express';
import { query as tsQuery } from './db/timescale';
import { fetchIndicators, fetchChartData } from './adapters/tradingView';
import { fetchOnchainMetrics } from './adapters/glassnode';
import { fetchMarketSentiment } from './adapters/coinank';
import { sendEvent } from './kafka/producer';
import { requireRole, requireAnyRole } from './middleware/rbac';
import { setupAnalyticsStream, broadcastAnalyticsEvent } from './ws/analyticsStream';

const app = express();
app.use(express.json());

// --- Atomic Endpoint: Compute Indicators (TradingView, TimescaleDB) ---
app.post('/indicators', requireAnyRole(['pro', 'analyst', 'admin']), async (req: Request, res) => {
  try {
    const { symbol, interval } = req.body;
    const indicators = await fetchIndicators(symbol, interval);
    await sendEvent('analytics_audit', { userId: req.user?.id, event: 'indicators', symbol, interval });
    broadcastAnalyticsEvent({ type: 'indicators', symbol, interval, indicators });
    res.json(indicators);
  } catch (err) {
    const error = err as Error;
    res.status(500).json({ error: error.message });
  }
});

// --- Atomic Endpoint: Backtest (TimescaleDB) ---
app.post('/backtest', requireAnyRole(['pro', 'analyst', 'admin']), async (req: Request, res) => {
  try {
    const { symbol, strategy, interval } = req.body;
    // Example: fetch historical data from TimescaleDB
    const data = await tsQuery('SELECT * FROM market_data WHERE symbol = $1 AND interval = $2', [symbol, interval]);
    // Run backtest (placeholder)
    const result = { profit: 0.12, trades: 42, sharpe: 1.8 };
    await sendEvent('analytics_audit', { userId: req.user?.id, event: 'backtest', symbol, strategy });
    broadcastAnalyticsEvent({ type: 'backtest', symbol, strategy, result });
    res.json(result);
  } catch (err) {
    const error = err as Error;
    res.status(500).json({ error: error.message });
  }
});

// --- Atomic Endpoint: Risk Analytics (PostgreSQL, TimescaleDB, AI) ---
app.get('/risk/:userId', requireAnyRole(['pro', 'analyst', 'admin']), async (req: Request, res) => {
  try {
    const { userId } = req.params;
    // Example: fetch user portfolio and risk metrics
    const risk = { valueAtRisk: 0.05, maxDrawdown: 0.2, beta: 1.1 };
    await sendEvent('analytics_audit', { userId, event: 'risk_analytics' });
    broadcastAnalyticsEvent({ type: 'risk', userId, risk });
    res.json(risk);
  } catch (err) {
    const error = err as Error;
    res.status(500).json({ error: error.message });
  }
});

// --- Atomic Endpoint: Onchain Metrics (Glassnode) ---
app.get('/onchain/:symbol/:metric', requireAnyRole(['pro', 'analyst', 'admin']), async (req: Request, res) => {
  try {
    const { symbol, metric } = req.params;
    const data = await fetchOnchainMetrics(symbol, metric);
    await sendEvent('analytics_audit', { userId: req.user?.id, event: 'onchain_metrics', symbol, metric });
    broadcastAnalyticsEvent({ type: 'onchain', symbol, metric, data });
    res.json(data);
  } catch (err) {
    const error = err as Error;
    res.status(500).json({ error: error.message });
  }
});

// --- Atomic Endpoint: Market Sentiment (CoinAnk) ---
app.get('/sentiment/:symbol', requireAnyRole(['pro', 'analyst', 'admin']), async (req: Request, res) => {
  try {
    const { symbol } = req.params;
    const data = await fetchMarketSentiment(symbol);
    await sendEvent('analytics_audit', { userId: req.user?.id, event: 'market_sentiment', symbol });
    broadcastAnalyticsEvent({ type: 'sentiment', symbol, data });
    res.json(data);
  } catch (err) {
    const error = err as Error;
    res.status(500).json({ error: error.message });
  }
});

// --- WebSocket Streaming Setup ---
const server = app.listen(4003, () => console.log('AnalyticsService running on port 4003'));
setupAnalyticsStream(server); 