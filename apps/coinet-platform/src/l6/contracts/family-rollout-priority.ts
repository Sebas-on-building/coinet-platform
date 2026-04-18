/**
 * L6.6 — Family Rollout Priority
 *
 * §6.6.4.11 — Recommended rollout ordering. Lower ordinal = earlier rollout.
 */

export enum L6FamilyRolloutPriority {
  P1_MARKET = 'P1_MARKET',
  P2_DERIVATIVES = 'P2_DERIVATIVES',
  P3_DEX = 'P3_DEX',
  P4_PROTOCOL = 'P4_PROTOCOL',
  P5_ONCHAIN = 'P5_ONCHAIN',
  P6_SECURITY = 'P6_SECURITY',
  P7_NARRATIVE = 'P7_NARRATIVE',
  P8_ENTITY = 'P8_ENTITY',
}

export const ALL_ROLLOUT_PRIORITIES: readonly L6FamilyRolloutPriority[] =
  Object.values(L6FamilyRolloutPriority);

export const ROLLOUT_ORDINAL: Readonly<Record<L6FamilyRolloutPriority, number>> = Object.freeze({
  [L6FamilyRolloutPriority.P1_MARKET]: 1,
  [L6FamilyRolloutPriority.P2_DERIVATIVES]: 2,
  [L6FamilyRolloutPriority.P3_DEX]: 3,
  [L6FamilyRolloutPriority.P4_PROTOCOL]: 4,
  [L6FamilyRolloutPriority.P5_ONCHAIN]: 5,
  [L6FamilyRolloutPriority.P6_SECURITY]: 6,
  [L6FamilyRolloutPriority.P7_NARRATIVE]: 7,
  [L6FamilyRolloutPriority.P8_ENTITY]: 8,
});

export function isEarlierRollout(a: L6FamilyRolloutPriority, b: L6FamilyRolloutPriority): boolean {
  return ROLLOUT_ORDINAL[a] < ROLLOUT_ORDINAL[b];
}
