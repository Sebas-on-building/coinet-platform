/**
 * L11.9 — Freeze Policy (§11.9.7)
 *
 * Declares which Layer 11 surfaces are frozen after ratification,
 * what changes may be made post-freeze (only with classification),
 * and what changes are absolutely prohibited.
 */

import { L11SublayerId } from './l11-layer-inventory';

export const L11_FREEZE_POLICY_VERSION = 'l11.9.freeze.v1';

export enum L11FreezeStatus {
  PRE_FREEZE = 'PRE_FREEZE',
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
}

export enum L11AllowedPostFreezeChange {
  ADD_SHADOW_FORMULA = 'ADD_SHADOW_FORMULA',
  ADD_CALIBRATION_TARGET = 'ADD_CALIBRATION_TARGET',
  ADD_DRIFT_MONITORING_STATISTIC = 'ADD_DRIFT_MONITORING_STATISTIC',
  ADD_READ_SURFACE_FOR_EXISTING_OBJECT = 'ADD_READ_SURFACE_FOR_EXISTING_OBJECT',
  ADD_RESERVED_SCORE_FAMILY_DOCTRINE = 'ADD_RESERVED_SCORE_FAMILY_DOCTRINE',
  CLARIFY_METADATA_WITHOUT_SEMANTIC_CHANGE =
    'CLARIFY_METADATA_WITHOUT_SEMANTIC_CHANGE',
}

export const ALL_L11_ALLOWED_POST_FREEZE_CHANGES:
  readonly L11AllowedPostFreezeChange[] =
  Object.values(L11AllowedPostFreezeChange);

export enum L11ProhibitedPostFreezeChange {
  SILENT_SCORE_MEANING_CHANGE = 'SILENT_SCORE_MEANING_CHANGE',
  SILENT_SCORE_DIRECTION_CHANGE = 'SILENT_SCORE_DIRECTION_CHANGE',
  HISTORICAL_SCORE_REINTERPRETATION = 'HISTORICAL_SCORE_REINTERPRETATION',
  FORMULA_MUTATION_IN_PLACE = 'FORMULA_MUTATION_IN_PLACE',
  THRESHOLD_MUTATION_IN_PLACE = 'THRESHOLD_MUTATION_IN_PLACE',
  RESERVED_FAMILY_PRODUCTION_PROMOTION_WITHOUT_RATIFICATION =
    'RESERVED_FAMILY_PRODUCTION_PROMOTION_WITHOUT_RATIFICATION',
  L5_PERSISTENCE_BYPASS = 'L5_PERSISTENCE_BYPASS',
  DOWNSTREAM_SCORE_REBUILD_PERMISSION = 'DOWNSTREAM_SCORE_REBUILD_PERMISSION',
  SCORE_AS_RECOMMENDATION_LEAK = 'SCORE_AS_RECOMMENDATION_LEAK',
}

export const ALL_L11_PROHIBITED_POST_FREEZE_CHANGES:
  readonly L11ProhibitedPostFreezeChange[] =
  Object.values(L11ProhibitedPostFreezeChange);

/**
 * Surfaces whose change requires a fresh L11.9 ratification (i.e.
 * cannot proceed via plain extension classification alone).
 */
export enum L11RatificationRequiredSurface {
  SCORE_FAMILY_PROMOTION = 'SCORE_FAMILY_PROMOTION',
  SCORE_MEANING_CLAIM = 'SCORE_MEANING_CLAIM',
  SCORE_DIRECTION = 'SCORE_DIRECTION',
  FORMULA_MAJOR_VERSION = 'FORMULA_MAJOR_VERSION',
  THRESHOLD_POLICY_MAJOR_VERSION = 'THRESHOLD_POLICY_MAJOR_VERSION',
  CALIBRATION_TARGET_RETIREMENT = 'CALIBRATION_TARGET_RETIREMENT',
  PERSISTENCE_SURFACE_RETIREMENT = 'PERSISTENCE_SURFACE_RETIREMENT',
  READ_SURFACE_RETIREMENT = 'READ_SURFACE_RETIREMENT',
  DOWNSTREAM_DEPENDENCY_CONTRACT_CHANGE = 'DOWNSTREAM_DEPENDENCY_CONTRACT_CHANGE',
}

export const ALL_L11_RATIFICATION_REQUIRED_SURFACES:
  readonly L11RatificationRequiredSurface[] =
  Object.values(L11RatificationRequiredSurface);

export interface L11FreezePolicy {
  readonly freeze_policy_id: string;
  readonly layer_id: 'L11';

  readonly status: L11FreezeStatus;

  readonly frozen_sublayers: readonly L11SublayerId[];

  readonly frozen_contracts: readonly string[];
  readonly frozen_registries: readonly string[];
  readonly frozen_formulas: readonly string[];
  readonly frozen_threshold_policies: readonly string[];
  readonly frozen_read_surfaces: readonly string[];

