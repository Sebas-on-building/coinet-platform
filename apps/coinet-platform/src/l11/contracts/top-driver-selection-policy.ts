/**
 * L11.4 — Top-Driver Selection Policy (§11.4.10)
 *
 * Deterministic policy for selecting the top positive and negative
 * drivers from an attribution candidate list.
 */

import { L11AttributionDriverClass } from './attribution-driver';
import { L11AttributionMaterialityClass } from './attribution-materiality';

export enum L11TopDriverTieBreakRule {
  MATERIALITY_CLASS = 'MATERIALITY_CLASS',
  DRIVER_CLASS_PRIORITY = 'DRIVER_CLASS_PRIORITY',
  CONTRIBUTION_MAGNITUDE = 'CONTRIBUTION_MAGNITUDE',
  SOURCE_LAYER_PRIORITY = 'SOURCE_LAYER_PRIORITY',
  DRIVER_ID_LEXICOGRAPHIC = 'DRIVER_ID_LEXICOGRAPHIC',
}

export const ALL_L11_TOP_DRIVER_TIE_BREAK_RULES:
  readonly L11TopDriverTieBreakRule[] =
  Object.values(L11TopDriverTieBreakRule);

export interface L11TopDriverSelectionPolicy {
  readonly policy_id: string;
  readonly max_positive_drivers: number;
  readonly max_negative_drivers: number;
  readonly min_materiality_threshold: number;
  readonly tie_break_order: readonly L11TopDriverTieBreakRule[];
  readonly include_caps_if_material: boolean;
  readonly include_missing_data_if_material: boolean;
  readonly include_modifier_if_material: boolean;
  readonly policy_version: string;
}

export const L11_DEFAULT_TOP_DRIVER_POLICY: L11TopDriverSelectionPolicy = {
  policy_id: 'l11.4.top_driver.default.v1',
  max_positive_drivers: 5,
  max_negative_drivers: 5,
  min_materiality_threshold: 0.05,
  tie_break_order: [
    L11TopDriverTieBreakRule.MATERIALITY_CLASS,
    L11TopDriverTieBreakRule.DRIVER_CLASS_PRIORITY,
    L11TopDriverTieBreakRule.CONTRIBUTION_MAGNITUDE,
    L11TopDriverTieBreakRule.SOURCE_LAYER_PRIORITY,
    L11TopDriverTieBreakRule.DRIVER_ID_LEXICOGRAPHIC,
  ],
  include_caps_if_material: true,
  include_missing_data_if_material: true,
  include_modifier_if_material: true,
  policy_version: 'l11.4.top_driver.policy.v1',
};

/**
 * Source-layer ordering used by the SOURCE_LAYER_PRIORITY tie-break.
 * Lower value wins. Higher numeric layer is generally more decisive
 * for L11 scores so we prefer L10 > L9 > L8 > L7 > L6 > N/A.
 */
export const L11_SOURCE_LAYER_PRIORITY: Readonly<Record<string, number>> = {
  L10: 0,
  L9: 1,
  L8: 2,
  L7: 3,
  L6: 4,
  N_A: 99,
};

/**
 * Validate the structural integrity of a top-driver policy. Used
 * by `top-driver-selection.validator.ts` and the engine.
 */
export function isL11TopDriverPolicyStructurallyValid(
  p: L11TopDriverSelectionPolicy,
): { ok: boolean; reason: string } {
  if (!p.policy_id) return { ok: false, reason: 'policy_id missing' };
  if (!p.policy_version) return { ok: false, reason: 'policy_version missing' };
  if (!Number.isInteger(p.max_positive_drivers) || p.max_positive_drivers <= 0) {
    return { ok: false, reason: `max_positive_drivers must be > 0` };
  }
  if (!Number.isInteger(p.max_negative_drivers) || p.max_negative_drivers <= 0) {
    return { ok: false, reason: `max_negative_drivers must be > 0` };
  }
  if (!Number.isFinite(p.min_materiality_threshold) ||
      p.min_materiality_threshold < 0 || p.min_materiality_threshold > 1) {
    return { ok: false, reason: `min_materiality_threshold must be in [0,1]` };
  }
  if (p.tie_break_order.length === 0) {
    return { ok: false, reason: 'tie_break_order must be non-empty' };
  }
  // DRIVER_ID_LEXICOGRAPHIC must be the final tie-break to guarantee determinism
  const last = p.tie_break_order[p.tie_break_order.length - 1];
  if (last !== L11TopDriverTieBreakRule.DRIVER_ID_LEXICOGRAPHIC) {
    return {
      ok: false,
      reason: 'tie_break_order must end with DRIVER_ID_LEXICOGRAPHIC for determinism',
    };
  }
  return { ok: true, reason: 'ok' };
}

/**
 * Used to anchor the materiality fallback when materiality_class
 * comparison is needed in tie-breaks but the candidate carries only
 * a numeric impact.
 */
export function pickMaterialityFloor(
  c: L11AttributionMaterialityClass,
  d: L11AttributionDriverClass,
): { class: L11AttributionMaterialityClass; driver: L11AttributionDriverClass } {
  return { class: c, driver: d };
}
