import { WebSocketServer } from 'ws';
import jwt from 'jsonwebtoken';
import redis from 'redis';
import fs from 'fs';
import * as Y from 'yjs';

const redisClient = redis.createClient({ url: process.env.REDIS_URL });
redisClient.connect();

const wss = new WebSocketServer({ noServer: true });
const yDocs = new Map<string, Y.Doc>();

function auditLog(userId: string, action: string, room: string) {
  const entry = {
    user: userId,
    action,
    room,
    timestamp: new Date().toISOString(),
  };
  fs.appendFile('logs/liveblocks-audit.log', JSON.stringify(entry) + '\n', err => {
    if (err) console.error('Liveblocks Audit log error:', err);
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
  const key = `liveblocksratelimit:${userId}`;
  const now = Math.floor(Date.now() / 1000);
  const windowStart = now - 60;
  const requests = await redisClient.zRangeByScore(key, windowStart, now);
  if (requests.length >= 60) return false;
  await redisClient.zAdd(key, [{ score: now, value: now.toString() }]);
  await redisClient.expire(key, 60);
  return true;
}

function getYDoc(room: string): Y.Doc {
  if (!yDocs.has(room)) {
    yDocs.set(room, new Y.Doc());
  }
  return yDocs.get(room)!;
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
    if (!user || typeof user.sub !== 'string') {
      ws.send(JSON.stringify({ error: 'Unauthorized' }));
      ws.close();
      return;
    }
    if (!(await rateLimit(user.sub))) {
      ws.send(JSON.stringify({ error: 'Rate limit exceeded' }));
      return;
    }
    if (!data.room) {
      ws.send(JSON.stringify({ error: 'Room required' }));
      return;
    }
    auditLog(user.sub, event, data.room);
    // Room management, presence, awareness
    const ydoc = getYDoc(data.room);
    if (event === 'join') {
      ws.send(JSON.stringify({ event: 'joined', room: data.room }));
    } else if (event === 'update') {
      Y.applyUpdate(ydoc, new Uint8Array(data.update));
      // Broadcast update to all clients in the room (mocked)
      wss.clients.forEach(client => {
        if (client !== ws && client.readyState === ws.OPEN) {
          client.send(JSON.stringify({ event: 'update', room: data.room, update: data.update }));
        }
      });
    } else if (event === 'awareness') {
      // Broadcast awareness to all clients in the room (mocked)
      wss.clients.forEach(client => {
        if (client !== ws && client.readyState === ws.OPEN) {
          client.send(JSON.stringify({ event: 'awareness', room: data.room, awareness: data.awareness }));
        }
      });
    }
    // Prometheus metrics, RBAC, and more can be added here
  });
});

export default wss; 