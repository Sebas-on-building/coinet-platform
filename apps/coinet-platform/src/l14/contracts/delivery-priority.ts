/**
 * L14.2 — Delivery Priority + Urgency Contracts
 *
 * §14.2.14 — Frozen taxonomy. Resolution to specific values is
 * deferred to L14.3.
 */

export enum L14DeliveryPriorityClass {
  CRITICAL = 'CRITICAL',
  HIGH = 'HIGH',
  MATERIAL = 'MATERIAL',
  ROUTINE = 'ROUTINE',
  LOW = 'LOW',
  SUPPRESSED = 'SUPPRESSED',
}

export const ALL_L14_DELIVERY_PRIORITY_CLASSES:
  readonly L14DeliveryPriorityClass[] =
  Object.values(L14DeliveryPriorityClass);

export enum L14DeliveryUrgencyClass {
  IMMEDIATE = 'IMMEDIATE',
  NEAR_REAL_TIME = 'NEAR_REAL_TIME',
  DIGEST_ELIGIBLE = 'DIGEST_ELIGIBLE',
  ON_DEMAND_ONLY = 'ON_DEMAND_ONLY',
}

export const ALL_L14_DELIVERY_URGENCY_CLASSES:
  readonly L14DeliveryUrgencyClass[] =
  Object.values(L14DeliveryUrgencyClass);
