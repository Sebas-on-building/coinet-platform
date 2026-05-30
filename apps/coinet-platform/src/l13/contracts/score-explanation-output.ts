/**
 * L13.7 — Score Explanation Output Contract
 *
 * §13.7.16 — Readable AI specialization of L11 score outputs.
 * Must include score meaning, posture, top positive/negative
 * attribution, caps/penalties, missing-data and drift effects,
 * and restrictions. May never become a buy/sell recommendation.
 */

export interface L13ScoreExplanationOutput {
  readonly score_explanation_id: string;
  readonly output_id: string;
  readonly input_package_id: string;

  readonly score_ref: string;
  readonly score_family: string;
  readonly score_name: string;
  readonly score_band: string;

  readonly score_meaning_line: string;
  readonly score_interpretation_line: string;
  readonly top_positive_driver_lines: readonly string[];
  readonly top_negative_driver_lines: readonly string[];
  readonly cap_penalty_lines: readonly string[];
  readonly missing_data_lines: readonly string[];
  readonly drift_lines: readonly string[];
  readonly restriction_line: string;

  readonly score_as_recommendation_detected: false;

  readonly evidence_refs: readonly string[];
  readonly lineage_refs: readonly string[];

  readonly policy_version: string;
  readonly replay_hash: string;
}

/**
 * §13.7.16.3 — Patterns indicating score-as-recommendation
 * leakage in the prose.
 */
export const L13_SCORE_AS_RECOMMENDATION_PATTERNS:
  readonly RegExp[] = [
  /\bscore\s+is\s+high(,?\s+so\s+(this|it)\s+is\s+a\s+buy)\b/i,
  /\bbuy\s+(because|since)\s+(the\s+)?score\b/i,
  /\bsell\s+(because|since)\s+(the\s+)?score\b/i,
  /\bopportunity\s+score\s+says\s+(buy|sell)\b/i,
];
