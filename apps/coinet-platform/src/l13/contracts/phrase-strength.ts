/**
 * L13.5 — Phrase Strength Taxonomy Contract
 *
 * §13.5.8 — Closed set of phrase-strength classes. The phrasing
 * engine classifies every emitted segment (headline, summary,
 * observation, inference, scenario, contradiction, uncertainty,
 * trigger/invalidation) into exactly one class and compares against
 * the inherited confidence ceiling.
 *
 * §13.5.10 — `FORBIDDEN_CERTAINTY` is illegal under all conditions.
 * Other classes are admissible if and only if the inherited
 * confidence ceiling, restriction posture, and disclosure state
 * permit them.
 */

export enum L13PhraseStrengthClass {
  REFUSAL_ONLY = 'REFUSAL_ONLY',
  UNCERTAIN_ONLY = 'UNCERTAIN_ONLY',
  CONDITIONAL_LOW = 'CONDITIONAL_LOW',
  CONDITIONAL_MEDIUM = 'CONDITIONAL_MEDIUM',
  EXPLANATORY_MEDIUM = 'EXPLANATORY_MEDIUM',
  EXPLANATORY_HIGH = 'EXPLANATORY_HIGH',
  ASSERTIVE_HIGH = 'ASSERTIVE_HIGH',
  FORBIDDEN_CERTAINTY = 'FORBIDDEN_CERTAINTY',
}

export const ALL_L13_PHRASE_STRENGTH_CLASSES:
  readonly L13PhraseStrengthClass[] =
  Object.values(L13PhraseStrengthClass);

/**
 * §13.5.8 — Deterministic ordering. REFUSAL_ONLY is the weakest
 * legal class; ASSERTIVE_HIGH is the strongest legal class.
 * FORBIDDEN_CERTAINTY is never legal — it is ranked above
 * ASSERTIVE_HIGH so that any ceiling comparison rejects it.
 */
export const L13_PHRASE_STRENGTH_RANK:
  Readonly<Record<L13PhraseStrengthClass, number>> = {
  [L13PhraseStrengthClass.REFUSAL_ONLY]: 0,
  [L13PhraseStrengthClass.UNCERTAIN_ONLY]: 1,
  [L13PhraseStrengthClass.CONDITIONAL_LOW]: 2,
  [L13PhraseStrengthClass.CONDITIONAL_MEDIUM]: 3,
  [L13PhraseStrengthClass.EXPLANATORY_MEDIUM]: 4,
  [L13PhraseStrengthClass.EXPLANATORY_HIGH]: 5,
  [L13PhraseStrengthClass.ASSERTIVE_HIGH]: 6,
  [L13PhraseStrengthClass.FORBIDDEN_CERTAINTY]: 99,
};

export function l13RankPhraseStrength(
  cls: L13PhraseStrengthClass,
): number {
  return L13_PHRASE_STRENGTH_RANK[cls];
}

/**
 * §13.5.8 — Phrases that anchor each phrase-strength class. The
 * phrasing engine matches against these patterns to classify
 * emitted text. Patterns are case-insensitive.
 *
 * Each entry is a literal phrase fragment. Word-boundary handling
 * is performed by the classifier.
 */
export interface L13PhraseStrengthAnchor {
  readonly phrase_strength_class: L13PhraseStrengthClass;
  readonly phrase: string;
}

