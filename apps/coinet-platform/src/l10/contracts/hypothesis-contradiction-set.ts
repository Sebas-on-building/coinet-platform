/**
 * L10.2 — HypothesisContradictionSet Contract
 *
 * §10.2.9 — Governed record of what weakens, narrows, or blocks a
 * candidate. First-class — may never be reduced to a hidden penalty.
 */

import { fnv1aHexL10 } from './hypothesis-subject';

export interface L10HypothesisContradictionSet {
  readonly contradiction_set_id: string;
  readonly hypothesis_candidate_id: string;

  readonly contradiction_refs: readonly string[];
  readonly contradiction_domains: readonly string[];
  readonly contradiction_pressure_score: number; // 0..1

  readonly blocking_contradiction_refs: readonly string[];
  readonly narrowing_contradiction_refs: readonly string[];
  readonly decayed_contradiction_refs: readonly string[];

  readonly lineage_refs: readonly string[];
}

export function buildL10ContradictionSetId(
  hypothesis_candidate_id: string,
  as_of: string,
): string {
  return `hcon_${fnv1aHexL10(hypothesis_candidate_id)}_${fnv1aHexL10(as_of)}`;
}
