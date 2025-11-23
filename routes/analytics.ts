import express from 'express';
import { queryMarketTicks, queryCrossMarketCorrelation } from '../services/analytics/clickhouse';
import { detectAnomalies, forecastPrices } from '../services/analytics/ai';
import { runPlugin } from '../services/analytics/plugins';
import { verifyToken } from '../middleware/auth';
import { Parser } from 'json2csv';
import { createCanvas } from 'canvas';
import * as cache from '../services/cache';

const router = express.Router();

router.get('/market-ticks', async (req, res) => {
  const { symbol, from, to, limit } = req.query;
  const key = `${symbol || ''}:${from || ''}:${to || ''}:${limit || ''}`;
  const data = await cache.cacheQuery(key, () => queryMarketTicks({ symbol, from, to, limit: Number(limit) }), 5);
  res.json(data);
});

router.get('/correlation', async (req, res) => {
  const { symbolA, symbolB, from, to } = req.query;
  const data = await queryCrossMarketCorrelation(symbolA as string, symbolB as string, from as string, to as string);
  res.json(data);
});

router.get('/anomalies', async (req, res) => {
  const { symbol, from, to } = req.query;
  const data = await detectAnomalies(symbol as string, from as string, to as string);
  res.json(data);
});

router.get('/forecast', async (req, res) => {
  const { symbol, from, to } = req.query;
  const data = await forecastPrices(symbol as string, from as string, to as string);
  res.json(data);
});

router.post('/plugin', async (req, res) => {
  const { id, params } = req.body;
  try {
    const result = await runPlugin(id, params);
    res.json(result);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.get('/export/csv', async (req, res) => {
  const { symbol, from, to } = req.query;
  const data = await queryMarketTicks({ symbol, from, to, limit: 1000 });
  const parser = new Parser();
  const csv = parser.parse(data);
  res.header('Content-Type', 'text/csv');
  res.attachment('market_data.csv');
  res.send(csv);
});

router.get('/export/png', async (req, res) => {
  const canvas = createCanvas(800, 400);
  const ctx = canvas.getContext('2d');
  // ...draw chart...
  res.type('png');
  canvas.pngStream().pipe(res);
});

router.post('/adhoc', verifyToken, async (req, res) => {
  const { query } = req.body;
  if (!/^\s*select/i.test(query)) {
    return res.status(400).json({ error: 'Only SELECT queries are allowed.' });
  }
  const result = await clickhouse.query({ query, format: 'JSONEachRow' });
  res.json(await result.json());
});

// Leaderboard Endpoints
router.post('/leaderboard', async (req, res) => {
  const { board, user, score } = req.body;
  await cache.addLeaderboardScore(board, user, score);
  res.json({ ok: true });
});
router.get('/leaderboard', async (req, res) => {
  const { board, count } = req.query;
  const data = await cache.getLeaderboard(board as string, Number(count) || 10);
  res.json(data);
});

// Pub/Sub Demo: Publish Alert
router.post('/alerts', async (req, res) => {
  const { message } = req.body;
  await cache.publish('alerts-channel', message);
  res.json({ ok: true });
});

export default router; 