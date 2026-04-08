/**
 * L3.5-A — Metric Compatibility Rules
 *
 * Defines when two metric observations are compatible, incompatible,
 * mergeable, or comparable-only. This is where fake metric equivalence
 * gets blocked.
 *
 * Two observations may look similar and still be incompatible.
 */

import {
  getMetricContract,
  deriveComparabilitySignature,
  type MetricContract,
} from './metric-contracts';
import type { CanonicalMetricObservation } from './metric-namespace';

export const L35_COMPAT_VERSION = '1.0.0' as const;

// ═══════════════════════════════════════════════════════════════════════════════
// COMPATIBILITY OUTCOME
// ═══════════════════════════════════════════════════════════════════════════════

export type MetricCompatibilityOutcome =
  | 'MERGE_COMPATIBLE'
  | 'COMPARE_ONLY'
  | 'INCOMPATIBLE'
  | 'BLOCKED_BY_UNCERTAINTY'
  | 'BLOCKED_BY_SCOPE'
  | 'BLOCKED_BY_BASIS'
  | 'BLOCKED_BY_UNIT'
  | 'BLOCKED_BY_WINDOW'
  | 'BLOCKED_BY_AGGREGATION_RULE';

export interface MetricCompatibilityDecision {
  outcome: MetricCompatibilityOutcome;
  reasons: string[];
  pathA: string;
  pathB: string;
  sigA: string;
  sigB: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CORE EVALUATION
// ═══════════════════════════════════════════════════════════════════════════════

export function evaluateMetricCompatibility(
  pathA: string,
  pathB: string,
): MetricCompatibilityDecision {
  const contractA = getMetricContract(pathA);
  const contractB = getMetricContract(pathB);
  const reasons: string[] = [];

  if (!contractA || !contractB) {
    return {
      outcome: 'INCOMPATIBLE', reasons: ['MISSING_CONTRACT'],
      pathA, pathB,
      sigA: contractA?.comparabilitySignature ?? 'NONE',
      sigB: contractB?.comparabilitySignature ?? 'NONE',
    };
  }

  const sigA = contractA.comparabilitySignature;
  const sigB = contractB.comparabilitySignature;

  if (contractA.blockedMergeConditions.includes(pathB) || contractB.blockedMergeConditions.includes(pathA)) {
    reasons.push(`BLOCKED_MERGE_CONDITION:${pathA}<->${pathB}`);
    return {
      outcome: sameFamilyRelated(contractA, contractB) ? 'COMPARE_ONLY' : 'INCOMPATIBLE',
      reasons, pathA, pathB, sigA, sigB,
    };
  }

  if (contractA.unit !== contractB.unit) {
    return { outcome: 'BLOCKED_BY_UNIT', reasons: [`UNIT:${contractA.unit}!=${contractB.unit}`], pathA, pathB, sigA, sigB };
  }

  if (contractA.valueType !== contractB.valueType) {
    return { outcome: 'INCOMPATIBLE', reasons: [`VALUE_TYPE:${contractA.valueType}!=${contractB.valueType}`], pathA, pathB, sigA, sigB };
  }

  if (contractA.scope.domain !== contractB.scope.domain) {
    return { outcome: 'BLOCKED_BY_SCOPE', reasons: [`SCOPE:${contractA.scope.domain}!=${contractB.scope.domain}`], pathA, pathB, sigA, sigB };
  }

  const basisA = extractPrimaryBasis(contractA);
  const basisB = extractPrimaryBasis(contractB);
  if (basisA !== basisB) {
    return { outcome: 'BLOCKED_BY_BASIS', reasons: [`BASIS:${basisA}!=${basisB}`], pathA, pathB, sigA, sigB };
  }

  if (contractA.aggregationRule !== contractB.aggregationRule) {
    return { outcome: 'BLOCKED_BY_AGGREGATION_RULE', reasons: [`AGG:${contractA.aggregationRule}!=${contractB.aggregationRule}`], pathA, pathB, sigA, sigB };
  }

  if (contractA.window.kind !== contractB.window.kind
    || contractA.window.value !== contractB.window.value
    || contractA.window.unit !== contractB.window.unit) {
    return { outcome: 'BLOCKED_BY_WINDOW', reasons: ['WINDOW_MISMATCH'], pathA, pathB, sigA, sigB };
  }

  if (sigA === sigB) {
    return { outcome: 'MERGE_COMPATIBLE', reasons: ['FULL_SIGNATURE_MATCH'], pathA, pathB, sigA, sigB };
  }

  if (sameFamilyRelated(contractA, contractB)) {
    return { outcome: 'COMPARE_ONLY', reasons: ['SAME_FAMILY_DIFFERENT_DETAILS'], pathA, pathB, sigA, sigB };
  }

  return { outcome: 'MERGE_COMPATIBLE', reasons: ['ALL_FIELDS_COMPATIBLE'], pathA, pathB, sigA, sigB };
}

function sameFamilyRelated(a: MetricContract, b: MetricContract): boolean {
  return a.semanticFamily === b.semanticFamily;
}

function extractPrimaryBasis(c: MetricContract): string {
  return c.basis.priceBasis ?? c.basis.valuationBasis ?? c.basis.flowBasis ?? c.basis.riskBasis ?? c.basis.eventBasis ?? 'none';
}

// ═══════════════════════════════════════════════════════════════════════════════
// OBSERVATION-LEVEL COMPATIBILITY
// ═══════════════════════════════════════════════════════════════════════════════

export function canMergeMetricObservations(
  obsA: CanonicalMetricObservation,
  obsB: CanonicalMetricObservation,
): { mergeable: boolean; decision: MetricCompatibilityDecision } {
  const decision = evaluateMetricCompatibility(obsA.metricPath, obsB.metricPath);
  if (decision.outcome !== 'MERGE_COMPATIBLE') {
    return { mergeable: false, decision };
  }
  if (obsA.admissibilityState === 'BLOCKED' || obsB.admissibilityState === 'BLOCKED') {
    return {
      mergeable: false,
      decision: { ...decision, outcome: 'BLOCKED_BY_UNCERTAINTY', reasons: [...decision.reasons, 'BLOCKED_ADMISSIBILITY'] },
    };
  }
  return { mergeable: true, decision };
}

export function canCompareMetricObservations(
  obsA: CanonicalMetricObservation,
  obsB: CanonicalMetricObservation,
): { comparable: boolean; decision: MetricCompatibilityDecision } {
  const decision = evaluateMetricCompatibility(obsA.metricPath, obsB.metricPath);
  const comparable = decision.outcome === 'MERGE_COMPATIBLE' || decision.outcome === 'COMPARE_ONLY';
  return { comparable, decision };
}

export function getMetricMergeBlockReasons(pathA: string, pathB: string): string[] {
  const decision = evaluateMetricCompatibility(pathA, pathB);
  return decision.outcome === 'MERGE_COMPATIBLE' ? [] : decision.reasons;
}