  readonly allowed_post_freeze_changes: readonly L11AllowedPostFreezeChange[];
  readonly prohibited_post_freeze_changes: readonly L11ProhibitedPostFreezeChange[];

  readonly requires_ratification_for: readonly L11RatificationRequiredSurface[];

  readonly policy_version: string;
}

/**
 * The canonical L11 freeze policy. `status` starts at `PRE_FREEZE`
 * and is promoted to `ACTIVE` only via the rollout gate after a
 * production-green ratification artifact is emitted.
 */
export const L11_FREEZE_POLICY_V1: L11FreezePolicy = {
  freeze_policy_id: 'l11.freeze.v1',
  layer_id: 'L11',
  status: L11FreezeStatus.PRE_FREEZE,
  frozen_sublayers: [
    L11SublayerId.L11_1_CONSTITUTION,
    L11SublayerId.L11_2_SCORE_DOCTRINE,
    L11SublayerId.L11_3_FORMULA_LAW,
    L11SublayerId.L11_4_ATTRIBUTION,
    L11SublayerId.L11_5_MISSING_REGIME,
    L11SublayerId.L11_6_CALIBRATION,
    L11SublayerId.L11_7_DRIFT,
    L11SublayerId.L11_8_PERSISTENCE,
  ],
  frozen_contracts: [
    'score-family',
    'score-meaning-claim',
    'score-direction',
    'score-band-policy',
    'score-formula',
    'score-component',
    'score-attribution',
    'attribution-driver',
    'attribution-completeness',
    'missing-data-profile',
    'regime-modifier',
    'calibration-target',
    'calibration-hook',
    'drift-type',
    'drift-severity',
    'drift-report',
    'threshold-policy',
    'l11-persistence-surface',
    'l11-current-authority',
    'l11-historical-surface',
    'l11-evidence-storage',
    'l11-read-surface',
  ],
  frozen_registries: [
    'score-family.registry',
    'score-formula.registry',
    'score-band-policy.registry',
    'score-direction.registry',
    'score-meaning-claim.registry',
    'reserved-score-family.registry',
    'l11-durable-surface.registry',
    'l11-read-surface.registry',
  ],
  frozen_formulas: [
    'l11.formula.opportunity.v1',
    'l11.formula.risk.v1',
    'l11.formula.unlock_risk.v1',
    'l11.formula.uncertainty.v1',
    'l11.formula.completion_readiness.v1',
    'l11.formula.confidence.v1',
    'l11.formula.regime_alignment.v1',
    'l11.formula.thesis_strength.v1',
  ],
  frozen_threshold_policies: [
    'l11.threshold.opportunity.v1',
    'l11.threshold.risk.v1',
    'l11.threshold.unlock_risk.v1',
    'l11.threshold.uncertainty.v1',
    'l11.threshold.completion_readiness.v1',
    'l11.threshold.confidence.v1',
    'l11.threshold.regime_alignment.v1',
    'l11.threshold.thesis_strength.v1',
  ],
  frozen_read_surfaces: [
    'CURRENT_SCORE_SNAPSHOT_BY_SCOPE',
    'CURRENT_SCORE_FAMILY_BY_SCOPE',
    'SCORE_ATTRIBUTION_BY_SCORE_ID',
    'SCORE_COMPONENT_BREAKDOWN_BY_SCORE_ID',
    'SCORE_MODIFIERS_BY_SCORE_ID',
    'SCORE_MISSING_DATA_PROFILE_BY_SCORE_ID',
    'SCORE_CALIBRATION_HOOKS_BY_SCORE_ID',
    'SCORE_HISTORY_BY_SCOPE_WINDOW',
    'CALIBRATION_TARGET_BY_SCORE_FAMILY',
    'DRIFT_REPORT_BY_FORMULA_VERSION',
    'SCORE_EVIDENCE_BUNDLE',
    'SCORE_LINEAGE_BY_RUN_ID',
  ],
  allowed_post_freeze_changes: ALL_L11_ALLOWED_POST_FREEZE_CHANGES,
  prohibited_post_freeze_changes: ALL_L11_PROHIBITED_POST_FREEZE_CHANGES,
  requires_ratification_for: ALL_L11_RATIFICATION_REQUIRED_SURFACES,
  policy_version: L11_FREEZE_POLICY_VERSION,
};

/**
 * Helper: returns true iff the given change kind is *prohibited*
 * absolutely (regardless of classification).
 */
export function isL11ChangeProhibitedAfterFreeze(
  change: L11ProhibitedPostFreezeChange | L11AllowedPostFreezeChange,
): boolean {
  return (
    ALL_L11_PROHIBITED_POST_FREEZE_CHANGES.includes(
      change as L11ProhibitedPostFreezeChange) &&
    !ALL_L11_ALLOWED_POST_FREEZE_CHANGES.includes(
      change as L11AllowedPostFreezeChange)
  );
}
