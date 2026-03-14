/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     TRUTH PRECEDENCE RESOLVER                                                 ║
 * ║                                                                               ║
 * ║   When sources overlap or disagree, Coinet must know what kind of             ║
 * ║   disagreement it is facing and which source is authoritative.                ║
 * ║                                                                               ║
 * ║   Truth precedence is category-specific, not universal.                       ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import {
  type TruthDomain,
  type SourceClass,
  TRUTH_PRECEDENCE,
  SOURCE_CLASS_DOCTRINES,
  getProvidersByClass,
} from './registry';
import { getClassHealth, getProviderHealth } from './health-monitor';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface SourceClaim {
  providerId: string;
  sourceClass: SourceClass;
  domain: TruthDomain;
  /** The value or assertion from this source */
  value: unknown;
  /** Confidence in this particular claim (0–1) */
  confidence: number;
  /** Unix timestamp of when the data was fetched */
  fetchedAt: number;
}

export interface TruthResolution {
  domain: TruthDomain;
  /** The winning claim */
  resolved: SourceClaim;
  /** Whether there was a conflict among sources */
  hadConflict: boolean;
  /** All claims that were considered */
  claims: SourceClaim[];
  /** Why this resolution was chosen */
  rationale: string;
  /** Confidence adjustment from resolution process (0–1 multiplier) */
  resolutionConfidence: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// RESOLUTION ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Resolve truth when multiple sources provide competing claims for the same domain.
 *
 * Resolution order:
 * 1. Category-specific precedence (TRUTH_PRECEDENCE)
 * 2. Provider health score (prefer healthy providers)
 * 3. Data freshness (prefer more recent data)
 * 4. Confidence-weighted selection
 */
export function resolveTruth(claims: SourceClaim[]): TruthResolution | null {
  if (claims.length === 0) return null;
  if (claims.length === 1) {
    return {
      domain: claims[0].domain,
      resolved: claims[0],
      hadConflict: false,
      claims,
      rationale: `Single source: ${claims[0].providerId}`,
      resolutionConfidence: claims[0].confidence,
    };
  }

  const domain = claims[0].domain;
  const precedence = TRUTH_PRECEDENCE[domain] ?? [];

  // Score each claim
  const scored = claims.map(claim => {
    let score = claim.confidence;

    // Precedence bonus: higher-ranked source class gets priority
    const classRank = precedence.indexOf(claim.sourceClass);
    if (classRank >= 0) {
      score += (precedence.length - classRank) * 0.15;
    }

    // Health bonus
    const health = getProviderHealth(claim.providerId);
    score += health.healthScore * 0.2;

    // Freshness bonus (penalize stale data)
    const age = Date.now() - claim.fetchedAt;
    if (age < 60_000) score += 0.1;
    else if (age > 300_000) score -= 0.1;

    return { claim, score };
  }).sort((a, b) => b.score - a.score);

  const winner = scored[0];
  const runner = scored.length > 1 ? scored[1] : null;

  // Detect conflict: do claims disagree?
  const hadConflict = detectConflict(winner.claim, runner?.claim ?? null);

  // Resolution confidence: reduced when claims conflict and scores are close
  let resolutionConfidence = winner.claim.confidence;
  if (hadConflict && runner) {
    const scoreDelta = winner.score - runner.score;
    if (scoreDelta < 0.1) {
      resolutionConfidence *= 0.7;
    } else if (scoreDelta < 0.2) {
      resolutionConfidence *= 0.85;
    }
  }

  const rationale = buildRationale(winner.claim, runner?.claim ?? null, hadConflict, precedence);

  return {
    domain,
    resolved: winner.claim,
    hadConflict,
    claims,
    rationale,
    resolutionConfidence: Math.max(0, Math.min(1, resolutionConfidence)),
  };
}

/**
 * Resolve which source class should be consulted for a given truth domain,
 * taking into account current class health.
 */
export function resolveAuthorityForDomain(domain: TruthDomain): {
  authoritative: SourceClass;
  fallback: SourceClass | null;
  confidence: number;
  rationale: string;
} {
  const precedence = TRUTH_PRECEDENCE[domain] ?? [];

  for (const sc of precedence) {
    const health = getClassHealth(sc);
    if (health.operational && !health.degraded) {
      return {
        authoritative: sc,
        fallback: precedence.find(s => s !== sc && getClassHealth(s).operational) ?? null,
        confidence: health.bestHealthScore,
        rationale: `${sc} is authoritative and healthy for ${domain} truth`,
      };
    }
  }

  // Degraded mode: pick best available even if degraded
  for (const sc of precedence) {
    const health = getClassHealth(sc);
    if (health.operational) {
      return {
        authoritative: sc,
        fallback: null,
        confidence: health.bestHealthScore * 0.7,
        rationale: `${sc} is authoritative but degraded for ${domain} truth — reduced confidence`,
      };
    }
  }

  return {
    authoritative: precedence[0] ?? ('market_data' as SourceClass),
    fallback: null,
    confidence: 0,
    rationale: `No operational source available for ${domain} truth — domain is blind`,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// MULTI-SOURCE VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

export interface CrossValidationResult {
  /** Number of sources that agree */
  agreementCount: number;
  /** Number of sources that disagree */
  disagreementCount: number;
  /** Agreement ratio (0–1) */
  consensus: number;
  /** Confidence multiplier based on cross-validation */
  confidenceMultiplier: number;
  /** Sources that disagree */
  dissenters: string[];
}

/**
 * Cross-validate a numeric claim across multiple sources.
 * Uses relative tolerance to determine agreement.
 */
export function crossValidateNumeric(
  claims: Array<{ providerId: string; value: number }>,
  tolerancePercent: number = 5,
): CrossValidationResult {
  if (claims.length < 2) {
    return { agreementCount: claims.length, disagreementCount: 0, consensus: 1, confidenceMultiplier: 0.9, dissenters: [] };
  }

  const median = computeMedian(claims.map(c => c.value));
  const tolerance = median * (tolerancePercent / 100);

  const agreeing = claims.filter(c => Math.abs(c.value - median) <= tolerance);
  const disagreeing = claims.filter(c => Math.abs(c.value - median) > tolerance);

  const consensus = agreeing.length / claims.length;

  let confidenceMultiplier: number;
  if (consensus >= 0.8) confidenceMultiplier = 1.05;
  else if (consensus >= 0.6) confidenceMultiplier = 0.95;
  else if (consensus >= 0.4) confidenceMultiplier = 0.8;
  else confidenceMultiplier = 0.65;

  return {
    agreementCount: agreeing.length,
    disagreementCount: disagreeing.length,
    consensus,
    confidenceMultiplier,
    dissenters: disagreeing.map(d => d.providerId),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function detectConflict(a: SourceClaim, b: SourceClaim | null): boolean {
  if (!b) return false;

  // Numeric comparison with tolerance
  if (typeof a.value === 'number' && typeof b.value === 'number') {
    const avg = (Math.abs(a.value) + Math.abs(b.value)) / 2;
    if (avg === 0) return a.value !== b.value;
    return Math.abs(a.value - b.value) / avg > 0.1;
  }

  // Boolean/string comparison
  if (typeof a.value === 'boolean' || typeof b.value === 'boolean') {
    return a.value !== b.value;
  }

  if (typeof a.value === 'string' && typeof b.value === 'string') {
    return a.value.toLowerCase() !== b.value.toLowerCase();
  }

  return false;
}

function buildRationale(
  winner: SourceClaim,
  runner: SourceClaim | null,
  hadConflict: boolean,
  precedence: SourceClass[],
): string {
  if (!hadConflict) {
    return runner
      ? `${winner.providerId} and ${runner.providerId} agree on ${winner.domain} truth`
      : `${winner.providerId} is the sole authority for ${winner.domain} truth`;
  }

  const winnerRank = precedence.indexOf(winner.sourceClass);
  const runnerRank = runner ? precedence.indexOf(runner.sourceClass) : -1;

  if (winnerRank >= 0 && runnerRank >= 0 && winnerRank < runnerRank) {
    return `Conflict: ${winner.providerId} takes precedence over ${runner!.providerId} for ${winner.domain} truth (class rank: ${winnerRank + 1} vs ${runnerRank + 1})`;
  }

  return `Conflict resolved: ${winner.providerId} preferred over ${runner?.providerId ?? 'none'} for ${winner.domain} truth (health + freshness weighted)`;
}

function computeMedian(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}
