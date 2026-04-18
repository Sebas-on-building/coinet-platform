/**
 * L5.2 Authority Model — Projection Categories
 *
 * §5.2.11 — Projection Law
 */

export enum L5ProjectionCategory {
  /** Needed for core platform function or replay completeness. */
  AUTHORITY_ADJACENT_REQUIRED = 'AUTHORITY_ADJACENT_REQUIRED',

  /** Needed for historical access or analytical surfaces. */
  ANALYTICAL = 'ANALYTICAL',

  /** Needed only for performance (latency reduction). */
  ACCELERATION = 'ACCELERATION',

  /** Needed for convenient bounded delivery, not authority. */
  PACKAGING = 'PACKAGING',
}

export const ALL_PROJECTION_CATEGORIES: readonly L5ProjectionCategory[] = [
  L5ProjectionCategory.AUTHORITY_ADJACENT_REQUIRED,
  L5ProjectionCategory.ANALYTICAL,
  L5ProjectionCategory.ACCELERATION,
  L5ProjectionCategory.PACKAGING,
];

export function isRequiredProjectionCategory(cat: L5ProjectionCategory): boolean {
  return cat === L5ProjectionCategory.AUTHORITY_ADJACENT_REQUIRED;
}
