/**
 * L9.4 — Sequence Execution Context
 *
 * §9.4.3 / §9.4.16 — The in-run state every Layer 9 engine reads from
 * and writes into. Holds:
 *   - the immutable `L9SequenceRun` header
 *   - subject contracts currently in scope
 *   - intermediate artifacts produced by each engine
 *   - a sealed final-output bag once the run completes
 *
 * Engines never mutate state they do not own. Stage seals make it
 * possible for tests/invariants to assert the exact stage order
 * (INV-9.4-A / INV-9.4-E).
 */

import type { L9SequenceRun } from './sequence-compute-run';
import type {
  L9SequenceSubjectContract,
} from '../contracts/sequence-subject.contract';
import type {
  L9SequenceOutputContract,
} from '../contracts/sequence-output.contract';
import type {
  L9LeadLagRelationContract,
} from '../contracts/lead-lag-relation.contract';
import type { L9SequenceChainContract } from '../contracts/sequence-chain.contract';
import type { L9PhaseStateContract } from '../contracts/phase-state.contract';
import type { L9DecayProfileContract } from '../contracts/decay-profile.contract';
import type {
  L9PostEventWindowContract,
} from '../contracts/post-event-window.contract';
import type {
  L9SequenceRestrictionProfileContract,
} from '../contracts/sequence-restriction.contract';
import type { L9SequenceFamily } from '../contracts/sequence-family';
import type { L9SequenceState } from '../contracts/sequence-state';
import type {
  L9SequenceCoexistenceClass,
} from '../contracts/sequence-coexistence';
import type {
  L9PhaseClass,
  L9PhaseProgressionClass,
} from '../contracts/phase-state';
import type { L9DecayClass } from '../contracts/decay-profile';
import type { L9ChainIntegrityFlag } from '../contracts/sequence-chain';
import type { L9ChangePoint } from '../contracts/change-point';
import type { L9OrderedSignalRoleClass } from './runtime-types';
import type { L9TemporalInputReadinessClass } from './runtime-types';
import type { L9LagClass } from '../contracts/lead-lag-relation';

/**
 * §9.4.5 — Subject instance emitted by the assembly engine. Its id is
 * deterministic: `lsi:<subject_id>:<contract_version>:<as_of>`.
 */
export interface L9SequenceSubjectInstance {
  readonly subject_instance_id: string;
  readonly subject_contract_ref: string;
  readonly sequence_subject_id: string;
  readonly sequence_family: L9SequenceFamily;
  readonly sequence_template_id: string;
  readonly sequence_version: string;
  readonly scope_type: string;
  readonly scope_id: string;
  readonly as_of: string;
  readonly bound_validation_refs: readonly string[];
  readonly bound_regime_refs: readonly string[];
  readonly bound_event_refs: readonly string[];
  readonly bound_feature_refs: readonly string[];
  readonly bound_context_refs: readonly string[];
  readonly bound_evidence_only_refs: readonly string[];
  readonly lineage_refs: {
    readonly trace_id: string;
    readonly manifest_id: string;
    readonly upstream_refs: readonly string[];
  };
  readonly replay_identity_inputs: {
    readonly subject_contract_version: string;
    readonly schema_version: string;
    readonly policy_version: string;
    readonly as_of: string;
    readonly scope_type: string;
    readonly scope_id: string;
  };
}

/**
 * §9.4.6.5 — Resolved temporal input set. Produced by the temporal
 * input resolver and consumed by downstream engines.
 */
export interface L9ResolvedTemporalInputSet {
  readonly sequence_subject_id: string;
  readonly usable_validation_refs: readonly string[];
  readonly usable_event_refs: readonly string[];
  readonly usable_feature_refs: readonly string[];
  readonly usable_regime_refs: readonly string[];
  readonly evidence_only_refs: readonly string[];
  readonly historical_refs: readonly string[];
  readonly stale_refs: readonly string[];
  readonly degraded_refs: readonly string[];
  readonly blocked_refs: readonly string[];
  readonly missing_required_refs: readonly string[];
  readonly restriction_consumption_refs: readonly string[];
  readonly readiness_class: L9TemporalInputReadinessClass;
  readonly replay_hash_contribution: string;
}

