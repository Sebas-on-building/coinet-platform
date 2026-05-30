/**
 * L13.5 — Restriction Composition Contract
 *
 * §13.5.13 — Composes restrictions from L7–L12, L13.2, and L13.4
 * into final phrasing rights. Most restrictive wins; lower
 * restrictions may never reopen blocked uses.
 *
 *   BLOCKED > EVIDENCE_ONLY > NARROWED > DISCLOSURE_ONLY > NONE
 *
 * The output object carries:
 *   - composed restriction level
 *   - the dominant restriction source
 *   - allowed/blocked output uses
 *   - allowed/blocked phrase-strength classes
 *   - boolean flags for the major answer-mode categories
 *   - required restriction phrases and refs
 *   - whether output is allowed at all
 */

import type { L13PhraseStrengthClass } from './phrase-strength';

/**
 * §13.5.13.3 — Restriction level taxonomy.
 */
export enum L13RestrictionLevel {
  NONE = 'NONE',
  DISCLOSURE_ONLY = 'DISCLOSURE_ONLY',
  NARROWED = 'NARROWED',
  EVIDENCE_ONLY = 'EVIDENCE_ONLY',
  BLOCKED = 'BLOCKED',
}

export const ALL_L13_RESTRICTION_LEVELS:
  readonly L13RestrictionLevel[] =
  Object.values(L13RestrictionLevel);

/**
 * §13.5.13.4 — Most-restrictive-wins ranking. Higher rank wins.
 */
export const L13_RESTRICTION_LEVEL_RANK:
  Readonly<Record<L13RestrictionLevel, number>> = {
  [L13RestrictionLevel.NONE]: 0,
  [L13RestrictionLevel.DISCLOSURE_ONLY]: 1,
  [L13RestrictionLevel.NARROWED]: 2,
  [L13RestrictionLevel.EVIDENCE_ONLY]: 3,
  [L13RestrictionLevel.BLOCKED]: 4,
};

export function l13RankRestrictionLevel(
  lvl: L13RestrictionLevel,
): number {
  return L13_RESTRICTION_LEVEL_RANK[lvl];
}

export function l13StrengthenRestrictionLevel(
  a: L13RestrictionLevel,
  b: L13RestrictionLevel,
): L13RestrictionLevel {
  return l13RankRestrictionLevel(a) >= l13RankRestrictionLevel(b)
    ? a
    : b;
}

/**
 * §13.5.13.3 — Restriction source classes. Every composed
 * restriction names the lower-layer source that produced it; the
 * dominant source is the one that contributed the strongest level.
 */
export enum L13RestrictionSourceClass {
  L7_VALIDATION = 'L7_VALIDATION',
  L8_REGIME = 'L8_REGIME',
  L9_SEQUENCE = 'L9_SEQUENCE',
  L10_HYPOTHESIS = 'L10_HYPOTHESIS',
  L11_SCORE = 'L11_SCORE',
  L12_SCENARIO = 'L12_SCENARIO',
  L13_INPUT_PACKAGE = 'L13_INPUT_PACKAGE',
  L13_GROUNDING = 'L13_GROUNDING',
}

export const ALL_L13_RESTRICTION_SOURCE_CLASSES:
  readonly L13RestrictionSourceClass[] =
  Object.values(L13RestrictionSourceClass);

/**
 * §13.5.13.3 — Allowed output uses. Each entry is a coarse-grained
 * answer-mode category. The composition engine emits the set
 * permitted under the composed restriction level.
 */
export enum L13AllowedOutputUse {
  EXPLAIN_STATE = 'EXPLAIN_STATE',
  EXPLAIN_SCENARIO = 'EXPLAIN_SCENARIO',
  EXPLAIN_SCORE = 'EXPLAIN_SCORE',
  EXPLAIN_HYPOTHESIS = 'EXPLAIN_HYPOTHESIS',
  EXPLAIN_REGIME = 'EXPLAIN_REGIME',
  EXPLAIN_SEQUENCE = 'EXPLAIN_SEQUENCE',
  EXPLAIN_CONTRADICTION = 'EXPLAIN_CONTRADICTION',
  EXPLAIN_UNCERTAINTY = 'EXPLAIN_UNCERTAINTY',
  COMPARE_ASSETS = 'COMPARE_ASSETS',
  COMPARE_THESES = 'COMPARE_THESES',
  WRITE_ALERT = 'WRITE_ALERT',
  WRITE_REPORT = 'WRITE_REPORT',
  ANSWER_WHAT_NEXT = 'ANSWER_WHAT_NEXT',
  STATE_BASE_CASE = 'STATE_BASE_CASE',
  STATE_DIRECTIONAL_BIAS = 'STATE_DIRECTIONAL_BIAS',
}

