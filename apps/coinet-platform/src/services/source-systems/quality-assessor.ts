/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     SOURCE QUALITY ASSESSOR                                                   ║
 * ║                                                                               ║
 * ║   Every source integrated into Coinet is evaluated on seven dimensions:       ║
 * ║   1. Coverage breadth                                                         ║
 * ║   2. Freshness                                                                ║
 * ║   3. Data stability                                                           ║
 * ║   4. Category fit                                                             ║
 * ║   5. Operational resilience                                                   ║
 * ║   6. Schema consistency                                                       ║
 * ║   7. Strategic uniqueness                                                     ║
 * ║                                                                               ║
 * ║   If a source is broad but unreliable, it cannot be treated as high-trust.    ║
 * ║   If a source is fast but noisy, it must be role-limited.                     ║
 * ║   If a source is high-value but sparse, it must be context-dependent.         ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import { type SourceClass, type SourceProviderDef, PROVIDERS, getProvidersByClass } from './registry';
import { getProviderHealth, type ProviderHealthState } from './health-monitor';

// ═══════════════════════════════════════════════════════════════════════════════
// QUALITY DIMENSIONS
// ═══════════════════════════════════════════════════════════════════════════════

export interface SourceQualityDimensions {
  /** How many aspects of its truth domain the source covers (0–1) */
  coverageBreadth: number;
  /** How current the data is relative to freshness requirements (0–1) */
  freshness: number;
  /** How stable/consistent the data is over time (0–1) */
  dataStability: number;
  /** How well the source fits its assigned truth role (0–1) */
  categoryFit: number;
  /** How resilient the source is operationally (0–1) */
  operationalResilience: number;
  /** How consistent the data schema is (0–1) */
  schemaConsistency: number;
  /** How strategically unique/irreplaceable the source is (0–1) */
  strategicUniqueness: number;
}

