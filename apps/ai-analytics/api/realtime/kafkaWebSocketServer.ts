import { WebSocketServer, WebSocket } from 'ws';
import { Kafka, Consumer } from 'kafkajs';
import redis from 'redis';
import jwt, { JwtPayload } from 'jsonwebtoken';
import fs from 'fs';
import client from 'prom-client';

const kafka = new Kafka({
  clientId: 'coinnet-realtime',
  brokers: [process.env.KAFKA_BROKER!],
});
const redisClient = redis.createClient({ url: process.env.REDIS_URL });
redisClient.connect();

const wss = new WebSocketServer({ noServer: true });
const symbolClients = new Map<string, Set<any>>(); // symbol -> Set of ws
const symbolConsumers = new Map<string, Consumer>();

// Extend WebSocket type to allow user property
interface AuthenticatedWebSocket extends WebSocket {
  user?: any;
}

// Prometheus metrics
const wsConnections = new client.Gauge({ name: 'ws_connections', help: 'Number of active WebSocket connections' });
const wsMessages = new client.Counter({ name: 'ws_messages_total', help: 'Total WebSocket messages received', labelNames: ['event'] });
const wsAuthFailures = new client.Counter({ name: 'ws_auth_failures', help: 'WebSocket authentication failures' });

// Audit log
function auditLog(userId: string, action: string, details?: any) {
  const entry = {
    user: userId,
    action,
    details,
    timestamp: new Date().toISOString(),
  };
  fs.appendFile('logs/ws-audit.log', JSON.stringify(entry) + '\n', err => {
    if (err) console.error('WS Audit log error:', err);
  });
}

// JWT authentication and RBAC
function authenticateAndAuthorize(token: string, requiredScopes: string[] = []): { user: any, error?: string } {
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
    const scopes = (payload as any).scopes || [];
    if (requiredScopes.length && !requiredScopes.every(scope => scopes.includes(scope))) {
      return { user: null, error: 'Insufficient permissions' };
    }
    return { user: payload };
  } catch {
    return { user: null, error: 'Invalid or expired token' };
  }
}

// Subscribe client to symbol
function subscribeClientToSymbol(ws: any, symbol: string) {
  if (!symbolClients.has(symbol)) {
    symbolClients.set(symbol, new Set());
    startKafkaConsumerForSymbol(symbol);
  }
  symbolClients.get(symbol)!.add(ws);
}

// Unsubscribe client from symbol
function unsubscribeClientFromSymbol(ws: any, symbol: string) {
  if (symbolClients.has(symbol)) {
    symbolClients.get(symbol)!.delete(ws);
    if (symbolClients.get(symbol)!.size === 0) {
      stopKafkaConsumerForSymbol(symbol);
      symbolClients.delete(symbol);
    }
  }
}

// Start Kafka consumer for a symbol
async function startKafkaConsumerForSymbol(symbol: string) {
  if (symbolConsumers.has(symbol)) return;
  const consumer = kafka.consumer({ groupId: `ws-group-${symbol}` });
  await consumer.connect();
  await consumer.subscribe({ topic: `market.ticks.${symbol}`, fromBeginning: false });
  await consumer.run({
    eachMessage: async ({ message }) => {
      const payload = message.value?.toString();
      if (payload) {
        // Fan out to all WS clients for this symbol
        symbolClients.get(symbol)?.forEach(ws => {
          if (ws.readyState === ws.OPEN) {
            ws.send(payload);
          }
        });
        // Publish to Redis for cross-instance scaling
        await redisClient.publish(`market.ticks.${symbol}`, payload);
      }
    },
  });
  symbolConsumers.set(symbol, consumer);
}

// Stop Kafka consumer for a symbol
async function stopKafkaConsumerForSymbol(symbol: string) {
  const consumer = symbolConsumers.get(symbol);
  if (consumer) {
    await consumer.disconnect();
    symbolConsumers.delete(symbol);
  }
}

// Redis pub/sub for cross-instance scaling
redisClient.subscribe('market.ticks.*', (message, channel) => {
  const symbol = channel.split('.')[2];
  symbolClients.get(symbol)?.forEach(ws => {
    if (ws.readyState === ws.OPEN) {
      ws.send(message);
    }
  });
});

// WebSocket server logic
wss.on('connection', (ws: AuthenticatedWebSocket, req) => {
  wsConnections.inc();
  ws.on('message', async (msg: string) => {
    wsMessages.inc({ event: 'message' });
    let parsed;
    try {
      parsed = JSON.parse(msg);
    } catch {
      ws.send(JSON.stringify({ error: 'Invalid message format' }));
      return;
    }
    // Auth required for all actions except 'ping'
    if (parsed.event !== 'ping') {
      const { token, subscribe, unsubscribe } = parsed;
      if (!token) {
        wsAuthFailures.inc();
        ws.send(JSON.stringify({ error: 'Missing token' }));
        ws.close();
        return;
      }
      const { user, error } = authenticateAndAuthorize(token, subscribe ? ['market:read'] : []);
      if (!user) {
        wsAuthFailures.inc();
        ws.send(JSON.stringify({ error }));
        ws.close();
        return;
      }
      ws.user = user;
      auditLog((user as any).sub, subscribe ? 'subscribe' : 'unsubscribe', { symbol: subscribe || unsubscribe });
      // Privacy/compliance: log all data access
    }
    if (parsed.subscribe) {
      subscribeClientToSymbol(ws, parsed.subscribe);
      ws.send(JSON.stringify({ event: 'subscribed', symbol: parsed.subscribe }));
    }
    if (parsed.unsubscribe) {
      unsubscribeClientFromSymbol(ws, parsed.unsubscribe);
      ws.send(JSON.stringify({ event: 'unsubscribed', symbol: parsed.unsubscribe }));
    }
    if (parsed.event === 'ping') {
      ws.send(JSON.stringify({ event: 'pong' }));
    }
  });
  ws.on('close', () => {
    wsConnections.dec();
    // Remove ws from all symbol sets
    for (const [symbol, clients] of symbolClients.entries()) {
      clients.delete(ws);
      if (clients.size === 0) {
        stopKafkaConsumerForSymbol(symbol);
        symbolClients.delete(symbol);
      }
    }
    if (ws.user) {
      auditLog((ws.user as any).sub, 'disconnect');
    }
  });
});

export default wss; 