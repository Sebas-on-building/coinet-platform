/**
 * L11.3 — Formula Status (§11.3.3.2)
 *
 * Status of a score formula. Production-enabled is the only status
 * that may serve current authoritative scores. Shadow-only formulas
 * may run in parallel for evaluation but never become authoritative.
 */

export enum L11FormulaStatus {
  PRODUCTION_ENABLED = 'PRODUCTION_ENABLED',
  SHADOW_ONLY = 'SHADOW_ONLY',
  EXPERIMENTAL_BLOCKED = 'EXPERIMENTAL_BLOCKED',
  DEPRECATED = 'DEPRECATED',
  FROZEN = 'FROZEN',
}

export const ALL_L11_FORMULA_STATUSES: readonly L11FormulaStatus[] =
  Object.values(L11FormulaStatus);

export function formulaStatusAllowsCurrentEmission(s: L11FormulaStatus): boolean {
  return (
    s === L11FormulaStatus.PRODUCTION_ENABLED ||
    s === L11FormulaStatus.FROZEN
  );
}

export function formulaStatusForbidsProductionEmission(s: L11FormulaStatus): boolean {
  return (
    s === L11FormulaStatus.SHADOW_ONLY ||
    s === L11FormulaStatus.EXPERIMENTAL_BLOCKED ||
    s === L11FormulaStatus.DEPRECATED
  );
}
