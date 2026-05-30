/**
 * L13.10 — Output Quality Read Service
 *
 * §13.10.29 / §13.10.30 — Governed read surface for output-quality
 * metrics and per-output evaluation records.
 */

import type { L13OutputQualityMetric } from '../contracts/l13-output-quality-metric';
import type { L13OutputQualityEvaluationRecord } from '../contracts/l13-output-quality-evaluation';
import {
  getAllL13OutputQualityEvaluations,
  getAllL13OutputQualityMetrics,
  getL13OutputQualityEvaluationByOutputId,
} from './l13-durable-store';

export function readL13OutputQualityEvaluationByOutputId(
  outputId: string,
): L13OutputQualityEvaluationRecord | undefined {
  return getL13OutputQualityEvaluationByOutputId(outputId);
}

export function readAllL13OutputQualityEvaluations():
  readonly L13OutputQualityEvaluationRecord[] {
  return getAllL13OutputQualityEvaluations();
}

export function readL13OutputQualityMetricsByMode(
  answer_mode?: string,
): readonly L13OutputQualityMetric[] {
  if (!answer_mode) return getAllL13OutputQualityMetrics();
  return getAllL13OutputQualityMetrics().filter(
    m => m.answer_mode === answer_mode,
  );
}
