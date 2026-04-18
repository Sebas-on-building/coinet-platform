/**
 * L6.5 — Late-Data Classification
 *
 * §6.5.7 — Late-arriving data is legal but never semantically harmless. Every
 * late event must be classified; silent mutation of current authoritative
 * truth is forbidden.
 */

export enum L6LateDataClass {
  ON_TIME = 'ON_TIME',
  LATE_NON_MATERIAL = 'LATE_NON_MATERIAL',
  LATE_HISTORICAL_ONLY = 'LATE_HISTORICAL_ONLY',
  LATE_EVENT_RECOMPUTE = 'LATE_EVENT_RECOMPUTE',
  LATE_GOVERNED_REMATERIALIZATION_CANDIDATE = 'LATE_GOVERNED_REMATERIALIZATION_CANDIDATE',
  LATE_REJECTED = 'LATE_REJECTED',
}

export const ALL_LATE_DATA_CLASSES: readonly L6LateDataClass[] = Object.values(L6LateDataClass);

export function mutatesCurrentAuthoritativeTruth(c: L6LateDataClass): boolean {
  return c === L6LateDataClass.LATE_GOVERNED_REMATERIALIZATION_CANDIDATE;
}

export function isHistoricalOnly(c: L6LateDataClass): boolean {
  return c === L6LateDataClass.LATE_HISTORICAL_ONLY ||
         c === L6LateDataClass.LATE_NON_MATERIAL;
}

export enum L6LateDataDecisionCode {
  ACCEPTED_ON_TIME = 'ACCEPTED_ON_TIME',
  ACCEPTED_NON_MATERIAL = 'ACCEPTED_NON_MATERIAL',
  ROUTED_HISTORICAL_REBUILD = 'ROUTED_HISTORICAL_REBUILD',
  ROUTED_EVENT_RECOMPUTE = 'ROUTED_EVENT_RECOMPUTE',
  ROUTED_REMATERIALIZATION_REVIEW = 'ROUTED_REMATERIALIZATION_REVIEW',
  REJECTED_STALE_BEYOND_HORIZON = 'REJECTED_STALE_BEYOND_HORIZON',
  REJECTED_WOULD_MUTATE_CURRENT_SILENTLY = 'REJECTED_WOULD_MUTATE_CURRENT_SILENTLY',
  REJECTED_CONTRACT_FORBIDS_REMATERIALIZATION = 'REJECTED_CONTRACT_FORBIDS_REMATERIALIZATION',
}

export const ALL_LATE_DATA_DECISION_CODES: readonly L6LateDataDecisionCode[] =
  Object.values(L6LateDataDecisionCode);

/**
 * Classification input presented to the `LateDataPolicyValidator`.
 */
export interface L6LateDataContext {
  readonly observed_at: string;
  readonly ingested_at: string;
  readonly current_as_of: string;
  readonly lateness_ms: number;
  readonly lateness_horizon_ms: number;
  readonly impacted_window_coverage_ratio: number;
  readonly current_state_materially_affected: boolean;
  readonly event_state_may_change: boolean;
  readonly contract_allows_rematerialization: boolean;
  readonly l5_rematerialization_path_legal: boolean;
}

export interface L6LateDataClassification {
  readonly classification: L6LateDataClass;
  readonly decision_code: L6LateDataDecisionCode;
  readonly rationale: string;
}
