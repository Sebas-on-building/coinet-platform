/**
 * L10.3 — Hypothesis Shift Condition Contract
 *
 * §10.3.7.2 — Machine-usable conditions describing what would change
 * the ranking. Required when competition is live and spread is not
 * wide.
 */

export interface L10HypothesisShiftConditionLineageRefs {
  readonly trace_id: string;
  readonly manifest_id: string;
  readonly upstream_refs: readonly string[];
}

export interface L10HypothesisShiftConditionContract {
  // Identity (§10.3.7.2)
  readonly shift_condition_set_id: string;
  readonly hypothesis_subject_id: string;
  readonly ranking_ref: string;

  // Contract versioning (§10.3.8.1)
  readonly shift_condition_contract_version: string;
  readonly schema_version: string;
  readonly policy_version: string;

  // Time
  readonly as_of: string;

  // Current state (§10.3.7.2)
  readonly current_primary_ref: string;
  readonly current_secondary_ref: string | null;

  // Conditions (§10.3.7.2)
  readonly promotion_conditions_for_secondary: readonly string[];
  readonly reinforcement_conditions_for_primary: readonly string[];
  readonly collapse_conditions_for_primary: readonly string[];
  readonly spread_narrowing_conditions: readonly string[];

  // Persistence / replay
  readonly evidence_pack_ref: string;
  readonly replay_hash: string;
  readonly lineage_refs: L10HypothesisShiftConditionLineageRefs;
}

export const L10_SHIFT_CONDITION_CONTRACT_REQUIRED_FIELDS: readonly string[] = [
  'shift_condition_set_id', 'hypothesis_subject_id', 'ranking_ref',
  'shift_condition_contract_version', 'schema_version', 'policy_version',
  'as_of',
  'current_primary_ref',
  'promotion_conditions_for_secondary',
  'reinforcement_conditions_for_primary',
  'collapse_conditions_for_primary',
  'spread_narrowing_conditions',
  'evidence_pack_ref', 'replay_hash', 'lineage_refs',
];
