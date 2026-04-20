/**
 * L10.2 — HypothesisInvalidationSet Contract
 *
 * §10.2.11 — What could meaningfully break or collapse a candidate.
 * First-class — stickiness without explicit invalidation is illegal.
 */

import { fnv1aHexL10 } from './hypothesis-subject';

export interface L10HypothesisInvalidationSet {
  readonly invalidation_set_id: string;
  readonly hypothesis_candidate_id: string;

  readonly invalidation_signal_refs: readonly string[];
  readonly active_invalidation_refs: readonly string[];
  readonly potential_invalidation_refs: readonly string[];
  readonly invalidation_risk_score: number; // 0..1

  readonly lineage_refs: readonly string[];
}

export function buildL10InvalidationSetId(
  hypothesis_candidate_id: string,
  as_of: string,
): string {
  return `hinv_${fnv1aHexL10(hypothesis_candidate_id)}_${fnv1aHexL10(as_of)}`;
}
