/**
 * L10.3 — Hypothesis Ranking Contract
 *
 * §10.3.6 — The governed competition-state object. Not a sorted list —
 * the object that preserves explanation plurality.
 *
 * §10.3.6.5 — If more than one legal candidate exists, ranking must
 * preserve that plurality. Suppressing the secondary when it remains
 * plausible is illegal.
 */

import type { L10RankingStabilityClass } from './hypothesis-ranking';

export interface L10HypothesisRankingLineageRefs {
  readonly trace_id: string;
  readonly manifest_id: string;
  readonly upstream_refs: readonly string[];
}

export interface L10HypothesisRankingContract {
  // Identity (§10.3.6.2)
  readonly ranking_id: string;
  readonly hypothesis_subject_id: string;
  readonly subject_contract_ref: string;

  // Contract versioning (§10.3.8.1)
  readonly ranking_contract_version: string;
  readonly schema_version: string;
  readonly ranking_policy_version: string;
  readonly policy_version: string;

  // Time
  readonly as_of: string;

  // Competition (§10.3.6.2 / §10.3.6.5)
  readonly ordered_hypothesis_refs: readonly string[];
  readonly primary_hypothesis_ref: string;
  readonly secondary_hypothesis_ref: string | null;
  readonly competition_size: number;

  // Spread / stability (§10.3.6.2 / §10.3.6.3)
  readonly confidence_spread: number;
  readonly narrow_spread_flag: boolean;
  readonly ranking_stability_class: L10RankingStabilityClass;

  // Side-outputs (§10.3.6.2)
  readonly spread_profile_ref: string;
  readonly shift_condition_set_ref: string | null;

  // Persistence / replay (§10.3.6.2 / §10.3.8.2)
  readonly evidence_pack_ref: string;
  readonly input_snapshot_ref: string;
  readonly compute_run_id: string;
  readonly replay_hash: string;
  readonly lineage_refs: L10HypothesisRankingLineageRefs;
}

export const L10_RANKING_CONTRACT_REQUIRED_FIELDS: readonly string[] = [
  'ranking_id', 'hypothesis_subject_id', 'subject_contract_ref',
  'ranking_contract_version', 'schema_version',
  'ranking_policy_version', 'policy_version',
  'as_of',
  'ordered_hypothesis_refs', 'primary_hypothesis_ref',
  'competition_size',
  'confidence_spread', 'ranking_stability_class',
  'spread_profile_ref',
  'evidence_pack_ref', 'input_snapshot_ref',
  'compute_run_id', 'replay_hash', 'lineage_refs',
];