export const ALL_L13_ALLOWED_OUTPUT_USES:
  readonly L13AllowedOutputUse[] =
  Object.values(L13AllowedOutputUse);

/**
 * §13.5.13.3 — Blocked output uses. Disjoint from
 * `L13AllowedOutputUse`; these are coarse-grained categories that
 * a restriction may explicitly block.
 */
export enum L13BlockedOutputUse {
  DIRECTIONAL_CERTAINTY = 'DIRECTIONAL_CERTAINTY',
  SCENARIO_AS_WINNER = 'SCENARIO_AS_WINNER',
  SCORE_AS_RECOMMENDATION = 'SCORE_AS_RECOMMENDATION',
  HYPOTHESIS_AS_FINAL_TRUTH = 'HYPOTHESIS_AS_FINAL_TRUTH',
  PREDICTION = 'PREDICTION',
  TRADE_INSTRUCTION = 'TRADE_INSTRUCTION',
  POSITION_SIZING = 'POSITION_SIZING',
  LEVERAGE_GUIDANCE = 'LEVERAGE_GUIDANCE',
  FINAL_JUDGMENT = 'FINAL_JUDGMENT',
  CERTAINTY_CLAIM = 'CERTAINTY_CLAIM',
  CLEAN_SCENARIO_PATH = 'CLEAN_SCENARIO_PATH',
  CONFIDENCE_OVERRIDE = 'CONFIDENCE_OVERRIDE',
}

export const ALL_L13_BLOCKED_OUTPUT_USES:
  readonly L13BlockedOutputUse[] =
  Object.values(L13BlockedOutputUse);

/**
 * §13.5.13.4 — Always-blocked uses. May never be flipped on,
 * regardless of how permissive lower-layer restrictions appear.
 */
export const L13_ALWAYS_BLOCKED_OUTPUT_USES:
  readonly L13BlockedOutputUse[] = [
  L13BlockedOutputUse.DIRECTIONAL_CERTAINTY,
  L13BlockedOutputUse.PREDICTION,
  L13BlockedOutputUse.TRADE_INSTRUCTION,
  L13BlockedOutputUse.POSITION_SIZING,
  L13BlockedOutputUse.LEVERAGE_GUIDANCE,
  L13BlockedOutputUse.FINAL_JUDGMENT,
  L13BlockedOutputUse.CERTAINTY_CLAIM,
  L13BlockedOutputUse.CONFIDENCE_OVERRIDE,
];

/**
 * §13.5.14 — Required restriction phrase codes. The phrase set is
 * separate from the uncertainty-disclosure phrases because
 * restrictions narrow USE, not just confidence.
 */
export enum L13RequiredRestrictionPhraseCode {
  OUTPUT_LIMITED_BY_RESTRICTION = 'OUTPUT_LIMITED_BY_RESTRICTION',
  SCORE_CONTEXT_SUPPORTS_EXPLANATION_ONLY = 'SCORE_CONTEXT_SUPPORTS_EXPLANATION_ONLY',
  SCENARIO_PATH_IS_CONDITIONAL_NOT_PREDICTIVE = 'SCENARIO_PATH_IS_CONDITIONAL_NOT_PREDICTIVE',
  EVIDENCE_SUPPORTS_MONITORING_NOT_ACTION = 'EVIDENCE_SUPPORTS_MONITORING_NOT_ACTION',
  INSUFFICIENT_CONTEXT_FOR_STRONGER_CLAIM = 'INSUFFICIENT_CONTEXT_FOR_STRONGER_CLAIM',
  DIRECTIONAL_LANGUAGE_NOT_PERMITTED = 'DIRECTIONAL_LANGUAGE_NOT_PERMITTED',
}

export const ALL_L13_REQUIRED_RESTRICTION_PHRASE_CODES:
  readonly L13RequiredRestrictionPhraseCode[] =
  Object.values(L13RequiredRestrictionPhraseCode);

/**
 * §13.5.14 — Required restriction phrase descriptor.
 */
export interface L13RequiredRestrictionPhrase {
  readonly phrase_code: L13RequiredRestrictionPhraseCode;
  readonly required_when_restriction_level:
    readonly L13RestrictionLevel[];
  readonly suggested_text: string;
  readonly may_be_paraphrased: boolean;
  readonly keyword_anchors: readonly string[];
}

