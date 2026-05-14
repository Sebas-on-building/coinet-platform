/**
 * L12.2 — ScenarioInvalidation (§12.2.12).
 *
 * Every scenario must declare at least one invalidation. Invalidations
 * describe what would break the path. They are NOT trade instructions.
 */

export enum L12InvalidationType {
  SUPPORT_FAILURE = 'SUPPORT_FAILURE',
  CONTRADICTION_ESCALATION = 'CONTRADICTION_ESCALATION',
  REGIME_SHIFT = 'REGIME_SHIFT',
  SEQUENCE_BREAK = 'SEQUENCE_BREAK',
  HYPOTHESIS_RANK_FLIP = 'HYPOTHESIS_RANK_FLIP',
  SCORE_BREAKDOWN = 'SCORE_BREAKDOWN',
  MISSING_DATA_BLOCKER = 'MISSING_DATA_BLOCKER',
  DRIFT_BLOCKER = 'DRIFT_BLOCKER',
}

export const ALL_L12_INVALIDATION_TYPES: readonly L12InvalidationType[] =
  Object.values(L12InvalidationType);

export enum L12InvalidationStatus {
  NOT_ACTIVE = 'NOT_ACTIVE',
  WATCHING = 'WATCHING',
  PARTIALLY_ACTIVE = 'PARTIALLY_ACTIVE',
  ACTIVE = 'ACTIVE',
  BLOCKING = 'BLOCKING',
}

export const ALL_L12_INVALIDATION_STATUSES: readonly L12InvalidationStatus[] =
  Object.values(L12InvalidationStatus);

export enum L12InvalidationEffect {
  PATH_INVALIDATED = 'PATH_INVALIDATED',
  PATH_NARROWED = 'PATH_NARROWED',
  CONFIDENCE_CAPPED = 'CONFIDENCE_CAPPED',
  RANKING_FLIP = 'RANKING_FLIP',
  WATCH_ONLY = 'WATCH_ONLY',
}

export const ALL_L12_INVALIDATION_EFFECTS: readonly L12InvalidationEffect[] =
  Object.values(L12InvalidationEffect);

export interface L12ScenarioInvalidation {
  readonly invalidation_id: string;

  readonly scenario_id: string;
  readonly scenario_set_id: string;

  readonly invalidation_type: L12InvalidationType;
  readonly invalidation_name: string;

  readonly invalidation_condition_refs: readonly string[];

  readonly invalidation_strength_score: number;
  readonly invalidation_status: L12InvalidationStatus;

  readonly expected_effect: L12InvalidationEffect;

  readonly evidence_refs: readonly string[];
  readonly lineage_refs: readonly string[];

  readonly policy_version: string;
  readonly replay_hash: string;
}

export function isL12ActiveInvalidationStatus(s: L12InvalidationStatus): boolean {
  return (
    s === L12InvalidationStatus.ACTIVE ||
    s === L12InvalidationStatus.PARTIALLY_ACTIVE ||
    s === L12InvalidationStatus.BLOCKING
  );
}

const TYPE_EFFECT_MAP: Readonly<Record<L12InvalidationType, readonly L12InvalidationEffect[]>> = {
  [L12InvalidationType.SUPPORT_FAILURE]: [
    L12InvalidationEffect.PATH_INVALIDATED,
    L12InvalidationEffect.PATH_NARROWED,
    L12InvalidationEffect.CONFIDENCE_CAPPED,
  ],
  [L12InvalidationType.CONTRADICTION_ESCALATION]: [
    L12InvalidationEffect.PATH_NARROWED,
    L12InvalidationEffect.CONFIDENCE_CAPPED,
    L12InvalidationEffect.WATCH_ONLY,
  ],
  [L12InvalidationType.REGIME_SHIFT]: [
    L12InvalidationEffect.PATH_INVALIDATED,
    L12InvalidationEffect.RANKING_FLIP,
  ],
  [L12InvalidationType.SEQUENCE_BREAK]: [
    L12InvalidationEffect.PATH_INVALIDATED,
    L12InvalidationEffect.PATH_NARROWED,
  ],
  [L12InvalidationType.HYPOTHESIS_RANK_FLIP]: [
    L12InvalidationEffect.RANKING_FLIP,
    L12InvalidationEffect.PATH_NARROWED,
  ],
  [L12InvalidationType.SCORE_BREAKDOWN]: [
    L12InvalidationEffect.PATH_INVALIDATED,
    L12InvalidationEffect.CONFIDENCE_CAPPED,
  ],
  [L12InvalidationType.MISSING_DATA_BLOCKER]: [
    L12InvalidationEffect.CONFIDENCE_CAPPED,
    L12InvalidationEffect.WATCH_ONLY,
  ],
  [L12InvalidationType.DRIFT_BLOCKER]: [
    L12InvalidationEffect.CONFIDENCE_CAPPED,
    L12InvalidationEffect.WATCH_ONLY,
  ],
};

export function isL12LegalInvalidationEffect(
  type: L12InvalidationType,
  effect: L12InvalidationEffect,
): boolean {
  return TYPE_EFFECT_MAP[type].includes(effect);
}
