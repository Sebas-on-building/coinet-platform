/**
 * L9.4 — SequenceEvidencePackBuilder
 *
 * §9.4.15.1 — Assembles the deterministic evidence pack consumed by
 * replay, repair, and the materializer. Every input ref is required
 * and sorted — the pack hash must be stable under replay.
 */

import type {
  L9ClassificationOutput,
  L9LeadLagProfile,
  L9OrderedSignalSet,
  L9PostEventRuntimeOutput,
  L9PhaseRuntimeOutput,
  L9ChangePointRuntimeOutput,
  L9SequenceEvidencePack,
  L9SequenceSubjectInstance,
} from '../runtime/sequence-execution-context';
import type { L9DecayProfileContract } from '../contracts/decay-profile.contract';
import type {
  L9SequenceRestrictionProfileContract,
} from '../contracts/sequence-restriction.contract';
import type { L9SequenceChainContract } from '../contracts/sequence-chain.contract';
import {
  L9RuntimeViolation,
  L9RuntimeViolationCode,
} from '../validation/l9-runtime-violation-codes';
import { L9EngineResult, fail, ok } from './engine-types';

export interface L9EvidencePackInput {
  readonly instance: L9SequenceSubjectInstance;
  readonly ordered_signals: L9OrderedSignalSet;
  readonly lead_lag: L9LeadLagProfile;
  readonly phase_output: L9PhaseRuntimeOutput;
  readonly change_points: L9ChangePointRuntimeOutput;
  readonly decay: L9DecayProfileContract;
  readonly post_event: L9PostEventRuntimeOutput;
  readonly chain: L9SequenceChainContract;
  readonly classification: L9ClassificationOutput;
  readonly confidence_ref: string;
  readonly restriction_profile: L9SequenceRestrictionProfileContract;
  readonly consumed_validation_refs: readonly string[];
  readonly consumed_regime_refs: readonly string[];
  readonly consumed_contradiction_refs: readonly string[];
  readonly input_snapshot_ref: string;
  readonly compute_run_lineage: readonly string[];
}

export function buildSequenceEvidencePack(
  input: L9EvidencePackInput,
): L9EngineResult<L9SequenceEvidencePack> {
  const violations: L9RuntimeViolation[] = [];
  const subjectId = input.instance.sequence_subject_id;

  if (!input.ordered_signals) {
    violations.push(v(
      L9RuntimeViolationCode.EVIDENCE_PACK_MISSING_ORDERED_SIGNAL,
      subjectId, 'missing ordered signals'));
  }
  if (!input.chain) {
    violations.push(v(
      L9RuntimeViolationCode.EVIDENCE_PACK_MISSING_CHAIN,
      subjectId, 'missing chain'));
  }
  if (!input.phase_output) {
    violations.push(v(
      L9RuntimeViolationCode.EVIDENCE_PACK_MISSING_PHASE,
      subjectId, 'missing phase'));
  }
  if (!input.decay) {
    violations.push(v(
      L9RuntimeViolationCode.EVIDENCE_PACK_MISSING_DECAY,
      subjectId, 'missing decay'));
  }
  if (!input.classification) {
    violations.push(v(
      L9RuntimeViolationCode.EVIDENCE_PACK_MISSING_CLASSIFICATION,
      subjectId, 'missing classification'));
  }
  if (!input.consumed_validation_refs || input.consumed_validation_refs.length === 0) {
    violations.push(v(
      L9RuntimeViolationCode.EVIDENCE_PACK_MISSING_CONSUMED_REFS,
      subjectId, 'missing consumed_validation_refs'));
  }
  if (!input.input_snapshot_ref) {
    violations.push(v(
      L9RuntimeViolationCode.EVIDENCE_PACK_MISSING_LINEAGE,
      subjectId, 'missing input_snapshot_ref'));
  }
  if (!input.instance.lineage_refs?.trace_id ||
      !input.instance.lineage_refs?.manifest_id) {
    violations.push(v(
      L9RuntimeViolationCode.EVIDENCE_PACK_MISSING_LINEAGE,
      subjectId, 'missing trace/manifest lineage'));
  }

  if (violations.length > 0) return fail(violations);

  const packId = `sep:${subjectId}:${input.instance.as_of}`;
  const pack: L9SequenceEvidencePack = {
    evidence_pack_id: packId,
    sequence_subject_id: subjectId,
    subject_instance_ref: input.instance.subject_instance_id,
    ordered_signal_refs: input.ordered_signals.ordered_signals
      .map(o => o.signal_ref).sort(),
    lead_lag_relation_refs: input.lead_lag.relations
      .map(r => r.lead_lag_id).sort(),
    sequence_chain_ref: input.chain.sequence_chain_id,
    phase_state_ref: input.phase_output.phase_state.phase_state_id,
    change_point_refs: input.change_points.change_points
      .map(cp => cp.change_point_id).sort(),
    decay_profile_ref: input.decay.decay_profile_id,
    post_event_window_refs: input.post_event.windows
      .map(w => w.post_event_window_id).sort(),
    classification_ref:
      `cls:${subjectId}:${input.classification.primary_sequence_state}`,
    confidence_ref: input.confidence_ref,
    restriction_profile_ref: input.restriction_profile
      .sequence_restriction_profile_id,
    consumed_validation_refs: [...input.consumed_validation_refs].sort(),
    consumed_regime_refs: [...input.consumed_regime_refs].sort(),
    consumed_contradiction_refs:
      [...input.consumed_contradiction_refs].sort(),
    input_snapshot_ref: input.input_snapshot_ref,
    compute_run_lineage: [...input.compute_run_lineage].sort(),
    replay_hash: computeReplayHash(packId, input),
  };
  return ok(pack);
}

function computeReplayHash(
  packId: string,
  input: L9EvidencePackInput,
): string {
  const parts = [
    packId,
    input.instance.subject_instance_id,
    input.chain.sequence_chain_id,
    input.phase_output.phase_state.phase_state_id,
    input.decay.decay_profile_id,
    input.classification.primary_sequence_state,
    input.classification.coexistence_class,
    input.restriction_profile.reliance_band,
  ];
  return `h:${parts.join('|')}`;
}

function v(
  code: L9RuntimeViolationCode,
  subjectId: string,
  detail: string,
): L9RuntimeViolation {
  return {
    code,
    source: 'sequence-evidence-pack-builder',
    nodeId: null,
    sequence_run_id: null,
    sequence_subject_id: subjectId,
    detail,
    context: {},
  };
}
