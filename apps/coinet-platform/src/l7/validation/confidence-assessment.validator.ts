/**
 * L7.2 — Confidence Assessment Validator
 *
 * §7.2.6.5 — Rejects confidence objects that lack factor breakdown,
 * have out-of-range scores, or whose band does not correspond to score.
 */

import {
  L7ConfidenceAssessment,
  L7ConfidenceBand,
  ALL_CONFIDENCE_BANDS,
  bandMatchesScore,
} from '../contracts/confidence-assessment';
import {
  L7ObjectViolationCode,
  L7ValidationOutputClass,
  REQUIRED_FIELDS_BY_OUTPUT,
} from '../contracts/validation-output-class';

export interface ConfidenceAssessmentIssue {
  readonly code: L7ObjectViolationCode;
  readonly message: string;
  readonly details?: Record<string, unknown>;
}

export interface ConfidenceAssessmentReport {
  readonly valid: boolean;
  readonly issues: readonly ConfidenceAssessmentIssue[];
}

export function validateConfidenceAssessment(
  c: L7ConfidenceAssessment,
): ConfidenceAssessmentReport {
  const issues: ConfidenceAssessmentIssue[] = [];

  for (const field of REQUIRED_FIELDS_BY_OUTPUT[L7ValidationOutputClass.CONFIDENCE_ASSESSMENT]) {
    const v = (c as unknown as Record<string, unknown>)[field];
    if (v === undefined || v === null || v === '') {
      issues.push({
        code: L7ObjectViolationCode.CONFIDENCE_MISSING_IDENTITY,
        message: `missing required field: ${field}`,
      });
    }
  }

  if (typeof c.confidence_score !== 'number' || Number.isNaN(c.confidence_score)) {
    issues.push({
      code: L7ObjectViolationCode.CONFIDENCE_SCORE_OUT_OF_RANGE,
      message: 'confidence_score must be a finite number',
    });
  } else if (c.confidence_score < 0 || c.confidence_score > 1) {
    issues.push({
      code: L7ObjectViolationCode.CONFIDENCE_SCORE_OUT_OF_RANGE,
      message: `confidence_score out of range: ${c.confidence_score}`,
    });
  }

  if (!ALL_CONFIDENCE_BANDS.includes(c.confidence_band as L7ConfidenceBand)) {
    issues.push({
      code: L7ObjectViolationCode.CONFIDENCE_BAND_MISMATCH,
      message: `invalid confidence_band: ${c.confidence_band}`,
    });
  } else if (
    typeof c.confidence_score === 'number' &&
    !Number.isNaN(c.confidence_score) &&
    c.confidence_score >= 0 &&
    c.confidence_score <= 1 &&
    !bandMatchesScore(c.confidence_band, c.confidence_score)
  ) {
    issues.push({
      code: L7ObjectViolationCode.CONFIDENCE_BAND_MISMATCH,
      message: `band ${c.confidence_band} does not match score ${c.confidence_score}`,
    });
  }

  if (!c.components) {
    issues.push({
      code: L7ObjectViolationCode.CONFIDENCE_MISSING_FACTORS,
      message: 'missing components',
    });
  } else {
    const keys: (keyof typeof c.components)[] = [
      'source_trust_component',
      'freshness_component',
      'feature_completeness_component',
      'cross_source_agreement_component',
      'regime_compatibility_component',
      'historical_reliability_component',
      'contradiction_penalty_component',
    ];
    for (const k of keys) {
      const v = c.components[k];
      if (typeof v !== 'number' || Number.isNaN(v)) {
        issues.push({
          code: L7ObjectViolationCode.CONFIDENCE_MISSING_FACTORS,
          message: `component ${k} must be a finite number`,
        });
      }
    }
  }

  if (!c.lineage_refs || !c.lineage_refs.trace_id || !c.lineage_refs.manifest_id) {
    issues.push({
      code: L7ObjectViolationCode.CONFIDENCE_MISSING_LINEAGE,
      message: 'missing lineage_refs',
    });
  }

  if (!c.replay_hash) {
    issues.push({
      code: L7ObjectViolationCode.CONFIDENCE_MISSING_IDENTITY,
      message: 'missing replay_hash',
    });
  }

  return { valid: issues.length === 0, issues };
}
