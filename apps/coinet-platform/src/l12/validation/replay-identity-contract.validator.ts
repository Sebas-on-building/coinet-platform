/**
 * L12.3 — Replay identity contract validator (§12.3.14.2).
 */

import { L12ScenarioReplayIdentity } from '../contracts/scenario-replay-identity.contract';
import {
  L12ContractViolation,
  L12ContractViolationCode,
} from './l12-contract-violation-codes';

export interface L12ReplayIdentityContextForValidation {
  /**
   * Lower-layer snapshot refs that must be referenced as part of the replay
   * material (specifically: must include an L11 score-context bundle).
   */
  readonly required_score_context_refs?: readonly string[];
}

export function validateL12ReplayIdentity(
  r: L12ScenarioReplayIdentity,
  ctx?: L12ReplayIdentityContextForValidation,
): readonly L12ContractViolation[] {
  const v: L12ContractViolation[] = [];
  const sid = r.replay_identity_id || '<unknown>';

  if (!r.replay_identity_id || !r.scenario_subject_id || !r.scenario_set_id) {
    v.push({
      code: L12ContractViolationCode.L12K_REPLAY_IDENTITY_INCOMPLETE,
      subject_id: sid,
      detail: 'replay identity has missing required identifiers',
    });
  }
  if (!r.subject_replay_hash) {
    v.push({
      code: L12ContractViolationCode.L12K_REPLAY_SUBJECT_HASH_MISSING,
      subject_id: sid,
      detail: 'subject_replay_hash required',
    });
  }
  if (!r.set_replay_hash) {
    v.push({
      code: L12ContractViolationCode.L12K_REPLAY_SET_HASH_MISSING,
      subject_id: sid,
      detail: 'set_replay_hash required',
    });
  }
  if (
    !r.scenario_replay_hashes ||
    r.scenario_replay_hashes.length === 0
  ) {
    v.push({
      code: L12ContractViolationCode.L12K_REPLAY_SCENARIO_HASHES_MISSING,
      subject_id: sid,
      detail: 'scenario_replay_hashes required',
    });
  }
  if (
    !r.condition_replay_hashes ||
    r.condition_replay_hashes.length === 0
  ) {
    v.push({
      code: L12ContractViolationCode.L12K_REPLAY_CONDITION_HASHES_MISSING,
      subject_id: sid,
      detail: 'condition_replay_hashes required',
    });
  }
  if (
    !r.trigger_replay_hashes ||
    r.trigger_replay_hashes.length === 0
  ) {
    v.push({
      code: L12ContractViolationCode.L12K_REPLAY_TRIGGER_HASHES_MISSING,
      subject_id: sid,
      detail: 'trigger_replay_hashes required',
    });
  }
  if (
    !r.invalidation_replay_hashes ||
    r.invalidation_replay_hashes.length === 0
  ) {
    v.push({
      code: L12ContractViolationCode.L12K_REPLAY_INVALIDATION_HASHES_MISSING,
      subject_id: sid,
      detail: 'invalidation_replay_hashes required',
    });
  }
  if (!r.confidence_replay_hash) {
    v.push({
      code: L12ContractViolationCode.L12K_REPLAY_CONFIDENCE_HASH_MISSING,
      subject_id: sid,
      detail: 'confidence_replay_hash required',
    });
  }
  if (!r.restriction_replay_hash) {
    v.push({
      code: L12ContractViolationCode.L12K_REPLAY_RESTRICTION_HASH_MISSING,
      subject_id: sid,
      detail: 'restriction_replay_hash required',
    });
  }
  if (!r.evidence_pack_replay_hash) {
    v.push({
      code: L12ContractViolationCode.L12K_REPLAY_EVIDENCE_PACK_HASH_MISSING,
      subject_id: sid,
      detail: 'evidence_pack_replay_hash required',
    });
  }
  if (
    !r.lower_layer_snapshot_refs ||
    r.lower_layer_snapshot_refs.length === 0
  ) {
    v.push({
      code: L12ContractViolationCode.L12K_REPLAY_LOWER_LAYER_SNAPSHOT_REFS_MISSING,
      subject_id: sid,
      detail: 'lower_layer_snapshot_refs required',
    });
  }
  if (!r.replay_hash) {
    v.push({
      code: L12ContractViolationCode.L12K_REPLAY_HASH_MISSING,
      subject_id: sid,
      detail: 'replay_hash required',
    });
  }
  if (ctx?.required_score_context_refs) {
    const present = new Set(r.lower_layer_snapshot_refs ?? []);
    const missing = ctx.required_score_context_refs.some(x => !present.has(x));
    if (missing || ctx.required_score_context_refs.length === 0) {
      v.push({
        code: L12ContractViolationCode.L12K_REPLAY_MATERIAL_EXCLUDES_SCORE_CONTEXT,
        subject_id: sid,
        detail: 'replay material does not include required L11 score-context refs',
      });
    }
  }
  return v;
}
