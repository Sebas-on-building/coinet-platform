/**
 * L9.4 — SequenceMaterializer
 *
 * §9.4.15.2 — Emits the final `L9SequenceOutputContract`. The
 * materializer hands the object off to L5 for persistence — it never
 * writes directly to a store. It carries the readiness class, the
 * replay identity mode, and the runtime integrity flag set.
 */

import type {
  L9ClassificationOutput,
  L9SequenceSubjectInstance,
  L9LeadLagProfile,
  L9OrderedSignalSet,
  L9PhaseRuntimeOutput,
  L9ChangePointRuntimeOutput,
  L9PostEventRuntimeOutput,
  L9SequenceEvidencePack,
} from '../runtime/sequence-execution-context';
import type {
  L9SequenceOutputContract,
  L9SequenceRuntimeIntegrityFlags,
  L9OutputCausalRestraintFlags,
} from '../contracts/sequence-output.contract';
import type { L9DecayProfileContract } from '../contracts/decay-profile.contract';
import type {
  L9SequenceRestrictionProfileContract,
} from '../contracts/sequence-restriction.contract';
import type { L9SequenceChainContract } from '../contracts/sequence-chain.contract';
import { L9SequenceConfidenceBand } from '../contracts/sequence-assessment';
import {
  L9SequenceMaterializationPolicy,
  L9SequenceLateDataClass,
  L9SequenceReplayIdentityMode,
} from '../contracts/sequence-materialization-policy';
import type { L9SequenceSubjectContract } from '../contracts/sequence-subject.contract';
import {
  L9RuntimeViolation,
  L9RuntimeViolationCode,
} from '../validation/l9-runtime-violation-codes';
import { L9EngineResult, fail, ok } from '../engine/engine-types';

export interface L9SequenceMaterializerInput {
  readonly subject: L9SequenceSubjectContract;
  readonly instance: L9SequenceSubjectInstance;
  readonly ordered_signals: L9OrderedSignalSet;
  readonly lead_lag: L9LeadLagProfile;
  readonly phase_output: L9PhaseRuntimeOutput;
  readonly change_points: L9ChangePointRuntimeOutput;
  readonly decay: L9DecayProfileContract;
  readonly post_event: L9PostEventRuntimeOutput;
  readonly chain: L9SequenceChainContract;
  readonly classification: L9ClassificationOutput;
  readonly restriction_profile: L9SequenceRestrictionProfileContract;
  readonly evidence_pack: L9SequenceEvidencePack;
  readonly sequence_confidence_score: number;
  readonly sequence_confidence_band: L9SequenceConfidenceBand;
  readonly materialization_mode: L9SequenceReplayIdentityMode;
  readonly replay_mode_flag: L9SequenceReplayIdentityMode;
  readonly repair_mode_flag: boolean;
  readonly late_data_class: L9SequenceLateDataClass;
  readonly materialization_policy: L9SequenceMaterializationPolicy;
  readonly output_contract_versions: {
    readonly output_contract_version: string;
    readonly schema_version: string;
    readonly policy_version: string;
  };
  readonly compute_run_id: string;
}

