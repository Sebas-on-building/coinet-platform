import { WebSocketServer } from 'ws';
import jwt from 'jsonwebtoken';
import redis from 'redis';
import fs from 'fs';

const redisClient = redis.createClient({ url: process.env.REDIS_URL });
redisClient.connect();

const wss = new WebSocketServer({ noServer: true });
const connections = new Map();

function auditLog(userId: string, action: string) {
  const entry = {
    user: userId,
    action,
    timestamp: new Date().toISOString(),
  };
  fs.appendFile('logs/ws-audit.log', JSON.stringify(entry) + '\n', err => {
    if (err) console.error('WS Audit log error:', err);
  });
}

async function authenticate(token: string) {
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!);
    return payload;
  } catch {
    return null;
  }
}

async function rateLimit(userId: string): Promise<boolean> {
  const key = `wsratelimit:${userId}`;
  const now = Math.floor(Date.now() / 1000);
  const windowStart = now - 60;
  const requests = await redisClient.zRangeByScore(key, windowStart, now);
  if (requests.length >= 60) return false;
  await redisClient.zAdd(key, [{ score: now, value: now.toString() }]);
  await redisClient.expire(key, 60);
  return true;
}

function broadcast(event: string, data: any) {
  for (const ws of wss.clients) {
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify({ event, data }));
    }
  }
}

wss.on('connection', (ws, req) => {
  ws.on('message', async (msg: string) => {
    let parsed;
    try {
      parsed = JSON.parse(msg);
    } catch {
      ws.send(JSON.stringify({ error: 'Invalid message format' }));
      return;
    }
    const { token, event, data } = parsed;
    const user = await authenticate(token);
    if (!user) {
      ws.send(JSON.stringify({ error: 'Unauthorized' }));
      ws.close();
      return;
    }
    if (!(await rateLimit(user.sub))) {
      ws.send(JSON.stringify({ error: 'Rate limit exceeded' }));
      return;
    }
    auditLog(user.sub, event);
    // Example: handle event types
    if (event === 'subscribe') {
      ws.send(JSON.stringify({ event: 'subscribed', data: { channel: data.channel } }));
    } else if (event === 'broadcast') {
      broadcast('update', data);
    }
    // Ready for Liveblocks/Yjs integration here
  });
});

export default wss; 