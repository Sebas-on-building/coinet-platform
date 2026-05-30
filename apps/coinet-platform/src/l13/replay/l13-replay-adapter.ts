/**
 * L13.11 — Replay Adapter
 *
 * §13.11.2 / §13.11.5 / §13.11.8 — Pure function that consumes
 * two replay-substrate snapshots, runs the equivalence engine,
 * and emits an `L13ReplayResult`.
 */

import {
  L13RepairReasonCode,
  L13ReplayEquivalenceClass,
  L13ReplayMode,
  L13ReplayStatus,
  type L13ReplayResult,
} from '../contracts/l13-replay-result';
import { fnv1a } from '../context/_fnv1a';
import {
  evaluateL13ReplayEquivalence,
  type L13ReplaySubstrateSnapshot,
} from './l13-replay-equivalence';

const POLICY_V = 'l13.replay.v1';

export interface L13ReplayAdapterInput {
  readonly replay_mode: L13ReplayMode;
  readonly source_output_id: string;
  readonly source_runtime_run_id: string;
  readonly replay_output_id?: string;
  readonly replay_runtime_run_id?: string;
  readonly source_snapshot: L13ReplaySubstrateSnapshot;
  readonly replay_snapshot: L13ReplaySubstrateSnapshot;
  readonly substrate_complete: boolean;
  readonly lineage_refs?: readonly string[];
}

function reasonsToRepair(
  legal_drift: boolean,
  safety_changed: boolean,
  disclosure_changed: boolean,
  grounding_changed: boolean,
  conditionality_blocked: boolean,
): readonly L13RepairReasonCode[] {
  const codes: L13RepairReasonCode[] = [];
  if (legal_drift) codes.push(L13RepairReasonCode.REPAIR_REPLAY_DRIFT);
  if (safety_changed) codes.push(L13RepairReasonCode.REPAIR_SAFETY_DRIFT);
  if (disclosure_changed)
    codes.push(L13RepairReasonCode.REPAIR_DISCLOSURE_DRIFT);
  if (grounding_changed)
    codes.push(L13RepairReasonCode.REPAIR_GROUNDING_DRIFT);
  if (conditionality_blocked)
    codes.push(L13RepairReasonCode.REPAIR_CONDITIONALITY_DRIFT);
  return codes;
}

