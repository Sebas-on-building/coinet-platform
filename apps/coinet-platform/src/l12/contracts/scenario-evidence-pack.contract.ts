/**
 * L12.3 — Scenario evidence pack contract (§12.3.13).
 */

export interface L12ScenarioEvidencePackContract {
  readonly evidence_pack_contract_id: string;

  readonly evidence_pack_ref: string;
  readonly scenario_set_id: string;

  readonly subject_ref: string;

  readonly scenario_refs: readonly string[];
  readonly condition_refs: readonly string[];
  readonly trigger_refs: readonly string[];
  readonly invalidation_refs: readonly string[];
  readonly confidence_profile_refs: readonly string[];
  readonly shift_condition_refs: readonly string[];
  readonly restriction_profile_refs: readonly string[];

  readonly lower_layer_evidence_refs: readonly string[];

  readonly validation_evidence_refs: readonly string[];
  readonly regime_evidence_refs: readonly string[];
  readonly sequence_evidence_refs: readonly string[];
  readonly hypothesis_evidence_refs: readonly string[];
  readonly score_evidence_refs: readonly string[];

  readonly input_snapshot_ref: string;

  readonly lineage_refs: readonly string[];

  readonly archive_policy_ref: string;
  readonly replay_safe_ref: string;

  readonly policy_version: string;
  readonly replay_hash: string;
}

/**
 * Heuristic for "raw lower-layer ref": L1 (raw ticks/orderbook) or L2
 * (un-governed primitives). These are illegal as decisive scenario proof.
 */
const RAW_REF_PATTERN = /^(l[12]|raw|primitive|ohlcv|tick|orderbook)[:.]/i;

export function isL12RawLowerLayerEvidenceRef(ref: string): boolean {
  if (!ref) return false;
  return RAW_REF_PATTERN.test(ref);
}
