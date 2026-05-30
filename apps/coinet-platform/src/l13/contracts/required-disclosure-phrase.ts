/**
 * L13.5 — Required Disclosure Phrase Contract
 *
 * §13.5.9 — Governed phrase family for mandatory disclosures. Each
 * phrase is identified by a stable code, mapped to one or more
 * uncertainty sources (and/or contradiction/restriction conditions),
 * and carries a suggested text that may be paraphrased so long as
 * the disclosed semantic content is preserved.
 *
 * Phrase codes form a disjoint enum; no two codes overlap in
 * semantic intent. The uncertainty-disclosure engine derives the
 * required set from the input package and grounding posture, and
 * the validator checks that every required phrase is satisfied by
 * the output sections.
 */

import type { L13ExpressionUncertaintySource } from './uncertainty-disclosure-profile';
import { L13PhraseStrengthClass } from './phrase-strength';

export enum L13RequiredDisclosurePhraseCode {
  SETUP_NOT_CLEAN = 'SETUP_NOT_CLEAN',
  BASE_CASE_CONFIDENCE_CAPPED = 'BASE_CASE_CONFIDENCE_CAPPED',
  ENGINE_PRESERVES_ALTERNATIVES = 'ENGINE_PRESERVES_ALTERNATIVES',
  CURRENT_PATH_REMAINS_CONDITIONAL = 'CURRENT_PATH_REMAINS_CONDITIONAL',
  ACTIVE_INVALIDATION_LIMITS_CONFIDENCE = 'ACTIVE_INVALIDATION_LIMITS_CONFIDENCE',
  TRIGGERS_REMAIN_UNRESOLVED = 'TRIGGERS_REMAIN_UNRESOLVED',
  CONTRADICTION_REMAINS_ACTIVE = 'CONTRADICTION_REMAINS_ACTIVE',
  MISSING_VISIBILITY_NARROWS_ANSWER = 'MISSING_VISIBILITY_NARROWS_ANSWER',
  DRIFT_LIMITS_SCORE_CONTEXT = 'DRIFT_LIMITS_SCORE_CONTEXT',
  SCENARIO_COMPETITION_REMAINS_OPEN = 'SCENARIO_COMPETITION_REMAINS_OPEN',
  HYPOTHESIS_COMPETITION_REMAINS_OPEN = 'HYPOTHESIS_COMPETITION_REMAINS_OPEN',
  REGIME_TRANSITION_RISK_NARROWS_INTERPRETATION = 'REGIME_TRANSITION_RISK_NARROWS_INTERPRETATION',
  SEQUENCE_AMBIGUITY_NARROWS_INTERPRETATION = 'SEQUENCE_AMBIGUITY_NARROWS_INTERPRETATION',
  CLAIM_LEVEL_GROUNDING_NARROWED = 'CLAIM_LEVEL_GROUNDING_NARROWED',
  CLAIM_LEVEL_UNCERTAIN_ONLY = 'CLAIM_LEVEL_UNCERTAIN_ONLY',
  SCORE_RESTRICTION_LIMITS_USE = 'SCORE_RESTRICTION_LIMITS_USE',
}

export const ALL_L13_REQUIRED_DISCLOSURE_PHRASE_CODES:
  readonly L13RequiredDisclosurePhraseCode[] =
  Object.values(L13RequiredDisclosurePhraseCode);

/**
 * §13.5.9 — Required-disclosure-phrase descriptor. The
 * `suggested_text` field gives an exemplar; the validator accepts
 * paraphrases that mention the keyword anchors.
 */
export interface L13RequiredDisclosurePhrase {
  readonly phrase_code: L13RequiredDisclosurePhraseCode;
  readonly phrase_strength_class: L13PhraseStrengthClass;
  readonly required_when: readonly L13ExpressionUncertaintySource[];
  readonly suggested_text: string;
  readonly may_be_paraphrased: boolean;
  /**
   * Keyword anchors that the validator searches for in the
   * concatenated output text to confirm the disclosure was
   * satisfied. Matched case-insensitively.
   */
  readonly keyword_anchors: readonly string[];
}