export function runL13Replay(
  input: L13ReplayAdapterInput,
): L13ReplayResult {
  const lineage = input.lineage_refs ?? ['l13.replay.lineage'];

  if (!input.substrate_complete) {
    const replayHash = fnv1a(
      [
        input.replay_mode,
        input.source_output_id,
        'INCOMPLETE_SUBSTRATE',
        POLICY_V,
      ].join('|'),
    );
    return {
      replay_result_id: `l13.replay.${replayHash}`,
      replay_mode: input.replay_mode,
      source_output_id: input.source_output_id,
      replay_output_id: input.replay_output_id,
      source_runtime_run_id: input.source_runtime_run_id,
      replay_runtime_run_id: input.replay_runtime_run_id,
      input_package_hash_match: false,
      prompt_template_hash_match: false,
      prompt_assembly_hash_match: false,
      model_gateway_config_hash_match: false,
      policy_hash_match: false,
      captured_provider_artifact_match: undefined,
      grounding_equivalence: L13ReplayEquivalenceClass.BLOCKED,
      safety_equivalence: L13ReplayEquivalenceClass.BLOCKED,
      restriction_equivalence: L13ReplayEquivalenceClass.BLOCKED,
      disclosure_equivalence: L13ReplayEquivalenceClass.BLOCKED,
      conditionality_equivalence: L13ReplayEquivalenceClass.BLOCKED,
      mode_equivalence: L13ReplayEquivalenceClass.BLOCKED,
      style_equivalence: L13ReplayEquivalenceClass.BLOCKED,
      semantic_drift_detected: true,
      wording_drift_detected: true,
      legal_drift_detected: true,
      replay_status: L13ReplayStatus.REPLAY_FAILED_INCOMPLETE_SUBSTRATE,
      mismatch_reason_codes: [],
      required_repair: true,
      repair_reason_codes: [L13RepairReasonCode.REPAIR_FAILURE_RECOVERY],
      lineage_refs: lineage,
      replay_hash: replayHash,
      policy_version: POLICY_V,
    };
  }

  const equiv = evaluateL13ReplayEquivalence(
    input.source_snapshot,
    input.replay_snapshot,
  );

  // Captured provider artifact match flag (only meaningful in CAPTURED mode).
  const captured_provider_artifact_match =
    input.replay_mode === L13ReplayMode.CAPTURED_RESPONSE_REPLAY
      ? input.source_snapshot.captured_provider_artifact_hash !== undefined &&
        input.source_snapshot.captured_provider_artifact_hash ===
          input.replay_snapshot.captured_provider_artifact_hash
      : undefined;

  // Replay status selection.
  let status: L13ReplayStatus;
  if (
    input.replay_mode === L13ReplayMode.CAPTURED_RESPONSE_REPLAY &&
    captured_provider_artifact_match &&
    !equiv.legal_drift_detected
  ) {
    status = L13ReplayStatus.CAPTURED_REPLAY_MATCH;
  } else if (equiv.safety_equivalence === L13ReplayEquivalenceClass.SAFETY_CHANGED) {
    status = L13ReplayStatus.SAFETY_DRIFT_DETECTED;
  } else if (
    equiv.grounding_equivalence === L13ReplayEquivalenceClass.GROUNDING_CHANGED
  ) {
    status = L13ReplayStatus.GROUNDING_DRIFT_DETECTED;
  } else if (
    equiv.disclosure_equivalence === L13ReplayEquivalenceClass.DISCLOSURE_CHANGED
  ) {
    status = L13ReplayStatus.DISCLOSURE_DRIFT_DETECTED;
  } else if (
    equiv.conditionality_equivalence === L13ReplayEquivalenceClass.BLOCKED ||
    equiv.mode_equivalence === L13ReplayEquivalenceClass.BLOCKED ||
    equiv.style_equivalence === L13ReplayEquivalenceClass.BLOCKED
  ) {
    status = L13ReplayStatus.BLOCKED_REPLAY;
  } else if (equiv.semantic_drift_detected && !equiv.legal_drift_detected) {
    status = L13ReplayStatus.SEMANTICALLY_EQUIVALENT_WITH_WORDING_DRIFT;
  } else if (!equiv.legal_drift_detected) {
    status = L13ReplayStatus.LEGALLY_EQUIVALENT_FRESH_REPLAY;
  } else {
    status = L13ReplayStatus.SEMANTIC_DRIFT_DETECTED;
  }

  const driftStatuses: readonly L13ReplayStatus[] = [
    L13ReplayStatus.BLOCKED_REPLAY,
    L13ReplayStatus.SAFETY_DRIFT_DETECTED,
    L13ReplayStatus.GROUNDING_DRIFT_DETECTED,
    L13ReplayStatus.DISCLOSURE_DRIFT_DETECTED,
    L13ReplayStatus.RESTRICTION_DRIFT_DETECTED,
    L13ReplayStatus.SEMANTIC_DRIFT_DETECTED,
  ];
  const required_repair = driftStatuses.includes(status);
  const repair_reason_codes = reasonsToRepair(
    equiv.legal_drift_detected,
    equiv.safety_equivalence === L13ReplayEquivalenceClass.SAFETY_CHANGED,
    equiv.disclosure_equivalence === L13ReplayEquivalenceClass.DISCLOSURE_CHANGED,
    equiv.grounding_equivalence === L13ReplayEquivalenceClass.GROUNDING_CHANGED,
    equiv.conditionality_equivalence === L13ReplayEquivalenceClass.BLOCKED,
  );

  const replayHash = fnv1a(
    [
      input.replay_mode,
      input.source_output_id,
      input.replay_output_id ?? '',
      input.source_runtime_run_id,
      input.replay_runtime_run_id ?? '',
      String(equiv.identity_match),
      String(equiv.prompt_match),
      String(equiv.policy_match),
      String(captured_provider_artifact_match ?? ''),
      equiv.grounding_equivalence,
      equiv.safety_equivalence,
      equiv.restriction_equivalence,
      equiv.disclosure_equivalence,
      equiv.conditionality_equivalence,
      equiv.mode_equivalence,
      equiv.style_equivalence,
      status,
      equiv.mismatch_reason_codes.slice().sort().join(','),
      String(required_repair),
      repair_reason_codes.slice().sort().join(','),
      POLICY_V,
    ].join('|'),
  );

  return {
    replay_result_id: `l13.replay.${replayHash}`,
    replay_mode: input.replay_mode,
    source_output_id: input.source_output_id,
    replay_output_id: input.replay_output_id,
    source_runtime_run_id: input.source_runtime_run_id,
    replay_runtime_run_id: input.replay_runtime_run_id,
    input_package_hash_match: equiv.identity_match,
    prompt_template_hash_match:
      input.source_snapshot.prompt_template_hash ===
      input.replay_snapshot.prompt_template_hash,
    prompt_assembly_hash_match:
      input.source_snapshot.prompt_assembly_hash ===
      input.replay_snapshot.prompt_assembly_hash,
    model_gateway_config_hash_match:
      input.source_snapshot.model_gateway_config_hash ===
      input.replay_snapshot.model_gateway_config_hash,
    policy_hash_match: equiv.policy_match,
    captured_provider_artifact_match,
    grounding_equivalence: equiv.grounding_equivalence,
    safety_equivalence: equiv.safety_equivalence,
    restriction_equivalence: equiv.restriction_equivalence,
    disclosure_equivalence: equiv.disclosure_equivalence,
    conditionality_equivalence: equiv.conditionality_equivalence,
    mode_equivalence: equiv.mode_equivalence,
    style_equivalence: equiv.style_equivalence,
    semantic_drift_detected: equiv.semantic_drift_detected,
    wording_drift_detected: equiv.wording_drift_detected,
    legal_drift_detected: equiv.legal_drift_detected,
    replay_status: status,
    mismatch_reason_codes: equiv.mismatch_reason_codes,
    required_repair,
    repair_reason_codes,
    lineage_refs: lineage,
    replay_hash: replayHash,
    policy_version: POLICY_V,
  };
}
