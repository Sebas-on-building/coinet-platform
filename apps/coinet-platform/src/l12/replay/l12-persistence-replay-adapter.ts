/**
 * L12.6 — Persistence-aware replay adapter (§12.6.17).
 *
 * Wraps the L12.4 runtime replay adapter with persistence-level guarantees:
 *   - replay never writes current authority
 *   - hash-window equality is reported per family
 *   - evidence/snapshot presence is enforced
 *   - mismatches are surfaced (never hidden)
 */

import { buildL12ScenarioReplayHash } from '../contracts/scenario-ids';

export enum L12ReplayMode {
  STRICT_HASH_REPLAY = 'STRICT_HASH_REPLAY',
  TOLERANT_REPLAY = 'TOLERANT_REPLAY',
  AUDIT_REPLAY = 'AUDIT_REPLAY',
}

export const ALL_L12_REPLAY_MODES: readonly L12ReplayMode[] = Object.values(L12ReplayMode);

export enum L12ReplayStatus {
  MATCH = 'MATCH',
  HASH_MISMATCH = 'HASH_MISMATCH',
  SCENARIO_DRIFT = 'SCENARIO_DRIFT',
  TRIGGER_DRIFT = 'TRIGGER_DRIFT',
  INVALIDATION_DRIFT = 'INVALIDATION_DRIFT',
  CONFIDENCE_DRIFT = 'CONFIDENCE_DRIFT',
  EVIDENCE_MISSING = 'EVIDENCE_MISSING',
  INPUT_SNAPSHOT_MISSING = 'INPUT_SNAPSHOT_MISSING',
  BLOCKED = 'BLOCKED',
}

export const ALL_L12_REPLAY_STATUSES: readonly L12ReplayStatus[] =
  Object.values(L12ReplayStatus);

export interface L12ReplayRequest {
  readonly replay_request_id: string;

  readonly source_compute_run_id: string;
  readonly scenario_set_id: string;

  readonly replay_mode: L12ReplayMode;

  readonly requested_by: string;
  readonly reason_code: string;

  readonly require_hash_match: boolean;
  readonly allow_historical_write: boolean;
  readonly allow_current_write: false;

  readonly policy_version: string;
}

export interface L12ReplayHashFamilyInputs {
  readonly source: {
    readonly scenario_set_hash: string;
    readonly trigger_set_hash: string;
    readonly invalidation_set_hash: string;
    readonly confidence_hash: string;
    readonly shift_condition_hash: string;
    readonly evidence_pack_hash: string;
    readonly input_snapshot_present: boolean;
  };
  readonly replay: {
    readonly scenario_set_hash: string;
    readonly trigger_set_hash: string;
    readonly invalidation_set_hash: string;
    readonly confidence_hash: string;
    readonly shift_condition_hash: string;
    readonly evidence_pack_hash: string;
    readonly input_snapshot_present: boolean;
  };
  /** True if replay attempted any current-authority write. */
  readonly attempts_to_write_current: boolean;
  /** True if replay attempted to erase a trigger present in source. */
  readonly attempts_to_erase_trigger: boolean;
  /** True if replay attempted to erase an invalidation present in source. */
  readonly attempts_to_erase_invalidation: boolean;
  /** True if replay attempted to upgrade readiness above source. */
  readonly attempts_to_upgrade_readiness: boolean;
  /** True if replay attempted to invent evidence not present in source. */
  readonly attempts_to_invent_evidence: boolean;
  /** True if replay ignores template version. */
  readonly ignores_template_version: boolean;

  readonly source_template_version: string;
  readonly replay_template_version: string;

  readonly source_runtime_version: string;
  readonly replay_runtime_version: string;

  readonly historical_fact_refs: readonly string[];
  readonly lineage_refs: readonly string[];
  readonly replay_compute_run_id: string;
}

export interface L12ReplayResult {
  readonly replay_result_id: string;

  readonly replay_request_id: string;
  readonly source_compute_run_id: string;
  readonly replay_compute_run_id: string;

  readonly scenario_set_hash_match: boolean;
  readonly trigger_hash_match: boolean;
  readonly invalidation_hash_match: boolean;
  readonly confidence_hash_match: boolean;
  readonly shift_condition_hash_match: boolean;
  readonly evidence_pack_hash_match: boolean;

  readonly replay_status: L12ReplayStatus;

  readonly mismatch_reason_codes: readonly string[];

  readonly historical_fact_refs: readonly string[];

  readonly lineage_refs: readonly string[];
  readonly replay_hash: string;

  readonly policy_version: string;
}

