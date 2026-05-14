/**
 * L12.1 — Boundary Contract (Negative Definition)
 *
 * §12.1.4 — What Layer 12 is NOT. §12.1.7 / §12.1.12 — Forbidden naming
 * patterns indicating prediction theater, certainty claims,
 * recommendation/judgment/trade-action leakage, or lower-layer rebuild
 * drift.
 */

export const L12_IS_NOT = [
  'the validation layer',
  'the contradiction engine',
  'the regime engine',
  'the sequence engine',
  'the hypothesis engine',
  'the scoring engine',
  'the final judgment layer',
  'the recommendation layer',
  'the delivery layer',
  'the trade execution layer',
  'the alert-action layer',
] as const;

export const L12_DOES_NOT_ANSWER = [
  'what will definitely happen',
  'what the user should buy',
  'what the user should sell',
  'what the final judgment is',
  'which scenario is guaranteed',
  'which trade should be taken',
  'whether the asset is finally good or bad',
  'whether an opportunity should be acted on',
  'whether a path is certain',
  'whether a path cannot fail',
] as const;

/**
 * §12.1.7 / §12.1.12 — Forbidden semantic patterns. Must never appear
 * as scenario subjects, scenario output names, or capability claims.
 */
const FORBIDDEN_NAME_PATTERNS: readonly RegExp[] = [
  // prediction theater
  /will[_\s]?definitely/i,
  /definitely[_\s]?going/i,
  /certain[_\s]?outcome/i,
  /certain[_\s]?path/i,
  /certain[_\s]?continuation/i,
  /guaranteed[_\s]?path/i,
  /guaranteed[_\s]?outcome/i,
  /guaranteed[_\s]?continuation/i,
  /guaranteed[_\s]?breakout/i,
  /guaranteed[_\s]?setup/i,
  /inevitable[_\s]?path/i,
  /inevitable[_\s]?outcome/i,
  /cannot[_\s]?fail/i,
  /no[_\s]?failure[_\s]?path/i,
  /must[_\s]?happen/i,
  /has[_\s]?to[_\s]?happen/i,
  /confirmed[_\s]?breakout/i,
  /confirmed[_\s]?continuation/i,
  /safe[_\s]?continuation/i,
  /prediction[_\s]?score/i,
  /prediction[_\s]?path/i,
  /forecast[_\s]?signal/i,

  // recommendation / trade action
  /buy[_\s]?signal/i,
  /sell[_\s]?signal/i,
  /avoid[_\s]?signal/i,
  /trade[_\s]?signal/i,
  /entry[_\s]?signal/i,
  /exit[_\s]?signal/i,
  /entry[_\s]?confirmed/i,
  /exit[_\s]?confirmed/i,
  /trade[_\s]?ready/i,
  /entry[_\s]?ready/i,
  /buy[_\s]?ready/i,
  /actionable[_\s]?scenario/i,
  /actionable[_\s]?path/i,
  /recommendation/i,
  /portfolio[_\s]?allocation/i,
  /portfolio[_\s]?priority/i,
  /best[_\s]?trade/i,
  /best[_\s]?opportunity/i,
  /best[_\s]?path/i,
  /optimal[_\s]?trade/i,

  // judgment / scenario winner
  /final[_\s]?scenario/i,
  /scenario[_\s]?winner/i,
  /winning[_\s]?scenario/i,
  /final[_\s]?judgment/i,
  /judgment[_\s]?override/i,
  /final[_\s]?recommendation/i,
  /trade[_\s]?recommendation/i,
  /winning[_\s]?path/i,
  /chosen[_\s]?scenario/i,
  /selected[_\s]?scenario/i,

  // certainty / conviction
  /highest[_\s]?conviction/i,
  /conviction[_\s]?signal/i,
  /conviction[_\s]?score/i,
  /conviction[_\s]?path/i,
  /alpha[_\s]?signal/i,
  /alpha[_\s]?path/i,
  /ideal[_\s]?path/i,
  /ideal[_\s]?scenario/i,
  /safest[_\s]?path/i,

  // lower-layer rebuild drift
  /rebuild[_\s]?validation/i,
  /rebuild[_\s]?regime/i,
  /rebuild[_\s]?sequence/i,
  /rebuild[_\s]?hypothesis/i,
  /rebuild[_\s]?hypotheses/i,
  /rebuild[_\s]?score/i,
  /recompute[_\s]?score/i,
  /override[_\s]?regime/i,
  /override[_\s]?sequence/i,
  /override[_\s]?hypothesis/i,
  /override[_\s]?validation/i,
  /reinterpret[_\s]?regime/i,
  /reinterpret[_\s]?sequence/i,
  /reinterpret[_\s]?hypothesis/i,
  /score[_\s]?value[_\s]?only/i,
  /naked[_\s]?score/i,

  // persistence / consumption
  /bypass[_\s]?l5/i,
  /bypass[_\s]?l7/i,
  /bypass[_\s]?l8/i,
  /bypass[_\s]?l9/i,
  /bypass[_\s]?l10/i,
  /bypass[_\s]?l11/i,
  /raw[_\s]?storage/i,
  /direct[_\s]?postgres/i,
  /direct[_\s]?clickhouse/i,
  /consume[_\s]?l1[3-9]/i,
  /consume[_\s]?l2[0-9]/i,
];

const VALID_NAME_EXAMPLES: readonly string[] = [
  'scenario_set_v1',
  'base_case_scenario_v1',
  'bullish_continuation_scenario_v1',
  'bearish_failure_scenario_v1',
  'trigger_profile_v1',
  'invalidation_profile_v1',
  'path_confidence_profile_v1',
  'scenario_shift_condition_set_v1',
  'scenario_restriction_profile_v1',
  'scenario_evidence_read_surface_v1',
  'scenario_lineage_read_surface_v1',
  'scenario_subject_assembler',
  'conditional_path_constructor',
];

export function containsL12ForbiddenNaming(name: string): boolean {
  return FORBIDDEN_NAME_PATTERNS.some(p => p.test(name));
}

export function isValidL12ComponentName(name: string): boolean {
  if (!name || name.length === 0) return false;
  if (containsL12ForbiddenNaming(name)) return false;
  return /^[a-z][a-z0-9_]*$/.test(name);
}

export interface L12ForbiddenSemanticCheck {
  readonly name: string;
  readonly forbidden: boolean;
  readonly matchedPattern: string | null;
}

export function checkL12ForbiddenSemantics(name: string): L12ForbiddenSemanticCheck {
  for (const p of FORBIDDEN_NAME_PATTERNS) {
    if (p.test(name)) {
      return { name, forbidden: true, matchedPattern: p.source };
    }
  }
  return { name, forbidden: false, matchedPattern: null };
}

export function getL12ForbiddenNamePatterns(): readonly RegExp[] {
  return FORBIDDEN_NAME_PATTERNS;
}

export function getL12ValidNameExamples(): readonly string[] {
  return VALID_NAME_EXAMPLES;
}
