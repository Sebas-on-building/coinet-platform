/**
 * L5.6 — Redis Key Families
 *
 * §5.6.11 — Redis key families
 * §5.6.12 — Redis law
 */

// ═══════════════════════════════════════════════════════════════════════════════
// KEY FAMILY ENUM
// ═══════════════════════════════════════════════════════════════════════════════

export enum RedisKeyFamily {
  HOT_METRIC = 'hot:metric',
  RECENT_WINDOW = 'window',
  DEDUPE = 'dedupe',
  ALERT_COOLDOWN = 'cooldown:alert',
  TRIGGER_ACTIVE = 'trigger:active',
  FEATURE_CACHE = 'cache:feature',
  CONTEXT_CACHE = 'cache:context',
}

export const ALL_REDIS_KEY_FAMILIES: readonly RedisKeyFamily[] = Object.values(RedisKeyFamily);

// ═══════════════════════════════════════════════════════════════════════════════
// TTL POLICY
// ═══════════════════════════════════════════════════════════════════════════════

export interface RedisTTLPolicy {
  readonly family: RedisKeyFamily;
  readonly minTTLSeconds: number;
  readonly maxTTLSeconds: number;
  readonly defaultTTLSeconds: number;
}

export const TTL_POLICIES: Record<RedisKeyFamily, RedisTTLPolicy> = {
  [RedisKeyFamily.HOT_METRIC]:     { family: RedisKeyFamily.HOT_METRIC,     minTTLSeconds: 30,   maxTTLSeconds: 600,   defaultTTLSeconds: 60 },
  [RedisKeyFamily.RECENT_WINDOW]:  { family: RedisKeyFamily.RECENT_WINDOW,  minTTLSeconds: 60,   maxTTLSeconds: 3600,  defaultTTLSeconds: 300 },
  [RedisKeyFamily.DEDUPE]:         { family: RedisKeyFamily.DEDUPE,         minTTLSeconds: 60,   maxTTLSeconds: 86400, defaultTTLSeconds: 3600 },
  [RedisKeyFamily.ALERT_COOLDOWN]: { family: RedisKeyFamily.ALERT_COOLDOWN, minTTLSeconds: 10,   maxTTLSeconds: 86400, defaultTTLSeconds: 300 },
  [RedisKeyFamily.TRIGGER_ACTIVE]: { family: RedisKeyFamily.TRIGGER_ACTIVE, minTTLSeconds: 60,   maxTTLSeconds: 86400, defaultTTLSeconds: 3600 },
  [RedisKeyFamily.FEATURE_CACHE]:  { family: RedisKeyFamily.FEATURE_CACHE,  minTTLSeconds: 10,   maxTTLSeconds: 600,   defaultTTLSeconds: 60 },
  [RedisKeyFamily.CONTEXT_CACHE]:  { family: RedisKeyFamily.CONTEXT_CACHE,  minTTLSeconds: 30,   maxTTLSeconds: 300,   defaultTTLSeconds: 60 },
};

export function getTTLPolicy(family: RedisKeyFamily): RedisTTLPolicy {
  return TTL_POLICIES[family];
}

// ═══════════════════════════════════════════════════════════════════════════════
// KEY BUILDERS — §5.6.11.1–7
// ═══════════════════════════════════════════════════════════════════════════════

const ENV_PREFIX_REQUIRED = true;

function buildKey(env: string, family: RedisKeyFamily, ...segments: string[]): string {
  return `${env}:l5:${family}:${segments.join(':')}`;
}

export function hotMetricKey(env: string, metricPath: string, scopeType: string, scopeId: string): string {
  return buildKey(env, RedisKeyFamily.HOT_METRIC, metricPath, scopeType, scopeId);
}

export function recentWindowKey(env: string, windowType: string, scopeType: string, scopeId: string): string {
  return buildKey(env, RedisKeyFamily.RECENT_WINDOW, windowType, scopeType, scopeId);
}

export function dedupeKey(env: string, producer: string, dedupeKeyValue: string): string {
  return buildKey(env, RedisKeyFamily.DEDUPE, producer, dedupeKeyValue);
}

export function alertCooldownKey(env: string, userId: string, alertId: string, scopeId: string): string {
  return buildKey(env, RedisKeyFamily.ALERT_COOLDOWN, userId, alertId, scopeId);
}

export function triggerActiveKey(env: string, triggerType: string, scopeType: string, scopeId: string): string {
  return buildKey(env, RedisKeyFamily.TRIGGER_ACTIVE, triggerType, scopeType, scopeId);
}

export function featureCacheKey(env: string, featureSet: string, scopeType: string, scopeId: string, interval: string): string {
  return buildKey(env, RedisKeyFamily.FEATURE_CACHE, featureSet, scopeType, scopeId, interval);
}

export function contextCacheKey(env: string, subjectId: string): string {
  return buildKey(env, RedisKeyFamily.CONTEXT_CACHE, subjectId);
}

// ═══════════════════════════════════════════════════════════════════════════════
// NAMESPACE VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

const KEY_PREFIX_PATTERN = /^[a-z0-9_]+:l5:/;

export function isValidL5RedisKey(key: string): boolean {
  return KEY_PREFIX_PATTERN.test(key);
}

export function extractKeyFamily(key: string): RedisKeyFamily | null {
  for (const family of ALL_REDIS_KEY_FAMILIES) {
    if (key.includes(`:l5:${family}:`)) return family;
  }
  return null;
}

export function validateRedisKeyNamespace(key: string, env: string): { valid: boolean; reason: string | null } {
  if (!key.startsWith(`${env}:l5:`)) {
    return { valid: false, reason: `Key must start with '${env}:l5:' but got '${key.slice(0, 20)}...'` };
  }
  const family = extractKeyFamily(key);
  if (!family) {
    return { valid: false, reason: 'Key does not match any declared key family' };
  }
  return { valid: true, reason: null };
}

// ═══════════════════════════════════════════════════════════════════════════════
// REDIS VALUE REQUIRED FIELDS
// ═══════════════════════════════════════════════════════════════════════════════

export const REDIS_VALUE_REQUIRED_FIELDS = ['trace_id', 'manifest_id', 'schema_version'] as const;

export function validateRedisValueLineage(value: Record<string, unknown>): { valid: boolean; missingFields: string[] } {
  const missing = REDIS_VALUE_REQUIRED_FIELDS.filter(f => !(f in value) || value[f] === undefined || value[f] === null);
  return { valid: missing.length === 0, missingFields: missing as unknown as string[] };
}
