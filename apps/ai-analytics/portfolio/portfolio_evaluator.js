const { Kafka } = require('kafkajs');
const Redis = require('ioredis');
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const kafka = new Kafka({ brokers: ['localhost:9092'] });
const consumer = kafka.consumer({ groupId: 'portfolio-evaluator' });
const redis = new Redis();
const db = new Pool({
  user: 'ai',
  host: 'localhost',
  database: 'timescale',
  password: 'ai',
  port: 5432,
});

// --- Plugin Loader ---
function loadPlugins() {
  const pluginsDir = path.join(__dirname, 'plugins');
  if (!fs.existsSync(pluginsDir)) return [];
  return fs.readdirSync(pluginsDir)
    .filter(f => f.endsWith('.js'))
    .map(f => require(path.join(pluginsDir, f)));
}
const plugins = loadPlugins();

// --- Submodule 1: Value Update ---
async function updatePortfolioValue(portfolioId, symbol, price, quantity) {
  const marketValue = price * quantity;
  await redis.hset(`portfolio:${portfolioId}:value`, symbol, marketValue);
  return marketValue;
}

// --- Submodule 2: P&L Calculation ---
async function calculatePnL(price, avgCost, quantity) {
  return (price - avgCost) * quantity;
}

// --- Submodule 3: Redis Cache Update ---
async function cachePortfolioPnL(portfolioId, symbol, pnl) {
  await redis.hset(`portfolio:${portfolioId}:pnl`, symbol, pnl);
}

// --- Submodule 4: Real-Time Push (Kafka/WebSocket) ---
async function pushPortfolioUpdate(portfolioId, update) {
  await redis.publish(`portfolio-updates:${portfolioId}`, JSON.stringify(update));
  // Optionally: push to Kafka or WebSocket server here
}

// --- Submodule 5: Alert Trigger ---
async function triggerAlerts(portfolioId, symbol, price, pnl) {
  // Built-in alert logic (placeholder)
  // ...
  // Plugin-based alerts
  await runPluginHooks('onAlertCheck', { portfolioId, symbol, price, pnl });
}

// --- Submodule 6: Audit Log ---
async function auditLog(event, details) {
  // Placeholder: log to DB or external service
  // e.g., await db.query('INSERT INTO audit_log ...', ...)
}

// --- Submodule 7: Extensible Plugin Hooks ---
async function runPluginHooks(hook, context) {
  for (const plugin of plugins) {
    if (typeof plugin[hook] === 'function') {
      await plugin[hook](context);
    }
  }
}

// --- Main Tick Handler ---
async function handleTick(tick) {
  // 1. Find all portfolios holding this symbol
  const { rows: holdings } = await db.query(
    'SELECT p.id as portfolio_id, h.quantity, h.avg_cost FROM portfolio_holdings h JOIN portfolios p ON h.portfolio_id=p.id WHERE h.symbol=$1',
    [tick.symbol]
  );
  for (const row of holdings) {
    // 2. Update value
    const value = await updatePortfolioValue(row.portfolio_id, tick.symbol, parseFloat(tick.price), parseFloat(row.quantity));
    // 3. Calculate P&L
    const pnl = await calculatePnL(parseFloat(tick.price), parseFloat(row.avg_cost), parseFloat(row.quantity));
    // 4. Cache P&L
    await cachePortfolioPnL(row.portfolio_id, tick.symbol, pnl);
    // 5. Push real-time update
    await pushPortfolioUpdate(row.portfolio_id, { symbol: tick.symbol, value, pnl, time: new Date().toISOString() });
    // 6. Trigger alerts
    await triggerAlerts(row.portfolio_id, tick.symbol, parseFloat(tick.price), pnl);
    // 7. Audit log
    await auditLog('portfolio_tick', { portfolioId: row.portfolio_id, symbol: tick.symbol, price: tick.price, value, pnl });
    // 8. Plugin hooks
    await runPluginHooks('onPortfolioTick', { portfolioId: row.portfolio_id, symbol: tick.symbol, price: tick.price, value, pnl });
  }
}

// --- Kafka Consumer Loop ---
async function run() {
  await consumer.connect();
  await consumer.subscribe({ topic: 'market.ticks', fromBeginning: false });
  await consumer.run({
    eachMessage: async ({ message }) => {
      const tick = JSON.parse(message.value.toString());
      await handleTick(tick);
    },
  });
}

run().catch(console.error); 