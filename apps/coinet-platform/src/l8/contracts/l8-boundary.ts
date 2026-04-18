/**
 * L8.1 — Boundary Contract (Negative Definition)
 *
 * §8.1.2 — What Layer 8 is NOT. §8.1.2.4 — Forbidden naming patterns that
 * indicate validation, scoring, scenario, judgment, or recommendation
 * drift.
 */

export const L8_IS_NOT = [
  'the validation layer',
  'the contradiction engine',
  'the deterministic scoring layer',
  'the scenario engine',
  'the final judgment layer',
  'the recommendation layer',
] as const;

export const L8_DOES_NOT_ANSWER = [
  'which trade should be taken',
  'which scenario is final',
  'what the final rank is',
  'what the final judgment should be',
  'whether an asset is attractive in final terms',
  'whether a thesis is the winning thesis',
  'which regime is best',
] as const;

/**
 * §8.1.2.4 — Forbidden semantic patterns. These names must never appear
 * as regime subjects, regime outputs, or capability claims.
 *
 * The patterns forbid: final trade advice, thesis confirmation, scenario
 * winners, judgment/score overrides, buy/sell/avoid semantics, and
 * action-biased regime names.
 */
const FORBIDDEN_NAME_PATTERNS: readonly RegExp[] = [
  /buy[_\s]?signal/i,
  /sell[_\s]?signal/i,
  /avoid[_\s]?signal/i,
  /trade[_\s]?signal/i,
  /action[_\s]?signal/i,
  /recommendation/i,
  /final[_\s]?scenario/i,
  /scenario[_\s]?winner/i,
  /final[_\s]?judgment/i,
  /judgment[_\s]?override/i,
  /final[_\s]?score/i,
  /score[_\s]?override/i,
  /final[_\s]?rank/i,
  /final[_\s]?narrative/i,
  /portfolio[_\s]?priority/i,
  /opportunity[_\s]?rank/i,
  /best[_\s]?trade/i,
  /best[_\s]?regime/i,
  /regime[_\s]?winner/i,
  /winning[_\s]?thesis/i,
  /highest[_\s]?conviction/i,
  /conviction[_\s]?trade/i,
  /buy[_\s]?ready/i,
  /risk[_\s]?on[_\s]?buy/i,
  /risk[_\s]?off[_\s]?avoid/i,
  /bullish[_\s]?confirmed/i,
  /bearish[_\s]?confirmed/i,
  /attractive[_\s]?regime/i,
  /avoid[_\s]?regime/i,
  /thesis[_\s]?confirmation/i,
  /validation[_\s]?override/i,
  /re[_-]?validate/i,
];

/**
 * Examples of legal regime-domain names. Used by tests and docs to keep
 * the layer honest.
 */
const VALID_NAME_EXAMPLES: readonly string[] = [
  'market_regime_macro_risk_on',
  'sector_regime_ecosystem_expansion',
  'asset_regime_post_unlock_digestion',
  'leverage_regime_deleveraging',
  'liquidity_regime_thin_fragile',
  'regime_transition_macro_risk_off',
  'regime_confidence_structural',
  'regime_multiplier_momentum_damped',
  'multi_family_coexistence_macro_sector',
];

export function containsL8ForbiddenNaming(name: string): boolean {
  return FORBIDDEN_NAME_PATTERNS.some(p => p.test(name));
}

export function isValidL8ComponentName(name: string): boolean {
  if (!name || name.length === 0) return false;
  if (containsL8ForbiddenNaming(name)) return false;
  return /^[a-z][a-z0-9_]*$/.test(name);
}

export interface L8ForbiddenSemanticCheck {
  readonly name: string;
  readonly forbidden: boolean;
  readonly matchedPattern: string | null;
}

export function checkL8ForbiddenSemantics(name: string): L8ForbiddenSemanticCheck {
  for (const p of FORBIDDEN_NAME_PATTERNS) {
    if (p.test(name)) {
      return { name, forbidden: true, matchedPattern: p.source };
    }
  }
  return { name, forbidden: false, matchedPattern: null };
}

export function getL8ForbiddenNamePatterns(): readonly RegExp[] {
  return FORBIDDEN_NAME_PATTERNS;
}

export function getL8ValidNameExamples(): readonly string[] {
  return VALID_NAME_EXAMPLES;
}