/** Run the persistence-aware replay adapter. */
export function runL12PersistenceReplay(
  request: L12ReplayRequest,
  inputs: L12ReplayHashFamilyInputs,
): L12ReplayResult {
  const setMatch = inputs.source.scenario_set_hash === inputs.replay.scenario_set_hash;
  const trgMatch = inputs.source.trigger_set_hash === inputs.replay.trigger_set_hash;
  const invMatch = inputs.source.invalidation_set_hash === inputs.replay.invalidation_set_hash;
  const confMatch = inputs.source.confidence_hash === inputs.replay.confidence_hash;
  const shiftMatch = inputs.source.shift_condition_hash === inputs.replay.shift_condition_hash;
  const evMatch = inputs.source.evidence_pack_hash === inputs.replay.evidence_pack_hash;

  const reasons: string[] = [];
  let status: L12ReplayStatus = L12ReplayStatus.MATCH;

  if (request.allow_current_write !== false || inputs.attempts_to_write_current) {
    reasons.push('REPLAY_WRITES_CURRENT');
    status = L12ReplayStatus.BLOCKED;
  }
  if (!inputs.source.input_snapshot_present || !inputs.replay.input_snapshot_present) {
    reasons.push('INPUT_SNAPSHOT_MISSING');
    status = L12ReplayStatus.INPUT_SNAPSHOT_MISSING;
  }
  if (!inputs.source.evidence_pack_hash || !inputs.replay.evidence_pack_hash) {
    reasons.push('EVIDENCE_MISSING');
    if (status === L12ReplayStatus.MATCH) status = L12ReplayStatus.EVIDENCE_MISSING;
  }
  if (inputs.attempts_to_invent_evidence) {
    reasons.push('REPLAY_INVENTED_EVIDENCE');
    status = status === L12ReplayStatus.MATCH ? L12ReplayStatus.EVIDENCE_MISSING : status;
  }
  if (inputs.attempts_to_erase_trigger) {
    reasons.push('REPLAY_ERASED_TRIGGER');
    status = L12ReplayStatus.TRIGGER_DRIFT;
  }
  if (inputs.attempts_to_erase_invalidation) {
    reasons.push('REPLAY_ERASED_INVALIDATION');
    status = L12ReplayStatus.INVALIDATION_DRIFT;
  }
  if (inputs.attempts_to_upgrade_readiness) {
    reasons.push('REPLAY_UPGRADED_READINESS');
    if (status === L12ReplayStatus.MATCH) status = L12ReplayStatus.SCENARIO_DRIFT;
  }
  if (
    inputs.ignores_template_version ||
    inputs.source_template_version !== inputs.replay_template_version
  ) {
    reasons.push('REPLAY_IGNORES_TEMPLATE_VERSION');
    if (status === L12ReplayStatus.MATCH) status = L12ReplayStatus.SCENARIO_DRIFT;
  }

  if (request.require_hash_match || request.replay_mode === L12ReplayMode.STRICT_HASH_REPLAY) {
    if (!setMatch) {
      reasons.push('SCENARIO_SET_HASH_MISMATCH');
      status = L12ReplayStatus.SCENARIO_DRIFT;
    }
    if (!trgMatch) {
      reasons.push('TRIGGER_HASH_MISMATCH');
      if (status === L12ReplayStatus.MATCH) status = L12ReplayStatus.TRIGGER_DRIFT;
    }
    if (!invMatch) {
      reasons.push('INVALIDATION_HASH_MISMATCH');
      if (status === L12ReplayStatus.MATCH) status = L12ReplayStatus.INVALIDATION_DRIFT;
    }
    if (!confMatch) {
      reasons.push('CONFIDENCE_HASH_MISMATCH');
      if (status === L12ReplayStatus.MATCH) status = L12ReplayStatus.CONFIDENCE_DRIFT;
    }
    if (!shiftMatch) {
      reasons.push('SHIFT_CONDITION_HASH_MISMATCH');
      if (status === L12ReplayStatus.MATCH) status = L12ReplayStatus.HASH_MISMATCH;
    }
    if (!evMatch) {
      reasons.push('EVIDENCE_HASH_MISMATCH');
      if (status === L12ReplayStatus.MATCH) status = L12ReplayStatus.HASH_MISMATCH;
    }
  }

  // No drift detected and all matches → MATCH
  if (
    reasons.length === 0 &&
    setMatch &&
    trgMatch &&
    invMatch &&
    confMatch &&
    shiftMatch &&
    evMatch
  ) {
    status = L12ReplayStatus.MATCH;
  }

  const replay_hash = buildL12ScenarioReplayHash({
    domain: 'l12.replay.result',
    policy_version: request.policy_version,
    material: {
      replay_request_id: request.replay_request_id,
      source_run_id: request.source_compute_run_id,
      replay_run_id: inputs.replay_compute_run_id,
      hashes: {
        scenario_set: [
          inputs.source.scenario_set_hash,
          inputs.replay.scenario_set_hash,
        ],
        trigger: [
          inputs.source.trigger_set_hash,
          inputs.replay.trigger_set_hash,
        ],
        invalidation: [
          inputs.source.invalidation_set_hash,
          inputs.replay.invalidation_set_hash,
        ],
        confidence: [
          inputs.source.confidence_hash,
          inputs.replay.confidence_hash,
        ],
        shift_condition: [
          inputs.source.shift_condition_hash,
          inputs.replay.shift_condition_hash,
        ],
        evidence_pack: [
          inputs.source.evidence_pack_hash,
          inputs.replay.evidence_pack_hash,
        ],
      },
      reasons: [...reasons].sort(),
    },
  });

  return {
    replay_result_id: `l12.replay.result.${replay_hash}`,
    replay_request_id: request.replay_request_id,
    source_compute_run_id: request.source_compute_run_id,
    replay_compute_run_id: inputs.replay_compute_run_id,

    scenario_set_hash_match: setMatch,
    trigger_hash_match: trgMatch,
    invalidation_hash_match: invMatch,
    confidence_hash_match: confMatch,
    shift_condition_hash_match: shiftMatch,
    evidence_pack_hash_match: evMatch,

    replay_status: status,
    mismatch_reason_codes: [...reasons].sort(),

    historical_fact_refs: [...inputs.historical_fact_refs].sort(),
    lineage_refs: [...inputs.lineage_refs].sort(),
    replay_hash,
    policy_version: request.policy_version,
  };
}
