/**
 * L6.3 — Feature Validity State
 *
 * §6.3.2.6 / §6.3.4.3 — A feature runtime output is never just "present".
 * It must always be classed by validity state. Missingness and degradation
 * remain explicit; a feature may never emit as VALID if validity law fails.
 */

export enum L6FeatureValidityState {
  VALID = 'VALID',
  ABSENT = 'ABSENT',
  DEGRADED = 'DEGRADED',
  PROVISIONAL = 'PROVISIONAL',
  BLOCKED = 'BLOCKED',
}

export const ALL_FEATURE_VALIDITY_STATES: readonly L6FeatureValidityState[] =
  Object.values(L6FeatureValidityState);

export enum L6QualityState {
  PASS = 'PASS',
  MARGINAL = 'MARGINAL',
  FAIL = 'FAIL',
}

export const ALL_QUALITY_STATES: readonly L6QualityState[] = Object.values(L6QualityState);

export enum L6ConfidenceBand {
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
  UNRATED = 'UNRATED',
}

export const ALL_CONFIDENCE_BANDS: readonly L6ConfidenceBand[] = Object.values(L6ConfidenceBand);

export enum L6FreshnessState {
  FRESH = 'FRESH',
  STALE = 'STALE',
  EXPIRED = 'EXPIRED',
  WARMING_UP = 'WARMING_UP',
}

export const ALL_FRESHNESS_STATES: readonly L6FreshnessState[] = Object.values(L6FreshnessState);

export enum L6NullState {
  PRESENT = 'PRESENT',
  ABSENT_REQUIRED = 'ABSENT_REQUIRED',
  ABSENT_OPTIONAL = 'ABSENT_OPTIONAL',
  EXPLICITLY_DEGRADED = 'EXPLICITLY_DEGRADED',
}

export const ALL_NULL_STATES: readonly L6NullState[] = Object.values(L6NullState);

/**
 * Validity law: a feature may only emit as VALID when quality/freshness/null
 * states all align. Any degradation forces a non-VALID emission class.
 */
export function isValidEmissionLegal(
  validity: L6FeatureValidityState,
  quality: L6QualityState,
  freshness: L6FreshnessState,
  nullState: L6NullState,
): boolean {
  if (validity !== L6FeatureValidityState.VALID) return true;

  if (quality === L6QualityState.FAIL) return false;
  if (freshness === L6FreshnessState.EXPIRED) return false;
  if (freshness === L6FreshnessState.WARMING_UP) return false;
  if (nullState === L6NullState.ABSENT_REQUIRED) return false;
  if (nullState === L6NullState.EXPLICITLY_DEGRADED) return false;

  return true;
}

export function requiredValidityStateFor(
  quality: L6QualityState,
  freshness: L6FreshnessState,
  nullState: L6NullState,
  warmupSatisfied: boolean,
): L6FeatureValidityState {
  if (nullState === L6NullState.ABSENT_REQUIRED) return L6FeatureValidityState.ABSENT;
  if (!warmupSatisfied || freshness === L6FreshnessState.WARMING_UP) return L6FeatureValidityState.BLOCKED;
  if (freshness === L6FreshnessState.EXPIRED) return L6FeatureValidityState.BLOCKED;
  if (quality === L6QualityState.FAIL) return L6FeatureValidityState.BLOCKED;
  if (quality === L6QualityState.MARGINAL) return L6FeatureValidityState.DEGRADED;
  if (nullState === L6NullState.EXPLICITLY_DEGRADED) return L6FeatureValidityState.DEGRADED;
  if (freshness === L6FreshnessState.STALE) return L6FeatureValidityState.PROVISIONAL;
  return L6FeatureValidityState.VALID;
}
