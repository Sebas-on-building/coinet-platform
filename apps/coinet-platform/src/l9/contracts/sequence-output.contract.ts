/**
 * L9.3 — Sequence Output Contract
 *
 * §9.3.3 — The executable sequence-result object. Every field required
 * by §9.3.3.2 and §9.3.3.3 is typed here; the L9.3 output validator
 * enforces cleanliness law (§9.3.3.5), state-pair law (§9.3.3.6), and
 * contract completeness.
 *
 * The L9.2 `L9SequenceAssessment` remains legal for in-memory
 * prototyping; this L9.3 contract is the shape every runtime must emit,
 * persist, and replay against.
 */

import type {
  L9SequenceFamily,
  L9SequenceScopeType,
} from './sequence-family';
import type { L9SequenceState } from './sequence-state';
import type { L9SequenceConfidenceBand } from './sequence-assessment';
import type {
  L9SequenceCoexistenceClass,
} from './sequence-coexistence';
import type {
  L9PhaseClass,
  L9PhaseProgressionClass,
} from './phase-state';
import type { L9DecayClass } from './decay-profile';
import type { L9ChainIntegrityFlag } from './sequence-chain';
import type {
  L9SequenceMaterializationPolicy,
  L9SequenceLateDataClass,
  L9SequenceReplayIdentityMode,
} from './sequence-materialization-policy';

/**
 * §9.3.3.3 — Runtime integrity flags. A runtime computes these during
 * emission; the output validator checks them.
 */
export interface L9SequenceRuntimeIntegrityFlags {
  readonly input_snapshot_hash_match: boolean;
  readonly contract_version_match: boolean;
  readonly replay_hash_stable: boolean;
  readonly evidence_refs_resolvable: boolean;
  readonly subject_contract_resolvable: boolean;
  readonly chain_ref_resolvable: boolean;
  readonly phase_ref_resolvable: boolean;
  readonly decay_ref_resolvable: boolean;
  readonly restriction_profile_resolvable: boolean;
  readonly validation_refs_within_restriction: boolean;
}

/**
 * §9.3.3.3 — Causal-restraint flag set carried on every emitted
 * output. Mirrors the L9.2 assessment posture but exposed as a typed
 * output-contract field so consumers of the contract surface never
 * need to reach into the L9.2 object to find the disclaimer.
 */
export interface L9OutputCausalRestraintFlags {
  readonly chain_is_temporal_only: true;
  readonly adjacency_is_not_causality_disclaimer: string;
  readonly hypothesis_excluded: true;
  readonly judgment_excluded: true;
  readonly scenario_excluded: true;
  readonly recommendation_excluded: true;
}

/**
 * §9.3.3.1 — The full executable sequence output contract.
 */
export interface L9SequenceOutputContract {
  // Identity (§9.3.3.2)
  readonly sequence_result_id: string;
  readonly sequence_subject_id: string;
  readonly subject_contract_ref: string;

  // Contract versioning (§9.3.7.1)
  readonly output_contract_version: string;
  readonly schema_version: string;
  readonly policy_version: string;

  // Family + state (§9.3.3.2)
  readonly sequence_family: L9SequenceFamily;
  readonly primary_sequence_state: L9SequenceState;
  readonly secondary_sequence_state: L9SequenceState | null;

  // Scope + time (§9.3.3.2)
  readonly scope_type: L9SequenceScopeType;
  readonly scope_id: string;
  readonly as_of: string;

  // Confidence + decay scores (§9.3.3.2)
  readonly sequence_confidence_score: number; // 0..1
  readonly sequence_confidence_band: L9SequenceConfidenceBand;
  readonly phase_progression_score: number;   // 0..1
  readonly phase_progression_class: L9PhaseProgressionClass;
  readonly sequence_decay_score: number;      // 0..1
  readonly sequence_decay_class: L9DecayClass;

  // Attached first-class subobjects (§9.3.3.2)
  readonly lead_lag_profile_ref: string;
  readonly ordered_signal_refs: readonly string[];
  readonly sequence_chain_ref: string;
  readonly phase_state_ref: string;
  readonly phase_class: L9PhaseClass;
  readonly change_point_refs: readonly string[];
  readonly post_event_window_refs: readonly string[];
  readonly decay_profile_ref: string;

  // Conditioning / consumed posture (§9.3.3.2)
  readonly regime_refs: readonly string[];
  readonly validation_refs: readonly string[];
  readonly contradiction_refs: readonly string[];
  readonly restriction_profile_ref: string;

  // Evidence + persistence (§9.3.3.2)
  readonly evidence_pack_ref: string;
  readonly input_snapshot_ref: string;

  // Cleanliness posture (§9.3.3.3)
  readonly coexistence_class: L9SequenceCoexistenceClass;
  readonly ambiguity_score: number;              // 0..1
  readonly staleness_score: number;              // 0..1
  readonly degradation_score: number;            // 0..1
  readonly sequence_completeness_score: number;  // 0..1
  readonly chain_integrity_flags: readonly L9ChainIntegrityFlag[];

  // Restraint posture (§9.3.3.3)
  readonly causal_restraint_flags: L9OutputCausalRestraintFlags;

  // Materialization + replay (§9.3.3.3)
  readonly materialization_mode: L9SequenceReplayIdentityMode;
  readonly materialization_policy: L9SequenceMaterializationPolicy;
  readonly replay_mode_flag: L9SequenceReplayIdentityMode;
  readonly repair_mode_flag: boolean;
  readonly late_data_class: L9SequenceLateDataClass;

  // Replay identity (§9.3.3.3)
  readonly compute_run_id: string;
  readonly replay_hash: string;
  readonly runtime_integrity_flags: L9SequenceRuntimeIntegrityFlags;

  // Lineage (§9.3.3.3)
  readonly lineage_refs: {
    readonly trace_id: string;
    readonly manifest_id: string;
    readonly upstream_refs: readonly string[];
  };
}

export const L9_OUTPUT_CONTRACT_REQUIRED_FIELDS: readonly string[] = [
  'sequence_result_id', 'sequence_subject_id', 'subject_contract_ref',
  'output_contract_version', 'schema_version', 'policy_version',
  'sequence_family', 'primary_sequence_state',
  'scope_type', 'scope_id', 'as_of',
  'sequence_confidence_score', 'sequence_confidence_band',
  'phase_progression_score', 'phase_progression_class',
  'sequence_decay_score', 'sequence_decay_class',
  'lead_lag_profile_ref', 'ordered_signal_refs', 'sequence_chain_ref',
  'phase_state_ref', 'phase_class', 'decay_profile_ref',
  'regime_refs', 'validation_refs',
  'restriction_profile_ref', 'evidence_pack_ref', 'input_snapshot_ref',
  'coexistence_class', 'ambiguity_score', 'staleness_score',
  'degradation_score', 'sequence_completeness_score',
  'chain_integrity_flags',
  'causal_restraint_flags',
  'materialization_mode', 'materialization_policy',
  'replay_mode_flag', 'late_data_class',
  'compute_run_id', 'replay_hash', 'runtime_integrity_flags',
  'lineage_refs',
];
