/**
 * L13.2 — Explanation Restriction Profile Contract
 *
 * §13.2.9 — The merged restriction profile that L13.2 binds onto
 * every input package. Composes restrictions from L7–L12 into
 * allowed and blocked answer modes and required disclosures. Most
 * restrictive posture wins; blocked modes may never be reopened.
 */

export enum L13AnswerMode {
  /**
   * Plain explanatory answer to "what is happening". Default for
   * chat answers.
   */
  EXPLAIN = 'EXPLAIN',
  SUMMARIZE_MARKET_STATE = 'SUMMARIZE_MARKET_STATE',
  EXPLAIN_SCENARIO = 'EXPLAIN_SCENARIO',
  EXPLAIN_SCORE = 'EXPLAIN_SCORE',
  EXPLAIN_HYPOTHESIS = 'EXPLAIN_HYPOTHESIS',
  EXPLAIN_REGIME = 'EXPLAIN_REGIME',
  EXPLAIN_SEQUENCE = 'EXPLAIN_SEQUENCE',
  WRITE_ALERT = 'WRITE_ALERT',
  WRITE_REPORT = 'WRITE_REPORT',
  COMPARE_ASSETS = 'COMPARE_ASSETS',
  COMPARE_THESES = 'COMPARE_THESES',
  DISCLOSE_CONTRADICTION = 'DISCLOSE_CONTRADICTION',
  DISCLOSE_UNCERTAINTY = 'DISCLOSE_UNCERTAINTY',
  REFUSE_UNSUPPORTED = 'REFUSE_UNSUPPORTED',
}

export const ALL_L13_ANSWER_MODES: readonly L13AnswerMode[] =
  Object.values(L13AnswerMode);

export enum L13BlockedAnswerMode {
  TRADE_RECOMMENDATION = 'TRADE_RECOMMENDATION',
  BUY_SELL_HOLD_AVOID = 'BUY_SELL_HOLD_AVOID',
  PREDICTION = 'PREDICTION',
  CERTAINTY_CLAIM = 'CERTAINTY_CLAIM',
  FINAL_JUDGMENT = 'FINAL_JUDGMENT',
  POSITION_SIZING = 'POSITION_SIZING',
  LEVERAGE_GUIDANCE = 'LEVERAGE_GUIDANCE',
  UNGROUNDED_ANALYSIS = 'UNGROUNDED_ANALYSIS',
}

export const ALL_L13_BLOCKED_ANSWER_MODES:
  readonly L13BlockedAnswerMode[] =
  Object.values(L13BlockedAnswerMode);

/**
 * Always-blocked modes — these may never be flipped on by L13.2
 * regardless of lower-layer postures or user intent.
 */
export const L13_ALWAYS_BLOCKED_ANSWER_MODES:
  readonly L13BlockedAnswerMode[] = [
  L13BlockedAnswerMode.TRADE_RECOMMENDATION,
  L13BlockedAnswerMode.BUY_SELL_HOLD_AVOID,
  L13BlockedAnswerMode.PREDICTION,
  L13BlockedAnswerMode.CERTAINTY_CLAIM,
  L13BlockedAnswerMode.FINAL_JUDGMENT,
  L13BlockedAnswerMode.POSITION_SIZING,
  L13BlockedAnswerMode.LEVERAGE_GUIDANCE,
  L13BlockedAnswerMode.UNGROUNDED_ANALYSIS,
];

export enum L13BlockedClaimType {
  TRADE_INSTRUCTION = 'TRADE_INSTRUCTION',
  PREDICTION_OUTCOME = 'PREDICTION_OUTCOME',
  CERTAINTY = 'CERTAINTY',
  WINNER_DECLARATION = 'WINNER_DECLARATION',
  FINAL_JUDGMENT = 'FINAL_JUDGMENT',
  RECOMMENDATION_FROM_SCORE = 'RECOMMENDATION_FROM_SCORE',
  REBUILT_LOWER_LAYER = 'REBUILT_LOWER_LAYER',
  INVENTED_SUPPORT = 'INVENTED_SUPPORT',
  HIDDEN_CONTRADICTION = 'HIDDEN_CONTRADICTION',
  HIDDEN_RESTRICTION = 'HIDDEN_RESTRICTION',
}

