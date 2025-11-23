import * as redis from './redisClient';

// Query Caching
export async function cacheQuery(key: string, valueFn: () => Promise<any>, ttl = 10) {
  const nsKey = `cache:query:${key}`;
  const cached = await redis.cacheGet(nsKey);
  if (cached) return JSON.parse(cached);
  const value = await valueFn();
  await redis.cacheSet(nsKey, JSON.stringify(value), ttl);
  return value;
}

// Session Store
export async function setSession(token: string, data: any, ttl = 3600) {
  await redis.cacheSet(`session:${token}`, JSON.stringify(data), ttl);
}
export async function getSession(token: string) {
  const data = await redis.cacheGet(`session:${token}`);
  return data ? JSON.parse(data) : null;
}

// Config/Reference Data
export async function cacheConfig(key: string, valueFn: () => Promise<any>, ttl = 3600) {
  const nsKey = `cache:config:${key}`;
  const cached = await redis.cacheGet(nsKey);
  if (cached) return JSON.parse(cached);
  const value = await valueFn();
  await redis.cacheSet(nsKey, JSON.stringify(value), ttl);
  return value;
}

// Leaderboard
export async function addLeaderboardScore(board: string, user: string, score: number) {
  await redis.leaderboardAdd(`leaderboard:${board}`, user, score);
}
export async function getLeaderboard(board: string, count = 10) {
  return redis.leaderboardTop(`leaderboard:${board}`, count);
}

// Pub/Sub
export const publish = redis.publish;
export const subscribe = redis.subscribe; 