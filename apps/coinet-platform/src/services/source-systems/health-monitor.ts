/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     SOURCE HEALTH MONITOR                                                     ║
 * ║                                                                               ║
 * ║   Runtime health tracking for every source provider.                          ║
 * ║   Tracks: latency, success rate, freshness, staleness, circuit state.         ║
 * ║   Produces per-source and per-class health scores.                            ║
 * ║                                                                               ║
 * ║   A world-class source layer is not only broad. It is resilient.              ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import { PROVIDERS, type SourceClass, type SourceProviderDef, getProvidersByClass, getAllSourceClasses } from './registry';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type CircuitState = 'closed' | 'open' | 'half_open';

export interface ProviderHealthState {
  providerId: string;
  sourceClass: SourceClass;

  circuit: CircuitState;
  consecutiveFailures: number;
  totalRequests: number;
  totalFailures: number;
  successRate: number;

  /** EMA of response latency (ms) */
  latencyEmaMs: number;
  /** Most recent response latency (ms) */
  lastLatencyMs: number;

  /** Unix timestamp of last successful response */
  lastSuccessAt: number;
  /** Unix timestamp of last failure */
  lastFailureAt: number;
  /** How long since last success (ms) */
  staleDurationMs: number;

  /** Whether data from this provider is considered stale */
  isStale: boolean;
  /** Whether the provider is currently available for requests */
  isAvailable: boolean;

  /** 0–1 composite health score */
  healthScore: number;
}

