/**
 * L14.2 — Deliverability Status Contract
 *
 * §14.2.15 — Closed enumeration describing whether a payload is
 * clean, conditionally deliverable, internal-only, or blocked.
 */

export enum L14DeliverabilityStatus {
  DELIVERABLE_CLEAN = 'DELIVERABLE_CLEAN',
  DELIVERABLE_WITH_DISCLOSURE = 'DELIVERABLE_WITH_DISCLOSURE',
  INTERNAL_ONLY_DELIVERABLE = 'INTERNAL_ONLY_DELIVERABLE',
  BLOCKED_RESERVED_CHANNEL = 'BLOCKED_RESERVED_CHANNEL',
  BLOCKED_CHANNEL_CONTRACT = 'BLOCKED_CHANNEL_CONTRACT',
  BLOCKED_AUDIENCE_CLASS = 'BLOCKED_AUDIENCE_CLASS',
  BLOCKED_ENTITLEMENT = 'BLOCKED_ENTITLEMENT',
  BLOCKED_RESTRICTION_PROFILE = 'BLOCKED_RESTRICTION_PROFILE',
  BLOCKED_UNGOVERNED_SOURCE = 'BLOCKED_UNGOVERNED_SOURCE',
  BLOCKED_UNCERTIFIED_RENDERING_PROFILE = 'BLOCKED_UNCERTIFIED_RENDERING_PROFILE',
  BLOCKED_FINAL_ARTIFACT_REQUIRED = 'BLOCKED_FINAL_ARTIFACT_REQUIRED',
}

export const ALL_L14_DELIVERABILITY_STATUSES:
  readonly L14DeliverabilityStatus[] =
  Object.values(L14DeliverabilityStatus);

const USER_EMITTING = new Set<L14DeliverabilityStatus>([
  L14DeliverabilityStatus.DELIVERABLE_CLEAN,
  L14DeliverabilityStatus.DELIVERABLE_WITH_DISCLOSURE,
]);

export function l14StatusIsUserEmitting(s: L14DeliverabilityStatus): boolean {
  return USER_EMITTING.has(s);
}

export function l14StatusIsBlocking(s: L14DeliverabilityStatus): boolean {
  return (
    s !== L14DeliverabilityStatus.DELIVERABLE_CLEAN &&
    s !== L14DeliverabilityStatus.DELIVERABLE_WITH_DISCLOSURE &&
    s !== L14DeliverabilityStatus.INTERNAL_ONLY_DELIVERABLE
  );
}
