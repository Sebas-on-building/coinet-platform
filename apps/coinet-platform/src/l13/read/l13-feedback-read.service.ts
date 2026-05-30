/**
 * L13.10 — Feedback Read Service
 *
 * §13.10.29 / §13.10.30 — Governed read surface for user feedback
 * and current feedback summaries.
 */

import type { L13UserFeedbackRecord } from '../contracts/l13-feedback-record';
import type { L13CurrentFeedbackSummaryRecord } from '../contracts/l13-feedback-summary-record';
import {
  getAllL13UserFeedback,
  getL13FeedbackSummaryByOutputId,
  getL13UserFeedbackByOutputId,
} from './l13-durable-store';

export function readL13UserFeedbackByOutputId(
  outputId: string,
): readonly L13UserFeedbackRecord[] {
  return getL13UserFeedbackByOutputId(outputId);
}

export function readL13FeedbackSummaryByOutputId(
  outputId: string,
): L13CurrentFeedbackSummaryRecord | undefined {
  return getL13FeedbackSummaryByOutputId(outputId);
}

export function readL13AllFeedbackForReview():
  readonly L13UserFeedbackRecord[] {
  return getAllL13UserFeedback();
}
