/**
 * L11.3 — Formula Modifier Rules (§11.3.6.5)
 *
 * Modifiers shift a score because of regime, sequence, hypothesis,
 * missing-data, or restriction posture from L7–L10. Modifiers may
 * NOT override contradiction, missing data, or reliance restrictions.
 */

import { L11ScoreFamily } from './score-family';
import { L11DependencyLayer } from './l11-constitutional-types';

export enum L11ModifierSourceLayer {
  L7_VALIDATION = 'L7_VALIDATION',
  L8_REGIME = 'L8_REGIME',
  L9_SEQUENCE = 'L9_SEQUENCE',
  L10_HYPOTHESIS = 'L10_HYPOTHESIS',
  L6_PRIMITIVE = 'L6_PRIMITIVE',
  MISSING_DATA = 'MISSING_DATA',
  RESTRICTION_POSTURE = 'RESTRICTION_POSTURE',
}

export const ALL_L11_MODIFIER_SOURCE_LAYERS:
  readonly L11ModifierSourceLayer[] =
  Object.values(L11ModifierSourceLayer);

export enum L11ModifierEffect {
  AMPLIFY = 'AMPLIFY',
  DAMPEN = 'DAMPEN',
  SHIFT_UP = 'SHIFT_UP',
  SHIFT_DOWN = 'SHIFT_DOWN',
  CAP_TRIGGER = 'CAP_TRIGGER',
  DISCLOSURE_ONLY = 'DISCLOSURE_ONLY',
}

export const ALL_L11_MODIFIER_EFFECTS: readonly L11ModifierEffect[] =
  Object.values(L11ModifierEffect);

export interface L11FormulaModifierRule {
  readonly modifier_rule_id: string;
  readonly score_family: L11ScoreFamily;

  readonly source_layer: L11ModifierSourceLayer;
  readonly effect: L11ModifierEffect;

  readonly trigger_code: string;
  readonly description: string;

  /** Magnitude in score units. SHIFT_UP/DOWN add the magnitude;
   * AMPLIFY/DAMPEN multiply by (1 ± magnitude/100). CAP_TRIGGER and
   * DISCLOSURE_ONLY ignore magnitude. */
  readonly magnitude: number;

  readonly attribution_required: boolean;
  readonly policy_version: string;
}

const ALLOWED_LAYER_BY_SOURCE: Readonly<Record<L11ModifierSourceLayer, L11DependencyLayer | null>> = {
  [L11ModifierSourceLayer.L7_VALIDATION]: L11DependencyLayer.L7,
  [L11ModifierSourceLayer.L8_REGIME]: L11DependencyLayer.L8,
  [L11ModifierSourceLayer.L9_SEQUENCE]: L11DependencyLayer.L9,
  [L11ModifierSourceLayer.L10_HYPOTHESIS]: L11DependencyLayer.L10,
  [L11ModifierSourceLayer.L6_PRIMITIVE]: L11DependencyLayer.L6,
  [L11ModifierSourceLayer.MISSING_DATA]: null,
  [L11ModifierSourceLayer.RESTRICTION_POSTURE]: null,
};

export function getL11ModifierDependencyLayer(
  source: L11ModifierSourceLayer,
): L11DependencyLayer | null {
  return ALLOWED_LAYER_BY_SOURCE[source];
}

export function isL11ModifierRuleStructurallyValid(m: L11FormulaModifierRule): {
  ok: boolean; reason: string;
} {
  if (!m.modifier_rule_id) return { ok: false, reason: 'modifier_rule_id missing' };
  if (!m.trigger_code) return { ok: false, reason: 'trigger_code missing' };
  if (!Number.isFinite(m.magnitude)) {
    return { ok: false, reason: 'magnitude must be finite' };
  }
  switch (m.effect) {
    case L11ModifierEffect.AMPLIFY:
    case L11ModifierEffect.DAMPEN:
      if (m.magnitude < 0 || m.magnitude > 100) {
        return { ok: false, reason: `amplify/dampen magnitude ${m.magnitude} out of [0,100]` };
      }
      return { ok: true, reason: 'ok' };
    case L11ModifierEffect.SHIFT_UP:
    case L11ModifierEffect.SHIFT_DOWN:
      if (m.magnitude < 0 || m.magnitude > 100) {
        return { ok: false, reason: `shift magnitude ${m.magnitude} out of [0,100]` };
      }
      return { ok: true, reason: 'ok' };
    case L11ModifierEffect.CAP_TRIGGER:
    case L11ModifierEffect.DISCLOSURE_ONLY:
      return { ok: true, reason: 'ok' };
    default:
      return { ok: false, reason: 'unknown effect' };
  }
}
