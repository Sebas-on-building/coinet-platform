import { WebSocketServer, WebSocket } from 'ws';
import { Kafka } from 'kafkajs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { IncomingMessage } from 'http';
dotenv.config();

const wss = new WebSocketServer({ port: 5000 });
const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';

const kafka = new Kafka({ brokers: [process.env.KAFKA_BROKER || 'localhost:9092'] });
const topics = ['market-ticks', 'alerts', 'portfolio-events'];

interface ClientMeta {
  ws: WebSocket;
  user: any;
  subscriptions: Set<string>;
}

const clients = new Set<ClientMeta>();

function authenticate(token: string): any {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
  const url = new URL(req.url || '', `ws://${req.headers.host}`);
  const token = url.searchParams.get('token');
  const user = token ? authenticate(token) : null;
  if (!user) {
    ws.close(4001, 'Unauthorized');
    return;
  }
  const meta: ClientMeta = { ws, user, subscriptions: new Set() };
  clients.add(meta);

  ws.on('message', (msg: Buffer | string) => {
    try {
      const { action, topic } = JSON.parse(msg.toString());
      if (action === 'subscribe' && topics.includes(topic)) {
        meta.subscriptions.add(topic);
      } else if (action === 'unsubscribe' && topics.includes(topic)) {
        meta.subscriptions.delete(topic);
      }
    } catch { }
  });

  ws.on('close', () => {
    clients.delete(meta);
  });

  ws.on('error', () => {
    clients.delete(meta);
  });
});

// Kafka consumers for each topic
for (const topic of topics) {
  const consumer = kafka.consumer({ groupId: `ws-server-${topic}` });
  consumer.connect().then(() => consumer.subscribe({ topic }));
  consumer.run({
    eachMessage: async ({ topic, message }) => {
      const payload = message.value?.toString();
      for (const meta of clients) {
        if (meta.subscriptions.has(topic)) {
          meta.ws.send(JSON.stringify({ topic, payload }));
        }
      }
    },
  });
}

console.log('WebSocket server running on port 5000'); 