/**
 * L11.8 — Downstream Consumption Request and Intended Use
 * (§11.8.13 / §11.8.14)
 *
 * Governs how later layers (L12+) consume L11 read surfaces.
 * Recompute requests are constrained to internal replay / repair
 * adapters under explicit `read_mode`.
 */

import { L11ScoreFamily } from './score-family';
import {
  L11ConsumerClass,
  L11ReadMode,
  L11ReadSurfaceId,
} from './l11-read-surface';

export const L11_DOWNSTREAM_POLICY_VERSION = 'l11.8.downstream.v1';

export enum L11DownstreamScoreUse {
  SCENARIO_WEIGHTING = 'SCENARIO_WEIGHTING',
  RANKING_SUPPORT = 'RANKING_SUPPORT',
  JUDGMENT_SUPPORT = 'JUDGMENT_SUPPORT',
  EXPLANATION_SUPPORT = 'EXPLANATION_SUPPORT',
  DELIVERY_SUMMARY = 'DELIVERY_SUMMARY',
  CALIBRATION_EVALUATION = 'CALIBRATION_EVALUATION',
  DRIFT_MONITORING = 'DRIFT_MONITORING',
  REPLAY_RECONSTRUCTION = 'REPLAY_RECONSTRUCTION',
  REPAIR_REBUILD = 'REPAIR_REBUILD',
}

export const ALL_L11_DOWNSTREAM_SCORE_USES:
  readonly L11DownstreamScoreUse[] = Object.values(L11DownstreamScoreUse);

export interface L11DownstreamConsumptionRequest {
  readonly request_id: string;

  readonly consumer_class: L11ConsumerClass;
  readonly intended_use: L11DownstreamScoreUse;

  readonly requested_surfaces: readonly L11ReadSurfaceId[];

  readonly score_family?: L11ScoreFamily;
  readonly scope_type?: string;
  readonly scope_id?: string;

  readonly uses_score_value: boolean;
  readonly uses_component_breakdown: boolean;
  readonly uses_attribution: boolean;
  readonly uses_missing_data_profile: boolean;
  readonly uses_modifiers: boolean;
  readonly uses_calibration_hooks: boolean;
  readonly uses_drift_reports: boolean;

  readonly attempts_recompute: boolean;
  readonly recompute_reason?: string;

  readonly read_mode: L11ReadMode;

  readonly policy_version: string;
}

/**
 * Consumer classes that are *allowed* to attempt ad hoc recompute
 * (§11.8.13.3): only internal replay / repair adapters.
 */
export const L11_RECOMPUTE_ALLOWED_CONSUMERS:
  ReadonlySet<L11ConsumerClass> = new Set([
  L11ConsumerClass.INTERNAL_REPLAY_ADAPTER,
  L11ConsumerClass.INTERNAL_REPAIR_ADAPTER,
]);

/** Read modes under which recompute is permissible. */
export const L11_RECOMPUTE_ALLOWED_READ_MODES:
  ReadonlySet<L11ReadMode> = new Set([
  L11ReadMode.REPLAY_HISTORICAL,
  L11ReadMode.REPAIR_VIEW,
]);

/** Uses considered scoring-sensitive and so requiring drift surfaces. */
export const L11_SCORING_SENSITIVE_USES:
  ReadonlySet<L11DownstreamScoreUse> = new Set([
  L11DownstreamScoreUse.SCENARIO_WEIGHTING,
  L11DownstreamScoreUse.RANKING_SUPPORT,
  L11DownstreamScoreUse.JUDGMENT_SUPPORT,
]);

export function isL11DownstreamConsumptionStructurallyValid(
  r: L11DownstreamConsumptionRequest,
): { ok: boolean; reason: string } {
  if (!r.request_id) return { ok: false, reason: 'request_id missing' };
  if (!r.consumer_class) return { ok: false, reason: 'consumer_class missing' };
  if (!r.intended_use) return { ok: false, reason: 'intended_use missing' };
  if (!r.read_mode) return { ok: false, reason: 'read_mode missing' };
  if (!Array.isArray(r.requested_surfaces) || r.requested_surfaces.length === 0) {
    return { ok: false, reason: 'requested_surfaces must be non-empty' };
  }
  if (!r.policy_version) return { ok: false, reason: 'policy_version missing' };
  return { ok: true, reason: 'ok' };
}
