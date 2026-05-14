/**
 * L11.6 — Calibration Cohort Definitions (§11.6.9)
 *
 * Cohort objects describe how scores must be grouped before later
 * empirical evaluation. Calibration is fair only inside a cohort.
 */

import { L11ScoreFamily } from './score-family';
import { L11ScoreBand } from './score-band-policy';
import { L11ScoreVisibilityClass } from './score-visibility-class';

export const L11_CALIBRATION_COHORT_POLICY_VERSION = 'l11.6.cohort.v1';

export interface L11CalibrationCohortDefinition {
  readonly cohort_id: string;
  readonly cohort_name: string;

  readonly score_family: L11ScoreFamily;

  readonly scope_type_filters: readonly string[];
  readonly asset_class_filters: readonly string[];
  readonly liquidity_bucket_filters: readonly string[];
  readonly market_cap_bucket_filters: readonly string[];

  readonly regime_filters: readonly string[];
  readonly sequence_state_filters: readonly string[];
  readonly hypothesis_family_filters: readonly string[];
  readonly visibility_class_filters: readonly L11ScoreVisibilityClass[];
  readonly score_band_filters: readonly L11ScoreBand[];

  readonly minimum_observation_count: number;

  /**
   * §11.6.9.3 — Cohort must be able to stratify by formula version
   * to keep production and deprecated formulas separate. Migration
   * cohorts may explicitly accept multiple versions.
   */
  readonly formula_version_filters: readonly string[];
  readonly migration_cohort: boolean;

  readonly cohort_version: string;
  readonly policy_version: string;
}

/**
 * §11.6.9.1 — Required dimensions are tracked as a stable set so
 * the validator can assert presence regardless of filter values.
 */
export enum L11CohortDimension {
  SCORE_FAMILY = 'SCORE_FAMILY',
  SCORE_BAND = 'SCORE_BAND',
  REGIME = 'REGIME',
  SEQUENCE_STATE = 'SEQUENCE_STATE',
  HYPOTHESIS_FAMILY = 'HYPOTHESIS_FAMILY',
  VISIBILITY_CLASS = 'VISIBILITY_CLASS',
  LIQUIDITY_BUCKET = 'LIQUIDITY_BUCKET',
  MARKET_CAP_BUCKET = 'MARKET_CAP_BUCKET',
  FORMULA_VERSION = 'FORMULA_VERSION',
}

export const ALL_L11_COHORT_DIMENSIONS: readonly L11CohortDimension[] =
  Object.values(L11CohortDimension);

export function isL11CalibrationCohortStructurallyValid(
  c: L11CalibrationCohortDefinition,
): { ok: boolean; reason: string } {
  if (!c.cohort_id) return { ok: false, reason: 'cohort_id missing' };
  if (!c.cohort_name) return { ok: false, reason: 'cohort_name missing' };
  if (!c.score_family) return { ok: false, reason: 'score_family missing' };
  if (!Number.isFinite(c.minimum_observation_count) ||
      c.minimum_observation_count <= 0) {
    return { ok: false, reason: 'minimum_observation_count must be > 0' };
  }
  // §11.6.9.4 — cohort must support score-band filtering (filter
  // arrays may be empty meaning "all bands", but the array itself
  // must be present and not nullable).
  if (!Array.isArray(c.score_band_filters)) {
    return { ok: false, reason: 'score_band_filters missing' };
  }
  if (!Array.isArray(c.visibility_class_filters)) {
    return { ok: false, reason: 'visibility_class_filters missing' };
  }
  if (!Array.isArray(c.formula_version_filters)) {
    return { ok: false, reason: 'formula_version_filters missing' };
  }
  if (c.formula_version_filters.length > 1 && !c.migration_cohort) {
    return {
      ok: false,
      reason: 'multi-version cohort must declare migration_cohort = true',
    };
  }
  if (!c.cohort_version) return { ok: false, reason: 'cohort_version missing' };
  if (!c.policy_version) return { ok: false, reason: 'policy_version missing' };
  return { ok: true, reason: 'ok' };
}

/**
 * Compute a deterministic, stable cohort key from a per-score
 * context. Ordering is fixed; values are joined with `|`. The same
 * context always yields the same key — the hook engine and later
 * evaluation jobs use this to group observations.
 */
export interface L11CohortKeyContext {
  readonly score_family: L11ScoreFamily;
  readonly score_band: L11ScoreBand;
  readonly formula_version: string;
  readonly regime?: string;
  readonly sequence_state?: string;
  readonly hypothesis_family?: string;
  readonly visibility_class?: L11ScoreVisibilityClass;
  readonly liquidity_bucket?: string;
  readonly market_cap_bucket?: string;
  readonly scope_type?: string;
  readonly asset_class?: string;
}

export function deriveL11CohortKey(ctx: L11CohortKeyContext): string {
  const parts: string[] = [
    `fam=${ctx.score_family}`,
    `band=${ctx.score_band}`,
    `fver=${ctx.formula_version}`,
    `reg=${ctx.regime ?? 'NA'}`,
    `seq=${ctx.sequence_state ?? 'NA'}`,
    `hyp=${ctx.hypothesis_family ?? 'NA'}`,
    `vis=${ctx.visibility_class ?? 'NA'}`,
    `liq=${ctx.liquidity_bucket ?? 'NA'}`,
    `mcap=${ctx.market_cap_bucket ?? 'NA'}`,
    `scope=${ctx.scope_type ?? 'NA'}`,
    `cls=${ctx.asset_class ?? 'NA'}`,
  ];
  return parts.join('|');
}

/**
 * §11.6.9.4 — Whether a cohort accepts a given score context. Used
 * by registry and validators. Empty filter arrays mean "any value".
 */
export function doesL11CohortAcceptContext(
  c: L11CalibrationCohortDefinition,
  ctx: L11CohortKeyContext,
): { ok: boolean; reason: string } {
  if (c.score_family !== ctx.score_family) {
    return { ok: false, reason: `family mismatch ${c.score_family} != ${ctx.score_family}` };
  }
  if (c.score_band_filters.length > 0 &&
      !c.score_band_filters.includes(ctx.score_band)) {
    return { ok: false, reason: `band ${ctx.score_band} not in cohort filters` };
  }
  if (c.formula_version_filters.length > 0 &&
      !c.formula_version_filters.includes(ctx.formula_version)) {
    return { ok: false, reason: `formula version ${ctx.formula_version} not in cohort` };
  }
  if (c.regime_filters.length > 0 && ctx.regime &&
      !c.regime_filters.includes(ctx.regime)) {
    return { ok: false, reason: `regime ${ctx.regime} not in cohort filters` };
  }
  if (c.visibility_class_filters.length > 0 && ctx.visibility_class &&
      !c.visibility_class_filters.includes(ctx.visibility_class)) {
    return { ok: false, reason: `visibility ${ctx.visibility_class} not in cohort filters` };
  }
  return { ok: true, reason: 'ok' };
}
