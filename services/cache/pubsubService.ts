import redis from './redisClient';

// ALERT NOTIFICATIONS
export async function publishAlert(channel: string, message: string) {
  await redis.publish(channel, message);
}

export async function subscribeToAlerts(channel: string, handler: (msg: string) => void) {
  const sub = redis.duplicate();
  await sub.connect();
  await sub.subscribe(channel);
  sub.on('message', (chan, msg) => {
    if (chan === channel) handler(msg);
  });
  return sub;
}

// INTER-SERVICE EVENTS (e.g. portfolio updates)
export async function publishPortfolioUpdate(event: { userId: string; portfolioId: string;[k: string]: any }) {
  await redis.publish('portfolio:update', JSON.stringify(event));
}

export async function subscribeToPortfolioUpdates(handler: (event: any) => void) {
  const sub = redis.duplicate();
  await sub.connect();
  await sub.subscribe('portfolio:update');
  sub.on('message', (chan, msg) => {
    if (chan === 'portfolio:update') handler(JSON.parse(msg));
  });
  return sub;
}

// EXTENSIBLE: Add more event types as needed for other real-time features.
// NOTE: Redis Pub/Sub is ephemeral. For guaranteed delivery, use Kafka or a message queue. 