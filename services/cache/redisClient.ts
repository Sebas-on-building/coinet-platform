import Redis from 'ioredis';

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  lazyConnect: false,
  retryStrategy: times => Math.min(times * 50, 2000),
});

redis.on('connect', () => console.info('[Redis] Connected'));
redis.on('error', err => console.error('[Redis] Error', err));
redis.on('close', () => console.warn('[Redis] Connection closed'));
redis.on('reconnecting', () => console.info('[Redis] Reconnecting...'));

export default redis;

export async function connectRedis() {
  // ioredis auto-connects; this is a no-op for compatibility
  return;
}

export async function cacheGet(key: string) {
  await connectRedis();
  return redis.get(key);
}

export async function cacheSet(key: string, value: string, ttlSeconds?: number) {
  await connectRedis();
  if (ttlSeconds) {
    await redis.set(key, value, 'EX', ttlSeconds);
  } else {
    await redis.set(key, value);
  }
}

export async function cacheDel(key: string) {
  await connectRedis();
  await redis.del(key);
}

// Pub/Sub
export async function publish(channel: string, message: string) {
  await connectRedis();
  await redis.publish(channel, message);
}

export async function subscribe(channel: string, handler: (msg: string) => void) {
  await connectRedis();
  const sub = redis.duplicate();
  await sub.connect();
  await sub.subscribe(channel);
  sub.on('message', (chan, msg) => {
    if (chan === channel) handler(msg);
  });
  return sub;
}

// Leaderboard (sorted set)
export async function leaderboardAdd(key: string, member: string, score: number) {
  await connectRedis();
  await redis.zadd(key, score, member);
}

export async function leaderboardTop(key: string, count: number) {
  await connectRedis();
  // zrevrange returns [member1, score1, member2, score2, ...]
  const results = await redis.zrevrange(key, 0, count - 1, 'WITHSCORES');
  const top: { value: string; score: number }[] = [];
  for (let i = 0; i < results.length; i += 2) {
    top.push({ value: results[i], score: Number(results[i + 1]) });
  }
  return top;
} 