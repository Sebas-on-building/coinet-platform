const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const { Kafka } = require('kafkajs');
const Redis = require('ioredis');
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// --- Data Model ---
const db = new Pool({
  user: 'ai',
  host: 'localhost',
  database: 'timescale',
  password: 'ai',
  port: 5432,
});
const redis = new Redis();

// --- Plugin Loader ---
function loadPlugins() {
  const pluginsDir = path.join(__dirname, 'plugins');
  if (!fs.existsSync(pluginsDir)) return [];
  return fs.readdirSync(pluginsDir)
    .filter(f => f.endsWith('.js'))
    .map(f => require(path.join(pluginsDir, f)));
}
const plugins = loadPlugins();

// --- Portfolio Service Class ---
class PortfolioService {
  constructor() {
    this.kafka = new Kafka({ brokers: ['localhost:9092'] });
    this.consumer = this.kafka.consumer({ groupId: 'portfolio-service' });
    this.wss = null; // WebSocket server
  }

  // --- Submodule: Plugin Hook Runner ---
  async runPluginHooks(hook, context) {
    for (const plugin of plugins) {
      if (typeof plugin[hook] === 'function') {
        await plugin[hook](context);
      }
    }
  }

  // --- Submodule: Portfolio Data ---
  async getPortfolio(portfolioId) {
    const { rows: holdings } = await db.query('SELECT * FROM portfolio_holdings WHERE portfolio_id=$1', [portfolioId]);
    let value = 0, cost = 0;
    for (const h of holdings) {
      const { rows: priceRows } = await db.query('SELECT price FROM market_data WHERE symbol=$1 ORDER BY time DESC LIMIT 1', [h.symbol]);
      const price = priceRows[0]?.price || 0;
      value += h.quantity * price;
      cost += h.quantity * h.avg_cost;
    }
    const pnl = value - cost;
    return { holdings, value, pnl };
  }

  // --- Submodule: Add/Update Holding ---
  async upsertHolding(portfolioId, symbol, quantity, avg_cost) {
    await db.query(
      `INSERT INTO portfolio_holdings (portfolio_id, symbol, quantity, avg_cost)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (portfolio_id, symbol) DO UPDATE SET quantity = $3, avg_cost = $4`,
      [portfolioId, symbol, quantity, avg_cost]
    );
  }

  // --- Submodule: Transaction Simulation ---
  async simulateTransaction(portfolioId, symbol, quantity, price, type) {
    // Record transaction
    await db.query(
      `INSERT INTO portfolio_transactions (portfolio_id, symbol, quantity, price, type, time)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [portfolioId, symbol, quantity, price, type]
    );
    // Update holdings
    const { rows } = await db.query('SELECT quantity, avg_cost FROM portfolio_holdings WHERE portfolio_id=$1 AND symbol=$2', [portfolioId, symbol]);
    let newQty = quantity, newCost = price;
    if (rows.length) {
      if (type === 'buy') {
        newQty += rows[0].quantity;
        newCost = ((rows[0].quantity * rows[0].avg_cost) + (quantity * price)) / newQty;
      } else if (type === 'sell') {
        newQty = rows[0].quantity - quantity;
        newCost = rows[0].avg_cost;
      }
    }
    await this.upsertHolding(portfolioId, symbol, newQty, newCost);
  }

  // --- Submodule: Real-Time Valuation Engine ---
  async updatePortfolioOnTick(tick) {
    const { rows: portfolios } = await db.query(
      'SELECT p.id, h.quantity, h.avg_cost FROM portfolio_holdings h JOIN portfolios p ON h.portfolio_id=p.id WHERE h.symbol=$1',
      [tick.symbol]
    );
    for (const row of portfolios) {
      const marketValue = parseFloat(tick.price) * parseFloat(row.quantity);
      await redis.hset(`portfolio:${row.id}:value`, tick.symbol, marketValue);
      const pnl = (parseFloat(tick.price) - parseFloat(row.avg_cost)) * parseFloat(row.quantity);
      await redis.hset(`portfolio:${row.id}:pnl`, tick.symbol, pnl);
      await this.pushPortfolioUpdate(row.id, { symbol: tick.symbol, value: marketValue, pnl, time: new Date().toISOString() });
      // --- Plugin: onPortfolioTick ---
      await this.runPluginHooks('onPortfolioTick', {
        portfolioId: row.id,
        symbol: tick.symbol,
        price: parseFloat(tick.price),
        value: marketValue,
        pnl,
        // Add user info or other context as needed
      });
      // --- Plugin: onAlertCheck ---
      await this.runPluginHooks('onAlertCheck', {
        portfolioId: row.id,
        symbol: tick.symbol,
        price: parseFloat(tick.price),
        value: marketValue,
        pnl,
        // Add user info or other context as needed
      });
    }
  }

  // --- Submodule: Real-Time WebSocket Push ---
  async pushPortfolioUpdate(portfolioId, update) {
    if (!this.wss) return;
    this.wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN && client.portfolioId === portfolioId) {
        client.send(JSON.stringify(update));
      }
    });
  }

  // --- Submodule: Kafka Consumer ---
  async startKafkaConsumer() {
    await this.consumer.connect();
    await this.consumer.subscribe({ topic: 'market.ticks', fromBeginning: false });
    await this.consumer.run({
      eachMessage: async ({ message }) => {
        const tick = JSON.parse(message.value.toString());
        await this.updatePortfolioOnTick(tick);
      },
    });
  }

  // --- Submodule: WebSocket Server ---
  startWebSocketServer(server) {
    this.wss = new WebSocket.Server({ server });
    this.wss.on('connection', (ws, req) => {
      // Parse portfolioId from query string
      const url = new URL(req.url, `http://${req.headers.host}`);
      ws.portfolioId = url.searchParams.get('portfolioId');
    });
  }
}

// --- Express API Setup ---
const app = express();
app.use(express.json());
const service = new PortfolioService();

app.get('/api/v1/portfolios/:id', async (req, res) => {
  const data = await service.getPortfolio(req.params.id);
  res.json(data);
});

app.post('/api/v1/portfolios/:id/holdings', async (req, res) => {
  const { symbol, quantity, avg_cost } = req.body;
  await service.upsertHolding(req.params.id, symbol, quantity, avg_cost);
  res.status(201).json({ success: true });
});

app.post('/api/v1/portfolios/:id/transactions', async (req, res) => {
  const { symbol, quantity, price, type } = req.body;
  await service.simulateTransaction(req.params.id, symbol, quantity, price, type);
  res.status(201).json({ success: true });
});

const server = http.createServer(app);
service.startWebSocketServer(server);
service.startKafkaConsumer();

server.listen(4000, () => {
  console.log('Portfolio Service running on http://localhost:4000');
}); 