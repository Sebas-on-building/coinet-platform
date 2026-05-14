/**
 * L12.5 — Path-confidence cap chain validator (§12.5.14.4).
 */

import {
  L12_PATH_CONFIDENCE_CAP_CEILINGS,
  L12PathConfidenceCapChain,
  L12PathConfidenceCapReason,
  l12CapBandToNumericCeiling,
} from '../contracts/path-confidence-cap-chain';
import {
  L12TemplateValidationResult,
  L12TemplateViolationCode,
  L12TemplateViolationIssue,
  l12TemplateIssueOf as iss,
} from './l12-template-violation-codes';

export function validateL12PathConfidenceCapChain(
  c: L12PathConfidenceCapChain,
): L12TemplateValidationResult {
  const issues: L12TemplateViolationIssue[] = [];

  if (c.capped_score > c.pre_cap_score + 1e-9) {
    issues.push(iss(
      L12TemplateViolationCode.L12T_CAPPED_SCORE_EXCEEDS_PRE_CAP,
      `capped_score ${c.capped_score} > pre_cap_score ${c.pre_cap_score}`,
      c.scenario_id,
    ));
  }
  if (c.cap_reasons.length > 0 && c.dominant_cap_reason === undefined) {
    issues.push(iss(
      L12TemplateViolationCode.L12T_DOMINANT_CAP_REASON_MISSING,
      'cap reasons present but dominant_cap_reason missing',
      c.scenario_id,
    ));
  }
  if (
    c.cap_reasons.includes(L12PathConfidenceCapReason.INCOMPLETE_L11_SCORE_CONTEXT) &&
    !c.is_blocked
  ) {
    issues.push(iss(
      L12TemplateViolationCode.L12T_INCOMPLETE_SCORE_CONTEXT_NOT_BLOCKED,
      'incomplete L11 score context not blocked',
      c.scenario_id,
    ));
  }
  if (
    c.cap_reasons.includes(L12PathConfidenceCapReason.BLOCKING_INVALIDATION) &&
    !c.is_blocked
  ) {
    const ceiling = L12_PATH_CONFIDENCE_CAP_CEILINGS[L12PathConfidenceCapReason.BLOCKING_INVALIDATION];
    if (ceiling !== null) {
      const max = l12CapBandToNumericCeiling(ceiling);
      if (c.capped_score > max + 1e-9) {
        issues.push(iss(
          L12TemplateViolationCode.L12T_BLOCKING_INVALIDATION_NOT_BLOCKED,
          `blocking invalidation but capped_score ${c.capped_score} > ceiling ${max}`,
          c.scenario_id,
        ));
      }
    }
  }
  if (c.dominant_cap_reason !== undefined && !c.cap_reasons.includes(c.dominant_cap_reason)) {
    issues.push(iss(
      L12TemplateViolationCode.L12T_CONFIDENCE_CAP_REQUIRED_BUT_ABSENT,
      'dominant_cap_reason not in cap_reasons',
      c.scenario_id,
    ));
  }

  return { ok: issues.length === 0, issues };
}
