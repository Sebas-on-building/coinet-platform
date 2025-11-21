const { createWSServer } = require('./ws/server');
const { startKafkaConsumer } = require('./kafka/consumer');
const { setupRedisPubSub } = require('./pubsub/redis');
const { setupMetrics } = require('./core/metrics');
const { setupLogger } = require('./core/logger');
const { setupHealthChecks } = require('./core/health');
const { loadPlugins } = require('./plugins/user/customPluginLoader');
const { applyDesignSystem } = require('./design/appleCanvaTradingViewSolana');

const config = require('./config');

(async () => {
  setupLogger();
  setupMetrics();
  setupHealthChecks();
  applyDesignSystem();

  const wss = createWSServer(config.ws);
  const redisPubSub = setupRedisPubSub(config.redis, wss);
  await startKafkaConsumer(config.kafka, wss, redisPubSub);

  loadPlugins(wss);

  console.log('🚀 Coinet Real-Time Server running with Apple/Canva/TradingView/Solana design perfection');
})(); 