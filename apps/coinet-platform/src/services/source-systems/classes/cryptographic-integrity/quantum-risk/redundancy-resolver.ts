/**
 * L1.3 — Redundancy Resolver for BTC Quantum Loop.
 *
 * Runtime engine that:
 * 1. Evaluates source candidates against the redundancy matrix
 * 2. Selects the best available source per substitution class
 * 3. Blocks forbidden substitutions
 * 4. Emits resolution records with provenance
 * 5. Computes downstream claim restrictions
 */

import type {
  FieldSourceCandidate,
  SourceResolutionRecord,
  SubstitutionResult,
  SubstitutionClass,
  FallbackStatus,
  ResolutionDegradation,
  RedundancyDiagnostics,
} from './redundancy-types';
import { L13_QR_VERSION } from './redundancy-types';
import { getRedundancyRule, REDUNDANCY_MATRIX } from './redundancy-matrix';

const resolutionLog: SourceResolutionRecord[] = [];
let forbiddenAttemptCount = 0;

function classifyFreshness(
  observedAt: string,
  maxCacheAgeMs: number,
  maxStaleAgeMs: number,
): 'live' | 'recent_cache' | 'stale_cache' | 'expired' {
  const age = Date.now() - new Date(observedAt).getTime();
  if (age < 60_000) return 'live';
  if (age < maxCacheAgeMs) return 'recent_cache';
  if (age < maxStaleAgeMs) return 'stale_cache';
  return 'expired';
}

function deriveSubstitutionClass(
  isPrimary: boolean,
  freshness: 'live' | 'recent_cache' | 'stale_cache' | 'expired',
): SubstitutionClass {
  if (freshness === 'expired') return 'E';
  if (isPrimary && freshness === 'live') return 'A';
  if (isPrimary && freshness === 'recent_cache') return 'A';
  if (isPrimary && freshness === 'stale_cache') return 'C';
  if (!isPrimary && freshness === 'live') return 'B';
  if (!isPrimary && freshness === 'recent_cache') return 'B';
  if (!isPrimary && freshness === 'stale_cache') return 'C';
  return 'E';
}

function deriveFallbackStatus(
  isPrimary: boolean,
  freshness: 'live' | 'recent_cache' | 'stale_cache' | 'expired',
): FallbackStatus {
  if (isPrimary && freshness === 'live') return 'primary';
  if (isPrimary && freshness === 'recent_cache') return 'cached_primary';
  if (isPrimary && freshness === 'stale_cache') return 'cached_primary';
  if (!isPrimary && freshness === 'live') return 'secondary';
  if (!isPrimary && freshness === 'recent_cache') return 'cached_secondary';
  if (!isPrimary && freshness === 'stale_cache') return 'cached_secondary';
  return 'unresolved';
}

function deriveDegradation(subClass: SubstitutionClass): ResolutionDegradation {
  switch (subClass) {
    case 'A': return 'healthy';
    case 'B': return 'partial';
    case 'C': return 'stale';
    case 'D': return 'degraded';
    case 'E': return 'unresolved';
  }
}

export function resolveField(
  fieldName: string,
  primary: FieldSourceCandidate | null,
  secondary: FieldSourceCandidate | null,
): SubstitutionResult {
  const rule = getRedundancyRule(fieldName);
  if (!rule) {
    return {
      resolution: {
        fieldName,
        meaningClaim: 'unknown',
        substitutionClass: 'E',
        fallbackStatus: 'unresolved',
        confidencePenalty: 1.0,
        degradationState: 'unresolved',
        reason: `No redundancy rule defined for field "${fieldName}"`,
      },
      data: null,
      usable: false,
      claimRestrictions: [`Field "${fieldName}" has no redundancy policy — treated as unresolved`],
    };
  }

  // Try primary
  if (primary && primary.data !== null && primary.data !== undefined) {
    const freshness = classifyFreshness(primary.observedAt, rule.maxCacheAgeMs, rule.maxStaleCacheAgeMs);
    if (freshness !== 'expired') {
      const subClass = deriveSubstitutionClass(true, freshness);
      const penalty = rule.confidencePenalties[subClass];
      const resolution: SourceResolutionRecord = {
        fieldName,
        meaningClaim: rule.meaningClaim,
        primaryCandidate: primary.sourceId,
        secondaryCandidate: secondary?.sourceId,
        selectedSource: primary.sourceId,
        substitutionClass: subClass,
        fallbackStatus: deriveFallbackStatus(true, freshness),
        confidencePenalty: penalty,
        degradationState: deriveDegradation(subClass),
        reason: freshness === 'live' ? 'Primary source healthy' : `Primary cache used (age: ${freshness})`,
        observedAt: primary.observedAt,
        schemaVersion: primary.schemaVersion,
      };
      resolutionLog.push(resolution);
      return {
        resolution,
        data: primary.data,
        usable: true,
        claimRestrictions: subClass === 'C' ? rule.downstreamClaimRestrictions : [],
      };
    }
  }

  // Try secondary
  if (secondary && secondary.data !== null && secondary.data !== undefined) {
    const freshness = classifyFreshness(secondary.observedAt, rule.maxCacheAgeMs, rule.maxStaleCacheAgeMs);
    if (freshness !== 'expired') {
      const subClass = deriveSubstitutionClass(false, freshness);
      const penalty = rule.confidencePenalties[subClass];
      const resolution: SourceResolutionRecord = {
        fieldName,
        meaningClaim: rule.meaningClaim,
        primaryCandidate: primary?.sourceId,
        secondaryCandidate: secondary.sourceId,
        selectedSource: secondary.sourceId,
        substitutionClass: subClass,
        fallbackStatus: deriveFallbackStatus(false, freshness),
        confidencePenalty: penalty,
        degradationState: deriveDegradation(subClass),
        reason: `Secondary source used: ${secondary.sourceId} (${freshness})`,
        observedAt: secondary.observedAt,
        schemaVersion: secondary.schemaVersion,
      };
      resolutionLog.push(resolution);
      return {
        resolution,
        data: secondary.data,
        usable: true,
        claimRestrictions: rule.downstreamClaimRestrictions,
      };
    }
  }

  // No valid source — unresolved
  const resolution: SourceResolutionRecord = {
    fieldName,
    meaningClaim: rule.meaningClaim,
    primaryCandidate: primary?.sourceId,
    secondaryCandidate: secondary?.sourceId,
    substitutionClass: 'E',
    fallbackStatus: 'unresolved',
    confidencePenalty: rule.confidencePenalties['E'],
    degradationState: 'unresolved',
    reason: 'No valid source available — field unresolved',
  };
  resolutionLog.push(resolution);
  return {
    resolution,
    data: null,
    usable: false,
    claimRestrictions: rule.downstreamClaimRestrictions,
  };
}

