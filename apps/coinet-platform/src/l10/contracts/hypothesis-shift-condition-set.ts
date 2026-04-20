/**
 * L10.2 — HypothesisShiftConditionSet Contract
 *
 * §10.2.15 — Machine-usable conditions describing what would change the
 * ranking. Required when competition is live and spread is not wide.
 */

import { fnv1aHexL10 } from './hypothesis-subject';

export interface L10HypothesisShiftConditionSet {
  readonly shift_condition_set_id: string;
  readonly hypothesis_subject_id: string;
  readonly hypothesis_ranking_ref: string;
  readonly as_of: string;

  readonly current_primary_ref: string;
  readonly current_secondary_ref: string | null;

  readonly promotion_conditions_for_secondary: readonly string[];
  readonly reinforcement_conditions_for_primary: readonly string[];
  readonly collapse_conditions_for_primary: readonly string[];
  readonly spread_narrowing_conditions: readonly string[];

  readonly evidence_pack_ref: string;
  readonly replay_hash: string;
  readonly lineage_refs: readonly string[];
}

export function buildL10ShiftConditionSetId(
  hypothesis_subject_id: string,
  as_of: string,
  compute_run_id: string,
): string {
  const key = `${hypothesis_subject_id}|${as_of}|${compute_run_id}`;
  return `hshift_${fnv1aHexL10(key)}_${fnv1aHexL10(hypothesis_subject_id)}`;
}
