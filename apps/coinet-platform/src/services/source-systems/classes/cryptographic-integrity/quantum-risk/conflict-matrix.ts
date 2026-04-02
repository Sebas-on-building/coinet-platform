/**
 * L1.5 — Conflict Matrix for BTC Quantum Loop
 *
 * Field-specific rules governing: who wins, when averaging is allowed,
 * when contradiction must be preserved, and when output must degrade.
 */

import type { FieldConflictRule } from './conflict-types';

export const CONFLICT_MATRIX: Record<string, FieldConflictRule> = {

  scriptDistribution: {
    fieldName: 'scriptDistribution',
    policy: 'numeric',
    averagingAllowed: true,
    tolerancePct: 0.05,
    semanticAlignmentRequired: true,
    preserveContradictionAbove: 'high',
    degradeAbove: 'moderate',
    unresolvedAbove: 'critical',
    winnerRules: [
      'Direct chain-derived classification wins over third-party interpreted summary',
      'Fresher healthy source wins over older if schema matches',
      'Higher authority source wins if health is comparable',
    ],
    downstreamRestrictions: [
      'key_exposure_rate confidence reduced under unresolved script conflict',
      'No precise exposure percentage claim under high-severity script conflict',
    ],
  },

  dormantCohorts: {
    fieldName: 'dormantCohorts',
    policy: 'numeric',
    averagingAllowed: true,
    tolerancePct: 0.08,
    semanticAlignmentRequired: true,
    preserveContradictionAbove: 'high',
    degradeAbove: 'moderate',
    unresolvedAbove: 'critical',
    winnerRules: [
      'Direct chain-derived bucketed cohort wins over modeled or external summary',
      'Fresher compatible source wins if authority roughly equal',
    ],
    downstreamRestrictions: [
      'dormant_vulnerable_supply confidence reduced under conflict',
      'No precise vulnerable dormant BTC figure under high-severity cohort conflict',
    ],
  },

  pqEvidence: {
    fieldName: 'pqEvidence',
    policy: 'stage',
    averagingAllowed: false,
    tolerancePct: 0,
    semanticAlignmentRequired: true,
    preserveContradictionAbove: 'moderate',
    degradeAbove: 'moderate',
    unresolvedAbove: 'high',
    winnerRules: [
      'Deployed code evidence beats implementation claim',
      'Implementation evidence beats proposal',
      'Proposal evidence beats informal statement',
      'Stricter defensible stage wins when conflict remains',
    ],
    downstreamRestrictions: [
      'pq_migration_progress confidence drops under PQ conflict',
      'No "Bitcoin is migrating" claim without stage evidence agreement',
      'Scenario language must weaken under posture conflict',
    ],
  },

  totalSupply: {
    fieldName: 'totalSupply',
    policy: 'numeric',
    averagingAllowed: true,
    tolerancePct: 0.001,
    toleranceAbsolute: 50_000,
    semanticAlignmentRequired: true,
    preserveContradictionAbove: 'high',
    degradeAbove: 'moderate',
    unresolvedAbove: 'critical',
    winnerRules: [
      'Semantically aligned deterministic chain-derived denominator wins',
      'If same denominator meaning and tiny drift, healthier source wins',
    ],
    downstreamRestrictions: [
      'No precise exposure percentage if denominator definition ambiguous',
    ],
  },

  btcPriceContext: {
    fieldName: 'btcPriceContext',
    policy: 'numeric',
    averagingAllowed: true,
    tolerancePct: 0.005,
    semanticAlignmentRequired: true,
    preserveContradictionAbove: 'high',
    degradeAbove: 'moderate',
    unresolvedAbove: 'critical',
    winnerRules: [
      'Fresher healthy mapped price feed wins',
      'Canonical price provider wins if difference is material',
    ],
    downstreamRestrictions: [
      'Market-context-dependent reasoning weakens if price uncertain',
    ],
  },

  outcomeMetrics: {
    fieldName: 'outcomeMetrics',
    policy: 'numeric',
    averagingAllowed: false,
    tolerancePct: 0.01,
    semanticAlignmentRequired: true,
    preserveContradictionAbove: 'moderate',
    degradeAbove: 'moderate',
    unresolvedAbove: 'high',
    winnerRules: [
      'Recomputed canonical outcome beats manually attached or weaker recomputation',
      'Canonical horizon definition wins',
    ],
    downstreamRestrictions: [
      'Edge report must exclude corrupted outcome rows',
      'Calibration confidence must reduce if row quality weak',
    ],
  },
};

export function getConflictRule(fieldName: string): FieldConflictRule | undefined {
  return CONFLICT_MATRIX[fieldName];
}

export function getAllConflictFieldNames(): string[] {
  return Object.keys(CONFLICT_MATRIX);
}