export interface SourceQualityReport {
  providerId: string;
  name: string;
  sourceClass: SourceClass;
  dimensions: SourceQualityDimensions;
  /** Weighted composite quality score (0–1) */
  compositeScore: number;
  /** Trust tier based on composite: 'high' | 'medium' | 'low' | 'untrusted' */
  trustTier: 'high' | 'medium' | 'low' | 'untrusted';
  /** Operational recommendations */
  recommendations: string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// DIMENSION WEIGHTS
// ═══════════════════════════════════════════════════════════════════════════════

const DIMENSION_WEIGHTS = {
  coverageBreadth: 0.15,
  freshness: 0.20,
  dataStability: 0.15,
  categoryFit: 0.15,
  operationalResilience: 0.15,
  schemaConsistency: 0.10,
  strategicUniqueness: 0.10,
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// ASSESSMENT ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

export function assessProviderQuality(providerId: string): SourceQualityReport {
  const def = PROVIDERS[providerId];
  if (!def) {
    return {
      providerId,
      name: 'Unknown',
      sourceClass: 'market_data' as SourceClass,
      dimensions: { coverageBreadth: 0, freshness: 0, dataStability: 0, categoryFit: 0, operationalResilience: 0, schemaConsistency: 0, strategicUniqueness: 0 },
      compositeScore: 0,
      trustTier: 'untrusted',
      recommendations: ['Provider not registered in source registry'],
    };
  }

  const health = getProviderHealth(providerId);
  const dimensions = computeDimensions(def, health);
  const compositeScore = computeComposite(dimensions);
  const trustTier = classifyTrust(compositeScore);
  const recommendations = generateRecommendations(def, health, dimensions);

  return {
    providerId,
    name: def.name,
    sourceClass: def.sourceClass,
    dimensions,
    compositeScore,
    trustTier,
    recommendations,
  };
}

export function assessClassQuality(sourceClass: SourceClass): {
  sourceClass: SourceClass;
  providers: SourceQualityReport[];
  classComposite: number;
  classTrust: 'high' | 'medium' | 'low' | 'untrusted';
} {
  const providers = getProvidersByClass(sourceClass).map(p => assessProviderQuality(p.id));
  const scores = providers.map(p => p.compositeScore);
  const classComposite = scores.length > 0 ? Math.max(...scores) : 0;
  const classTrust = classifyTrust(classComposite);

  return { sourceClass, providers, classComposite, classTrust };
}

export function assessAllSources(): SourceQualityReport[] {
  return Object.keys(PROVIDERS).map(id => assessProviderQuality(id));
}

// ═══════════════════════════════════════════════════════════════════════════════
// DIMENSION COMPUTATION
// ═══════════════════════════════════════════════════════════════════════════════

function computeDimensions(def: SourceProviderDef, health: ProviderHealthState): SourceQualityDimensions {
  return {
    coverageBreadth: computeCoverageBreadth(def),
    freshness: computeFreshness(def, health),
    dataStability: computeDataStability(health),
    categoryFit: computeCategoryFit(def),
    operationalResilience: computeOperationalResilience(def, health),
    schemaConsistency: computeSchemaConsistency(health),
    strategicUniqueness: computeStrategicUniqueness(def),
  };
}

function computeCoverageBreadth(def: SourceProviderDef): number {
  const authCount = def.authoritativeFor.length;
  if (authCount >= 6) return 1.0;
  if (authCount >= 4) return 0.8;
  if (authCount >= 2) return 0.6;
  return 0.3;
}

function computeFreshness(def: SourceProviderDef, health: ProviderHealthState): number {
  if (health.lastSuccessAt === 0) return 0.2;
  const age = Date.now() - health.lastSuccessAt;
  const window = def.freshnessWindowMs;
  if (age <= window) return 1.0;
  if (age <= window * 2) return 0.7;
  if (age <= window * 5) return 0.4;
  return 0.1;
}

function computeDataStability(health: ProviderHealthState): number {
  return Math.min(1, health.successRate * 0.6 + (health.circuit === 'closed' ? 0.4 : 0));
}

function computeCategoryFit(def: SourceProviderDef): number {
  // Primary providers that can stand alone have highest fit
  if (def.tier === 'primary' && def.canStandAlone) return 1.0;
  if (def.tier === 'primary') return 0.85;
  if (def.tier === 'secondary') return 0.65;
  return 0.45;
}

function computeOperationalResilience(def: SourceProviderDef, health: ProviderHealthState): number {
  let score = 0;
  if (health.circuit === 'closed') score += 0.4;
  else if (health.circuit === 'half_open') score += 0.2;
  if (def.fallbacks.length > 0) score += 0.2;
  if (health.successRate > 0.9) score += 0.2;
  if (health.latencyEmaMs < 1000) score += 0.2;
  else if (health.latencyEmaMs < 3000) score += 0.1;
  return Math.min(1, score);
}

function computeSchemaConsistency(health: ProviderHealthState): number {
  // Schema consistency inferred from success rate and low failure count
  if (health.totalRequests === 0) return 0.5;
  if (health.successRate > 0.95) return 1.0;
  if (health.successRate > 0.85) return 0.8;
  if (health.successRate > 0.7) return 0.6;
  return 0.3;
}

function computeStrategicUniqueness(def: SourceProviderDef): number {
  // How replaceable is this provider?
  const classProviders = getProvidersByClass(def.sourceClass);
  if (classProviders.length === 1) return 1.0;
  if (def.canStandAlone && def.tier === 'primary') return 0.8;
  if (def.fallbacks.length === 0) return 0.7;
  return 0.4;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCORING AND CLASSIFICATION
// ═══════════════════════════════════════════════════════════════════════════════

function computeComposite(dim: SourceQualityDimensions): number {
  return (
    dim.coverageBreadth * DIMENSION_WEIGHTS.coverageBreadth +
    dim.freshness * DIMENSION_WEIGHTS.freshness +
    dim.dataStability * DIMENSION_WEIGHTS.dataStability +
    dim.categoryFit * DIMENSION_WEIGHTS.categoryFit +
    dim.operationalResilience * DIMENSION_WEIGHTS.operationalResilience +
    dim.schemaConsistency * DIMENSION_WEIGHTS.schemaConsistency +
    dim.strategicUniqueness * DIMENSION_WEIGHTS.strategicUniqueness
  );
}

function classifyTrust(score: number): 'high' | 'medium' | 'low' | 'untrusted' {
  if (score >= 0.75) return 'high';
  if (score >= 0.5) return 'medium';
  if (score >= 0.25) return 'low';
  return 'untrusted';
}

function generateRecommendations(def: SourceProviderDef, health: ProviderHealthState, dim: SourceQualityDimensions): string[] {
  const recs: string[] = [];

  if (dim.freshness < 0.4) {
    recs.push(`${def.name}: data freshness is degraded — check connectivity and rate limits`);
  }
  if (dim.operationalResilience < 0.4) {
    recs.push(`${def.name}: operational resilience is low — review circuit breaker and fallback chain`);
  }
  if (dim.schemaConsistency < 0.5 && health.totalRequests > 10) {
    recs.push(`${def.name}: schema consistency issues — review provider response validation`);
  }
  if (def.fallbacks.length === 0 && def.tier === 'primary') {
    recs.push(`${def.name}: no fallback providers configured — single point of failure for ${def.sourceClass}`);
  }
  if (health.circuit === 'open') {
    recs.push(`${def.name}: circuit breaker is OPEN — provider is temporarily unavailable`);
  }

  return recs;
}
