/**
 * L13.5 — Forbidden Certainty Phrase Contract
 *
 * §13.5.10 — Closed set of forbidden-certainty phrase codes and
 * descriptors. The phrasing engine matches against these to detect
 * confidence outrun and to populate the `forbidden_certainty_phrases`
 * array on the uncertainty disclosure profile.
 *
 * Two activation classes exist:
 *   - `forbidden_under_any_condition` — illegal regardless of
 *     ceiling, restriction, or grounding state (the absolute set).
 *   - contextually forbidden — illegal only when the confidence
 *     ceiling is at or below a threshold band, or when specified
 *     uncertainty sources are present.
 */

import { L13ExplanationConfidenceBand } from './confidence-breakdown';
import type { L13ExpressionUncertaintySource } from './uncertainty-disclosure-profile';

export enum L13ForbiddenCertaintyPhraseCode {
  CONFIRMS_BULLISH_CASE = 'CONFIRMS_BULLISH_CASE',
  CONFIRMS_BEARISH_CASE = 'CONFIRMS_BEARISH_CASE',
  ALMOST_CERTAINLY_GOING_UP = 'ALMOST_CERTAINLY_GOING_UP',
  ALMOST_CERTAINLY_GOING_DOWN = 'ALMOST_CERTAINLY_GOING_DOWN',
  SCENARIO_LOCKED_IN = 'SCENARIO_LOCKED_IN',
  PATH_CONFIRMED = 'PATH_CONFIRMED',
  NO_REAL_ALTERNATIVE = 'NO_REAL_ALTERNATIVE',
  CLEAR_BUY_BY_EVIDENCE = 'CLEAR_BUY_BY_EVIDENCE',
  NO_MEANINGFUL_CONTRADICTIONS = 'NO_MEANINGFUL_CONTRADICTIONS',
  DATA_IS_COMPLETE = 'DATA_IS_COMPLETE',
  THIS_WILL_HAPPEN = 'THIS_WILL_HAPPEN',
  WILL_PUMP = 'WILL_PUMP',
  WILL_DUMP = 'WILL_DUMP',
  GUARANTEED = 'GUARANTEED',
  LOCKED_IN = 'LOCKED_IN',
  INEVITABLE = 'INEVITABLE',
  THIS_PROVES = 'THIS_PROVES',
  CANNOT_FAIL = 'CANNOT_FAIL',
  CLEARLY_UNDER_NARROWED_CONFIDENCE = 'CLEARLY_UNDER_NARROWED_CONFIDENCE',
  THE_ANSWER_IS_UNDER_NARROWED_CONFIDENCE = 'THE_ANSWER_IS_UNDER_NARROWED_CONFIDENCE',
  SETUP_IS_CLEAN_UNDER_NARROWED_CONFIDENCE = 'SETUP_IS_CLEAN_UNDER_NARROWED_CONFIDENCE',
  NO_MAJOR_ISSUE_REMAINS_UNDER_NARROWED_CONFIDENCE = 'NO_MAJOR_ISSUE_REMAINS_UNDER_NARROWED_CONFIDENCE',
}

export const ALL_L13_FORBIDDEN_CERTAINTY_PHRASE_CODES:
  readonly L13ForbiddenCertaintyPhraseCode[] =
  Object.values(L13ForbiddenCertaintyPhraseCode);

/**
 * §13.5.10 — Forbidden-certainty phrase descriptor. The phrasing
 * engine compiles the `pattern` (case-insensitive) against the
 * output text.
 */
export interface L13ForbiddenCertaintyPhrase {
  readonly phrase_code: L13ForbiddenCertaintyPhraseCode;
  readonly pattern: RegExp;
  readonly forbidden_under_any_condition: boolean;
  readonly forbidden_when_confidence_ceiling_at_or_below?:
    L13ExplanationConfidenceBand;
  readonly forbidden_when_sources_present?:
    readonly L13ExpressionUncertaintySource[];
}

/**
 * §13.5.10 — Canonical catalogue. Patterns are case-insensitive.
 * Word boundaries are used to avoid false positives on common
 * substrings.
 */
