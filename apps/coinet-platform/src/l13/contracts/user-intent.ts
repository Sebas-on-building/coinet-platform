/**
 * L13.6 — User Intent Classification Contract
 *
 * §13.6.5 — Deterministic, ruleset-versioned intent classification.
 * Binds to the existing `L13UserIntentClass` enum defined by L13.2
 * (`./user-intent-binding`) so the runtime and the input-package
 * builder share a single intent taxonomy.
 *
 * §13.6.5.5 — Intent classification may never silently default to
 * `WHATS_HAPPENING` for unrecognized prompts; the classifier must
 * route to an out-of-scope or follow-up-required reason code.
 */

import {
  L13AnswerMode,
} from './explanation-restriction-profile';
import {
  L13UserIntentClass,
} from './user-intent-binding';

/**
 * §13.6.5.4 — Intent confidence taxonomy.
 */
export enum L13IntentConfidenceClass {
  CLEAR_MATCH = 'CLEAR_MATCH',
  STRONG_MATCH = 'STRONG_MATCH',
  AMBIGUOUS_MATCH = 'AMBIGUOUS_MATCH',
  FOLLOW_UP_CONTEXT_REQUIRED = 'FOLLOW_UP_CONTEXT_REQUIRED',
  OUT_OF_SCOPE_MATCH = 'OUT_OF_SCOPE_MATCH',
}

export const ALL_L13_INTENT_CONFIDENCE_CLASSES:
  readonly L13IntentConfidenceClass[] =
  Object.values(L13IntentConfidenceClass);

/**
 * §13.6.5 — Out-of-scope reason codes. The classifier emits one or
 * more of these when the user query asks for something Layer 13
 * cannot legally answer (trade advice, certainty, etc.) or when no
 * intent rule fires at all.
 */
export enum L13IntentOutOfScopeReasonCode {
  REQUESTS_TRADE_INSTRUCTION = 'REQUESTS_TRADE_INSTRUCTION',
  REQUESTS_BUY_SELL_HOLD = 'REQUESTS_BUY_SELL_HOLD',
  REQUESTS_PRICE_TARGET = 'REQUESTS_PRICE_TARGET',
  REQUESTS_PREDICTION = 'REQUESTS_PREDICTION',
  REQUESTS_CERTAINTY = 'REQUESTS_CERTAINTY',
  REQUESTS_BULLISH_BEARISH_BINARY = 'REQUESTS_BULLISH_BEARISH_BINARY',
  REQUESTS_LEVERAGE_OR_POSITION_SIZE = 'REQUESTS_LEVERAGE_OR_POSITION_SIZE',
  REQUESTS_NON_CRYPTO_TOPIC = 'REQUESTS_NON_CRYPTO_TOPIC',
  NO_RULE_MATCHED = 'NO_RULE_MATCHED',
  AMBIGUOUS_QUERY = 'AMBIGUOUS_QUERY',
  EMPTY_QUERY = 'EMPTY_QUERY',
}

export const ALL_L13_INTENT_OUT_OF_SCOPE_REASON_CODES:
  readonly L13IntentOutOfScopeReasonCode[] =
  Object.values(L13IntentOutOfScopeReasonCode);

/**
 * §13.6.5.3 — Intent Classification object. The classifier is the
 * sole authority on intent; downstream stages bind to this object
 * by ref.
 */
export interface L13UserIntentClassification {
  readonly intent_classification_id: string;

  readonly request_id: string;
  readonly raw_user_query_ref: string;

  readonly selected_intent: L13UserIntentClass;
  readonly secondary_intent_candidates: readonly L13UserIntentClass[];

  readonly intent_confidence_class: L13IntentConfidenceClass;

  readonly matched_rule_refs: readonly string[];
  readonly rejected_rule_refs: readonly string[];

  readonly requires_scope_resolution: boolean;
  readonly requires_comparison_scope: boolean;
  readonly requires_forward_scenario_context: boolean;
  readonly requires_score_context: boolean;
  readonly requires_hypothesis_context: boolean;
  readonly requires_contradiction_context: boolean;

  readonly answer_mode_hint: L13AnswerMode;

  readonly out_of_scope_reason_codes:
    readonly L13IntentOutOfScopeReasonCode[];

  readonly lineage_refs: readonly string[];
  readonly policy_version: string;
  readonly replay_hash: string;
}

/**
 * §13.6.5 — Raw user request payload. The runtime classifier
 * consumes this verbatim; downstream stages reference it by id
 * only.
 */
export interface L13RawUserRequest {
  readonly request_id: string;
  readonly user_query: string;
  /** Optional prior interaction ref for follow-up context. */
  readonly prior_request_ref?: string;
  /**
   * Optional user-declared answer mode hint. The classifier may
   * confirm or override this.
   */
  readonly requested_answer_mode?: L13AnswerMode;
  readonly received_at: string;
}
