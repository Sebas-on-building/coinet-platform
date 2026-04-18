/**
 * L6.1 — Boundary Contract
 *
 * §6.1.3 — What Layer 6 is NOT. Negative-definition doctrine.
 * §6.1.3.4 — Forbidden output inflation rule.
 */

export const L6_IS_NOT = [
  'a dashboard layer',
  'a reporting layer',
  'a scoring layer',
  'a scenario layer',
  'a judgment layer',
  'a recommendation layer',
] as const;

export const L6_DOES_NOT_ANSWER = [
  'what to do',
  'what narrative is right',
  'whether an asset is attractive',
  'whether a thesis is confirmed',
  'whether a move is actionable',
  'whether a market state is bullish or bearish in final judgment terms',
] as const;

const FORBIDDEN_NAME_PATTERNS: readonly RegExp[] = [
  /buy[_\s]?signal/i,
  /sell[_\s]?signal/i,
  /bullish[_\s]?confirm/i,
  /bearish[_\s]?confirm/i,
  /strong[_\s]?thesis/i,
  /avoid[_\s]?score/i,
  /conviction[_\s]?trade/i,
  /trade[_\s]?signal/i,
  /recommendation/i,
  /action[_\s]?signal/i,
  /opportunity[_\s]?rank/i,
  /best[_\s]?asset/i,
];

const VALID_NAME_EXAMPLES: readonly string[] = [
  'funding_z_score',
  'whale_accumulation_cluster',
  'liquidation_burst',
  'revenue_quality_score',
  'narrative_price_divergence',
  'volume_anomaly_ratio',
  'correlation_shift_magnitude',
];

export function containsForbiddenNaming(name: string): boolean {
  return FORBIDDEN_NAME_PATTERNS.some(p => p.test(name));
}

export function isValidPrimitiveName(name: string): boolean {
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
