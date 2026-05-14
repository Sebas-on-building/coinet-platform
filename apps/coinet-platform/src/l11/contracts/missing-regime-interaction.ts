/**
 * L11.5 — Missing-Data × Regime Interaction (§11.5.12)
 *
 * Combined-risk interaction surface. Material missing-data and a
 * material regime modifier together are stronger than either alone.
 * The interaction object is what L11.4 attribution surfaces consume.
 */

import { L11ScoreFamily } from './score-family';
import { L11RegimePostureCode } from './regime-modifier-matrix';

export const L11_MISSING_REGIME_INTERACTION_POLICY_VERSION =
  'l11.5.interaction.v1';

export enum L11MissingRegimeInteractionClass {
  NO_INTERACTION = 'NO_INTERACTION',
  DISCLOSURE_INTERACTION = 'DISCLOSURE_INTERACTION',
  PENALTY_INTERACTION = 'PENALTY_INTERACTION',
  CAP_INTERACTION = 'CAP_INTERACTION',
  BLOCKING_INTERACTION = 'BLOCKING_INTERACTION',
}

export const ALL_L11_MISSING_REGIME_INTERACTION_CLASSES:
  readonly L11MissingRegimeInteractionClass[] =
  Object.values(L11MissingRegimeInteractionClass);

export interface L11MissingRegimeInteraction {
  readonly interaction_id: string;

  readonly score_id: string;
  readonly score_family: L11ScoreFamily;
  readonly formula_id: string;
  readonly formula_version: string;

  readonly missing_profile_ref: string;
  readonly regime_modifier_refs: readonly string[];

  readonly missing_input_ref_ids: readonly string[];
  readonly regime_postures: readonly L11RegimePostureCode[];

  readonly interaction_class: L11MissingRegimeInteractionClass;

  readonly score_effect: number;
  readonly confidence_effect: number;

  readonly cap_rule_refs: readonly string[];
  readonly penalty_rule_refs: readonly string[];
  readonly disclosure_required: boolean;

  readonly reason_codes: readonly string[];

  readonly lineage_refs: readonly string[];
  readonly evidence_refs: readonly string[];

  readonly policy_version: string;
}

const SEVERITY_BY_CLASS: Readonly<Record<L11MissingRegimeInteractionClass, number>> = {
  [L11MissingRegimeInteractionClass.BLOCKING_INTERACTION]: 0,
  [L11MissingRegimeInteractionClass.CAP_INTERACTION]: 1,
  [L11MissingRegimeInteractionClass.PENALTY_INTERACTION]: 2,
  [L11MissingRegimeInteractionClass.DISCLOSURE_INTERACTION]: 3,
  [L11MissingRegimeInteractionClass.NO_INTERACTION]: 4,
};

export function compareL11InteractionClass(
  a: L11MissingRegimeInteractionClass,
  b: L11MissingRegimeInteractionClass,
): number {
  return SEVERITY_BY_CLASS[a] - SEVERITY_BY_CLASS[b];
}

export function mostSevereL11InteractionClass(
  classes: readonly L11MissingRegimeInteractionClass[],
): L11MissingRegimeInteractionClass {
  if (classes.length === 0) return L11MissingRegimeInteractionClass.NO_INTERACTION;
  let best = classes[0];
  for (let i = 1; i < classes.length; i++) {
    if (compareL11InteractionClass(classes[i], best) < 0) best = classes[i];
  }
  return best;
}

export function isL11MissingRegimeInteractionStructurallyValid(
  i: L11MissingRegimeInteraction,
): { ok: boolean; reason: string } {
  if (!i.interaction_id) return { ok: false, reason: 'interaction_id missing' };
  if (!i.score_id) return { ok: false, reason: 'score_id missing' };
  if (!i.missing_profile_ref) return { ok: false, reason: 'missing_profile_ref missing' };
  if (!i.interaction_class) return { ok: false, reason: 'interaction_class missing' };
  if (i.lineage_refs.length === 0) return { ok: false, reason: 'lineage_refs missing' };
  if (i.interaction_class === L11MissingRegimeInteractionClass.NO_INTERACTION) {
    return { ok: true, reason: 'ok' };
  }
  if (i.missing_input_ref_ids.length === 0 && i.regime_modifier_refs.length === 0) {
    return {
      ok: false,
      reason: 'non-NO_INTERACTION requires at least one missing-input or regime-modifier ref',
    };
  }
  if (i.reason_codes.length === 0) {
    return { ok: false, reason: 'reason_codes missing' };
  }
  return { ok: true, reason: 'ok' };
}
