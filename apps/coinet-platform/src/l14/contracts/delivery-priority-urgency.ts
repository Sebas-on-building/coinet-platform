/**
 * L14.3 — Priority + Urgency Profile Contracts
 *
 * §14.3.16 / §14.3.20 — Frozen profile shapes plus the priority
 * factor weighting reference (resolution lives in the engine).
 */

import type {
  L14DeliveryPriorityClass,
  L14DeliveryUrgencyClass,
} from './delivery-priority';

export enum L14PriorityReasonCode {
  SOURCE_IMPORTANCE_HIGH = 'SOURCE_IMPORTANCE_HIGH',
  SCENARIO_SHIFT_MATERIAL = 'SCENARIO_SHIFT_MATERIAL',
  TRIGGER_OR_INVALIDATION_ACTIVE = 'TRIGGER_OR_INVALIDATION_ACTIVE',
  SCORE_CHANGE_MATERIAL = 'SCORE_CHANGE_MATERIAL',
  CONFIDENCE_READINESS_LOW = 'CONFIDENCE_READINESS_LOW',
  NOVELTY_HIGH = 'NOVELTY_HIGH',
  AUDIENCE_RELEVANCE_HIGH = 'AUDIENCE_RELEVANCE_HIGH',
  RESTRICTION_CAP_APPLIED = 'RESTRICTION_CAP_APPLIED',
  INTERNAL_ONLY_CAP_APPLIED = 'INTERNAL_ONLY_CAP_APPLIED',
  HISTORICAL_USEFULNESS_UNAVAILABLE = 'HISTORICAL_USEFULNESS_UNAVAILABLE',
}

export interface L14DeliveryPriorityProfile {
  readonly priority_profile_id: string;
  readonly candidate_delivery_ref: string;
  readonly source_importance_score: number;
  readonly scenario_shift_score: number;
  readonly trigger_invalidation_score: number;
  readonly score_change_significance_score: number;
  readonly confidence_readiness_score: number;
  readonly novelty_score: number;
  readonly historical_usefulness_score?: number;
  readonly audience_relevance_score: number;
  readonly raw_priority_score: number;
  readonly final_priority_score: number;
  readonly priority_class: L14DeliveryPriorityClass;
  readonly priority_reason_codes: readonly L14PriorityReasonCode[];
  readonly capped_by_restriction: boolean;
  readonly capped_by_low_confidence: boolean;
  readonly capped_by_internal_only_posture: boolean;
  readonly lineage_refs: readonly string[];
  readonly replay_hash: string;
  readonly policy_version: string;
}

/**
 * §14.3.17 — Frozen v1 weighting. historical_usefulness is
 * declared optional and never silently treated as zero.
 */
export const L14_PRIORITY_FACTOR_WEIGHTS_V1 = {
  source_importance_score: 0.18,
  scenario_shift_score: 0.16,
  trigger_invalidation_score: 0.18,
  score_change_significance_score: 0.12,
  confidence_readiness_score: 0.14,
  novelty_score: 0.10,
  audience_relevance_score: 0.12,
} as const;

/**
 * §14.3.18 — Priority class thresholds (0..100 final score).
 */
export const L14_PRIORITY_CLASS_THRESHOLDS = [
  { min: 90, max: 100, cls: 'CRITICAL' },
  { min: 75, max: 89, cls: 'HIGH' },
  { min: 55, max: 74, cls: 'MATERIAL' },
  { min: 35, max: 54, cls: 'ROUTINE' },
  { min: 1, max: 34, cls: 'LOW' },
  { min: 0, max: 0, cls: 'SUPPRESSED' },
] as const;

export enum L14UrgencyReasonCode {
  ACTIVE_INVALIDATION = 'ACTIVE_INVALIDATION',
  SEVERE_TRIGGER = 'SEVERE_TRIGGER',
  HIGH_PRIORITY_ALERT = 'HIGH_PRIORITY_ALERT',
  MATERIAL_SCORE_SHIFT = 'MATERIAL_SCORE_SHIFT',
  WATCHLIST_HIGH_RELEVANCE = 'WATCHLIST_HIGH_RELEVANCE',
  ROUTINE_STATE_CHANGE = 'ROUTINE_STATE_CHANGE',
  ON_DEMAND_SURFACE = 'ON_DEMAND_SURFACE',
  RESTRICTION_CAP_APPLIED = 'RESTRICTION_CAP_APPLIED',
  QUIET_HOURS_CAP_APPLIED = 'QUIET_HOURS_CAP_APPLIED',
}

export interface L14DeliveryUrgencyProfile {
  readonly urgency_profile_id: string;
  readonly candidate_delivery_ref: string;
  readonly time_sensitivity_score: number;
  readonly decay_risk_score: number;
  readonly trigger_recency_score: number;
  readonly audience_time_relevance_score: number;
  readonly urgency_class: L14DeliveryUrgencyClass;
  readonly urgency_reason_codes: readonly L14UrgencyReasonCode[];
  readonly urgency_capped_by_restriction: boolean;
  readonly urgency_capped_by_quiet_hours: boolean;
  readonly lineage_refs: readonly string[];
  readonly replay_hash: string;
  readonly policy_version: string;
}
