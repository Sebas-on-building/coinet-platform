const express = require('express');
const { ApolloServer, gql } = require('apollo-server-express');
const { Kafka } = require('kafkajs');
const Redis = require('ioredis');
const { Pool } = require('pg');
const strategyTypes = require('./plugins/strategyTypes');
const math = require('mathjs');
const axios = require('axios');
const { Logger, correlationIdMiddleware, withRequestIdHeaders } = require('./logger');
const { errorHandler, retry, CircuitBreaker, withFallback } = require('./errorHandler');
const { metricsMiddleware, metricsEndpoint, activeWebsockets, alertsTriggered, dbQueryDuration, cacheHits, cacheMisses, kafkaConsumerLag } = require('./metrics');
const validation = require('./validation');
const { createHTTPSServer } = require('./https_server');
const { corsMiddleware } = require('./cors');
const { authenticateWS } = require('./ws_auth');
const WebSocket = require('ws');
const { getJWTSecret, getJWTKeySet } = require('./jwt_secrets');
const { createDBPool } = require('./db_acl');
const { generalRateLimiter, authRateLimiter } = require('./rate_limit');
const { requirePermission, canWithCustomRules } = require('./rbac');

// --- Data Model ---
const db = createDBPool();
const redis = new Redis();

// --- Async Secrets Loading at Startup ---
let jwtSecret, jwtKeys;
(async () => {
  jwtSecret = await getJWTSecret();
  jwtKeys = await getJWTKeySet();
})();
// Use db, jwtSecret, jwtKeys in all downstream code

// --- Context Helpers for Strategy Evaluation ---
class StrategyContext {
  constructor(historicalData) {
    this.historicalData = historicalData;
    this.cache = {};
  }
  getMA(symbol, period) {
    const prices = this.historicalData[symbol]?.slice(-period).map(t => t.price) || [];
    if (!prices.length) return 0;
    return prices.reduce((a, b) => a + b, 0) / prices.length;
  }
  getRSI(symbol, period) {
    const data = this.historicalData[symbol]?.slice(-period - 1) || [];
    if (data.length < period + 1) return 0;
    let gains = 0, losses = 0;
    for (let i = 1; i < data.length; i++) {
      const diff = data[i].price - data[i - 1].price;
      if (diff > 0) gains += diff;
      else losses -= diff;
    }
    const avgGain = gains / period;
    const avgLoss = losses / period;
    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - 100 / (1 + rs);
  }
  evaluateFormula(formula, context) {
    return math.evaluate(formula, context);
  }
}

// --- Submodule: Price Window Manager ---
class PriceWindow {
  constructor(size) {
    this.size = size;
    this.window = [];
  }
  update(price) {
    this.window.push(price);
    if (this.window.length > this.size) this.window.shift();
    return this.window;
  }
  getLast(n) {
    return this.window.slice(-n);
  }
}

// --- Submodule: Moving Average Crossover with Position State ---
class MovingAverageCrossoverStrategy {
  constructor(short, long) {
    this.short = short;
    this.long = long;
    this.priceWindow = new PriceWindow(long);
    this.inPosition = false;
  }
  getMA(symbol, period) {
    const window = this.priceWindow.getLast(period);
    if (!window.length) return 0;
    return window.reduce((a, b) => a + b, 0) / window.length;
  }
  onTick(tick) {
    const window = this.priceWindow.update(tick.price);
    if (window.length < this.long) return null;
    const shortMA = this.getMA(tick.symbol, this.short);
    const longMA = this.getMA(tick.symbol, this.long);
    if (shortMA > longMA && !this.inPosition) {
      this.inPosition = true;
      return { signal: 'BUY', price: tick.price };
    } else if (shortMA < longMA && this.inPosition) {
      this.inPosition = false;
      return { signal: 'SELL', price: tick.price };
    }
    return null;
  }
}