/**
 * Check if a proposed substitution is forbidden by the matrix.
 * Returns the violation reason if forbidden, null if acceptable.
 */
export function checkForbiddenSubstitution(
  fieldName: string,
  proposedSourceDescription: string,
): string | null {
  const rule = getRedundancyRule(fieldName);
  if (!rule) return null;

  const lower = proposedSourceDescription.toLowerCase();
  for (const forbidden of rule.unacceptableSubstitutions) {
    if (lower.includes(forbidden.toLowerCase().substring(0, 30))) {
      forbiddenAttemptCount++;
      return `Forbidden substitution for ${fieldName}: "${forbidden}"`;
    }
  }
  return null;
}

/**
 * Build complete diagnostics for all quantum loop fields.
 */
export function buildRedundancyDiagnostics(
  resolutions: SourceResolutionRecord[],
): RedundancyDiagnostics {
  const healthy = resolutions.filter(r => r.degradationState === 'healthy').length;
  const substituted = resolutions.filter(r =>
    r.degradationState === 'partial' || r.degradationState === 'stale'
  ).length;
  const unresolved = resolutions.filter(r => r.degradationState === 'unresolved').length;
  const blocked = resolutions.filter(r => r.fallbackStatus === 'blocked').length;
  const totalPenalty = resolutions.reduce((sum, r) => sum + r.confidencePenalty, 0);

  const allRestrictions: string[] = [];
  for (const r of resolutions) {
    const rule = getRedundancyRule(r.fieldName);
    if (rule && r.degradationState !== 'healthy') {
      allRestrictions.push(...rule.downstreamClaimRestrictions);
    }
  }

  return {
    timestamp: new Date().toISOString(),
    resolutions,
    totalFields: resolutions.length,
    healthy,
    substituted,
    unresolved,
    blocked,
    totalConfidencePenalty: Math.round(totalPenalty * 1000) / 1000,
    forbiddenAttempts: forbiddenAttemptCount,
    claimRestrictions: [...new Set(allRestrictions)],
    version: L13_QR_VERSION,
  };
}

export function getResolutionLog(): SourceResolutionRecord[] {
  return [...resolutionLog];
}

export function getForbiddenAttemptCount(): number {
  return forbiddenAttemptCount;
}

export function clearResolutionLog(): void {
  resolutionLog.length = 0;
  forbiddenAttemptCount = 0;
}

/**
 * Resolve all four core BTC quantum loop fields from provided sources.
 * This is the main entry point the pipeline should call.
 */
export function resolveAllQuantumFields(sources: {
  scriptDistribution?: { primary: FieldSourceCandidate | null; secondary: FieldSourceCandidate | null };
  dormantCohorts?: { primary: FieldSourceCandidate | null; secondary: FieldSourceCandidate | null };
  pqEvidence?: { primary: FieldSourceCandidate | null; secondary: FieldSourceCandidate | null };
  totalSupply?: { primary: FieldSourceCandidate | null; secondary: FieldSourceCandidate | null };
}): {
  results: Record<string, SubstitutionResult>;
  diagnostics: RedundancyDiagnostics;
} {
  const results: Record<string, SubstitutionResult> = {};
  const resolutions: SourceResolutionRecord[] = [];

  for (const fieldName of ['scriptDistribution', 'dormantCohorts', 'pqEvidence', 'totalSupply'] as const) {
    const src = sources[fieldName];
    const result = resolveField(
      fieldName,
      src?.primary ?? null,
      src?.secondary ?? null,
    );
    results[fieldName] = result;
    resolutions.push(result.resolution);
  }

  return {
    results,
    diagnostics: buildRedundancyDiagnostics(resolutions),
  };
}
