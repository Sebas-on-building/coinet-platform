/**
 * L10.2 — HypothesisSupportSet Contract
 *
 * §10.2.8 — Governed collection of evidence that supports one candidate.
 * First-class object — may not be folded into net-evidence scoring.
 */

import { fnv1aHexL10 } from './hypothesis-subject';

export interface L10HypothesisSupportSet {
  readonly support_set_id: string;
  readonly hypothesis_candidate_id: string;

  readonly supporting_refs: readonly string[];
  readonly support_domains: readonly string[];
  readonly support_strength_score: number; // 0..1
  readonly support_coverage_score: number; // 0..1

  readonly stale_support_refs: readonly string[];
  readonly degraded_support_refs: readonly string[];
  readonly missing_expected_support_refs: readonly string[];

  readonly lineage_refs: readonly string[];
}

export function buildL10SupportSetId(
  hypothesis_candidate_id: string,
  as_of: string,
): string {
  return `hsup_${fnv1aHexL10(hypothesis_candidate_id)}_${fnv1aHexL10(as_of)}`;
}
