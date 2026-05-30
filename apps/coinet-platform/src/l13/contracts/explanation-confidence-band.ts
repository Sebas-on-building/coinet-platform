/**
 * L13.5 — Explanation Confidence Band Helpers
 *
 * §13.5.5 — The canonical `L13ExplanationConfidenceBand` enum is
 * owned by L13.2 (`./confidence-breakdown`). L13.5 binds to that
 * frozen enum and adds the narrowing/strengthening helpers needed
 * by the confidence-ceiling engine and the phrasing engine.
 *
 * §13.5.21 — L13.5 may only narrow the inherited band. The
 * helpers exposed here enforce that semantically by selecting the
 * weaker of two bands (`l13NarrowConfidenceBand`).
 */

import {
  L13ExplanationConfidenceBand,
  rankL13ExplanationConfidenceBand,
} from './confidence-breakdown';

/**
 * Choose the more restrictive (weaker) of two bands. Used by the
 * confidence-ceiling engine to apply each narrowing factor in turn.
 *
 * Tie-breaks favor the first argument so the function is
 * deterministic.
 */
export function l13NarrowConfidenceBand(
  a: L13ExplanationConfidenceBand,
  b: L13ExplanationConfidenceBand,
): L13ExplanationConfidenceBand {
  return rankL13ExplanationConfidenceBand(a) <=
    rankL13ExplanationConfidenceBand(b)
    ? a
    : b;
}

/**
 * True when `candidate` would raise confidence above `inherited`.
 * The confidence-ceiling engine and validator use this to enforce
 * the never-raise rule.
 */
export function l13WouldRaiseConfidence(
  inherited: L13ExplanationConfidenceBand,
  candidate: L13ExplanationConfidenceBand,
): boolean {
  return (
    rankL13ExplanationConfidenceBand(candidate) >
    rankL13ExplanationConfidenceBand(inherited)
  );
}

/**
 * True when `candidate` is at or below `threshold` in band rank.
 * Used by the contextually-forbidden-phrase rules
 * (`forbidden_when_confidence_ceiling_at_or_below`).
 */
export function l13ConfidenceBandAtOrBelow(
  candidate: L13ExplanationConfidenceBand,
  threshold: L13ExplanationConfidenceBand,
): boolean {
  return (
    rankL13ExplanationConfidenceBand(candidate) <=
    rankL13ExplanationConfidenceBand(threshold)
  );
}

/**
 * §13.5.5 — Confidence band semantics for the expression layer.
 * Strictly informational; phrase-strength permission is governed
 * by the phrase-strength taxonomy and the confidence-ceiling map.
 */
export const L13_EXPLANATION_CONFIDENCE_BAND_DESCRIPTIONS:
  Readonly<Record<L13ExplanationConfidenceBand, string>> = {
  [L13ExplanationConfidenceBand.BLOCKED]:
    'no substantive interpretation legal; refusal or unavailable-context only',
  [L13ExplanationConfidenceBand.VERY_LOW]:
    'insufficient for clean explanation; engine may not lean strongly',
  [L13ExplanationConfidenceBand.LOW]:
    'tentative; weakly supported; requires confirmation',
  [L13ExplanationConfidenceBand.MEDIUM]:
    'currently supported but not clean; engine preserves alternatives',
  [L13ExplanationConfidenceBand.HIGH]:
    'well supported; materially stronger interpretation',
  [L13ExplanationConfidenceBand.VERY_HIGH]:
    'strongly supported; engine clearly indicates; never implies future certainty',
};
