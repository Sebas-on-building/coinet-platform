/**
 * Substitution Resolver — the runtime engine that determines active
 * substitution state for every truth atom.
 *
 * Resolution flow:
 * 1. Identify atom and primary authority
 * 2. Check primary health and freshness
 * 3. If primary fails, evaluate same-truth secondary substitutions
 * 4. If none, evaluate temporal fallback rules
 * 5. If temporal not allowed or expired, evaluate adjacent-truth continuity
 * 6. If no valid continuity, mark atom blind
 * 7. Apply penalties and claim lockouts
 * 8. Run compound blind-spot escalation
 * 9. Emit substitution fingerprint
 */

import type { ResolvedSubstitution, SubstitutionStatus, SubstitutionMode, SubstitutionPenalty } from './types';
import { getRedundancyRule, REDUNDANCY_RULES } from './truth-atom-rules';
import { computeSubstitutionPenalty, computeBlindPenalty, computeTemporalFallbackPenalty } from './penalty-model';
import { getLockedOutClaimFamilies } from './claim-lockouts';
import { isProviderAvailable, getProviderHealth } from '../health-monitor';

export interface SubstitutionContext {
  lastTrustedStateAges?: Record<string, number>;
}

export function resolveSubstitution(
  truthAtomId: string,
  context: SubstitutionContext = {},
): ResolvedSubstitution {
  const rule = getRedundancyRule(truthAtomId);
  if (!rule) {
    return blindResult(truthAtomId, 'No redundancy rule defined');
  }

  if (isSourceHealthy(rule.primarySourceId)) {
    return {
      truthAtomId,
      status: 'PRIMARY_HEALTHY',
      activeSourceId: rule.primarySourceId,
      mode: 'SAME_AUTHORITY',
      penalty: zeroPenalty(),
      lockedOutClaims: [],
      rationale: [`Primary ${rule.primarySourceId} is healthy`],
    };
  }

  for (const sub of rule.acceptableSubstitutions) {
    if (sub.mode === 'TEMPORAL_FALLBACK') continue;
    if (sub.mode === 'ADJACENT_TRUTH_CONTINUITY') continue;

    if (sub.sourceId === 'temporal_last_state' || sub.sourceId === 'explorer_reconstruction'
      || sub.sourceId === 'explorer_contract_check' || sub.sourceId === 'onchain_behavior_proxy'
      || sub.sourceId === 'internal_heuristic') {
      continue;
    }

    if (isSourceHealthy(sub.sourceId)) {
      const penalty = computeSubstitutionPenalty(sub, 0, sub.maxFreshnessMs);
      return {
        truthAtomId,
        status: 'SECONDARY_SUBSTITUTED',
        activeSourceId: sub.sourceId,
        mode: sub.mode,
        penalty,
        lockedOutClaims: [],
        rationale: [
          `Primary ${rule.primarySourceId} unavailable`,
          `Secondary ${sub.sourceId} substituted (${sub.mode})`,
          ...sub.notes,
        ],
      };
    }
  }

  for (const secId of rule.secondarySourceIds) {
    if (isSourceHealthy(secId)) {
      return {
        truthAtomId,
        status: 'SECONDARY_SUBSTITUTED',
        activeSourceId: secId,
        mode: 'SAME_AUTHORITY',
        penalty: { authorityPenalty: 0.1, freshnessPenalty: 0, scopePenalty: 0, confidencePenalty: 0.05, claimRightsPenalty: 'none', totalConfidenceReduction: 0.15 },
        lockedOutClaims: [],
        rationale: [
          `Primary ${rule.primarySourceId} unavailable`,
          `Registered secondary ${secId} substituted`,
        ],
      };
    }
  }

  if (rule.temporalFallback.allowed) {
    const staleMs = context.lastTrustedStateAges?.[truthAtomId] ?? 0;
    if (staleMs > 0 && staleMs <= rule.temporalFallback.maxAgeMs) {
      const penalty = computeTemporalFallbackPenalty(staleMs, rule.temporalFallback.maxAgeMs, 0.15);
      return {
        truthAtomId,
        status: 'TEMPORAL_FALLBACK_ACTIVE',
        activeSourceId: null,
        mode: 'TEMPORAL_FALLBACK',
        penalty,
        lockedOutClaims: rule.noFallbackClaimFamilies,
        staleSinceMs: staleMs,
        rationale: [
          `All live sources unavailable for ${truthAtomId}`,
          `Temporal fallback active (age: ${(staleMs / 1000).toFixed(0)}s, max: ${(rule.temporalFallback.maxAgeMs / 1000).toFixed(0)}s)`,
          `Claim strength limited to ${rule.temporalFallback.allowedClaimStrength}`,
        ],
      };
    }
  }

  const adjacentSub = rule.acceptableSubstitutions.find(s => s.mode === 'ADJACENT_TRUTH_CONTINUITY');
  if (adjacentSub) {
    const penalty = computeSubstitutionPenalty(adjacentSub, 0);
    return {
      truthAtomId,
      status: 'ADJACENT_CONTINUITY_ONLY',
      activeSourceId: adjacentSub.sourceId,
      mode: 'ADJACENT_TRUTH_CONTINUITY',
      penalty,
      lockedOutClaims: rule.noFallbackClaimFamilies,
      rationale: [
        `All live and temporal sources unavailable for ${truthAtomId}`,
        `Adjacent-truth continuity via ${adjacentSub.sourceId} — this is NOT equivalent substitution`,
        ...adjacentSub.notes,
      ],
    };
  }

  const blindPenalty = computeBlindPenalty();
  return {
    truthAtomId,
    status: 'BLIND',
    activeSourceId: null,
    mode: 'NO_FALLBACK',
    penalty: blindPenalty,
    lockedOutClaims: rule.noFallbackClaimFamilies,
    rationale: [
      `Truth atom ${truthAtomId} is BLIND — no primary, secondary, temporal, or adjacent path available`,
      rule.failMode === 'fail_stop'
        ? 'FAIL-STOP: claims requiring this truth must be refused'
        : 'FAIL-SOFT: degraded judgment allowed with heavy penalties',
    ],
  };
}

export function resolveAllSubstitutions(
  context: SubstitutionContext = {},
): Map<string, ResolvedSubstitution> {
  const results = new Map<string, ResolvedSubstitution>();
  for (const rule of REDUNDANCY_RULES) {
    results.set(rule.truthAtomId, resolveSubstitution(rule.truthAtomId, context));
  }
  return results;
}

function isSourceHealthy(sourceId: string): boolean {
  return isProviderAvailable(sourceId) && getProviderHealth(sourceId).healthScore > 0.3;
}

function zeroPenalty(): SubstitutionPenalty {
  return {
    authorityPenalty: 0,
    freshnessPenalty: 0,
    scopePenalty: 0,
    confidencePenalty: 0,
    claimRightsPenalty: 'none',
    totalConfidenceReduction: 0,
  };
}

function blindResult(truthAtomId: string, reason: string): ResolvedSubstitution {
  return {
    truthAtomId,
    status: 'BLIND',
    activeSourceId: null,
    mode: 'NO_FALLBACK',
    penalty: computeBlindPenalty(),
    lockedOutClaims: [],
    rationale: [reason],
  };
}