/**
 * §9.4.7.3 — OrderedSignalSet. Encodes chain nodes with typed temporal
 * roles, ambiguity, lateness, and staleness flags.
 */
export interface L9OrderedSignal {
  readonly signal_ref: string;
  readonly role: L9OrderedSignalRoleClass;
  readonly ordering_evidence_refs: readonly string[];
  readonly ambiguity_flag: boolean;
  readonly late_flag: boolean;
  readonly stale_flag: boolean;
  readonly role_confidence: number; // 0..1
}

export interface L9OrderedSignalSet {
  readonly sequence_subject_id: string;
  readonly ordered_signals: readonly L9OrderedSignal[];
  readonly has_ambiguity: boolean;
  readonly ambiguity_score: number;
  readonly staleness_score: number;
  readonly tie_break_reasons: readonly string[];
}

/**
 * §9.4.8.3 — Aggregate lead-lag profile. Individual relations are kept
 * as `L9LeadLagRelationContract[]`; the profile is the summary view
 * downstream stages classify against.
 */
export interface L9LeadLagProfile {
  readonly sequence_subject_id: string;
  readonly relations: readonly L9LeadLagRelationContract[];
  readonly dominant_lag_class: L9LagClass;
  readonly aggregate_support_score: number; // 0..1
  readonly contradiction_present: boolean;
  readonly decay_adjustment_mean: number; // 0..1
  readonly causal_restraint_flag: boolean;
}

/**
 * §9.4.9.3 — Runtime phase output. Refers to a full `L9PhaseStateContract`
 * plus runtime-only flags (jumped/continuity).
 */
export interface L9PhaseRuntimeOutput {
  readonly sequence_subject_id: string;
  readonly phase_state: L9PhaseStateContract;
  readonly jumped: boolean;
  readonly continuity_intact: boolean;
}

/**
 * §9.4.10 — Runtime change-point set. Container over the typed
 * `L9ChangePoint` objects so engines can reason about presence vs
 * absence of change-points per class.
 */
export interface L9ChangePointRuntimeOutput {
  readonly sequence_subject_id: string;
  readonly change_points: readonly L9ChangePoint[];
}

/**
 * §9.4.12 — Runtime post-event window output.
 */
export interface L9PostEventRuntimeOutput {
  readonly sequence_subject_id: string;
  readonly windows: readonly L9PostEventWindowContract[];
  readonly expired_count: number;
  readonly active_count: number;
}

/**
 * §9.4.13.4 — Pre-materialization classification output. Only the
 * classification engine may emit one of these (§9.4.13.2).
 */
export interface L9ClassificationOutput {
  readonly sequence_subject_id: string;
  readonly sequence_family: L9SequenceFamily;
  readonly primary_sequence_state: L9SequenceState;
  readonly secondary_sequence_state: L9SequenceState | null;
  readonly coexistence_class: L9SequenceCoexistenceClass;
  readonly phase_class: L9PhaseClass;
  readonly phase_progression_class: L9PhaseProgressionClass;
  readonly phase_progression_score: number; // 0..1
  readonly sequence_decay_class: L9DecayClass;
  readonly sequence_decay_score: number; // 0..1
  readonly ambiguity_score: number;
  readonly staleness_score: number;
  readonly degradation_score: number;
  readonly sequence_completeness_score: number;
  readonly chain_integrity_flags: readonly L9ChainIntegrityFlag[];
  readonly causal_restraint_flags: {
    readonly chain_is_temporal_only: true;
    readonly hypothesis_excluded: true;
  };
  readonly rationale_codes: readonly string[];
  readonly readiness_class: L9TemporalInputReadinessClass;
}

/**
 * §9.4.14 — Confidence / restriction handoff bundle produced by the
 * classification engine. Confidence and restriction engines consume
 * this bundle (§9.4.14.3).
 */
export interface L9ConfidenceHandoffBundle {
  readonly sequence_subject_id: string;
  readonly classification_ref: string;
  readonly coexistence_class: L9SequenceCoexistenceClass;
  readonly ambiguity_score: number;
  readonly decay_class: L9DecayClass;
  readonly chain_completeness: number;
  readonly contradiction_refs: readonly string[];
  readonly regime_refs: readonly string[];
  readonly evidence_refs: readonly string[];
}