/**
 * §13.5.9 — Canonical disclosure-phrase catalogue. The
 * uncertainty-disclosure engine looks up entries by code; the
 * validator checks `keyword_anchors` against output text.
 *
 * NOTE: actual mapping from uncertainty sources to phrase codes
 * is encoded in `uncertainty-disclosure-profile.ts` so that
 * `required_when` here remains illustrative metadata for tooling.
 */
export const L13_REQUIRED_DISCLOSURE_PHRASES:
  readonly L13RequiredDisclosurePhrase[] = [
  {
    phrase_code: L13RequiredDisclosurePhraseCode.SETUP_NOT_CLEAN,
    phrase_strength_class: L13PhraseStrengthClass.CONDITIONAL_MEDIUM,
    required_when: [],
    suggested_text: 'The setup is not clean.',
    may_be_paraphrased: true,
    keyword_anchors: ['not clean', 'setup is not'],
  },
  {
    phrase_code:
      L13RequiredDisclosurePhraseCode.BASE_CASE_CONFIDENCE_CAPPED,
    phrase_strength_class: L13PhraseStrengthClass.CONDITIONAL_MEDIUM,
    required_when: [],
    suggested_text: 'The base case is confidence-capped.',
    may_be_paraphrased: true,
    keyword_anchors: ['confidence-capped', 'confidence cap'],
  },
  {
    phrase_code:
      L13RequiredDisclosurePhraseCode.ENGINE_PRESERVES_ALTERNATIVES,
    phrase_strength_class: L13PhraseStrengthClass.EXPLANATORY_MEDIUM,
    required_when: [],
    suggested_text: 'The engine preserves alternatives.',
    may_be_paraphrased: true,
    keyword_anchors: ['preserves alternatives', 'alternatives remain'],
  },
  {
    phrase_code:
      L13RequiredDisclosurePhraseCode.CURRENT_PATH_REMAINS_CONDITIONAL,
    phrase_strength_class: L13PhraseStrengthClass.CONDITIONAL_MEDIUM,
    required_when: [],
    suggested_text: 'The current path remains conditional.',
    may_be_paraphrased: true,
    keyword_anchors: ['remains conditional', 'still conditional'],
  },
  {
    phrase_code:
      L13RequiredDisclosurePhraseCode.ACTIVE_INVALIDATION_LIMITS_CONFIDENCE,
    phrase_strength_class: L13PhraseStrengthClass.CONDITIONAL_MEDIUM,
    required_when: [],
    suggested_text:
      'Active invalidation pressure still limits confidence.',
    may_be_paraphrased: true,
    keyword_anchors: ['active invalidation', 'invalidation pressure', 'invalidation signals'],
  },
  {
    phrase_code:
      L13RequiredDisclosurePhraseCode.TRIGGERS_REMAIN_UNRESOLVED,
    phrase_strength_class: L13PhraseStrengthClass.CONDITIONAL_MEDIUM,
    required_when: [],
    suggested_text: 'The path still depends on trigger confirmation.',
    may_be_paraphrased: true,
    keyword_anchors: ['unresolved', 'trigger confirmation', 'triggers remain'],
  },
  {
    phrase_code:
      L13RequiredDisclosurePhraseCode.CONTRADICTION_REMAINS_ACTIVE,
    phrase_strength_class: L13PhraseStrengthClass.CONDITIONAL_MEDIUM,
    required_when: [],
    suggested_text:
      'Contradiction remains active and narrows the interpretation.',
    may_be_paraphrased: true,
    keyword_anchors: ['contradiction remains', 'contradiction is active', 'narrows the interpretation'],
  },
  {
    phrase_code:
      L13RequiredDisclosurePhraseCode.MISSING_VISIBILITY_NARROWS_ANSWER,
    phrase_strength_class: L13PhraseStrengthClass.CONDITIONAL_MEDIUM,
    required_when: [],
    suggested_text:
      'Missing visibility limits how strongly the engine can lean on this explanation.',
    may_be_paraphrased: true,
    keyword_anchors: ['missing visibility', 'missing data', 'narrows the answer', 'limits how strongly'],
  },
  {
    phrase_code:
      L13RequiredDisclosurePhraseCode.DRIFT_LIMITS_SCORE_CONTEXT,
    phrase_strength_class: L13PhraseStrengthClass.CONDITIONAL_MEDIUM,
    required_when: [],
    suggested_text:
      'Drift in the relevant score or threshold context narrows confidence.',
    may_be_paraphrased: true,
    keyword_anchors: ['drift', 'threshold context'],
  },
  {
    phrase_code:
      L13RequiredDisclosurePhraseCode.SCENARIO_COMPETITION_REMAINS_OPEN,
    phrase_strength_class: L13PhraseStrengthClass.CONDITIONAL_MEDIUM,
    required_when: [],
    suggested_text:
      'Scenario competition remains open; the engine has not converged.',
    may_be_paraphrased: true,
    keyword_anchors: ['scenario competition', 'narrow scenario', 'scenarios remain open'],
  },
  {
    phrase_code:
      L13RequiredDisclosurePhraseCode.HYPOTHESIS_COMPETITION_REMAINS_OPEN,
    phrase_strength_class: L13PhraseStrengthClass.CONDITIONAL_MEDIUM,
    required_when: [],
    suggested_text:
      'Hypothesis competition remains open; explanations have not collapsed.',
    may_be_paraphrased: true,
    keyword_anchors: ['hypothesis competition', 'narrow hypothesis', 'competing hypotheses', 'explanations have not collapsed'],
  },
  {
    phrase_code:
      L13RequiredDisclosurePhraseCode.REGIME_TRANSITION_RISK_NARROWS_INTERPRETATION,
    phrase_strength_class: L13PhraseStrengthClass.CONDITIONAL_MEDIUM,
    required_when: [],
    suggested_text:
      'Regime transition risk narrows the current interpretation.',
    may_be_paraphrased: true,
    keyword_anchors: ['transition risk', 'regime transition'],
  },
  {
    phrase_code:
      L13RequiredDisclosurePhraseCode.SEQUENCE_AMBIGUITY_NARROWS_INTERPRETATION,
    phrase_strength_class: L13PhraseStrengthClass.CONDITIONAL_MEDIUM,
    required_when: [],
    suggested_text:
      'Sequence ambiguity narrows the current interpretation.',
    may_be_paraphrased: true,
    keyword_anchors: ['sequence ambiguity', 'sequence is ambiguous'],
  },
  {
    phrase_code:
      L13RequiredDisclosurePhraseCode.CLAIM_LEVEL_GROUNDING_NARROWED,
    phrase_strength_class: L13PhraseStrengthClass.CONDITIONAL_LOW,
    required_when: [],
    suggested_text:
      'Claim-level grounding is narrowed; portions of the answer rest on weaker support.',
    may_be_paraphrased: true,
    keyword_anchors: ['grounding narrowed', 'weaker support', 'narrowed grounding'],
  },
  {
    phrase_code:
      L13RequiredDisclosurePhraseCode.CLAIM_LEVEL_UNCERTAIN_ONLY,
    phrase_strength_class: L13PhraseStrengthClass.UNCERTAIN_ONLY,
    required_when: [],
    suggested_text:
      'Certain claims may only be expressed as uncertain; do not read them as confirmed.',
    may_be_paraphrased: true,
    keyword_anchors: ['expressed as uncertain', 'do not read as confirmed', 'uncertain only'],
  },
  {
    phrase_code:
      L13RequiredDisclosurePhraseCode.SCORE_RESTRICTION_LIMITS_USE,
    phrase_strength_class: L13PhraseStrengthClass.CONDITIONAL_MEDIUM,
    required_when: [],
    suggested_text:
      'Score restrictions limit how this explanation may be used.',
    may_be_paraphrased: true,
    keyword_anchors: ['score restrictions', 'score restriction', 'limit how this explanation', 'restriction limits use'],
  },
];

/**
 * Index by phrase code. Used by engines and validators.
 */
export function l13RequiredDisclosurePhraseByCode(
  code: L13RequiredDisclosurePhraseCode,
): L13RequiredDisclosurePhrase {
  const entry = L13_REQUIRED_DISCLOSURE_PHRASES.find(
    p => p.phrase_code === code,
  );
  if (!entry) {
    throw new Error(
      `L13.5: unknown L13RequiredDisclosurePhraseCode ${code}`,
    );
  }
  return entry;
}
