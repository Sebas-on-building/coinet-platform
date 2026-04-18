/**
 * L8.8 — Current Authority Contracts
 *
 * §8.8.5 — Current regime, transition, confidence, and multiplier
 * state are authoritative only in Postgres current registries.
 * Redis may accelerate reads but may never become shadow authority.
 *
 * These shapes are the canonical row contracts for the four current
 * registries plus the four historical fact families. Physical DDL
 * lives under `l5/physical/postgres-tables` and `l5/physical/clickhouse`;
 * these types are the API the L8 runtime + read services see.
 */

import { L8MaterializationMode } from './l8-persistence-surface';
import { L8RegimeClass } from './regime-class';
import { L8RegimeFamily, L8RegimeScopeType } from './regime-family';
import {
  L8RegimeCoexistenceClass, L8RegimeConfidenceBand,
} from './regime-state';
import { L8RegimeTransitionRiskClass }
  from './regime-transition-risk.policy';
import { L8RegimeRelianceReadinessClass }
  from './regime-reliance-profile';

// ── Shared identity / lineage block ─────────────────────────────────────

/**
 * §8.8.5.4 — Every current-state row carries identity + lineage +
 * replay identity + supersession linkage + evidence linkage.
 */
export interface L8CurrentStateIdentity {
  readonly current_state_id: string;
  readonly regime_subject_id: string;
  readonly scope_type: L8RegimeScopeType;
  readonly scope_id: string;
  readonly regime_family: L8RegimeFamily;
  readonly effective_as_of: string;
  readonly compute_run_id: string;
  readonly policy_version: string;
  readonly template_id: string | null;
  readonly materialization_mode: L8MaterializationMode;
  readonly replay_hash: string;
  readonly superseded_prior_ref: string | null;
  readonly evidence_pointer_refs: readonly string[];
  readonly lineage_refs: {
    readonly trace_id: string;
    readonly manifest_id: string;
  };
}

// ── Current regime ──────────────────────────────────────────────────────

/**
 * §8.8.5.2 — Authoritative current regime state per (family, scope).
 */
export interface L8CurrentRegimeRow extends L8CurrentStateIdentity {
  readonly regime_result_id: string;
  readonly primary_regime: L8RegimeClass;
  readonly secondary_regime: L8RegimeClass | null;
  readonly coexistence_class: L8RegimeCoexistenceClass;
  readonly blocked_for_downstream: boolean;
  readonly ambiguity_flag: boolean;
  readonly staleness_flag: boolean;
  readonly degradation_flag: boolean;
}

// ── Current transition ──────────────────────────────────────────────────

export interface L8CurrentTransitionRow extends L8CurrentStateIdentity {
  readonly transition_profile_id: string;
  readonly transition_risk_score: number;
  readonly transition_risk_class: L8RegimeTransitionRiskClass;
  readonly coexistence_class: L8RegimeCoexistenceClass;
  readonly primary_secondary_flip_pressure: number;
  readonly family_transition_pressure: number;
  readonly instability_reason_codes: readonly string[];
}

// ── Current confidence ──────────────────────────────────────────────────

export interface L8CurrentConfidenceRow extends L8CurrentStateIdentity {
  readonly confidence_assessment_id: string;
  readonly confidence_score_raw: number;
  readonly confidence_score_capped: number;
  readonly confidence_band: L8RegimeConfidenceBand;
  readonly applied_cap_reasons: readonly string[];
  readonly dominant_cap_reason: string | null;
}

// ── Current multiplier ──────────────────────────────────────────────────

export interface L8CurrentMultiplierRow extends L8CurrentStateIdentity {
  readonly multiplier_profile_id: string;
  readonly reliance_profile_id: string;
  readonly readiness_class: L8RegimeRelianceReadinessClass;
  readonly narrowing_reason_codes: readonly string[];
  readonly primary_regime: L8RegimeClass;
  readonly secondary_regime: L8RegimeClass | null;
  readonly trend_amplification: number;
  readonly momentum_trust_multiplier: number;
  readonly breakout_skepticism_multiplier: number;
  readonly leverage_risk_multiplier: number;
  readonly liquidity_fragility_multiplier: number;
  readonly narrative_sensitivity_multiplier: number;
  readonly risk_overhang_sensitivity_multiplier: number;
}