export const ALL_L13_BLOCKED_CLAIM_TYPES:
  readonly L13BlockedClaimType[] = Object.values(L13BlockedClaimType);

export enum L13RequiredDisclosure {
  CONTRADICTION = 'CONTRADICTION',
  ACTIVE_INVALIDATION = 'ACTIVE_INVALIDATION',
  UNRESOLVED_TRIGGER = 'UNRESOLVED_TRIGGER',
  CONFIDENCE_CAP = 'CONFIDENCE_CAP',
  NARROW_SCENARIO_SPREAD = 'NARROW_SCENARIO_SPREAD',
  NARROW_HYPOTHESIS_SPREAD = 'NARROW_HYPOTHESIS_SPREAD',
  MISSING_DATA = 'MISSING_DATA',
  DRIFT = 'DRIFT',
  TRANSITION_RISK = 'TRANSITION_RISK',
  SEQUENCE_DECAY = 'SEQUENCE_DECAY',
  RESTRICTION = 'RESTRICTION',
  EVIDENCE_REFS = 'EVIDENCE_REFS',
  LINEAGE_REFS = 'LINEAGE_REFS',
}

export const ALL_L13_REQUIRED_DISCLOSURES:
  readonly L13RequiredDisclosure[] = Object.values(L13RequiredDisclosure);

export interface L13ExplanationRestrictionProfile {
  readonly restriction_profile_id: string;

  readonly lower_layer_restriction_refs: readonly string[];

  readonly allowed_answer_modes: readonly L13AnswerMode[];
  readonly blocked_answer_modes: readonly L13BlockedAnswerMode[];

  readonly blocked_claim_types: readonly L13BlockedClaimType[];

  readonly required_disclosures: readonly L13RequiredDisclosure[];

  readonly may_explain_scenario: boolean;
  readonly may_explain_score: boolean;
  readonly may_compare_assets: boolean;
  readonly may_write_alert: boolean;
  readonly may_generate_report: boolean;

  readonly may_use_directional_language: boolean;
  readonly may_use_confident_language: boolean;

  readonly must_avoid_recommendation_language: true;
  readonly must_avoid_prediction_language: true;
  readonly must_avoid_final_judgment_language: true;

  readonly evidence_refs: readonly string[];
  readonly lineage_refs: readonly string[];

  readonly policy_version: string;
}

/**
 * §13.2.10 — Disclosure effect classes shared by missing-data and
 * drift disclosures.
 */
export enum L13DisclosureEffect {
  DISCLOSURE_ONLY = 'DISCLOSURE_ONLY',
  NARROWS_CONFIDENCE = 'NARROWS_CONFIDENCE',
  BLOCKS_CLEAN_ANSWER = 'BLOCKS_CLEAN_ANSWER',
  BLOCKS_ANSWER = 'BLOCKS_ANSWER',
}

export const ALL_L13_DISCLOSURE_EFFECTS:
  readonly L13DisclosureEffect[] = Object.values(L13DisclosureEffect);

export interface L13MissingDataDisclosure {
  readonly disclosure_id: string;

  readonly source_layer: 'L11' | 'L12' | 'L7' | 'L6';

  readonly missing_data_ref: string;
  readonly affected_summary_class: string;

  readonly effect_on_answer: L13DisclosureEffect;

  readonly required_user_facing_disclosure: boolean;

  readonly disclosure_text_code: string;

  readonly evidence_refs: readonly string[];
  readonly lineage_refs: readonly string[];

  readonly policy_version: string;
}

export interface L13DriftDisclosure {
  readonly disclosure_id: string;

  readonly drift_ref: string;
  readonly affected_score_or_scenario_ref: string;

  readonly drift_severity: string;
  readonly drift_effect_on_answer: L13DisclosureEffect;

  readonly required_user_facing_disclosure: boolean;

  readonly disclosure_text_code: string;

  readonly evidence_refs: readonly string[];
  readonly lineage_refs: readonly string[];

  readonly policy_version: string;
}
