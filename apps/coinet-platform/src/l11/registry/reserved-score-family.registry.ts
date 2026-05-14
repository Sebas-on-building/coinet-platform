/**
 * L11.2 — Reserved Score-Family Registry (§11.2.8)
 *
 * Doctrine record of reserved second-wave families. They may exist in
 * registries and documentation, may not emit current production
 * scores, may not appear in current authoritative read surfaces, and
 * may not be consumed by L12+. Any attempt to emit from a reserved
 * family is rejected by the score-output validator.
 */

import {
  L11ScoreFamily,
  L11_RESERVED_SCORE_FAMILIES,
} from '../contracts/score-family';
import {
  L11ScoreProductionStatus,
  statusForbidsProductionEmission,
} from '../contracts/score-production-status';
import {
  L11ScoreFamilyDefinition,
  getL11ScoreFamilyDefinition,
} from '../contracts/score-family-catalogue';

export interface L11ReservedFamilyEntry {
  readonly score_family: L11ScoreFamily;
  readonly status: L11ScoreProductionStatus;
  readonly reason_for_reservation: string;
  readonly downstream_blocked_for: readonly string[];
}

export const L11_RESERVED_FAMILY_ENTRIES: readonly L11ReservedFamilyEntry[] = [
  {
    score_family: L11ScoreFamily.NARRATIVE_QUALITY,
    status: L11ScoreProductionStatus.RESERVED,
    reason_for_reservation: 'narrative governance not yet ratified at L11',
    downstream_blocked_for: ['L12_PRODUCTION', 'L13_PRODUCTION', 'L14_PRODUCTION'],
  },
  {
    score_family: L11ScoreFamily.FUNDAMENTAL_SUBSTANCE,
    status: L11ScoreProductionStatus.RESERVED,
    reason_for_reservation: 'fundamental substance evidence catalogue still in L6 expansion',
    downstream_blocked_for: ['L12_PRODUCTION', 'L13_PRODUCTION', 'L14_PRODUCTION'],
  },
  {
    score_family: L11ScoreFamily.LIQUIDITY_QUALITY,
    status: L11ScoreProductionStatus.RESERVED,
    reason_for_reservation: 'covered downstream of MARKET_STRUCTURE for now',
    downstream_blocked_for: ['L12_PRODUCTION', 'L13_PRODUCTION', 'L14_PRODUCTION'],
  },
  {
    score_family: L11ScoreFamily.MANIPULATION_RISK,
    status: L11ScoreProductionStatus.RESERVED,
    reason_for_reservation: 'manipulation evidence law not yet finalised at L7',
    downstream_blocked_for: ['L12_PRODUCTION', 'L13_PRODUCTION', 'L14_PRODUCTION'],
  },
  {
    score_family: L11ScoreFamily.ECOSYSTEM_BETA,
    status: L11ScoreProductionStatus.RESERVED,
    reason_for_reservation: 'ecosystem propagation surfaces still being formalised at L4',
    downstream_blocked_for: ['L12_PRODUCTION', 'L13_PRODUCTION', 'L14_PRODUCTION'],
  },
  {
    score_family: L11ScoreFamily.CONTINUATION_QUALITY,
    status: L11ScoreProductionStatus.RESERVED,
    reason_for_reservation: 'continuation semantics depend on TIMING + MARKET_STRUCTURE calibration',
    downstream_blocked_for: ['L12_PRODUCTION', 'L13_PRODUCTION', 'L14_PRODUCTION'],
  },
  {
    score_family: L11ScoreFamily.REVERSAL_RISK,
    status: L11ScoreProductionStatus.RESERVED,
    reason_for_reservation: 'reversal hypothesis spread reliance not yet validated',
    downstream_blocked_for: ['L12_PRODUCTION', 'L13_PRODUCTION', 'L14_PRODUCTION'],
  },
];

export interface L11ReservedFamilyRegistryIssue {
  readonly family: L11ScoreFamily | null;
  readonly reason: string;
}

export interface L11ReservedFamilyRegistryReport {
  readonly ok: boolean;
  readonly count: number;
  readonly issues: readonly L11ReservedFamilyRegistryIssue[];
}

export function buildL11ReservedFamilyRegistryReport(
  entries: readonly L11ReservedFamilyEntry[] = L11_RESERVED_FAMILY_ENTRIES,
): L11ReservedFamilyRegistryReport {
  const issues: L11ReservedFamilyRegistryIssue[] = [];
  const seen = new Set<L11ScoreFamily>();
  for (const e of entries) {
    if (seen.has(e.score_family)) {
      issues.push({ family: e.score_family, reason: 'duplicate reserved registration' });
      continue;
    }
    seen.add(e.score_family);

    if (!statusForbidsProductionEmission(e.status)) {
      issues.push({
        family: e.score_family,
        reason: 'reserved entry has non-blocking production status',
      });
    }
    const def = getL11ScoreFamilyDefinition(e.score_family);
    if (!def) {
      issues.push({
        family: e.score_family,
        reason: 'reserved family has no catalogue definition',
      });
    } else if (def.production_status !== e.status) {
      issues.push({
        family: e.score_family,
        reason: `catalogue/registry status mismatch: catalogue=${def.production_status}, reserved-registry=${e.status}`,
      });
    }
  }

  for (const f of L11_RESERVED_SCORE_FAMILIES) {
    if (!seen.has(f)) {
      issues.push({ family: f, reason: 'reserved family missing from registry' });
    }
  }

  return { ok: issues.length === 0, count: entries.length, issues };
}

export function isL11FamilyReserved(family: L11ScoreFamily): boolean {
  const def: L11ScoreFamilyDefinition | undefined =
    getL11ScoreFamilyDefinition(family);
  if (!def) return false;
  return statusForbidsProductionEmission(def.production_status);
}
