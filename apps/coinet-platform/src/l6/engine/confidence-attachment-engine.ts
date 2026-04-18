/**
 * L6.4 — ConfidenceAttachmentEngine
 *
 * §6.4.6.6 — Attaches primitive-level confidence based on declared derivation
 * method. This module never redefines lower-layer confidence; it only maps
 * input confidence + coverage + freshness into an L6ConfidenceBand.
 */

import { L6ConfidenceBand } from '../contracts/feature-validity-state';
import { ConfidenceDerivationSpec } from '../contracts/primitive-contract';

export interface ConfidenceAttachmentInput {
  readonly input_confidences: readonly number[];
  readonly coverage: number;
  readonly warmup_satisfied: boolean;
  readonly freshness_score: number;
  readonly partial_inputs: boolean;
}

export class ConfidenceAttachmentEngine {
  attach(spec: ConfidenceDerivationSpec, input: ConfidenceAttachmentInput): L6ConfidenceBand {
    if (!input.warmup_satisfied) return L6ConfidenceBand.UNRATED;
    if (input.input_confidences.length === 0) return L6ConfidenceBand.UNRATED;

    let score: number;
    switch (spec.method) {
      case 'INPUT_CONFIDENCE_MIN':
        score = Math.min(...input.input_confidences);
        break;
      case 'INPUT_CONFIDENCE_PRODUCT':
        score = input.input_confidences.reduce((a, b) => a * b, 1);
        break;
      case 'BASELINE_DERIVED':
        score = input.input_confidences.reduce((a, b) => a + b, 0) / input.input_confidences.length;
        break;
      case 'COMPOSITE_RULE':
        score = Math.min(
          input.input_confidences.reduce((a, b) => a + b, 0) / input.input_confidences.length,
          Math.min(...input.input_confidences) * 1.1,
        );
        break;
    }

    score = score * Math.min(1, input.coverage) * Math.min(1, input.freshness_score);
    if (spec.downgradesOnPartialInputs && input.partial_inputs) {
      score = score * 0.8;
    }

    if (score >= 0.75) return L6ConfidenceBand.HIGH;
    if (score >= 0.5) return L6ConfidenceBand.MEDIUM;
    if (score >= 0.25) return L6ConfidenceBand.LOW;
    return L6ConfidenceBand.UNRATED;
  }
}