// ── Historical fact row shapes ──────────────────────────────────────────

/**
 * §8.8.4.4 — Base shape carried by every historical fact row. Payload
 * fields are added in the family-specific interfaces below.
 */
export interface L8HistoricalFactBase {
  readonly fact_id: string;
  readonly regime_subject_id: string;
  readonly scope_type: L8RegimeScopeType;
  readonly scope_id: string;
  readonly regime_family: L8RegimeFamily;
  readonly as_of: string;
  readonly effective_at: string;
  readonly compute_run_id: string;
  readonly replay_generation_ref: string | null;
  readonly materialization_mode: L8MaterializationMode;
  readonly policy_version: string;
  readonly template_id: string | null;
  readonly lineage_refs: {
    readonly trace_id: string;
    readonly manifest_id: string;
  };
  readonly evidence_pack_ref: string | null;
  readonly input_snapshot_ref: string | null;
  readonly replay_hash: string;

  /** §8.8.4.5 — correction-aware law. */
  readonly correction_parent_ref: string | null;
  readonly correction_reason: string | null;
}

export interface L8HistoricalRegimeFact extends L8HistoricalFactBase {
  readonly regime_result_id: string;
  readonly primary_regime: L8RegimeClass;
  readonly secondary_regime: L8RegimeClass | null;
  readonly coexistence_class: L8RegimeCoexistenceClass;
  readonly ambiguity_score: number;
  readonly staleness_score: number;
  readonly degradation_score: number;
}

export interface L8HistoricalTransitionFact extends L8HistoricalFactBase {
  readonly transition_profile_id: string;
  readonly transition_risk_score: number;
  readonly transition_risk_class: L8RegimeTransitionRiskClass;
  readonly primary_secondary_flip_pressure: number;
  readonly family_transition_pressure: number;
  readonly instability_reason_codes: readonly string[];
  readonly candidate_flip_refs: readonly string[];
}

export interface L8HistoricalConfidenceFact extends L8HistoricalFactBase {
  readonly confidence_assessment_id: string;
  readonly confidence_score_raw: number;
  readonly confidence_score_capped: number;
  readonly confidence_band: L8RegimeConfidenceBand;
  readonly factor_breakdown_ref: string;
  readonly cap_chain_ref: string;
}

export interface L8HistoricalMultiplierFact extends L8HistoricalFactBase {
  readonly multiplier_profile_id: string;
  readonly reliance_profile_id: string;
  readonly readiness_class: L8RegimeRelianceReadinessClass;
  readonly narrowing_reason_codes: readonly string[];
  readonly dimensions_hash: string;
}

// ── Supersession linkage ────────────────────────────────────────────────

/**
 * §8.8.5.4 — Supersession law. Current-state mutation must go through
 * an explicit supersession record with a reason and mode.
 */
export interface L8SupersessionLink {
  readonly prior_state_id: string;
  readonly new_state_id: string;
  readonly supersession_reason: string;
  readonly materialization_mode: L8MaterializationMode;
  readonly compute_run_id: string;
  readonly timestamp: string;
}

/**
 * §8.8.5.5 — Canonical current-authority classes. Used by the current-
 * authority validator to map a write intent onto legal surface + mode
 * combinations.
 */
export enum L8CurrentAuthorityClass {
  REGIME = 'REGIME',
  TRANSITION = 'TRANSITION',
  CONFIDENCE = 'CONFIDENCE',
  MULTIPLIER = 'MULTIPLIER',
}

export const ALL_L8_CURRENT_AUTHORITY_CLASSES:
  readonly L8CurrentAuthorityClass[] =
    Object.values(L8CurrentAuthorityClass);
