/**
 * L13.10 — User Feedback Record
 *
 * §13.10.17 / §13.10.18 / §13.10.19 / §13.10.20 — Durable user
 * feedback for AI outputs. Feedback is signal — never treated as
 * automatic truth.
 */

export enum L13FeedbackType {
  THUMBS_UP = 'THUMBS_UP',
  THUMBS_DOWN = 'THUMBS_DOWN',
  TOO_LONG = 'TOO_LONG',
  TOO_SHORT = 'TOO_SHORT',
  HELPFUL = 'HELPFUL',
  NOT_USEFUL = 'NOT_USEFUL',
  FELT_TOO_CERTAIN = 'FELT_TOO_CERTAIN',
  FELT_TOO_VAGUE = 'FELT_TOO_VAGUE',
  MISSED_CONTRADICTION = 'MISSED_CONTRADICTION',
  MISSED_IMPORTANT_RISK = 'MISSED_IMPORTANT_RISK',
  OUTPUT_FEELS_ROBOTIC = 'OUTPUT_FEELS_ROBOTIC',
  OUTPUT_FEELS_HYPEY = 'OUTPUT_FEELS_HYPEY',
  USER_CORRECTION = 'USER_CORRECTION',
  SAFETY_COMPLAINT = 'SAFETY_COMPLAINT',
}

export const ALL_L13_FEEDBACK_TYPES:
  readonly L13FeedbackType[] =
  Object.values(L13FeedbackType);

const POSITIVE = new Set<L13FeedbackType>([
  L13FeedbackType.THUMBS_UP,
  L13FeedbackType.HELPFUL,
]);

const NEGATIVE = new Set<L13FeedbackType>([
  L13FeedbackType.THUMBS_DOWN,
  L13FeedbackType.NOT_USEFUL,
  L13FeedbackType.FELT_TOO_CERTAIN,
  L13FeedbackType.FELT_TOO_VAGUE,
  L13FeedbackType.MISSED_CONTRADICTION,
  L13FeedbackType.MISSED_IMPORTANT_RISK,
  L13FeedbackType.OUTPUT_FEELS_ROBOTIC,
  L13FeedbackType.OUTPUT_FEELS_HYPEY,
  L13FeedbackType.USER_CORRECTION,
  L13FeedbackType.SAFETY_COMPLAINT,
]);

export function l13IsPositiveFeedback(t: L13FeedbackType): boolean {
  return POSITIVE.has(t);
}

export function l13IsNegativeFeedback(t: L13FeedbackType): boolean {
  return NEGATIVE.has(t);
}

export enum L13FeedbackReasonCode {
  ANSWERED_QUESTION_WELL = 'ANSWERED_QUESTION_WELL',
  DID_NOT_ANSWER_QUESTION = 'DID_NOT_ANSWER_QUESTION',
  USEFUL_SCENARIO_EXPLANATION = 'USEFUL_SCENARIO_EXPLANATION',
  USEFUL_SCORE_EXPLANATION = 'USEFUL_SCORE_EXPLANATION',
  USEFUL_COMPARISON = 'USEFUL_COMPARISON',
  TOO_MUCH_JARGON = 'TOO_MUCH_JARGON',
  TOO_FEW_DETAILS = 'TOO_FEW_DETAILS',
  TOO_MANY_DETAILS = 'TOO_MANY_DETAILS',
  CONTRADICTION_NOT_DISCLOSED = 'CONTRADICTION_NOT_DISCLOSED',
  INVALIDATION_NOT_CLEAR = 'INVALIDATION_NOT_CLEAR',
  TRIGGER_NOT_CLEAR = 'TRIGGER_NOT_CLEAR',
  FELT_UNSUPPORTED = 'FELT_UNSUPPORTED',
  FELT_OVERCONFIDENT = 'FELT_OVERCONFIDENT',
  FELT_GENERIC = 'FELT_GENERIC',
  POSSIBLE_FACTUAL_ISSUE = 'POSSIBLE_FACTUAL_ISSUE',
  POSSIBLE_HALLUCINATION = 'POSSIBLE_HALLUCINATION',
  SAFETY_BOUNDARY_ISSUE = 'SAFETY_BOUNDARY_ISSUE',
}

export const ALL_L13_FEEDBACK_REASON_CODES:
  readonly L13FeedbackReasonCode[] =
  Object.values(L13FeedbackReasonCode);

export enum L13FeedbackSanitizationStatus {
  NOT_PROVIDED = 'NOT_PROVIDED',
  STORED_AS_SAFE_FREEFORM = 'STORED_AS_SAFE_FREEFORM',
  STORED_WITH_REDACTION = 'STORED_WITH_REDACTION',
  REJECTED_BY_POLICY = 'REJECTED_BY_POLICY',
}

export const ALL_L13_FEEDBACK_SANITIZATION_STATUSES:
  readonly L13FeedbackSanitizationStatus[] =
  Object.values(L13FeedbackSanitizationStatus);

export interface L13UserFeedbackRecord {
  readonly feedback_id: string;
  readonly output_id: string;
  readonly runtime_run_id?: string;
  readonly request_id?: string;
  readonly user_id_hash?: string;
  readonly feedback_type: L13FeedbackType;
  readonly feedback_reason_codes: readonly L13FeedbackReasonCode[];
  readonly freeform_feedback?: string;
  readonly freeform_feedback_sanitization_status?: L13FeedbackSanitizationStatus;
  readonly created_at: string;
  readonly lineage_refs: readonly string[];
  readonly policy_version: string;
  readonly replay_hash: string;
}
