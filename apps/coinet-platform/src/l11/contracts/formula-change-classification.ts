/**
 * L11.7 — Formula Change Classification (§11.7.13.1 / §11.7.13.5)
 */

export enum L11FormulaChangeClassification {
  ADDITIVE_SAFE = 'ADDITIVE_SAFE',
  BACKWARD_COMPATIBLE = 'BACKWARD_COMPATIBLE',
  RECALIBRATION_REQUIRED = 'RECALIBRATION_REQUIRED',
  MIGRATION_REQUIRED = 'MIGRATION_REQUIRED',
  BREAKING_SEMANTIC = 'BREAKING_SEMANTIC',
  PROHIBITED = 'PROHIBITED',
}

export const ALL_L11_FORMULA_CHANGE_CLASSIFICATIONS:
  readonly L11FormulaChangeClassification[] =
  Object.values(L11FormulaChangeClassification);

const SAFE: ReadonlySet<L11FormulaChangeClassification> = new Set([
  L11FormulaChangeClassification.ADDITIVE_SAFE,
  L11FormulaChangeClassification.BACKWARD_COMPATIBLE,
]);

const REQUIRES_VERSION_BUMP: ReadonlySet<L11FormulaChangeClassification> = new Set([
  L11FormulaChangeClassification.RECALIBRATION_REQUIRED,
  L11FormulaChangeClassification.MIGRATION_REQUIRED,
  L11FormulaChangeClassification.BREAKING_SEMANTIC,
]);

export function isL11FormulaChangeSafe(
  c: L11FormulaChangeClassification,
): boolean {
  return SAFE.has(c);
}

export function l11FormulaChangeRequiresVersionBump(
  c: L11FormulaChangeClassification,
): boolean {
  return REQUIRES_VERSION_BUMP.has(c);
}

export function isL11FormulaChangeProhibited(
  c: L11FormulaChangeClassification,
): boolean {
  return c === L11FormulaChangeClassification.PROHIBITED;
}

export function l11FormulaChangeRequiresMigration(
  c: L11FormulaChangeClassification,
): boolean {
  return c === L11FormulaChangeClassification.MIGRATION_REQUIRED ||
    c === L11FormulaChangeClassification.BREAKING_SEMANTIC;
}

export function l11FormulaChangeRequiresRecalibration(
  c: L11FormulaChangeClassification,
): boolean {
  return c === L11FormulaChangeClassification.RECALIBRATION_REQUIRED ||
    l11FormulaChangeRequiresMigration(c);
}
