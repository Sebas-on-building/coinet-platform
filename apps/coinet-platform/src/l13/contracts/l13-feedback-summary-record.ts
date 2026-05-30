/**
 * L13.10 — Current Feedback Summary Record
 *
 * §13.10.21 — Recomputable current state of feedback for an
 * output. Recomputable, not irreversible history.
 */

import type { L13FeedbackReasonCode, L13FeedbackType } from './l13-feedback-record';

export interface L13CurrentFeedbackSummaryRecord {
  readonly feedback_summary_id: string;
  readonly output_id: string;
  readonly total_feedback_count: number;
  readonly positive_feedback_count: number;
  readonly negative_feedback_count: number;
  readonly top_feedback_types: readonly L13FeedbackType[];
  readonly top_feedback_reason_codes: readonly L13FeedbackReasonCode[];
  readonly flagged_for_quality_review: boolean;
  readonly flagged_for_safety_review: boolean;
  readonly flagged_for_hallucination_review: boolean;
  readonly last_feedback_at?: string;
  readonly lineage_refs: readonly string[];
  readonly policy_version: string;
  readonly replay_hash: string;
}
