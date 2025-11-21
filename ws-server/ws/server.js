const WebSocket = require('ws');
const { Kafka } = require('kafkajs');
const Redis = require('ioredis');
const topics = require('../kafka/topics');
const config = require('../config');
const { authenticateJWT } = require('../core/auth');
const { handleRBAC } = require('../core/rbac');
const { handlePresence } = require('./presence');
const { handleSubscriptions } = require('./subscriptions');
const { handleMessageRouter } = require('./messageRouter');
const { auditLog } = require('./audit');

const wss = new WebSocket.Server({ port: 8080 });
const redis = new Redis();
const redisSub = new Redis();

// Map: symbol -> Set of ws clients
const symbolClients = new Map();

function subscribeClient(ws, symbol) {
  if (!symbolClients.has(symbol)) symbolClients.set(symbol, new Set());
  symbolClients.get(symbol).add(ws);
  ws.subscriptions.add(symbol);
}
function unsubscribeClient(ws, symbol) {
  if (symbolClients.has(symbol)) symbolClients.get(symbol).delete(ws);
  ws.subscriptions.delete(symbol);
}
function cleanupClient(ws) {
  for (const symbol of ws.subscriptions) {
    unsubscribeClient(ws, symbol);
  }
}

wss.on('connection', async (ws, req) => {
  ws.subscriptions = new Set();
  ws.user = await authenticateJWT(req);
  handleRBAC(ws);
  handlePresence(ws, wss);
  handleSubscriptions(ws);
  handleMessageRouter(ws, wss);
  auditLog('connection', ws.user);

  ws.on('message', msg => {
    try {
      const data = JSON.parse(msg);
      if (data.subscribe) subscribeClient(ws, data.subscribe);
      if (data.unsubscribe) unsubscribeClient(ws, data.unsubscribe);
    } catch { }
  });

  ws.on('close', () => {
    auditLog('disconnect', ws.user);
    cleanupClient(ws);
  });
});

// Kafka -> Redis pub/sub for scale-out
async function startKafkaToRedis() {
  const kafka = new Kafka({ brokers: config.kafka.brokers });
  const consumer = kafka.consumer({ groupId: 'ws-kafka-group' });
  await consumer.connect();
  await consumer.subscribe({ topic: topics.MARKET_TICKS, fromBeginning: false });
  await consumer.run({
    eachMessage: async ({ message }) => {
      const tick = JSON.parse(message.value.toString());
      // Publish to Redis channel per symbol
      if (tick.symbol) redis.publish(`symbol:${tick.symbol}`, JSON.stringify(tick));
    }
  });
}

// Redis -> WS clients
function startRedisToWS() {
  redisSub.psubscribe('symbol:*');
  redisSub.on('pmessage', (pattern, channel, message) => {
    const symbol = channel.split(':')[1];
    const tick = JSON.parse(message);
    const clients = symbolClients.get(symbol);
    if (clients) {
      for (const ws of clients) {
        if (ws.readyState === 1) ws.send(JSON.stringify(tick));
      }
    }
  });
}

startKafkaToRedis();
startRedisToWS();

module.exports = { wss }; 