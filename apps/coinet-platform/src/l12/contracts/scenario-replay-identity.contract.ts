/**
 * L12.3 — Scenario replay identity contract (§12.3.14).
 */

export interface L12ScenarioReplayIdentity {
  readonly replay_identity_id: string;

  readonly scenario_subject_id: string;
  readonly scenario_set_id: string;

  readonly scenario_contract_version: string;
  readonly scenario_engine_version?: string;

  readonly subject_replay_hash: string;
  readonly set_replay_hash: string;
  readonly scenario_replay_hashes: readonly string[];
  readonly condition_replay_hashes: readonly string[];
  readonly trigger_replay_hashes: readonly string[];
  readonly invalidation_replay_hashes: readonly string[];
  readonly confidence_replay_hash: string;
  readonly shift_condition_replay_hash: string;
  readonly restriction_replay_hash: string;
  readonly evidence_pack_replay_hash: string;

  readonly input_snapshot_ref: string;

  readonly lower_layer_snapshot_refs: readonly string[];

  readonly policy_version: string;
  readonly replay_hash: string;
}
