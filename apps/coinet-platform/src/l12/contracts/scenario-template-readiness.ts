/**
 * L12.5 — Scenario template readiness law (§12.5.16).
 *
 * Distinct from L12.2's object-level readiness and L12.3's emission-level
 * readiness, this readiness is the *template-evaluation* readiness verdict.
 * It summarises whether a matched template can be used downstream and with
 * what restrictions.
 */

export enum L12ScenarioTemplateReadinessClass {
  READY_CLEAN = 'READY_CLEAN',
  READY_WITH_DISCLOSURE = 'READY_WITH_DISCLOSURE',
  NARROWED_BY_CONTRADICTION = 'NARROWED_BY_CONTRADICTION',
  NARROWED_BY_MISSING_VISIBILITY = 'NARROWED_BY_MISSING_VISIBILITY',
  NARROWED_BY_DRIFT = 'NARROWED_BY_DRIFT',
  NARROWED_BY_ACTIVE_INVALIDATION = 'NARROWED_BY_ACTIVE_INVALIDATION',
  UNRESOLVED_MULTI_PATH = 'UNRESOLVED_MULTI_PATH',
  BLOCKED_INSUFFICIENT_EVIDENCE = 'BLOCKED_INSUFFICIENT_EVIDENCE',
  BLOCKED_INCOMPLETE_SCORE_CONTEXT = 'BLOCKED_INCOMPLETE_SCORE_CONTEXT',
  BLOCKED_BY_RESTRICTION = 'BLOCKED_BY_RESTRICTION',
}

export const ALL_L12_SCENARIO_TEMPLATE_READINESS_CLASSES: readonly L12ScenarioTemplateReadinessClass[] =
  Object.values(L12ScenarioTemplateReadinessClass);

export function isL12CleanTemplateReadiness(
  c: L12ScenarioTemplateReadinessClass,
): boolean {
  return c === L12ScenarioTemplateReadinessClass.READY_CLEAN;
}

export function isL12NarrowedTemplateReadiness(
  c: L12ScenarioTemplateReadinessClass,
): boolean {
  return (
    c === L12ScenarioTemplateReadinessClass.NARROWED_BY_CONTRADICTION ||
    c === L12ScenarioTemplateReadinessClass.NARROWED_BY_MISSING_VISIBILITY ||
    c === L12ScenarioTemplateReadinessClass.NARROWED_BY_DRIFT ||
    c === L12ScenarioTemplateReadinessClass.NARROWED_BY_ACTIVE_INVALIDATION
  );
}

export function isL12BlockedTemplateReadiness(
  c: L12ScenarioTemplateReadinessClass,
): boolean {
  return (
    c === L12ScenarioTemplateReadinessClass.BLOCKED_INSUFFICIENT_EVIDENCE ||
    c === L12ScenarioTemplateReadinessClass.BLOCKED_INCOMPLETE_SCORE_CONTEXT ||
    c === L12ScenarioTemplateReadinessClass.BLOCKED_BY_RESTRICTION
  );
}
