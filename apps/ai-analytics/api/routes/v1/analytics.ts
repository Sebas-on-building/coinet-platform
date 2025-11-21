import { Router, Request, Response, NextFunction } from 'express';
import { createProxyMiddleware, responseInterceptor } from 'http-proxy-middleware';
const { volatility, rsi, macd, bollingerBands, anomalyDetection, atr, stochastic, vwap, zScore, sharpeRatio, sortinoRatio, maxDrawdown, alphaBeta, customFormula } = require('../../../alerts/advanced_analytics');

const router = Router();

// Logging middleware for analytics proxy
function logProxy(req: Request, res: Response, next: NextFunction) {
  console.log(`[Analytics Proxy] ${req.method} ${req.originalUrl}`);
  next();
}

// Proxy GET /api/v1/analytics/predict to Python Flask service
router.use(
  '/predict',
  logProxy,
  createProxyMiddleware({
    target: 'http://localhost:5000',
    changeOrigin: true,
    pathRewrite: { '^/api/v1/analytics': '/api/v1/analytics' },
    selfHandleResponse: true,
    // @ts-expect-error onProxyRes is supported by http-proxy-middleware
    onProxyRes: responseInterceptor(async (responseBuffer, proxyRes, req, res) => {
      const response = responseBuffer.toString('utf8');
      // @ts-expect-error originalUrl exists on req
      console.log(`[Analytics Proxy Response] ${req.method} ${req.originalUrl}: ${response}`);
      return responseBuffer;
    })
  })
);

// Proxy POST /api/v1/analytics/train to Python Flask service (if implemented)
router.use(
  '/train',
  logProxy,
  createProxyMiddleware({
    target: 'http://localhost:5000',
    changeOrigin: true,
    pathRewrite: { '^/api/v1/analytics': '/api/v1/analytics' },
    selfHandleResponse: true,
    // @ts-expect-error onProxyRes is supported by http-proxy-middleware
    onProxyRes: responseInterceptor(async (responseBuffer, proxyRes, req, res) => {
      const response = responseBuffer.toString('utf8');
      // @ts-expect-error originalUrl exists on req
      console.log(`[Analytics Proxy Response] ${req.method} ${req.originalUrl}: ${response}`);
      return responseBuffer;
    })
  })
);

// Proxy GET /api/v1/analytics/history to Python Flask service (for historical analytics)
router.use(
  '/history',
  logProxy,
  createProxyMiddleware({
    target: 'http://localhost:5000',
    changeOrigin: true,
    pathRewrite: { '^/api/v1/analytics': '/api/v1/analytics' },
    selfHandleResponse: true,
    // @ts-expect-error onProxyRes is supported by http-proxy-middleware
    onProxyRes: responseInterceptor(async (responseBuffer, proxyRes, req, res) => {
      const response = responseBuffer.toString('utf8');
      // @ts-expect-error originalUrl exists on req
      console.log(`[Analytics Proxy Response] ${req.method} ${req.originalUrl}: ${response}`);
      return responseBuffer;
    })
  })
);

// Proxy GET /api/v1/analytics/health to Python Flask service (for health checks)
router.use(
  '/health',
  logProxy,
  createProxyMiddleware({
    target: 'http://localhost:5000',
    changeOrigin: true,
    pathRewrite: { '^/api/v1/analytics': '/api/v1/analytics' },
    selfHandleResponse: true,
    // @ts-expect-error onProxyRes is supported by http-proxy-middleware
    onProxyRes: responseInterceptor(async (responseBuffer, proxyRes, req, res) => {
      const response = responseBuffer.toString('utf8');
      // @ts-expect-error originalUrl exists on req
      console.log(`[Analytics Proxy Response] ${req.method} ${req.originalUrl}: ${response}`);
      return responseBuffer;
    })
  })
);

// GET /api/v1/analytics/advanced?symbol=BTCUSD&formula=(price-mean)/stdDev
router.get('/advanced', async (req: Request, res: Response) => {
  const symbol = req.query.symbol;
  const formula = req.query.formula;
  if (!symbol) return res.status(400).json({ error: 'symbol required' });
  const [vol, rsiVal, macdVal, bb, anomaly, atrVal, stochasticVal, vwapVal, zScoreVal, sharpe, sortino, drawdown, ab, custom] = await Promise.all([
    volatility(symbol),
    rsi(symbol),
    macd(symbol),
    bollingerBands(symbol),
    anomalyDetection(symbol),
    atr(symbol),
    stochastic(symbol),
    vwap(symbol),
    zScore(symbol),
    sharpeRatio(symbol),
    sortinoRatio(symbol),
    maxDrawdown(symbol),
    alphaBeta(symbol),
    formula ? customFormula(symbol, formula) : null
  ]);
  res.json({ volatility: vol, rsi: rsiVal, macd: macdVal, bollingerBands: bb, anomaly, atr: atrVal, stochastic: stochasticVal, vwap: vwapVal, zScore: zScoreVal, sharpeRatio: sharpe, sortinoRatio: sortino, maxDrawdown: drawdown, alphaBeta: ab, custom });
});

export default router; 