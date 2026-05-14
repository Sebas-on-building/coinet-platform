/**
 * L12.5 — Path confidence policy validator (§12.5.13).
 */

import {
  ALL_L12_PATH_CONFIDENCE_FACTOR_GROUPS,
  L12PathConfidencePolicy,
  l12IsLegalPathConfidenceWeightSum,
  l12PathConfidenceWeightSum,
} from '../contracts/path-confidence-policy';
import {
  L12TemplateValidationResult,
  L12TemplateViolationCode,
  L12TemplateViolationIssue,
  l12TemplateIssueOf as iss,
} from './l12-template-violation-codes';

export function validateL12PathConfidencePolicy(
  p: L12PathConfidencePolicy,
): L12TemplateValidationResult {
  const issues: L12TemplateViolationIssue[] = [];

  for (const f of ALL_L12_PATH_CONFIDENCE_FACTOR_GROUPS) {
    if (!(f in p.weights) || typeof p.weights[f] !== 'number') {
      issues.push(iss(
        L12TemplateViolationCode.L12T_CONFIDENCE_FACTOR_MISSING,
        `weight missing for ${f}`,
        p.policy_id,
      ));
    }
    if (!(f in p.directions)) {
      issues.push(iss(
        L12TemplateViolationCode.L12T_CONFIDENCE_DIRECTION_MISSING,
        `direction missing for ${f}`,
        p.policy_id,
      ));
    }
  }
  if (!l12IsLegalPathConfidenceWeightSum(p.weights, p.weight_sum_tolerance ?? 1e-6)) {
    issues.push(iss(
      L12TemplateViolationCode.L12T_CONFIDENCE_WEIGHT_SUM_ILLEGAL,
      `weight sum ${l12PathConfidenceWeightSum(p.weights)} != 1.0`,
      p.policy_id,
    ));
  }

  return { ok: issues.length === 0, issues };
}
