/**
 * L11.7 — Drift Recommended Action (§11.7.10)
 *
 * Action ladder produced by drift reports. The severity → action
 * compatibility table is the single source of truth used by
 * validators, the monitoring engine, and INV-11.7-B.
 */

import {
  L11DriftSeverity,
  isL11DriftSeverityAtLeast,
} from './drift-severity';
import {
  L11ScoreDriftType,
  L11DriftTypeImpactClass,
  getL11DriftTypeImpactClass,
} from './drift-type';

export enum L11DriftRecommendedAction {
  NO_ACTION = 'NO_ACTION',
  CONTINUE_MONITORING = 'CONTINUE_MONITORING',
  REQUIRE_REVIEW = 'REQUIRE_REVIEW',
  REQUIRE_RECALIBRATION = 'REQUIRE_RECALIBRATION',
  REQUIRE_THRESHOLD_UPDATE = 'REQUIRE_THRESHOLD_UPDATE',
  REQUIRE_FORMULA_MIGRATION = 'REQUIRE_FORMULA_MIGRATION',
  FREEZE_SCORE_FAMILY = 'FREEZE_SCORE_FAMILY',
  BLOCK_CURRENT_EMISSION = 'BLOCK_CURRENT_EMISSION',
}

export const ALL_L11_DRIFT_RECOMMENDED_ACTIONS:
  readonly L11DriftRecommendedAction[] =
  Object.values(L11DriftRecommendedAction);

/**
 * §11.7.10.2 — Each severity admits a closed set of actions. Higher
 * severity admits stronger actions and disallows passive ones.
 *
 * Suggested mapping (spec §11.7.10.2):
 *   INFO      → NO_ACTION, CONTINUE_MONITORING
 *   WATCH     → CONTINUE_MONITORING
 *   MATERIAL  → REQUIRE_REVIEW
 *   SEVERE    → REQUIRE_RECALIBRATION, REQUIRE_THRESHOLD_UPDATE
 *   CRITICAL  → REQUIRE_FORMULA_MIGRATION, FREEZE_SCORE_FAMILY,
 *               BLOCK_CURRENT_EMISSION
 */
export const L11_LEGAL_ACTIONS_BY_SEVERITY:
  Readonly<Record<L11DriftSeverity, readonly L11DriftRecommendedAction[]>> = {
  [L11DriftSeverity.INFO]: [
    L11DriftRecommendedAction.NO_ACTION,
    L11DriftRecommendedAction.CONTINUE_MONITORING,
  ],
  [L11DriftSeverity.WATCH]: [
    L11DriftRecommendedAction.CONTINUE_MONITORING,
    L11DriftRecommendedAction.REQUIRE_REVIEW,
  ],
  [L11DriftSeverity.MATERIAL]: [
    L11DriftRecommendedAction.REQUIRE_REVIEW,
    L11DriftRecommendedAction.REQUIRE_RECALIBRATION,
    L11DriftRecommendedAction.REQUIRE_THRESHOLD_UPDATE,
  ],
  [L11DriftSeverity.SEVERE]: [
    L11DriftRecommendedAction.REQUIRE_RECALIBRATION,
    L11DriftRecommendedAction.REQUIRE_THRESHOLD_UPDATE,
    L11DriftRecommendedAction.REQUIRE_FORMULA_MIGRATION,
    L11DriftRecommendedAction.FREEZE_SCORE_FAMILY,
    L11DriftRecommendedAction.BLOCK_CURRENT_EMISSION,
  ],
  [L11DriftSeverity.CRITICAL]: [
    L11DriftRecommendedAction.REQUIRE_FORMULA_MIGRATION,
    L11DriftRecommendedAction.FREEZE_SCORE_FAMILY,
    L11DriftRecommendedAction.BLOCK_CURRENT_EMISSION,
  ],
};

export function isL11DriftActionLegalForSeverity(
  action: L11DriftRecommendedAction,
  severity: L11DriftSeverity,
): boolean {
  return L11_LEGAL_ACTIONS_BY_SEVERITY[severity].includes(action);
}

/**
 * §11.7.10.2 — Type-specific action constraints:
 *   - threshold-class drift must produce a threshold-update or
 *     stronger action when severity ≥ MATERIAL.
 *   - calibration-class drift must produce recalibration / migration
 *     when severity ≥ SEVERE.
 *   - structural drift at severity ≥ SEVERE must require migration
 *     or freeze.
 */
export function isL11DriftActionLegalForType(
  action: L11DriftRecommendedAction,
  type: L11ScoreDriftType,
  severity: L11DriftSeverity,
): { ok: boolean; reason: string } {
  const impact = getL11DriftTypeImpactClass(type);
  if (impact === L11DriftTypeImpactClass.THRESHOLD &&
      isL11DriftSeverityAtLeast(severity, L11DriftSeverity.MATERIAL)) {
    const ok =
      action === L11DriftRecommendedAction.REQUIRE_THRESHOLD_UPDATE ||
      action === L11DriftRecommendedAction.REQUIRE_RECALIBRATION ||
      action === L11DriftRecommendedAction.REQUIRE_FORMULA_MIGRATION ||
      action === L11DriftRecommendedAction.FREEZE_SCORE_FAMILY ||
      action === L11DriftRecommendedAction.BLOCK_CURRENT_EMISSION ||
      action === L11DriftRecommendedAction.REQUIRE_REVIEW;
    return ok
      ? { ok: true, reason: 'ok' }
      : {
        ok: false,
        reason: `threshold drift at ${severity} requires threshold-review-or-stronger action`,
      };
  }
  if (impact === L11DriftTypeImpactClass.CALIBRATION &&
      isL11DriftSeverityAtLeast(severity, L11DriftSeverity.SEVERE)) {
    const ok =
      action === L11DriftRecommendedAction.REQUIRE_RECALIBRATION ||
      action === L11DriftRecommendedAction.REQUIRE_FORMULA_MIGRATION ||
      action === L11DriftRecommendedAction.FREEZE_SCORE_FAMILY ||
      action === L11DriftRecommendedAction.BLOCK_CURRENT_EMISSION;
    return ok
      ? { ok: true, reason: 'ok' }
      : {
        ok: false,
        reason: `calibration drift at ${severity} requires recalibration / migration / freeze / block`,
      };
  }
  if (impact === L11DriftTypeImpactClass.STRUCTURAL &&
      isL11DriftSeverityAtLeast(severity, L11DriftSeverity.SEVERE)) {
    const ok =
      action === L11DriftRecommendedAction.REQUIRE_FORMULA_MIGRATION ||
      action === L11DriftRecommendedAction.FREEZE_SCORE_FAMILY ||
      action === L11DriftRecommendedAction.BLOCK_CURRENT_EMISSION ||
      action === L11DriftRecommendedAction.REQUIRE_RECALIBRATION;
    return ok
      ? { ok: true, reason: 'ok' }
      : {
        ok: false,
        reason: `structural drift at ${severity} requires migration / freeze / block / recalibration`,
      };
  }
  return { ok: true, reason: 'ok' };
}

const PASSIVE_ACTIONS: ReadonlySet<L11DriftRecommendedAction> = new Set([
  L11DriftRecommendedAction.NO_ACTION,
  L11DriftRecommendedAction.CONTINUE_MONITORING,
]);

export function isL11DriftActionPassive(
  a: L11DriftRecommendedAction,
): boolean {
  return PASSIVE_ACTIONS.has(a);
}
