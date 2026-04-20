/**
 * L9.2 — SequenceAssessment Contract
 *
 * §9.2.4.10 + §9.2.8 — The main temporal verdict object consumed by
 * later layers. This is the first-class output object of the later L9
 * runtime. A SequenceAssessment is illegal if any of the object-model
 * requirements of §9.2.8.4 are violated.
 */

import { L9SequenceFamily, L9SequenceScopeType } from './sequence-family';
import { L9SequenceState } from './sequence-state';
import {
  L9SequenceCoexistenceClass,
} from './sequence-coexistence';
import { L9PhaseClass } from './phase-state';
import { L9DecayClass } from './decay-profile';
import { fnv1aHexL9 } from './sequence-subject';

/**
 * §9.2.8.2 — Sequence confidence band, banded form of the raw score.
 */
export enum L9SequenceConfidenceBand {
  LOW = 'LOW',
  MODERATE = 'MODERATE',
  HIGH = 'HIGH',
  FULL = 'FULL',
}

export const ALL_L9_SEQUENCE_CONFIDENCE_BANDS:
  readonly L9SequenceConfidenceBand[] =
    Object.values(L9SequenceConfidenceBand);

/**
 * §9.2.8.3 — Causal-restraint flag set carried on the assessment.
 * Ensures every downstream consumer sees the restraint posture.
 */
export interface L9AssessmentCausalRestraintFlags {
  readonly chain_is_temporal_only: true;
  readonly adjacency_is_not_causality_disclaimer: string;
  readonly hypothesis_excluded: true;
  readonly judgment_excluded: true;
  readonly scenario_excluded: true;
  readonly recommendation_excluded: true;
}

/**
 * §9.2.4.10 / §9.2.8.2 + §9.2.8.3 — Full SequenceAssessment object.
 */
export interface L9SequenceAssessment {
  // Identity (§9.2.8.2)
  readonly sequence_assessment_id: string;
  readonly sequence_subject_id: string;
  readonly sequence_template_id: string;
  readonly sequence_version: string;

  // Family and state (§9.2.8.2)
  readonly sequence_family: L9SequenceFamily;
  readonly primary_sequence_state: L9SequenceState;
  readonly secondary_sequence_state: L9SequenceState | null;

  // Scope and time (§9.2.8.2)
  readonly scope_type: L9SequenceScopeType;
  readonly scope_id: string;
  readonly as_of: string;

  // Ordered evidence (§9.2.8.2)
  readonly ordered_signal_refs: readonly string[];
  readonly sequence_chain_ref: string;
  readonly lead_lag_relations: readonly string[];
  readonly phase_state_ref: string;
  readonly phase_class: L9PhaseClass;
  readonly change_point_refs: readonly string[];
  readonly post_event_window_refs: readonly string[];
  readonly decay_profile_ref: string;

  // Confidence and decay (§9.2.8.2)
  readonly sequence_confidence_score: number; // 0..1
  readonly sequence_confidence_band: L9SequenceConfidenceBand;
  readonly sequence_decay_score: number; // 0..1
  readonly sequence_decay_class: L9DecayClass;

  // Conditioning and contradiction (§9.2.8.2)
  readonly regime_refs: readonly string[];
  readonly validation_refs: readonly string[];
  readonly contradiction_refs: readonly string[];
  readonly restriction_profile_ref: string;

  // Coexistence and cleanliness (§9.2.8.3)
  readonly coexistence_class: L9SequenceCoexistenceClass;
  readonly ambiguity_score: number; // 0..1
  readonly sequence_completeness_score: number; // 0..1
  readonly chain_integrity_flags: readonly string[];

  // Restraint / posture (§9.2.8.3)
  readonly causal_restraint_flags: L9AssessmentCausalRestraintFlags;
  readonly degradation_score: number; // 0..1
  readonly staleness_score: number; // 0..1

  // Lineage and replay (§9.2.8.2 + §9.2.8.3)
  readonly evidence_pack_ref: string;
  readonly input_snapshot_ref: string;
  readonly compute_run_id: string;
  readonly replay_hash: string;
  readonly lineage_refs: readonly string[];
  readonly policy_version: string;

  // Materialization (§9.1.4.4 + §9.2.8.3)
  readonly materialization_mode: 'LIVE' | 'REPLAY' | 'REPAIR' | 'HISTORICAL_RECONSTRUCTION';

  readonly created_by: string;
  readonly created_at: string;
  readonly description: string;
}

export interface L9SequenceAssessmentIdInputs {
  readonly sequence_subject_id: string;
  readonly primary_sequence_state: L9SequenceState;
  readonly secondary_sequence_state: L9SequenceState | null;
  readonly as_of: string;
  readonly compute_run_id: string;
}

export function buildL9SequenceAssessmentId(
  i: L9SequenceAssessmentIdInputs,
): string {
  const key =
    `${i.sequence_subject_id}|${i.primary_sequence_state}|${i.secondary_sequence_state ?? '-'}|${i.as_of}|${i.compute_run_id}`;
  return `sassess_${fnv1aHexL9(key)}_${fnv1aHexL9(i.sequence_subject_id)}`;
}

export function canonicalizeL9SequenceAssessmentForHash(
  a: L9SequenceAssessment,
): string {
  return [
    a.sequence_family,
    a.primary_sequence_state,
    a.secondary_sequence_state ?? '-',
    a.scope_type,
    a.scope_id,
    a.as_of,
    a.sequence_confidence_score.toFixed(6),
    a.sequence_decay_score.toFixed(6),
    a.coexistence_class,
    a.ambiguity_score.toFixed(6),
    a.sequence_completeness_score.toFixed(6),
    a.sequence_template_id,
    a.sequence_version,
    a.policy_version,
    a.compute_run_id,
  ].join('|');
}
