/**
 * L10.2 — HypothesisAssessment Contract
 *
 * §10.2.12 — Per-candidate explanatory verdict. The first object that
 * gathers support / contradiction / confirmations / invalidations /
 * confidence / ranking posture into one governed candidate-level result.
 */

import {
  L10HypothesisFamilyClass,
  L10HypothesisSubjectClass,
  L10ScopeType,
} from './hypothesis-subject-class';
import { fnv1aHexL10 } from './hypothesis-subject';

export enum L10HypothesisConfidenceBand {
  LOW = 'LOW',
  MODERATE = 'MODERATE',
  HIGH = 'HIGH',
  FULL = 'FULL',
}

export const ALL_L10_HYPOTHESIS_CONFIDENCE_BANDS:
  readonly L10HypothesisConfidenceBand[] = Object.values(L10HypothesisConfidenceBand);

export enum L10HypothesisReadinessClass {
  DRAFT = 'DRAFT',
  PROVISIONAL = 'PROVISIONAL',
  READY = 'READY',
}

export const ALL_L10_HYPOTHESIS_READINESS_CLASSES:
  readonly L10HypothesisReadinessClass[] = Object.values(L10HypothesisReadinessClass);

/**
 * §10.2.12.3 — Causal-restraint posture carried on every assessment so
 * downstream consumers cannot treat hypothesis adjacency as causality.
 */
export interface L10HypothesisCausalRestraintFlags {
  readonly hypothesis_is_explanation_candidate: true;
  readonly not_final_judgment_disclaimer: string;
  readonly scenario_excluded: true;
  readonly recommendation_excluded: true;
  readonly judgment_excluded: true;
  readonly score_is_not_probability_of_truth: true;
}

export interface L10HypothesisAssessment {
  // Identity
  readonly hypothesis_assessment_id: string;
  readonly hypothesis_subject_id: string;
  readonly hypothesis_candidate_id: string;
  readonly hypothesis_family: L10HypothesisFamilyClass;
  readonly hypothesis_template_id: string;
  readonly hypothesis_name: string;

  // Scope / time
  readonly subject_class: L10HypothesisSubjectClass;
  readonly scope_type: L10ScopeType;
  readonly scope_id: string;
  readonly as_of: string;

  // Object refs (must be first-class)
  readonly support_set_ref: string;
  readonly contradiction_set_ref: string;
  readonly confirmation_set_ref: string;
  readonly invalidation_set_ref: string;

  readonly supporting_evidence_refs: readonly string[];
  readonly contradicting_evidence_refs: readonly string[];
  readonly required_confirmation_refs: readonly string[];
  readonly invalidation_signal_refs: readonly string[];

  // Scores (0..1) — not probabilities of truth
  readonly hypothesis_confidence_score: number;
  readonly hypothesis_confidence_band: L10HypothesisConfidenceBand;
  readonly support_strength_score: number;
  readonly contradiction_pressure_score: number;
  readonly confirmation_gap_score: number;
  readonly invalidation_risk_score: number;

  // Ranking posture
  readonly rank_position: number;
  readonly rank_spread_to_next: number;

  // Side-outputs
  readonly restriction_profile_ref: string;
  readonly shift_condition_set_ref: string | null;

  // Evidence / lineage / replay
  readonly evidence_pack_ref: string;
  readonly input_snapshot_ref: string;
  readonly compute_run_id: string;
  readonly replay_hash: string;
  readonly lineage_refs: readonly string[];
  readonly policy_version: string;

  // Posture
  readonly readiness_class: L10HypothesisReadinessClass;
  readonly causal_restraint_flags: L10HypothesisCausalRestraintFlags;
  readonly materialization_mode: 'LIVE' | 'REPLAY' | 'REPAIR' | 'HISTORICAL_RECONSTRUCTION';

  readonly created_by: string;
  readonly created_at: string;
  readonly description: string;
}

export interface L10HypothesisAssessmentIdInputs {
  readonly hypothesis_subject_id: string;
  readonly hypothesis_candidate_id: string;
  readonly as_of: string;
  readonly compute_run_id: string;
}

export function buildL10HypothesisAssessmentId(
  i: L10HypothesisAssessmentIdInputs,
): string {
  const key =
    `${i.hypothesis_subject_id}|${i.hypothesis_candidate_id}|${i.as_of}|${i.compute_run_id}`;
  return `hassess_${fnv1aHexL10(key)}_${fnv1aHexL10(i.hypothesis_candidate_id)}`;
}

export function canonicalizeL10HypothesisAssessmentForHash(
  a: L10HypothesisAssessment,
): string {
  return [
    a.hypothesis_family,
    a.hypothesis_template_id,
    a.subject_class,
    a.scope_type,
    a.scope_id,
    a.as_of,
    a.hypothesis_confidence_score.toFixed(6),
    a.support_strength_score.toFixed(6),
    a.contradiction_pressure_score.toFixed(6),
    a.confirmation_gap_score.toFixed(6),
    a.invalidation_risk_score.toFixed(6),
    a.rank_position,
    a.rank_spread_to_next.toFixed(6),
    a.policy_version,
    a.compute_run_id,
  ].join('|');
}

export function l10ConfidenceBandForScore(score: number): L10HypothesisConfidenceBand {
  if (score >= 0.9) return L10HypothesisConfidenceBand.FULL;
  if (score >= 0.75) return L10HypothesisConfidenceBand.HIGH;
  if (score >= 0.5) return L10HypothesisConfidenceBand.MODERATE;
  return L10HypothesisConfidenceBand.LOW;
}
