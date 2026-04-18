/**
 * L7.1 — Boundary Contract (Negative Definition)
 *
 * §7.1.3 — What Layer 7 is NOT. §7.1.3.4 — Forbidden naming patterns
 * that indicate judgment/scenario/recommendation drift.
 */

export const L7_IS_NOT = [
  'a regime engine',
  'a sequence engine',
  'a hypothesis engine',
  'a deterministic scoring layer',
  'a scenario engine',
  'a final judgment layer',
  'a recommendation layer',
] as const;

export const L7_DOES_NOT_ANSWER = [
  'which scenario is most likely',
  'which trade should be taken',
  'what the final rank is',
  'what the final judgment should be',
  'whether an asset is attractive in final terms',
  'whether a thesis is the winning thesis',
] as const;

/**
 * §7.1.3.4 — Forbidden semantic patterns. These names must never appear
 * as validation subjects, validation outputs, or capability claims.
 */
const FORBIDDEN_NAME_PATTERNS: readonly RegExp[] = [
  /buy[_\s]?ready[_\s]?validation/i,
  /final[_\s]?bullish[_\s]?truth/i,
  /best[_\s]?trade[_\s]?confirmed/i,
  /highest[_\s]?conviction[_\s]?opportunity/i,
  /scenario[_\s]?winner/i,
  /judgment[_\s]?override/i,
  /buy[_\s]?signal/i,
  /sell[_\s]?signal/i,
  /trade[_\s]?signal/i,
  /recommendation/i,
  /action[_\s]?signal/i,
  /final[_\s]?score/i,
  /final[_\s]?rank/i,
  /final[_\s]?narrative/i,
  /portfolio[_\s]?priority/i,
  /opportunity[_\s]?rank/i,
  /regime[_\s]?decision/i,
  /conviction[_\s]?trade/i,
  /winning[_\s]?thesis/i,
  /avoid[_\s]?score/i,
];

/**
 * Examples of legal validation-domain names. Used by tests and docs to
 * keep the layer honest.
 */
const VALID_NAME_EXAMPLES: readonly string[] = [
  'story_support_assessment',
  'contradiction_bundle_funding_divergence',
  'claim_candidate_whale_accumulation',
  'confidence_assessment_structural',
  'restriction_profile_insufficient_support',
  'incompleteness_classification_missing_onchain',
  'staleness_classification_funding',
  'ambiguity_classification_direction',
];

export function containsForbiddenNaming(name: string): boolean {
  return FORBIDDEN_NAME_PATTERNS.some(p => p.test(name));
}

export function isValidValidationName(name: string): boolean {
  if (!name || name.length === 0) return false;
  if (containsForbiddenNaming(name)) return false;
  return /^[a-z][a-z0-9_]*$/.test(name);
}

export interface ForbiddenSemanticCheck {
  readonly name: string;
  readonly forbidden: boolean;
  readonly matchedPattern: string | null;
}

export function checkForbiddenSemantics(name: string): ForbiddenSemanticCheck {
  for (const p of FORBIDDEN_NAME_PATTERNS) {
    if (p.test(name)) {
      return { name, forbidden: true, matchedPattern: p.source };
    }
  }
  return { name, forbidden: false, matchedPattern: null };
}

export function getForbiddenNamePatterns(): readonly RegExp[] {
  return FORBIDDEN_NAME_PATTERNS;
}

export function getValidNameExamples(): readonly string[] {
  return VALID_NAME_EXAMPLES;
}