export const L13_PHRASE_STRENGTH_ANCHORS:
  readonly L13PhraseStrengthAnchor[] = [
  // REFUSAL_ONLY
  { phrase_strength_class: L13PhraseStrengthClass.REFUSAL_ONLY, phrase: 'cannot answer' },
  { phrase_strength_class: L13PhraseStrengthClass.REFUSAL_ONLY, phrase: 'unable to explain' },
  { phrase_strength_class: L13PhraseStrengthClass.REFUSAL_ONLY, phrase: 'insufficient governed context' },

  // UNCERTAIN_ONLY
  { phrase_strength_class: L13PhraseStrengthClass.UNCERTAIN_ONLY, phrase: 'cannot cleanly support' },
  { phrase_strength_class: L13PhraseStrengthClass.UNCERTAIN_ONLY, phrase: 'evidence remains incomplete' },
  { phrase_strength_class: L13PhraseStrengthClass.UNCERTAIN_ONLY, phrase: 'remains unresolved' },
  { phrase_strength_class: L13PhraseStrengthClass.UNCERTAIN_ONLY, phrase: 'cannot lean strongly' },

  // CONDITIONAL_LOW
  { phrase_strength_class: L13PhraseStrengthClass.CONDITIONAL_LOW, phrase: 'tentative' },
  { phrase_strength_class: L13PhraseStrengthClass.CONDITIONAL_LOW, phrase: 'weakly supported' },
  { phrase_strength_class: L13PhraseStrengthClass.CONDITIONAL_LOW, phrase: 'not yet clean' },
  { phrase_strength_class: L13PhraseStrengthClass.CONDITIONAL_LOW, phrase: 'requires confirmation' },
  { phrase_strength_class: L13PhraseStrengthClass.CONDITIONAL_LOW, phrase: 'path is possible' },

  // CONDITIONAL_MEDIUM
  { phrase_strength_class: L13PhraseStrengthClass.CONDITIONAL_MEDIUM, phrase: 'remains conditional' },
  { phrase_strength_class: L13PhraseStrengthClass.CONDITIONAL_MEDIUM, phrase: 'gains support if' },
  { phrase_strength_class: L13PhraseStrengthClass.CONDITIONAL_MEDIUM, phrase: 'confidence-capped' },
  { phrase_strength_class: L13PhraseStrengthClass.CONDITIONAL_MEDIUM, phrase: 'confidence remains limited' },
  { phrase_strength_class: L13PhraseStrengthClass.CONDITIONAL_MEDIUM, phrase: 'setup is not clean' },

  // EXPLANATORY_MEDIUM
  { phrase_strength_class: L13PhraseStrengthClass.EXPLANATORY_MEDIUM, phrase: 'currently favors' },
  { phrase_strength_class: L13PhraseStrengthClass.EXPLANATORY_MEDIUM, phrase: 'preserves alternatives' },
  { phrase_strength_class: L13PhraseStrengthClass.EXPLANATORY_MEDIUM, phrase: 'currently supported' },
  { phrase_strength_class: L13PhraseStrengthClass.EXPLANATORY_MEDIUM, phrase: 'engine currently sees' },

  // EXPLANATORY_HIGH
  { phrase_strength_class: L13PhraseStrengthClass.EXPLANATORY_HIGH, phrase: 'well supported' },
  { phrase_strength_class: L13PhraseStrengthClass.EXPLANATORY_HIGH, phrase: 'materially stronger' },
  { phrase_strength_class: L13PhraseStrengthClass.EXPLANATORY_HIGH, phrase: 'best-supported path' },
  { phrase_strength_class: L13PhraseStrengthClass.EXPLANATORY_HIGH, phrase: 'strongly supported' },
  { phrase_strength_class: L13PhraseStrengthClass.EXPLANATORY_HIGH, phrase: 'engine clearly indicates' },

  // ASSERTIVE_HIGH — present-tense engine state only
  { phrase_strength_class: L13PhraseStrengthClass.ASSERTIVE_HIGH, phrase: 'engine clearly identifies' },
  { phrase_strength_class: L13PhraseStrengthClass.ASSERTIVE_HIGH, phrase: 'the current base case' },
  { phrase_strength_class: L13PhraseStrengthClass.ASSERTIVE_HIGH, phrase: 'materially clearer' },

  // FORBIDDEN_CERTAINTY — always illegal
  { phrase_strength_class: L13PhraseStrengthClass.FORBIDDEN_CERTAINTY, phrase: 'will happen' },
  { phrase_strength_class: L13PhraseStrengthClass.FORBIDDEN_CERTAINTY, phrase: 'will go up' },
  { phrase_strength_class: L13PhraseStrengthClass.FORBIDDEN_CERTAINTY, phrase: 'will go down' },
  { phrase_strength_class: L13PhraseStrengthClass.FORBIDDEN_CERTAINTY, phrase: 'will pump' },
  { phrase_strength_class: L13PhraseStrengthClass.FORBIDDEN_CERTAINTY, phrase: 'will dump' },
  { phrase_strength_class: L13PhraseStrengthClass.FORBIDDEN_CERTAINTY, phrase: 'guaranteed' },
  { phrase_strength_class: L13PhraseStrengthClass.FORBIDDEN_CERTAINTY, phrase: 'locked in' },
  { phrase_strength_class: L13PhraseStrengthClass.FORBIDDEN_CERTAINTY, phrase: 'inevitable' },
  { phrase_strength_class: L13PhraseStrengthClass.FORBIDDEN_CERTAINTY, phrase: 'almost certainly' },
  { phrase_strength_class: L13PhraseStrengthClass.FORBIDDEN_CERTAINTY, phrase: 'no doubt' },
  { phrase_strength_class: L13PhraseStrengthClass.FORBIDDEN_CERTAINTY, phrase: 'this confirms' },
  { phrase_strength_class: L13PhraseStrengthClass.FORBIDDEN_CERTAINTY, phrase: 'this proves' },
  { phrase_strength_class: L13PhraseStrengthClass.FORBIDDEN_CERTAINTY, phrase: 'cannot fail' },
  { phrase_strength_class: L13PhraseStrengthClass.FORBIDDEN_CERTAINTY, phrase: 'must happen' },
  { phrase_strength_class: L13PhraseStrengthClass.FORBIDDEN_CERTAINTY, phrase: 'scenario is locked' },
  { phrase_strength_class: L13PhraseStrengthClass.FORBIDDEN_CERTAINTY, phrase: 'path confirmed' },
];

/**
 * Always-forbidden anchor phrases — extracted from the
 * FORBIDDEN_CERTAINTY entries above for use by the no-emit gate.
 */
export const L13_ALWAYS_FORBIDDEN_PHRASES: readonly string[] =
  L13_PHRASE_STRENGTH_ANCHORS
    .filter(
      a => a.phrase_strength_class === L13PhraseStrengthClass.FORBIDDEN_CERTAINTY,
    )
    .map(a => a.phrase);

/**
 * §13.5.21.6 — Contextually forbidden phrases. These are
 * grammatically legal but illegal when the inherited confidence
 * ceiling is at or below MEDIUM. The phrasing engine uses this
 * list to detect overconfident clean-language under narrowed
 * confidence.
 */
export const L13_CONTEXTUALLY_OVERCONFIDENT_PHRASES:
  readonly string[] = [
  'clearly',
  'strongly confirms',
  'the answer is',
  'the setup is clean',
  'no major issue remains',
  'no real alternative',
  'everything lines up',
  'no major contradictions',
];