function mean(arr) {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

// --- Strategy Service Class ---
class StrategyService {
  constructor() {
    this.kafka = new Kafka({ brokers: ['localhost:9092'] });
    this.producer = this.kafka.producer();
    this.consumer = this.kafka.consumer({ groupId: 'strategy-engine' });
  }

  // --- Submodule: Create Strategy ---
  async createStrategy(userId, name, definition) {
    const { rows } = await timedDbQuery(
      `INSERT INTO strategies (user_id, name, definition) VALUES ($1, $2, $3) RETURNING *`,
      [userId, name, definition]
    );
    return rows[0];
  }

  // --- Submodule: List Strategies ---
  async listStrategies(userId) {
    const { rows } = await timedDbQuery('SELECT * FROM strategies WHERE user_id=$1', [userId]);
    return rows;
  }

  // --- Submodule: Delete Strategy ---
  async deleteStrategy(userId, id) {
    await timedDbQuery('DELETE FROM strategies WHERE user_id=$1 AND id=$2', [userId, id]);
    return true;
  }

  // --- Submodule: Parse Strategy (JSON/DSL to Executable) ---
  parseStrategy(definition, context) {
    if (typeof definition === 'string') definition = JSON.parse(definition);
    if (definition.type && strategyTypes.getStrategyType(definition.type)) {
      return strategyTypes.getStrategyType(definition.type)(definition, context);
    }
    // Fallback: simple condition parser
    const { symbol, condition } = definition;
    if (/crosses above (\d+)/.test(condition)) {
      const threshold = parseFloat(condition.match(/crosses above (\d+)/)[1]);
      return (tick, prevTick) => prevTick && prevTick.price <= threshold && tick.price > threshold;
    }
    return () => false;
  }

  // --- Submodule: Historical OHLC Loader ---
  async loadOHLC(symbol, start, end, interval = '1m') {
    // Use retry and fallback to cache if DB fails
    return await withFallback(
      () => retry(async () => {
        const { rows } = await timedDbQuery(
          `SELECT time, open, high, low, close, volume FROM ohlc_data WHERE symbol=$1 AND time BETWEEN $2 AND $3 AND interval=$4 ORDER BY time ASC`,
          [symbol, start, end, interval]
        );
        return rows;
      }, { retries: 3 }),
      async () => {
        logger.warn('Falling back to cached OHLC', { symbol });
        // Example: return empty array or last known cache
        return [];
      }
    );
  }

  // --- Submodule: ML Model Integration ---
  async getMLPrediction(symbol, features, requestId) {
    const breaker = new CircuitBreaker(async () => {
      return await retry(() => axios.post('http://localhost:4001/api/v1/analytics/predict', { symbol, features }, { headers: withRequestIdHeaders(requestId) }), { retries: 3 });
    });
    try {
      const res = await withFallback(
        () => breaker.call(),
        async () => ({ data: { prediction: null } }) // fallback: return null prediction
      );
      return res.data.prediction;
    } catch (err) {
      logger.error('ML prediction failed', { requestId, symbol, error: err.message });
      return null;
    }
  }

  // --- Enhanced Backtesting Engine with OHLC and ML ---
  async backtestStrategy(strategyId, start, end, requestId) {
    const { rows: [strategy] } = await timedDbQuery('SELECT * FROM strategies WHERE id=$1', [strategyId]);
    // Load OHLC data
    const ohlc = await this.loadOHLC(strategy.definition.symbol, start, end);
    let signals = [], returns = 0, maxDrawdown = 0, peak = 0, value = 10000;
    const strat = new MovingAverageCrossoverStrategy(5, 20);
    for (const bar of ohlc) {
      const tick = { price: bar.close };
      const result = strat.onTick(tick);
      if (result) {
        logger.info('Signal generated', { requestId, strategyId, time: bar.time, ...result });
        signals.push({ time: bar.time, ...result });
      }
      // Optionally: integrate ML prediction
      // try {
      //   const mlSignal = await this.getMLPrediction(strategy.definition.symbol, { price: bar.close }, requestId);
      //   logger.info('ML prediction', { requestId, strategyId, time: bar.time, mlSignal });
      // } catch (err) {
      //   logger.error('ML prediction failed', { requestId, strategyId, error: err.message });
      // }
      value += Math.random() * 10 - 5; // Placeholder for P&L
      if (value > peak) peak = value;
      const dd = (peak - value) / peak;
      if (dd > maxDrawdown) maxDrawdown = dd;
    }
    returns = value - 10000;
    return { signals, returns, maxDrawdown };
  }

  // --- Enhanced Real-Time Engine with Price Window and ML ---
  async startRealTimeEngine() {
    await this.consumer.connect();
    await this.consumer.subscribe({ topic: 'market.ticks', fromBeginning: false });
    const { rows: strategies } = await timedDbQuery('SELECT * FROM strategies');
    const parsed = strategies.map(s => {
      if (s.definition.type === 'ma_crossover') {
        return { ...s, strat: new MovingAverageCrossoverStrategy(5, 20) };
      }
      return s;
    });
    await this.consumer.run({
      eachMessage: async ({ message }) => {
        const tick = JSON.parse(message.value.toString());
        for (const s of parsed) {
          if (s.definition.symbol === tick.symbol && s.strat) {
            const result = s.strat.onTick(tick);
            if (result) {
              logger.info('Real-time signal', { strategyId: s.id, symbol: tick.symbol, time: tick.time, ...result });
              await this.producer.send({
                topic: 'strategy.signals',
                messages: [{ value: JSON.stringify({ strategyId: s.id, symbol: tick.symbol, time: tick.time, ...result }) }],
              });
            }
          }
          // Optionally: integrate ML prediction
          // try {
          //   const mlSignal = await this.getMLPrediction(tick.symbol, { price: tick.price }, tick.requestId);
          //   logger.info('Real-time ML prediction', { strategyId: s.id, symbol: tick.symbol, time: tick.time, mlSignal });
          // } catch (err) {
          //   logger.error('Real-time ML prediction failed', { strategyId: s.id, symbol: tick.symbol, error: err.message });
          // }
        }
      },
    });
  }

  // --- Express API Setup ---
  startWebSocketServer(server) {
    if (!activeWebsockets) return;
    this.wss = new WebSocket.Server({ server });
    this.wss.on('connection', (ws, req) => {
      activeWebsockets.inc();
      ws.on('close', () => activeWebsockets.dec());
    });
  }

  triggerAlert() {
    if (alertsTriggered) alertsTriggered.inc();
    // ... alert logic ...
  }
}

// --- REST & GraphQL API Setup ---
const app = express();
app.use(express.json());
app.use(metricsMiddleware); // HTTP metrics
app.use(correlationIdMiddleware);
app.use(corsMiddleware);
const service = new StrategyService();

// --- Apply General Rate Limiter Globally ---
app.use(generalRateLimiter());

// --- Apply Auth Rate Limiter to Auth Routes ---
app.use('/api/auth', authRateLimiter());

// REST Endpoints (with validation)
app.post('/api/v1/strategies', requirePermission('create', 'strategy'), async (req, res) => {
  try {
    // Validate input
    const { valid, error, value } = validation.validateWithSchema(req.body, validation.strategySchema);
    if (!valid) return res.status(400).json({ status: 400, error: 'InvalidInput', message: error.message });
    // Sanitize name
    value.name = validation.sanitizeString(value.name, 64);
    const strategy = await service.createStrategy(value.userId, value.name, value.definition);
    logger.info('Strategy created', { userId: value.userId, requestId: req.requestId, strategyId: strategy.id });
    res.status(201).json(strategy);
  } catch (err) {
    logger.error('Failed to create strategy', { error: err.message, requestId: req.requestId });
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/v1/strategies', requirePermission('read', 'strategy'), async (req, res) => {
  try {
    const { userId } = req.query;
    const strategies = await service.listStrategies(userId);
    logger.info('Listed strategies', { userId, requestId: req.requestId });
    res.json(strategies);
  } catch (err) {
    logger.error('Failed to list strategies', { error: err.message, requestId: req.requestId });
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/v1/strategies/:id', async (req, res) => {
  try {
    const { userId } = req.body;
    await service.deleteStrategy(userId, req.params.id);
    logger.info('Strategy deleted', { userId, requestId: req.requestId, strategyId: req.params.id });
    res.json({ success: true });
  } catch (err) {
    logger.error('Failed to delete strategy', { error: err.message, requestId: req.requestId });
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/v1/strategies/:id/run', async (req, res) => {
  try {
    const { start, end } = req.body;
    const result = await service.backtestStrategy(req.params.id, start, end, req.requestId);
    logger.info('Strategy backtest run', { requestId: req.requestId, strategyId: req.params.id });
    res.json(result);
  } catch (err) {
    logger.error('Failed to backtest strategy', { error: err.message, requestId: req.requestId });
    res.status(500).json({ error: err.message });
  }
});

// --- /metrics endpoint for Prometheus ---
app.get('/metrics', metricsEndpoint);

// GraphQL API
const typeDefs = gql`
  type Strategy {
    id: ID!
    user_id: String!
    name: String!
    definition: JSON
  }
  scalar JSON
  type Query {
    strategies(userId: String!): [Strategy]
  }
  type Mutation {
    createStrategy(input: CreateStrategyInput!): Strategy
    deleteStrategy(id: ID!, userId: String!): Boolean
    runStrategy(id: ID!, start: String!, end: String!): JSON
  }
  input CreateStrategyInput {
    userId: String!
    name: String!
    definition: JSON!
  }
`;
const resolvers = {
  Query: {
    strategies: (_, { userId }) => {
      if (!validation.validateUsername(userId)) throw new Error('Invalid userId');
      return service.listStrategies(userId);
    },
  },
  Mutation: {
    createStrategy: async (_, { input }) => {
      const { valid, error, value } = validation.validateWithSchema(input, validation.strategySchema);
      if (!valid) throw new Error(error.message);
      value.name = validation.sanitizeString(value.name, 64);
      return service.createStrategy(value.userId, value.name, value.definition);
    },
    deleteStrategy: async (_, { id, userId }) => {
      if (!validation.validateUsername(userId)) throw new Error('Invalid userId');
      return service.deleteStrategy(userId, id);
    },
    runStrategy: async (_, { id, start, end }) => service.backtestStrategy(id, start, end),
  },
};
const apollo = new ApolloServer({ typeDefs, resolvers });
(async () => {
  await apollo.start();
  apollo.applyMiddleware({ app });
})();

// Start Real-Time Engine
service.startRealTimeEngine();

// At the end of Express setup, add errorHandler
app.use(errorHandler);

// --- Create HTTPS Server and WebSocket Server ---
const httpsServer = createHTTPSServer(app);
const wss = new WebSocket.Server({ server: httpsServer, verifyClient: authenticateWS });
wss.on('connection', (ws, req) => {
  if (activeWebsockets) activeWebsockets.inc();
  ws.on('close', () => { if (activeWebsockets) activeWebsockets.dec(); });
});

// --- Start HTTPS Server ---
httpsServer.listen(4100, () => {
  logger.info('Strategy Service running securely on https://localhost:4100');
});

// --- Helper: Timed DB Query ---
async function timedDbQuery(query, params) {
  if (!dbQueryDuration) return db.query(query, params);
  const end = dbQueryDuration.startTimer();
  try {
    return await db.query(query, params);
  } finally {
    end();
  }
}

// --- Helper: Cache Get with Metrics ---
async function cacheGet(key) {
  const value = await redis.get(key);
  if (value !== null) {
    if (cacheHits) cacheHits.inc();
  } else {
    if (cacheMisses) cacheMisses.inc();
  }
  return value;
}

// --- Helper: Update Kafka Consumer Lag ---
function updateKafkaConsumerLag(topic, partition, lag) {
  if (kafkaConsumerLag) kafkaConsumerLag.set({ topic, partition }, lag);
}

// --- Use JWT Secret/KeySet for All JWT Operations ---
// Example: const jwtSecret = getJWTSecret();
// Example: const jwtKeys = getJWTKeySet();
// Use with your JWT library (jsonwebtoken, jose, etc) 