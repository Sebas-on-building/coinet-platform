/**
 * L10.1 — Boundary Contract (Negative Definition)
 *
 * §10.1.2 — What Layer 10 is NOT. §10.1.5.3 / §10.1.6.4 — Forbidden
 * naming patterns that indicate judgment, scenario, scoring,
 * recommendation, conviction, causal-certainty, or single-story
 * collapse drift.
 */

export const L10_IS_NOT = [
  'the validation layer',
  'the contradiction engine',
  'the regime engine',
  'the sequence engine',
  'the scenario engine',
  'the deterministic scoring layer',
  'the final judgment layer',
  'the recommendation layer',
  'the action layer',
] as const;

export const L10_DOES_NOT_ANSWER = [
  'which trade should be taken',
  'which scenario is final',
  'what the final rank is',
  'what the final judgment should be',
  'whether an asset is attractive in final terms',
  'whether a thesis is the winning thesis',
  'which explanation is the single truth',
  'whether temporal support proves causation',
  'whether conviction is highest for a given explanation',
] as const;

/**
 * §10.1.5.3 / §10.1.6.4 — Forbidden semantic patterns. These names must
 * never appear as hypothesis subjects, hypothesis outputs, or capability
 * claims.
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
  /final[_\s]?explanation/i,
  /final[_\s]?narrative/i,
  /portfolio[_\s]?priority/i,
  /opportunity[_\s]?rank/i,
  /best[_\s]?trade/i,
  /best[_\s]?opportunity/i,
  /best[_\s]?explanation/i,
  /best[_\s]?hypothesis/i,
  /winning[_\s]?explanation/i,
  /winning[_\s]?hypothesis/i,
  /winning[_\s]?thesis/i,
  /highest[_\s]?conviction/i,
  /conviction[_\s]?trade/i,
  /conviction[_\s]?ranking/i,
  /conviction[_\s]?explanation/i,
  /conviction[_\s]?hypothesis/i,
  /clear[_\s]?buy[_\s]?explanation/i,
  /clear[_\s]?sell[_\s]?explanation/i,
  /ideal[_\s]?explanation/i,
  /ideal[_\s]?hypothesis/i,
  /ideal[_\s]?timing/i,
  /alpha[_\s]?explanation/i,
  /actionable[_\s]?explanation/i,
  /actionable[_\s]?hypothesis/i,
  /actionable[_\s]?setup/i,
  /trade[_\s]?ready/i,
  /entry[_\s]?ready/i,
  /buy[_\s]?ready/i,
  /risk[_\s]?on[_\s]?buy/i,
  /risk[_\s]?off[_\s]?avoid/i,
  /bullish[_\s]?confirmed/i,
  /bearish[_\s]?confirmed/i,
  /thesis[_\s]?confirmation/i,
  /single[_\s]?story/i,
  /only[_\s]?explanation/i,
  /the[_\s]?explanation/i,
  /proven[_\s]?cause/i,
  /proven[_\s]?causality/i,
  /causal[_\s]?certainty/i,
  /causal[_\s]?proof/i,
  /validation[_\s]?override/i,
  /regime[_\s]?override/i,
  /reinterpret[_\s]?regime/i,
  /sequence[_\s]?override/i,
  /reinterpret[_\s]?sequence/i,
  /re[_-]?validate/i,
];

/**
 * Examples of legal hypothesis-domain names. Used by tests and docs.
 */
const VALID_NAME_EXAMPLES: readonly string[] = [
  'hypothesis_candidate_narrative_driven',
  'hypothesis_candidate_liquidity_driven',
  'hypothesis_competition_primary_vs_alternative',
  'hypothesis_ranking_with_spread',
  'hypothesis_spread_profile',
  'support_domain_binding_primary',
  'contradiction_domain_binding_primary',
  'confirmation_gap_unresolved_funding',
  'invalidation_risk_regime_transition',
  'shift_condition_set_spread_narrowing',
  'hypothesis_restriction_profile_evidence_only',
  'hypothesis_evidence_pack',
];

export function containsL10ForbiddenNaming(name: string): boolean {
  return FORBIDDEN_NAME_PATTERNS.some(p => p.test(name));
}

export function isValidL10ComponentName(name: string): boolean {
  if (!name || name.length === 0) return false;
  if (containsL10ForbiddenNaming(name)) return false;
  return /^[a-z][a-z0-9_]*$/.test(name);
}

export interface L10ForbiddenSemanticCheck {
  readonly name: string;
  readonly forbidden: boolean;
  readonly matchedPattern: string | null;
}

export function checkL10ForbiddenSemantics(name: string): L10ForbiddenSemanticCheck {
  for (const p of FORBIDDEN_NAME_PATTERNS) {
    if (p.test(name)) {
      return { name, forbidden: true, matchedPattern: p.source };
    }
  }
  return { name, forbidden: false, matchedPattern: null };
}

export function getL10ForbiddenNamePatterns(): readonly RegExp[] {
  return FORBIDDEN_NAME_PATTERNS;
}

export function getL10ValidNameExamples(): readonly string[] {
  return VALID_NAME_EXAMPLES;
}
