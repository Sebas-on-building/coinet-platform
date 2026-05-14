/**
 * L13.3 — Confidence Disclosure Contract
 *
 * §13.3.6 — Every AI output carries a confidence disclosure derived
 * from the L13.2 confidence breakdown. Confident language may not be
 * used while caps or narrowing reasons apply, and confidence may
 * never be expressed as a probability.
 */

import type { L13ExplanationConfidenceBand } from './confidence-breakdown';

/**
 * §13.3.6 — Forbidden confidence phrases. These overlap with
 * `L13_FORBIDDEN_CERTAINTY_PHRASES` from L13.2 but include
 * percentage-style "probability theater" patterns specific to L13.3
 * (e.g. "70% chance", "with 75% confidence").
 */
export const L13_FORBIDDEN_CONFIDENCE_PHRASES: readonly string[] = [
  'guaranteed',
  'inevitable',
  'inevitably',
  'no doubt',
  'cannot fail',
  'locked in',
  'definitely',
  'certainly',
  'surely',
  'with certainty',
];

/**
 * §13.3.6 — Forbidden probability-style phrasings ("X% chance",
 * "Y% probability"). Detected via regex by the validators.
 */
export const L13_FORBIDDEN_PROBABILITY_PATTERNS: readonly RegExp[] = [
  /\b\d{1,3}\s*%\s*(chance|probability|likely|likelihood|odds)\b/i,
  /\b\d{1,3}\s*%\s*(confidence|sure|certain)\b/i,
  /\b(probability\s+of|odds\s+of)\s+\d/i,
  /\bone\s+in\s+\d+\s+(chance|odds)\b/i,
];

export interface L13ConfidenceDisclosure {
  readonly confidence_disclosure_id: string;

  readonly explanation_confidence_band: L13ExplanationConfidenceBand;

  readonly confidence_basis_refs: readonly string[];

  readonly confidence_cap_refs: readonly string[];
  readonly confidence_narrowing_reasons: readonly string[];

  readonly may_use_confident_language: boolean;
  readonly must_use_uncertainty_language: boolean;

  readonly forbidden_confidence_phrases: readonly string[];

  readonly confidence_statement: string;

  readonly evidence_refs: readonly string[];
  readonly lineage_refs: readonly string[];

  readonly policy_version: string;
}

/**
 * Returns the first forbidden probability pattern that matches the
 * given text, or `null`.
 */
export function detectL13ProbabilityTheater(
  text: string,
): RegExpMatchArray | null {
  for (const p of L13_FORBIDDEN_PROBABILITY_PATTERNS) {
    const m = text.match(p);
    if (m) return m;
  }
  return null;
}

export function containsL13ForbiddenConfidencePhrase(
  text: string,
): boolean {
  const lower = text.toLowerCase();
  return L13_FORBIDDEN_CONFIDENCE_PHRASES.some(p =>
    lower.includes(p.toLowerCase()),
  );
}