export interface SourceClassHealth {
  sourceClass: SourceClass;
  /** Number of providers configured */
  configuredCount: number;
  /** Number currently available */
  availableCount: number;
  /** Number currently stale */
  staleCount: number;
  /** Best available health score across providers */
  bestHealthScore: number;
  /** Average health score across configured providers */
  avgHealthScore: number;
  /** Whether the class can still produce usable data */
  operational: boolean;
  /** Whether the class is in degraded mode */
  degraded: boolean;
  /** Human-readable status */
  status: 'healthy' | 'degraded' | 'critical' | 'offline';
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════════════════════════════════════

const CIRCUIT_OPEN_THRESHOLD = 5;
const CIRCUIT_RESET_MS = 60_000;
const HALF_OPEN_PROBE_COUNT = 2;
const LATENCY_EMA_ALPHA = 0.3;

// ═══════════════════════════════════════════════════════════════════════════════
// STATE STORE
// ═══════════════════════════════════════════════════════════════════════════════

const healthStates = new Map<string, ProviderHealthState>();

function getOrCreateState(providerId: string): ProviderHealthState {
  let state = healthStates.get(providerId);
  if (state) return state;

  const def = PROVIDERS[providerId];
  state = {
    providerId,
    sourceClass: def?.sourceClass ?? ('market_data' as SourceClass),
    circuit: 'closed',
    consecutiveFailures: 0,
    totalRequests: 0,
    totalFailures: 0,
    successRate: 1,
    latencyEmaMs: 0,
    lastLatencyMs: 0,
    lastSuccessAt: 0,
    lastFailureAt: 0,
    staleDurationMs: 0,
    isStale: true,
    isAvailable: true,
    healthScore: 0.5,
  };
  healthStates.set(providerId, state);
  return state;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EVENT RECORDING
// ═══════════════════════════════════════════════════════════════════════════════

export function recordSuccess(providerId: string, latencyMs: number): void {
  const state = getOrCreateState(providerId);
  const now = Date.now();

  state.totalRequests++;
  state.consecutiveFailures = 0;
  state.lastSuccessAt = now;
  state.lastLatencyMs = latencyMs;
  state.latencyEmaMs = state.latencyEmaMs === 0
    ? latencyMs
    : state.latencyEmaMs * (1 - LATENCY_EMA_ALPHA) + latencyMs * LATENCY_EMA_ALPHA;

  state.successRate = state.totalRequests > 0
    ? (state.totalRequests - state.totalFailures) / state.totalRequests
    : 1;

  // Circuit recovery
  if (state.circuit === 'half_open') {
    state.circuit = 'closed';
  }

  recalculate(state);
}

export function recordFailure(providerId: string, latencyMs?: number): void {
  const state = getOrCreateState(providerId);
  const now = Date.now();

  state.totalRequests++;
  state.totalFailures++;
  state.consecutiveFailures++;
  state.lastFailureAt = now;

  if (latencyMs !== undefined) {
    state.lastLatencyMs = latencyMs;
    state.latencyEmaMs = state.latencyEmaMs === 0
      ? latencyMs
      : state.latencyEmaMs * (1 - LATENCY_EMA_ALPHA) + latencyMs * LATENCY_EMA_ALPHA;
  }

  state.successRate = state.totalRequests > 0
    ? (state.totalRequests - state.totalFailures) / state.totalRequests
    : 0;

  // Circuit breaker
  if (state.consecutiveFailures >= CIRCUIT_OPEN_THRESHOLD) {
    state.circuit = 'open';
  }

  recalculate(state);
}

function recalculate(state: ProviderHealthState): void {
  const now = Date.now();
  const def = PROVIDERS[state.providerId];
  const freshnessWindow = def?.freshnessWindowMs ?? 60_000;

  state.staleDurationMs = state.lastSuccessAt > 0 ? now - state.lastSuccessAt : Infinity;
  state.isStale = state.lastSuccessAt === 0 || state.staleDurationMs > freshnessWindow * 3;

  // Half-open probe after timeout
  if (state.circuit === 'open' && state.lastFailureAt > 0 && (now - state.lastFailureAt) > CIRCUIT_RESET_MS) {
    state.circuit = 'half_open';
  }

  state.isAvailable = state.circuit !== 'open';

  // Composite health: success rate * freshness * circuit factor
  const circuitFactor = state.circuit === 'closed' ? 1 : state.circuit === 'half_open' ? 0.5 : 0;
  const freshnessFactor = state.isStale ? 0.3 : 1;
  const latencyFactor = state.latencyEmaMs > 5000 ? 0.5 : state.latencyEmaMs > 2000 ? 0.75 : 1;

  state.healthScore = Math.max(0, Math.min(1,
    state.successRate * 0.4 +
    freshnessFactor * 0.25 +
    circuitFactor * 0.2 +
    latencyFactor * 0.15
  ));
}

// ═══════════════════════════════════════════════════════════════════════════════
// QUERY API
// ═══════════════════════════════════════════════════════════════════════════════

export function getProviderHealth(providerId: string): ProviderHealthState {
  const state = getOrCreateState(providerId);
  recalculate(state);
  return { ...state };
}

export function isProviderAvailable(providerId: string): boolean {
  const state = getOrCreateState(providerId);
  recalculate(state);
  return state.isAvailable;
}

export function getClassHealth(sourceClass: SourceClass): SourceClassHealth {
  const providers = getProvidersByClass(sourceClass);
  const states = providers.map(p => {
    const s = getOrCreateState(p.id);
    recalculate(s);
    return s;
  });

  const configured = states.length;
  const available = states.filter(s => s.isAvailable).length;
  const stale = states.filter(s => s.isStale).length;
  const healthScores = states.map(s => s.healthScore);
  const best = healthScores.length > 0 ? Math.max(...healthScores) : 0;
  const avg = healthScores.length > 0 ? healthScores.reduce((a, b) => a + b, 0) / healthScores.length : 0;

  const operational = available > 0;
  const degraded = available < configured || stale > 0;

  let status: SourceClassHealth['status'];
  if (available === 0) status = 'offline';
  else if (best < 0.3 || (available === 1 && configured > 1)) status = 'critical';
  else if (degraded) status = 'degraded';
  else status = 'healthy';

  return { sourceClass, configuredCount: configured, availableCount: available, staleCount: stale, bestHealthScore: best, avgHealthScore: avg, operational, degraded, status };
}

export function getAllClassHealth(): Record<SourceClass, SourceClassHealth> {
  const result = {} as Record<SourceClass, SourceClassHealth>;
  for (const sc of getAllSourceClasses()) {
    result[sc] = getClassHealth(sc);
  }
  return result;
}

export function getSystemHealth(): {
  totalProviders: number;
  availableProviders: number;
  healthyClasses: number;
  degradedClasses: number;
  offlineClasses: number;
  overallScore: number;
  status: 'healthy' | 'degraded' | 'critical';
} {
  const allClasses = getAllClassHealth();
  const classValues = Object.values(allClasses);

  const totalProviders = Object.keys(PROVIDERS).length;
  const availableProviders = Object.keys(PROVIDERS).filter(id => isProviderAvailable(id)).length;

  const healthyClasses = classValues.filter(c => c.status === 'healthy').length;
  const degradedClasses = classValues.filter(c => c.status === 'degraded' || c.status === 'critical').length;
  const offlineClasses = classValues.filter(c => c.status === 'offline').length;

  // Weighted: reasoning is less critical than market/onchain for intelligence
  const classWeights: Record<SourceClass, number> = {
    market_data: 0.18,
    dex_discovery: 0.12,
    derivatives: 0.14,
    fundamentals: 0.12,
    onchain: 0.14,
    security: 0.10,
    narrative: 0.08,
    entity: 0.06,
    reasoning: 0.06,
  };

  let overallScore = 0;
  for (const ch of classValues) {
    overallScore += ch.bestHealthScore * (classWeights[ch.sourceClass] ?? 0.1);
  }

  let status: 'healthy' | 'degraded' | 'critical';
  if (offlineClasses >= 3 || overallScore < 0.3) status = 'critical';
  else if (degradedClasses >= 2 || overallScore < 0.6) status = 'degraded';
  else status = 'healthy';

  return { totalProviders, availableProviders, healthyClasses, degradedClasses, offlineClasses, overallScore, status };
}

export function resetProviderHealth(providerId: string): void {
  healthStates.delete(providerId);
}

export function resetAllHealth(): void {
  healthStates.clear();
}
