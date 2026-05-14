/**
 * L12.2 — ScenarioTrigger (§12.2.11).
 *
 * Triggers describe what would strengthen, confirm, shift, or invalidate a
 * scenario. They are NOT trade signals.
 */

import { L12ConditionMaterialityClass } from './scenario-condition';

export enum L12TriggerType {
  BULLISH_CONFIRMATION_TRIGGER = 'BULLISH_CONFIRMATION_TRIGGER',
  BEARISH_CONFIRMATION_TRIGGER = 'BEARISH_CONFIRMATION_TRIGGER',
  FAILURE_TRIGGER = 'FAILURE_TRIGGER',
  RECOVERY_TRIGGER = 'RECOVERY_TRIGGER',
  RANKING_SHIFT_TRIGGER = 'RANKING_SHIFT_TRIGGER',
  INVALIDATION_TRIGGER = 'INVALIDATION_TRIGGER',
  WATCH_TRIGGER = 'WATCH_TRIGGER',
}

export const ALL_L12_TRIGGER_TYPES: readonly L12TriggerType[] =
  Object.values(L12TriggerType);

export enum L12TriggerStatus {
  ACTIVE = 'ACTIVE',
  PARTIALLY_ACTIVE = 'PARTIALLY_ACTIVE',
  NOT_ACTIVE = 'NOT_ACTIVE',
  WATCHING = 'WATCHING',
  BLOCKED_BY_MISSING_VISIBILITY = 'BLOCKED_BY_MISSING_VISIBILITY',
  BLOCKED_BY_RESTRICTION = 'BLOCKED_BY_RESTRICTION',
}

export const ALL_L12_TRIGGER_STATUSES: readonly L12TriggerStatus[] =
  Object.values(L12TriggerStatus);

export enum L12TriggerEffect {
  STRENGTHENS_PRIMARY = 'STRENGTHENS_PRIMARY',
  WEAKENS_PRIMARY = 'WEAKENS_PRIMARY',
  PROMOTES_SECONDARY = 'PROMOTES_SECONDARY',
  COLLAPSES_BASE_CASE = 'COLLAPSES_BASE_CASE',
  ESCALATES_FAILURE = 'ESCALATES_FAILURE',
  CONFIRMS_RECOVERY = 'CONFIRMS_RECOVERY',
  WATCH_ONLY = 'WATCH_ONLY',
}

export const ALL_L12_TRIGGER_EFFECTS: readonly L12TriggerEffect[] =
  Object.values(L12TriggerEffect);

export interface L12ScenarioTrigger {
  readonly trigger_id: string;

  readonly scenario_id: string;
  readonly scenario_set_id: string;

  readonly trigger_type: L12TriggerType;
  readonly trigger_name: string;

  readonly trigger_condition_refs: readonly string[];

  readonly trigger_status: L12TriggerStatus;

  readonly trigger_strength_score: number;
  readonly trigger_materiality_class: L12ConditionMaterialityClass;

  readonly expected_effect_on_scenario: L12TriggerEffect;

  readonly evidence_refs: readonly string[];
  readonly lineage_refs: readonly string[];

  readonly policy_version: string;
  readonly replay_hash: string;
}

/** Trigger type × default effect compatibility (used by validators). */
const TYPE_EFFECT_MAP: Readonly<Record<L12TriggerType, readonly L12TriggerEffect[]>> = {
  [L12TriggerType.BULLISH_CONFIRMATION_TRIGGER]: [
    L12TriggerEffect.STRENGTHENS_PRIMARY,
    L12TriggerEffect.PROMOTES_SECONDARY,
  ],
  [L12TriggerType.BEARISH_CONFIRMATION_TRIGGER]: [
    L12TriggerEffect.WEAKENS_PRIMARY,
    L12TriggerEffect.PROMOTES_SECONDARY,
    L12TriggerEffect.ESCALATES_FAILURE,
  ],
  [L12TriggerType.FAILURE_TRIGGER]: [
    L12TriggerEffect.COLLAPSES_BASE_CASE,
    L12TriggerEffect.ESCALATES_FAILURE,
    L12TriggerEffect.WEAKENS_PRIMARY,
  ],
  [L12TriggerType.RECOVERY_TRIGGER]: [
    L12TriggerEffect.CONFIRMS_RECOVERY,
    L12TriggerEffect.STRENGTHENS_PRIMARY,
  ],
  [L12TriggerType.RANKING_SHIFT_TRIGGER]: [
    L12TriggerEffect.PROMOTES_SECONDARY,
    L12TriggerEffect.WEAKENS_PRIMARY,
  ],
  [L12TriggerType.INVALIDATION_TRIGGER]: [
    L12TriggerEffect.COLLAPSES_BASE_CASE,
    L12TriggerEffect.ESCALATES_FAILURE,
  ],
  [L12TriggerType.WATCH_TRIGGER]: [L12TriggerEffect.WATCH_ONLY],
};

export function isL12LegalTriggerEffect(
  type: L12TriggerType,
  effect: L12TriggerEffect,
): boolean {
  return TYPE_EFFECT_MAP[type].includes(effect);
}