export const L13_FORBIDDEN_CERTAINTY_PHRASE_CATALOGUE:
  readonly L13ForbiddenCertaintyPhrase[] = [
  // Absolute set
  {
    phrase_code:
      L13ForbiddenCertaintyPhraseCode.CONFIRMS_BULLISH_CASE,
    pattern: /\bthis\s+confirms\s+(the\s+)?bullish\b/i,
    forbidden_under_any_condition: true,
  },
  {
    phrase_code:
      L13ForbiddenCertaintyPhraseCode.CONFIRMS_BEARISH_CASE,
    pattern: /\bthis\s+confirms\s+(the\s+)?bearish\b/i,
    forbidden_under_any_condition: true,
  },
  {
    phrase_code:
      L13ForbiddenCertaintyPhraseCode.ALMOST_CERTAINLY_GOING_UP,
    pattern: /\balmost\s+certainly\s+(going\s+up|up)\b/i,
    forbidden_under_any_condition: true,
  },
  {
    phrase_code:
      L13ForbiddenCertaintyPhraseCode.ALMOST_CERTAINLY_GOING_DOWN,
    pattern: /\balmost\s+certainly\s+(going\s+down|down)\b/i,
    forbidden_under_any_condition: true,
  },
  {
    phrase_code: L13ForbiddenCertaintyPhraseCode.SCENARIO_LOCKED_IN,
    pattern: /\bscenario\s+is\s+locked\s+in\b/i,
    forbidden_under_any_condition: true,
  },
  {
    phrase_code: L13ForbiddenCertaintyPhraseCode.PATH_CONFIRMED,
    pattern: /\bpath\s+(is\s+)?confirmed\b/i,
    forbidden_under_any_condition: true,
  },
  {
    phrase_code:
      L13ForbiddenCertaintyPhraseCode.NO_REAL_ALTERNATIVE,
    pattern: /\bno\s+real\s+alternative\b/i,
    forbidden_under_any_condition: true,
  },
  {
    phrase_code:
      L13ForbiddenCertaintyPhraseCode.CLEAR_BUY_BY_EVIDENCE,
    pattern: /\bclear\s+(buy|sell)\s+(by|from)\s+evidence\b/i,
    forbidden_under_any_condition: true,
  },
  {
    phrase_code:
      L13ForbiddenCertaintyPhraseCode.NO_MEANINGFUL_CONTRADICTIONS,
    pattern: /\bno\s+(meaningful|major)\s+contradictions?\b/i,
    forbidden_under_any_condition: true,
  },
  {
    phrase_code: L13ForbiddenCertaintyPhraseCode.DATA_IS_COMPLETE,
    pattern: /\b(data|evidence)\s+is\s+complete\b/i,
    forbidden_under_any_condition: true,
  },
  {
    phrase_code: L13ForbiddenCertaintyPhraseCode.THIS_WILL_HAPPEN,
    pattern: /\bthis\s+will\s+(happen|occur)\b/i,
    forbidden_under_any_condition: true,
  },
  {
    phrase_code: L13ForbiddenCertaintyPhraseCode.WILL_PUMP,
    pattern: /\bwill\s+pump\b/i,
    forbidden_under_any_condition: true,
  },
  {
    phrase_code: L13ForbiddenCertaintyPhraseCode.WILL_DUMP,
    pattern: /\bwill\s+dump\b/i,
    forbidden_under_any_condition: true,
  },
  {
    phrase_code: L13ForbiddenCertaintyPhraseCode.GUARANTEED,
    pattern: /\bguaranteed\b/i,
    forbidden_under_any_condition: true,
  },
  {
    phrase_code: L13ForbiddenCertaintyPhraseCode.LOCKED_IN,
    pattern: /\blocked\s+in\b/i,
    forbidden_under_any_condition: true,
  },
  {
    phrase_code: L13ForbiddenCertaintyPhraseCode.INEVITABLE,
    pattern: /\binevitabl[ye]\b/i,
    forbidden_under_any_condition: true,
  },
  {
    phrase_code: L13ForbiddenCertaintyPhraseCode.THIS_PROVES,
    pattern: /\bthis\s+proves\b/i,
    forbidden_under_any_condition: true,
  },
  {
    phrase_code: L13ForbiddenCertaintyPhraseCode.CANNOT_FAIL,
    pattern: /\bcannot\s+fail\b/i,
    forbidden_under_any_condition: true,
  },

  // Contextually forbidden under narrowed confidence (≤ MEDIUM)
  // The actual ceiling is supplied dynamically; we record the
  // threshold here as a string and the phrasing engine compares.
  {
    phrase_code:
      L13ForbiddenCertaintyPhraseCode.CLEARLY_UNDER_NARROWED_CONFIDENCE,
    pattern: /\bclearly\b/i,
    forbidden_under_any_condition: false,
    forbidden_when_confidence_ceiling_at_or_below: L13ExplanationConfidenceBand.MEDIUM,
  },
  {
    phrase_code:
      L13ForbiddenCertaintyPhraseCode.THE_ANSWER_IS_UNDER_NARROWED_CONFIDENCE,
    pattern: /\bthe\s+answer\s+is\b/i,
    forbidden_under_any_condition: false,
    forbidden_when_confidence_ceiling_at_or_below: L13ExplanationConfidenceBand.MEDIUM,
  },
  {
    phrase_code:
      L13ForbiddenCertaintyPhraseCode.SETUP_IS_CLEAN_UNDER_NARROWED_CONFIDENCE,
    pattern: /\bsetup\s+is\s+clean\b/i,
    forbidden_under_any_condition: false,
    forbidden_when_confidence_ceiling_at_or_below: L13ExplanationConfidenceBand.MEDIUM,
  },
  {
    phrase_code:
      L13ForbiddenCertaintyPhraseCode.NO_MAJOR_ISSUE_REMAINS_UNDER_NARROWED_CONFIDENCE,
    pattern: /\bno\s+major\s+issue\s+remains?\b/i,
    forbidden_under_any_condition: false,
    forbidden_when_confidence_ceiling_at_or_below: L13ExplanationConfidenceBand.MEDIUM,
  },
];

/**
 * Index by phrase code.
 */
export function l13ForbiddenCertaintyPhraseByCode(
  code: L13ForbiddenCertaintyPhraseCode,
): L13ForbiddenCertaintyPhrase {
  const entry = L13_FORBIDDEN_CERTAINTY_PHRASE_CATALOGUE.find(
    p => p.phrase_code === code,
  );
  if (!entry) {
    throw new Error(
      `L13.5: unknown L13ForbiddenCertaintyPhraseCode ${code}`,
    );
  }
  return entry;
}
