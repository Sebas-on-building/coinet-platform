/**
 * L7.7 — Current Authority Contracts
 *
 * §7.7.2.5 + §7.7.4.4 — Current validation, contradiction, confidence,
 * and restriction state are authoritative only in Postgres current
 * registries. Redis may accelerate reads, but may never become shadow
 * authority.
 *
 * These shapes are the canonical row contracts for the four current
 * registries. Physical DDL lives under `l5/physical/postgres-tables`;
 * these types are the API the L7 runtime + read services see.
 */

import { L7ValidationClass, L7ValidationModifier } from './validation-output-class';
import { L7ContradictionSeverity, L7ContradictionFamily } from './contradiction-bundle';
import { L7ConfidenceBand } from './confidence-assessment';
import { L7RestrictionRight, L7RestrictionReasonCode } from './claim-restriction-profile';
import { L7MaterializationMode } from './l7-persistence-surface';

// ── Shared identity / lineage block ────────────────────────────────────

export interface L7CurrentStateIdentity {
  readonly current_state_id: string;
  readonly validation_subject_id: string;
  readonly scope_type: string;
  readonly scope_id: string;
  readonly effective_as_of: string;
  readonly compute_run_id: string;
  readonly policy_version: string;
  readonly materialization_mode: L7MaterializationMode;
  readonly replay_hash: string;
  readonly superseded_prior_ref: string | null;
  readonly evidence_pointer_refs: readonly string[];
  readonly lineage_refs: {
    readonly trace_id: string;
    readonly manifest_id: string;
  };
}

// ── Current validation ─────────────────────────────────────────────────

export interface L7CurrentValidationRow extends L7CurrentStateIdentity {
  readonly validation_result_id: string;
  readonly validation_class: L7ValidationClass;
  readonly validation_modifiers: readonly L7ValidationModifier[];
  readonly support_strength_score: number;
  readonly contradiction_bundle_ref: string | null;
  readonly confidence_assessment_ref: string | null;
  readonly restriction_profile_ref: string | null;
  readonly staleness_flag: boolean;
  readonly incompleteness_flag: boolean;
  readonly ambiguity_flag: boolean;
  readonly degradation_flag: boolean;
}

// ── Current contradiction ──────────────────────────────────────────────

export interface L7CurrentContradictionRow extends L7CurrentStateIdentity {
  readonly contradiction_bundle_id: string;
  readonly cluster_count: number;
  readonly highest_severity: L7ContradictionSeverity;
  readonly dominant_family: L7ContradictionFamily;
  readonly blocked_confirmation_surfaces: readonly string[];
  readonly stale_support_refs: readonly string[];
  readonly missing_support_refs: readonly string[];
  readonly unresolved: boolean;
}

// ── Current confidence ─────────────────────────────────────────────────

export interface L7CurrentConfidenceRow extends L7CurrentStateIdentity {
  readonly confidence_assessment_id: string;
  readonly raw_score_100: number;
  readonly capped_score_100: number;
  readonly confidence_band: L7ConfidenceBand;
  readonly cap_classes_applied: readonly string[];
  readonly penalty_classes_applied: readonly string[];
  readonly restriction_profile_ref: string | null;
}

// ── Current restriction ────────────────────────────────────────────────

export interface L7CurrentRestrictionRow extends L7CurrentStateIdentity {
  readonly restriction_profile_id: string;
  readonly downstream_use_rights: readonly L7RestrictionRight[];
  readonly restriction_reasons: readonly L7RestrictionReasonCode[];
  readonly requires_contradiction_disclosure: boolean;
  readonly requires_additional_confirmation: boolean;
  readonly evidence_only_mode: boolean;
  readonly blocked_from_score_driving: boolean;
}

// ── Historical fact row shapes ─────────────────────────────────────────

/**
 * §7.7.3.3 — Base shape carried by every historical fact row. Payload
 * fields are added in the family-specific interfaces below.
 */
export interface L7HistoricalFactBase {
  readonly fact_id: string;
  readonly validation_subject_id: string;
  readonly scope_type: string;
  readonly scope_id: string;
  readonly as_of: string;
  readonly effective_at: string;
  readonly compute_run_id: string;
  readonly replay_generation_ref: string | null;
  readonly materialization_mode: L7MaterializationMode;
  readonly policy_version: string;
  readonly lineage_refs: {
    readonly trace_id: string;
    readonly manifest_id: string;
  };
  readonly evidence_pack_ref: string | null;
  readonly input_snapshot_ref: string | null;
  readonly replay_hash: string;

  /** Correction-aware law (§7.7.3.4). */
  readonly correction_parent_ref: string | null;
  readonly correction_reason: string | null;
}

export interface L7HistoricalValidationFact extends L7HistoricalFactBase {
  readonly validation_class: L7ValidationClass;
  readonly validation_modifiers: readonly L7ValidationModifier[];
  readonly support_strength_score: number;
  readonly contradiction_severity: L7ContradictionSeverity;
  readonly incompleteness_score: number;
  readonly staleness_score: number;
  readonly ambiguity_score: number;
  readonly degradation_score: number;
}

export interface L7HistoricalContradictionFact extends L7HistoricalFactBase {
  readonly contradiction_bundle_id: string;
  readonly cluster_count: number;
  readonly highest_severity: L7ContradictionSeverity;
  readonly dominant_family: L7ContradictionFamily;
  readonly blocked_confirmation_surfaces: readonly string[];
  readonly stale_support_refs: readonly string[];
  readonly missing_support_refs: readonly string[];
}

export interface L7HistoricalConfidenceFact extends L7HistoricalFactBase {
  readonly confidence_assessment_id: string;
  readonly confidence_score_raw: number;
  readonly confidence_score_capped: number;
  readonly confidence_band: L7ConfidenceBand;
  readonly factor_breakdown_ref: string;
  readonly cap_chain_ref: string;
  readonly penalty_chain_ref: string;
}

export interface L7HistoricalRestrictionFact extends L7HistoricalFactBase {
  readonly restriction_profile_id: string;
  readonly downstream_rights: readonly L7RestrictionRight[];
  readonly requires_contradiction_disclosure: boolean;
  readonly requires_additional_confirmation: boolean;
  readonly score_driving_eligible: boolean;
  readonly judgment_eligible: boolean;
}

// ── Supersession / correction linkage ──────────────────────────────────

/**
 * §7.7.2.6 — Supersession law. Current-state mutation must go through an
 * explicit supersession record with a reason.
 */
export interface L7SupersessionLink {
  readonly prior_state_id: string;
  readonly new_state_id: string;
  readonly supersession_reason: string;
  readonly materialization_mode: L7MaterializationMode;
  readonly compute_run_id: string;
  readonly timestamp: string;
}