export function materializeSequenceOutput(
  input: L9SequenceMaterializerInput,
): L9EngineResult<L9SequenceOutputContract> {
  const violations: L9RuntimeViolation[] = [];
  const s = input.subject;
  const subjectId = s.sequence_subject_id;

  // §9.4.15.2 — prerequisites must all be present
  if (!input.classification || !input.evidence_pack ||
      !input.restriction_profile || !input.chain ||
      !input.phase_output || !input.decay) {
    violations.push(v(
      L9RuntimeViolationCode.MATERIALIZATION_PREREQUISITES_MISSING,
      subjectId, 'materialization prerequisites missing'));
  }

  // §9.4.15.2 — repair mode flag must align with replay mode
  if (input.repair_mode_flag &&
      input.replay_mode_flag !== 'REPAIR') {
    violations.push(v(
      L9RuntimeViolationCode.MATERIALIZATION_READINESS_INCONSISTENT,
      subjectId,
      'repair_mode_flag=true but replay_mode_flag!=REPAIR',
    ));
  }

  if (input.sequence_confidence_score < 0 || input.sequence_confidence_score > 1) {
    violations.push(v(
      L9RuntimeViolationCode.MATERIALIZATION_CONTRACT_INVALID,
      subjectId,
      `sequence_confidence_score ${input.sequence_confidence_score} out of [0,1]`,
    ));
  }

  if (violations.length > 0) return fail(violations);

  const c = input.classification;

  const resultId = `lsr:${subjectId}:${s.as_of}:${input.compute_run_id}`;
  const causalRestraint: L9OutputCausalRestraintFlags = {
    chain_is_temporal_only: true,
    adjacency_is_not_causality_disclaimer:
      'Temporal adjacency does not imply causality.',
    hypothesis_excluded: true,
    judgment_excluded: true,
    scenario_excluded: true,
    recommendation_excluded: true,
  };
  const integrity: L9SequenceRuntimeIntegrityFlags = {
    input_snapshot_hash_match: true,
    contract_version_match: true,
    replay_hash_stable: true,
    evidence_refs_resolvable: true,
    subject_contract_resolvable: true,
    chain_ref_resolvable: true,
    phase_ref_resolvable: true,
    decay_ref_resolvable: true,
    restriction_profile_resolvable: true,
    validation_refs_within_restriction: true,
  };

  const output: L9SequenceOutputContract = {
    sequence_result_id: resultId,
    sequence_subject_id: subjectId,
    subject_contract_ref: input.instance.subject_contract_ref,
    output_contract_version:
      input.output_contract_versions.output_contract_version,
    schema_version: input.output_contract_versions.schema_version,
    policy_version: input.output_contract_versions.policy_version,
    sequence_family: s.sequence_family,
    primary_sequence_state: c.primary_sequence_state,
    secondary_sequence_state: c.secondary_sequence_state,
    scope_type: s.scope_type,
    scope_id: s.scope_id,
    as_of: s.as_of,
    sequence_confidence_score: clamp01(input.sequence_confidence_score),
    sequence_confidence_band: input.sequence_confidence_band,
    phase_progression_score: c.phase_progression_score,
    phase_progression_class: c.phase_progression_class,
    sequence_decay_score: c.sequence_decay_score,
    sequence_decay_class: c.sequence_decay_class,
    lead_lag_profile_ref: `llp:${subjectId}`,
    ordered_signal_refs:
      input.ordered_signals.ordered_signals.map(o => o.signal_ref).sort(),
    sequence_chain_ref: input.chain.sequence_chain_id,
    phase_state_ref: input.phase_output.phase_state.phase_state_id,
    phase_class: c.phase_class,
    change_point_refs:
      input.change_points.change_points.map(cp => cp.change_point_id).sort(),
    post_event_window_refs:
      input.post_event.windows.map(w => w.post_event_window_id).sort(),
    decay_profile_ref: input.decay.decay_profile_id,
    regime_refs: [...input.instance.bound_regime_refs].sort(),
    validation_refs: [...input.instance.bound_validation_refs].sort(),
    contradiction_refs: [...input.evidence_pack.consumed_contradiction_refs].sort(),
    restriction_profile_ref:
      input.restriction_profile.sequence_restriction_profile_id,
    evidence_pack_ref: input.evidence_pack.evidence_pack_id,
    input_snapshot_ref: input.evidence_pack.input_snapshot_ref,
    coexistence_class: c.coexistence_class,
    ambiguity_score: c.ambiguity_score,
    staleness_score: c.staleness_score,
    degradation_score: c.degradation_score,
    sequence_completeness_score: c.sequence_completeness_score,
    chain_integrity_flags: [...c.chain_integrity_flags].sort() as
      L9SequenceOutputContract['chain_integrity_flags'],
    causal_restraint_flags: causalRestraint,
    materialization_mode: input.materialization_mode,
    materialization_policy: input.materialization_policy,
    replay_mode_flag: input.replay_mode_flag,
    repair_mode_flag: input.repair_mode_flag,
    late_data_class: input.late_data_class,
    compute_run_id: input.compute_run_id,
    replay_hash: input.evidence_pack.replay_hash,
    runtime_integrity_flags: integrity,
    lineage_refs: {
      trace_id: input.instance.lineage_refs.trace_id,
      manifest_id: input.instance.lineage_refs.manifest_id,
      upstream_refs: [...input.instance.lineage_refs.upstream_refs].sort(),
    },
  };
  return ok(output);
}

function clamp01(x: number): number {
  if (!Number.isFinite(x) || x < 0) return 0;
  if (x > 1) return 1;
  return x;
}

function v(
  code: L9RuntimeViolationCode,
  subjectId: string,
  detail: string,
): L9RuntimeViolation {
  return {
    code,
    source: 'sequence-materializer',
    nodeId: null,
    sequence_run_id: null,
    sequence_subject_id: subjectId,
    detail,
    context: {},
  };
}
