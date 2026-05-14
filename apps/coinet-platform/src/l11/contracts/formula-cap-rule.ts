/**
 * L11.3 — Formula Cap Rules (§11.3.6.2 / §11.3.6.3 / §11.3.6.4)
 *
 * Caps limit how high or low a score may go under unsafe conditions.
 * They are not modifiers — they are hard constraints applied after
 * raw computation.
 */

import { L11ScoreFamily } from './score-family';
import { L11ScoreBand } from './score-band-policy';

export enum L11CapType {
  UPPER_VALUE = 'UPPER_VALUE',
  LOWER_VALUE = 'LOWER_VALUE',
  UPPER_BAND = 'UPPER_BAND',
  LOWER_BAND = 'LOWER_BAND',
  READINESS_CAP = 'READINESS_CAP',
}

export const ALL_L11_CAP_TYPES: readonly L11CapType[] = Object.values(L11CapType);

export enum L11CapDirection {
  LIMIT_UPSIDE = 'LIMIT_UPSIDE',
  LIMIT_DOWNSIDE = 'LIMIT_DOWNSIDE',
  LIMIT_BAND_BAND = 'LIMIT_BAND_BAND',
  LIMIT_READINESS = 'LIMIT_READINESS',
}

export const ALL_L11_CAP_DIRECTIONS: readonly L11CapDirection[] =
  Object.values(L11CapDirection);

/**
 * §11.3.6.3 — A trigger condition is described by a stable code that
 * later runtime sublayers (L11.4+) can evaluate against governed
 * lower-layer state. Doctrine only requires the code to be present
 * and well-formed.
 */
export interface L11CapTriggerCondition {
  readonly trigger_code: string;
  readonly description: string;
}

export interface L11FormulaCapRule {
  readonly cap_rule_id: string;
  readonly score_family: L11ScoreFamily;

  readonly trigger_condition: L11CapTriggerCondition;
  readonly cap_type: L11CapType;
  /** Numeric cap target (or NaN when cap_type uses a band/readiness). */
  readonly cap_value: number;
  readonly cap_band?: L11ScoreBand;

  readonly cap_direction: L11CapDirection;
  readonly reason_code: string;

  readonly attribution_required: boolean;
  readonly policy_version: string;
}

/**
 * §11.3.6.4 — Cap direction must match the cap type. Numeric caps
 * (UPPER_VALUE/LOWER_VALUE) require a finite value in [0, 100];
 * band caps require a band; readiness caps require a readiness
 * direction.
 */
export function isL11CapRuleStructurallyValid(c: L11FormulaCapRule): {
  ok: boolean; reason: string;
} {
  if (!c.cap_rule_id) return { ok: false, reason: 'cap_rule_id missing' };
  if (!c.reason_code) return { ok: false, reason: 'reason_code missing' };
  if (!c.trigger_condition?.trigger_code) {
    return { ok: false, reason: 'trigger_code missing' };
  }
  switch (c.cap_type) {
    case L11CapType.UPPER_VALUE:
    case L11CapType.LOWER_VALUE:
      if (!Number.isFinite(c.cap_value) || c.cap_value < 0 || c.cap_value > 100) {
        return { ok: false, reason: `cap_value ${c.cap_value} out of [0,100]` };
      }
      if (c.cap_type === L11CapType.UPPER_VALUE && c.cap_direction !== L11CapDirection.LIMIT_UPSIDE) {
        return { ok: false, reason: 'UPPER_VALUE requires LIMIT_UPSIDE' };
      }
      if (c.cap_type === L11CapType.LOWER_VALUE && c.cap_direction !== L11CapDirection.LIMIT_DOWNSIDE) {
        return { ok: false, reason: 'LOWER_VALUE requires LIMIT_DOWNSIDE' };
      }
      return { ok: true, reason: 'ok' };
    case L11CapType.UPPER_BAND:
    case L11CapType.LOWER_BAND:
      if (!c.cap_band) {
        return { ok: false, reason: 'band cap requires cap_band' };
      }
      if (c.cap_direction !== L11CapDirection.LIMIT_BAND_BAND) {
        return { ok: false, reason: 'band cap requires LIMIT_BAND_BAND' };
      }
      return { ok: true, reason: 'ok' };
    case L11CapType.READINESS_CAP:
      if (c.cap_direction !== L11CapDirection.LIMIT_READINESS) {
        return { ok: false, reason: 'readiness cap requires LIMIT_READINESS' };
      }
      return { ok: true, reason: 'ok' };
    default:
      return { ok: false, reason: 'unknown cap_type' };
  }
}
