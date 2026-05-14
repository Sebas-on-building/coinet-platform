/**
 * L12.2 — Scenario types (§12.2.6.3).
 *
 * 8 frozen scenario types describing the conditional path role within the
 * scenario set. Each scenario carries exactly one type. Type/family pair
 * legality is enforced via `scenario-family.ts`.
 */

export enum L12ScenarioType {
  BASE_CASE = 'BASE_CASE',
  BULLISH_CONTINUATION = 'BULLISH_CONTINUATION',
  BEARISH_FAILURE = 'BEARISH_FAILURE',
  NEUTRAL_CHOP = 'NEUTRAL_CHOP',
  STRESS_CASE = 'STRESS_CASE',
  RECOVERY_CASE = 'RECOVERY_CASE',
  INVALIDATION_CASE = 'INVALIDATION_CASE',
  INSUFFICIENT_DATA_CASE = 'INSUFFICIENT_DATA_CASE',
}

export const ALL_L12_SCENARIO_TYPES: readonly L12ScenarioType[] =
  Object.values(L12ScenarioType);

/**
 * High-level type "polarity" used by ScenarioSet routing
 * (bullish refs / bearish refs / neutral refs / stress refs / recovery refs).
 */
export enum L12ScenarioTypePolarity {
  BULLISH = 'BULLISH',
  BEARISH = 'BEARISH',
  NEUTRAL = 'NEUTRAL',
  STRESS = 'STRESS',
  RECOVERY = 'RECOVERY',
  BASE = 'BASE',
  INVALIDATION = 'INVALIDATION',
  INSUFFICIENT = 'INSUFFICIENT',
}

const POLARITY: Readonly<Record<L12ScenarioType, L12ScenarioTypePolarity>> = {
  [L12ScenarioType.BASE_CASE]: L12ScenarioTypePolarity.BASE,
  [L12ScenarioType.BULLISH_CONTINUATION]: L12ScenarioTypePolarity.BULLISH,
  [L12ScenarioType.BEARISH_FAILURE]: L12ScenarioTypePolarity.BEARISH,
  [L12ScenarioType.NEUTRAL_CHOP]: L12ScenarioTypePolarity.NEUTRAL,
  [L12ScenarioType.STRESS_CASE]: L12ScenarioTypePolarity.STRESS,
  [L12ScenarioType.RECOVERY_CASE]: L12ScenarioTypePolarity.RECOVERY,
  [L12ScenarioType.INVALIDATION_CASE]: L12ScenarioTypePolarity.INVALIDATION,
  [L12ScenarioType.INSUFFICIENT_DATA_CASE]: L12ScenarioTypePolarity.INSUFFICIENT,
};

export function getL12ScenarioTypePolarity(t: L12ScenarioType): L12ScenarioTypePolarity {
  return POLARITY[t];
}
