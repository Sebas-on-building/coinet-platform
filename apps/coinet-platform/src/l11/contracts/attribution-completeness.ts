/**
 * L11.4 — Attribution Completeness (§11.4.13)
 *
 * Classes describing how complete an attribution object is. The
 * completeness validator selects exactly one class with strict
 * precedence (BLOCKED > PARTIAL > COMPLETE_WITH_DISCLOSURE >
 * COMPLETE).
 */

export enum L11AttributionCompletenessClass {
  COMPLETE_ATTRIBUTION = 'COMPLETE_ATTRIBUTION',
  COMPLETE_WITH_DISCLOSURE = 'COMPLETE_WITH_DISCLOSURE',
  PARTIAL_ATTRIBUTION = 'PARTIAL_ATTRIBUTION',
  BLOCKED_INSUFFICIENT_TRACE = 'BLOCKED_INSUFFICIENT_TRACE',
  BLOCKED_UNGOVERNED_INPUT = 'BLOCKED_UNGOVERNED_INPUT',
}

export const ALL_L11_ATTRIBUTION_COMPLETENESS_CLASSES:
  readonly L11AttributionCompletenessClass[] =
  Object.values(L11AttributionCompletenessClass);

export function isL11AttributionBlocked(
  c: L11AttributionCompletenessClass,
): boolean {
  return (
    c === L11AttributionCompletenessClass.BLOCKED_INSUFFICIENT_TRACE ||
    c === L11AttributionCompletenessClass.BLOCKED_UNGOVERNED_INPUT
  );
}

export function isL11AttributionEmissible(
  c: L11AttributionCompletenessClass,
): boolean {
  return (
    c === L11AttributionCompletenessClass.COMPLETE_ATTRIBUTION ||
    c === L11AttributionCompletenessClass.COMPLETE_WITH_DISCLOSURE
  );
}
