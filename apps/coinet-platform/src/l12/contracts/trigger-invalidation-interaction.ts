/**
 * L12.5 — Trigger / invalidation interaction law (§12.5.18).
 *
 * Triggers and invalidations are not independent: a strong bullish trigger
 * cannot fully override a blocking invalidation. The interaction class
 * captures the dominance relationship the engine assigns per scenario.
 */

import { L12InvalidationStrengthBand } from './invalidation-strength-profile';
import { L12TriggerStrengthBand } from './trigger-strength-profile';

export enum L12TriggerInvalidationInteractionClass {
  TRIGGER_DOMINANT = 'TRIGGER_DOMINANT',
  BALANCED_COMPETITION = 'BALANCED_COMPETITION',
  INVALIDATION_NARROWS = 'INVALIDATION_NARROWS',
  INVALIDATION_DOMINATES = 'INVALIDATION_DOMINATES',
  BLOCKED_BY_INVALIDATION = 'BLOCKED_BY_INVALIDATION',
}

export const ALL_L12_TRIGGER_INVALIDATION_INTERACTION_CLASSES: readonly L12TriggerInvalidationInteractionClass[] =
  Object.values(L12TriggerInvalidationInteractionClass);

const TRIGGER_RANK: Readonly<Record<L12TriggerStrengthBand, number>> = {
  [L12TriggerStrengthBand.BLOCKED]: 0,
  [L12TriggerStrengthBand.WEAK]: 1,
  [L12TriggerStrengthBand.MODERATE]: 2,
  [L12TriggerStrengthBand.STRONG]: 3,
  [L12TriggerStrengthBand.DECISIVE]: 4,
};

const INV_RANK: Readonly<Record<L12InvalidationStrengthBand, number>> = {
  [L12InvalidationStrengthBand.WATCH]: 0,
  [L12InvalidationStrengthBand.WEAK]: 1,
  [L12InvalidationStrengthBand.MATERIAL]: 2,
  [L12InvalidationStrengthBand.STRONG]: 3,
  [L12InvalidationStrengthBand.BLOCKING]: 4,
};

/**
 * §12.5.18 — Resolve interaction class deterministically. Invalidation
 * dominance is asymmetric: blocking invalidation always beats any trigger
 * band; otherwise the higher rank wins, ties → balanced.
 */
export function l12ResolveInteractionClass(args: {
  triggerBand: L12TriggerStrengthBand;
  invalidationBand: L12InvalidationStrengthBand;
  invalidationActive: boolean;
}): L12TriggerInvalidationInteractionClass {
  const t = TRIGGER_RANK[args.triggerBand];
  const i = INV_RANK[args.invalidationBand];

  if (args.invalidationActive && args.invalidationBand === L12InvalidationStrengthBand.BLOCKING) {
    return L12TriggerInvalidationInteractionClass.BLOCKED_BY_INVALIDATION;
  }
  if (args.invalidationActive && i >= 3) {
    return L12TriggerInvalidationInteractionClass.INVALIDATION_DOMINATES;
  }
  if (args.invalidationActive && i === 2) {
    return L12TriggerInvalidationInteractionClass.INVALIDATION_NARROWS;
  }
  if (t > i + 1) return L12TriggerInvalidationInteractionClass.TRIGGER_DOMINANT;
  if (i > t + 1) return L12TriggerInvalidationInteractionClass.INVALIDATION_DOMINATES;
  return L12TriggerInvalidationInteractionClass.BALANCED_COMPETITION;
}

export interface L12TriggerInvalidationInteractionRecord {
  readonly interaction_record_id: string;

  readonly scenario_set_id: string;
  readonly scenario_id: string;

  readonly trigger_id: string;
  readonly invalidation_id: string;

  readonly trigger_strength_band: L12TriggerStrengthBand;
  readonly invalidation_strength_band: L12InvalidationStrengthBand;

  readonly invalidation_active: boolean;
  readonly invalidation_blocking: boolean;

  readonly interaction_class: L12TriggerInvalidationInteractionClass;

  readonly trigger_overrides_blocked_invalidation_attempted: boolean;

  readonly lineage_refs: readonly string[];
  readonly replay_hash: string;

  readonly policy_version: string;
}