export interface L9RestrictionHandoffBundle {
  readonly sequence_subject_id: string;
  readonly classification_ref: string;
  readonly coexistence_class: L9SequenceCoexistenceClass;
  readonly ambiguity_score: number;
  readonly decay_class: L9DecayClass;
  readonly restriction_required_refs: readonly string[];
  readonly contradiction_refs: readonly string[];
  readonly regime_refs: readonly string[];
  readonly evidence_refs: readonly string[];
}

/**
 * §9.4.15.1 — Evidence pack produced by the evidence builder. Contains
 * the complete lineage the L5 materializer and the replay adapter
 * verify against.
 */
export interface L9SequenceEvidencePack {
  readonly evidence_pack_id: string;
  readonly sequence_subject_id: string;
  readonly subject_instance_ref: string;
  readonly ordered_signal_refs: readonly string[];
  readonly lead_lag_relation_refs: readonly string[];
  readonly sequence_chain_ref: string;
  readonly phase_state_ref: string;
  readonly change_point_refs: readonly string[];
  readonly decay_profile_ref: string;
  readonly post_event_window_refs: readonly string[];
  readonly classification_ref: string;
  readonly confidence_ref: string;
  readonly restriction_profile_ref: string;
  readonly consumed_validation_refs: readonly string[];
  readonly consumed_regime_refs: readonly string[];
  readonly consumed_contradiction_refs: readonly string[];
  readonly input_snapshot_ref: string;
  readonly compute_run_lineage: readonly string[];
  readonly replay_hash: string;
}

/**
 * §9.4.3 — Layer 9 runtime execution context. Every engine lives off
 * this context; engines never share globals.
 */
export interface L9SequenceExecutionContext {
  readonly run: L9SequenceRun;
  readonly subjects: Map<string, L9SequenceSubjectContract>;
  readonly subject_instances: Map<string, L9SequenceSubjectInstance>;
  readonly resolved_inputs: Map<string, L9ResolvedTemporalInputSet>;
  readonly ordered_signal_sets: Map<string, L9OrderedSignalSet>;
  readonly lead_lag_profiles: Map<string, L9LeadLagProfile>;
  readonly phase_outputs: Map<string, L9PhaseRuntimeOutput>;
  readonly change_point_outputs: Map<string, L9ChangePointRuntimeOutput>;
  readonly decay_profiles: Map<string, L9DecayProfileContract>;
  readonly post_event_outputs: Map<string, L9PostEventRuntimeOutput>;
  readonly chains: Map<string, L9SequenceChainContract>;
  readonly classifications: Map<string, L9ClassificationOutput>;
  readonly confidence_bundles: Map<string, L9ConfidenceHandoffBundle>;
  readonly restriction_bundles: Map<string, L9RestrictionHandoffBundle>;
  readonly restriction_profiles: Map<string, L9SequenceRestrictionProfileContract>;
  readonly evidence_packs: Map<string, L9SequenceEvidencePack>;
  readonly outputs: Map<string, L9SequenceOutputContract>;
  readonly stage_seal: Set<string>;
}

export function createL9ExecutionContext(
  run: L9SequenceRun,
): L9SequenceExecutionContext {
  return {
    run,
    subjects: new Map(),
    subject_instances: new Map(),
    resolved_inputs: new Map(),
    ordered_signal_sets: new Map(),
    lead_lag_profiles: new Map(),
    phase_outputs: new Map(),
    change_point_outputs: new Map(),
    decay_profiles: new Map(),
    post_event_outputs: new Map(),
    chains: new Map(),
    classifications: new Map(),
    confidence_bundles: new Map(),
    restriction_bundles: new Map(),
    restriction_profiles: new Map(),
    evidence_packs: new Map(),
    outputs: new Map(),
    stage_seal: new Set(),
  };
}

export function sealL9Stage(
  ctx: L9SequenceExecutionContext,
  stage: string,
): void {
  ctx.stage_seal.add(stage);
}

export function isL9StageSealed(
  ctx: L9SequenceExecutionContext,
  stage: string,
): boolean {
  return ctx.stage_seal.has(stage);
}
