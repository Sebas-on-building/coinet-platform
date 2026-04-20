/**
 * L10.2 — HypothesisConfirmationSet Contract
 *
 * §10.2.10 — Defines what still needs to happen for a candidate to
 * strengthen. First-class — may not be conflated with invalidations.
 */

import { fnv1aHexL10 } from './hypothesis-subject';

export interface L10HypothesisConfirmationSet {
  readonly confirmation_set_id: string;
  readonly hypothesis_candidate_id: string;

  readonly required_confirmation_refs: readonly string[];
  readonly present_confirmation_refs: readonly string[];
  readonly missing_confirmation_refs: readonly string[];
  readonly confirmation_gap_score: number; // 0..1

  readonly lineage_refs: readonly string[];
}

export function buildL10ConfirmationSetId(
  hypothesis_candidate_id: string,
  as_of: string,
): string {
  return `hcnf_${fnv1aHexL10(hypothesis_candidate_id)}_${fnv1aHexL10(as_of)}`;
}
