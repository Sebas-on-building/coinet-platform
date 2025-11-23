const Redis = require('ioredis');
const redis = new Redis();

// --- Query Result Cache ---
async function getCache(key) {
  const value = await redis.get(key);
  return value ? JSON.parse(value) : null;
}
async function setCache(key, value, ttl = 5) {
  await redis.set(key, JSON.stringify(value), 'EX', ttl);
}
async function delCache(key) {
  await redis.del(key);
}

// --- Static Data Cache (no TTL) ---
async function setStaticCache(key, value) {
  await redis.set(key, JSON.stringify(value));
}
async function getStaticCache(key) {
  const value = await redis.get(key);
  return value ? JSON.parse(value) : null;
}

// --- Session & Auth ---
async function setSession(key, value, ttl = 3600) {
  await redis.set(`session:${key}`, JSON.stringify(value), 'EX', ttl);
}
async function getSession(key) {
  const value = await redis.get(`session:${key}`);
  return value ? JSON.parse(value) : null;
}
async function blacklistToken(jti, ttl = 3600) {
  await redis.set(`blacklist:${jti}`, '1', 'EX', ttl);
}
async function isTokenBlacklisted(jti) {
  return !!(await redis.get(`blacklist:${jti}`));
}

// --- Rate Limiting ---
async function incrRateLimit(key, windowSec = 60) {
  const count = await redis.incr(key);
  if (count === 1) await redis.expire(key, windowSec);
  return count;
}
async function getRateLimit(key) {
  return parseInt(await redis.get(key) || '0', 10);
}

// --- Pub/Sub ---
function subscribe(channel, handler) {
  const sub = new Redis();
  sub.subscribe(channel);
  sub.on('message', (chan, msg) => handler(chan, JSON.parse(msg)));
  return sub;
}
function publish(channel, message) {
  return redis.publish(channel, JSON.stringify(message));
}

// --- Namespaced Key Helpers ---
function cacheKey(...parts) {
  return parts.join(':');
}

// --- Extensible for Plugin Analytics ---
async function setPluginCache(plugin, key, value, ttl = 30) {
  await setCache(`plugin:${plugin}:${key}`, value, ttl);
}
async function getPluginCache(plugin, key) {
  return getCache(`plugin:${plugin}:${key}`);
}

module.exports = {
  getCache,
  setCache,
  delCache,
  setStaticCache,
  getStaticCache,
  setSession,
  getSession,
  blacklistToken,
  isTokenBlacklisted,
  incrRateLimit,
  getRateLimit,
  subscribe,
  publish,
  cacheKey,
  setPluginCache,
  getPluginCache,
  redis,
}; 