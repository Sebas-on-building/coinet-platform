/**
 * L14.2 — Audience Class Contract
 *
 * §14.2.7 — Closed enumeration of audience classes Layer 14
 * may legally target.
 */

export enum L14AudienceClass {
  END_USER = 'END_USER',
  WATCHLIST_USER = 'WATCHLIST_USER',
  ALERT_SUBSCRIBER = 'ALERT_SUBSCRIBER',
  INTERNAL_ANALYST = 'INTERNAL_ANALYST',
  INTERNAL_SYSTEM_REVIEW = 'INTERNAL_SYSTEM_REVIEW',
}

export const ALL_L14_AUDIENCE_CLASSES: readonly L14AudienceClass[] =
  Object.values(L14AudienceClass);

const INTERNAL = new Set<L14AudienceClass>([
  L14AudienceClass.INTERNAL_ANALYST,
  L14AudienceClass.INTERNAL_SYSTEM_REVIEW,
]);

export function l14AudienceIsInternal(a: L14AudienceClass): boolean {
  return INTERNAL.has(a);
}