export const L13_REQUIRED_RESTRICTION_PHRASES:
  readonly L13RequiredRestrictionPhrase[] = [
  {
    phrase_code:
      L13RequiredRestrictionPhraseCode.OUTPUT_LIMITED_BY_RESTRICTION,
    required_when_restriction_level: [
      L13RestrictionLevel.NARROWED,
      L13RestrictionLevel.EVIDENCE_ONLY,
      L13RestrictionLevel.BLOCKED,
    ],
    suggested_text:
      'This output is limited by an active lower-layer restriction.',
    may_be_paraphrased: true,
    keyword_anchors: ['limited by', 'restriction', 'restricted'],
  },
  {
    phrase_code:
      L13RequiredRestrictionPhraseCode.SCORE_CONTEXT_SUPPORTS_EXPLANATION_ONLY,
    required_when_restriction_level: [
      L13RestrictionLevel.EVIDENCE_ONLY,
      L13RestrictionLevel.NARROWED,
    ],
    suggested_text:
      'Score context supports explanation only and not recommendation.',
    may_be_paraphrased: true,
    keyword_anchors: ['explanation only', 'not recommendation', 'score restriction'],
  },
  {
    phrase_code:
      L13RequiredRestrictionPhraseCode.SCENARIO_PATH_IS_CONDITIONAL_NOT_PREDICTIVE,
    required_when_restriction_level: [
      L13RestrictionLevel.NARROWED,
      L13RestrictionLevel.EVIDENCE_ONLY,
    ],
    suggested_text:
      'The scenario path is conditional and not predictive.',
    may_be_paraphrased: true,
    keyword_anchors: ['conditional and not predictive', 'conditional path', 'not predictive'],
  },
  {
    phrase_code:
      L13RequiredRestrictionPhraseCode.EVIDENCE_SUPPORTS_MONITORING_NOT_ACTION,
    required_when_restriction_level: [
      L13RestrictionLevel.EVIDENCE_ONLY,
    ],
    suggested_text:
      'Evidence supports monitoring, not action.',
    may_be_paraphrased: true,
    keyword_anchors: ['supports monitoring', 'not action', 'monitor only'],
  },
  {
    phrase_code:
      L13RequiredRestrictionPhraseCode.INSUFFICIENT_CONTEXT_FOR_STRONGER_CLAIM,
    required_when_restriction_level: [
      L13RestrictionLevel.NARROWED,
      L13RestrictionLevel.EVIDENCE_ONLY,
    ],
    suggested_text:
      'Insufficient context to support a stronger claim.',
    may_be_paraphrased: true,
    keyword_anchors: ['insufficient context', 'stronger claim'],
  },
  {
    phrase_code:
      L13RequiredRestrictionPhraseCode.DIRECTIONAL_LANGUAGE_NOT_PERMITTED,
    required_when_restriction_level: [
      L13RestrictionLevel.NARROWED,
      L13RestrictionLevel.EVIDENCE_ONLY,
    ],
    suggested_text:
      'Directional language is not permitted under this restriction.',
    may_be_paraphrased: true,
    keyword_anchors: ['directional language', 'not permitted'],
  },
];

export function l13RequiredRestrictionPhraseByCode(
  code: L13RequiredRestrictionPhraseCode,
): L13RequiredRestrictionPhrase {
  const entry = L13_REQUIRED_RESTRICTION_PHRASES.find(
    p => p.phrase_code === code,
  );
  if (!entry) {
    throw new Error(
      `L13.5: unknown L13RequiredRestrictionPhraseCode ${code}`,
    );
  }
  return entry;
}

/**
 * §13.5.13.3 — Restriction Composition Profile.
 */
export interface L13RestrictionCompositionProfile {
  readonly restriction_composition_id: string;

  readonly output_id: string;
  readonly input_package_id: string;

  readonly source_restriction_refs: readonly string[];

  readonly composed_restriction_level: L13RestrictionLevel;
  readonly dominant_restriction_source: L13RestrictionSourceClass;

  readonly allowed_output_uses: readonly L13AllowedOutputUse[];
  readonly blocked_output_uses: readonly L13BlockedOutputUse[];

  readonly allowed_phrase_strength_classes:
    readonly L13PhraseStrengthClass[];
  readonly blocked_phrase_strength_classes:
    readonly L13PhraseStrengthClass[];

  readonly may_state_base_case: boolean;
  readonly may_state_directional_bias: boolean;
  readonly may_compare_assets: boolean;
  readonly may_explain_scores: boolean;
  readonly may_explain_scenarios: boolean;
  readonly may_write_alert: boolean;
  readonly may_answer_what_next: boolean;

  readonly must_disclose_restriction: boolean;
  readonly required_restriction_phrases:
    readonly L13RequiredRestrictionPhraseCode[];

  readonly output_allowed: boolean;

  readonly evidence_refs: readonly string[];
  readonly lineage_refs: readonly string[];

  readonly policy_version: string;
  readonly replay_hash: string;
}
