/**
 * L11.3 — Formula Penalty Rules (§11.3.6.1)
 *
 * Declarative penalty contract. Constructive families have penalties
 * that reduce score; risk families have penalties that may increase
 * the risk score (always direction-aligned).
 */

import { L11ScoreFamily } from './score-family';

export enum L11PenaltyApplicationMode {
  ADDITIVE = 'ADDITIVE',
  MULTIPLICATIVE = 'MULTIPLICATIVE',
}

export const ALL_L11_PENALTY_APPLICATION_MODES:
  readonly L11PenaltyApplicationMode[] =
  Object.values(L11PenaltyApplicationMode);

export interface L11FormulaPenaltyRule {
  readonly penalty_rule_id: string;
  readonly score_family: L11ScoreFamily;

  readonly reason_code: string;
  readonly affected_component_ids: readonly string[];

  /**
   * §11.3.6.1 — Magnitude expressed in score units (additive) or as a
   * multiplier in [0, 1] (multiplicative). Multiplicative >1 is
   * forbidden because it would inflate the score under penalty.
   */
  readonly magnitude: number;
  readonly application_mode: L11PenaltyApplicationMode;

  /** True when penalty trigger should also activate a cap rule. */
  readonly triggers_cap: boolean;
  readonly attribution_required: boolean;

  readonly policy_version: string;
}

export function isL11PenaltyRuleStructurallyValid(p: L11FormulaPenaltyRule): {
  ok: boolean; reason: string;
} {
  if (!p.penalty_rule_id) return { ok: false, reason: 'penalty_rule_id missing' };
  if (!p.reason_code) return { ok: false, reason: 'reason_code missing' };
  if (!Number.isFinite(p.magnitude)) {
    return { ok: false, reason: 'magnitude must be finite' };
  }
  switch (p.application_mode) {
    case L11PenaltyApplicationMode.ADDITIVE:
      if (p.magnitude < 0 || p.magnitude > 100) {
        return { ok: false, reason: `additive magnitude ${p.magnitude} out of [0,100]` };
      }
      return { ok: true, reason: 'ok' };
    case L11PenaltyApplicationMode.MULTIPLICATIVE:
      if (p.magnitude < 0 || p.magnitude > 1) {
        return { ok: false, reason: `multiplicative magnitude ${p.magnitude} out of [0,1]` };
      }
      return { ok: true, reason: 'ok' };
    default:
      return { ok: false, reason: 'unknown application_mode' };
  }
}
