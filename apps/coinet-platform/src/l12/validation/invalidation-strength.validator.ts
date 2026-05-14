/**
 * L12.5 — Invalidation strength validator (§12.5.12.4).
 */

import {
  L12InvalidationStrengthBand,
  L12InvalidationStrengthProfile,
} from '../contracts/invalidation-strength-profile';
import {
  L12TemplateValidationResult,
  L12TemplateViolationCode,
  L12TemplateViolationIssue,
  l12TemplateIssueOf as iss,
} from './l12-template-violation-codes';

function inUnit(x: number): boolean {
  return Number.isFinite(x) && x >= 0 && x <= 1;
}

export function validateL12InvalidationStrengthProfile(
  p: L12InvalidationStrengthProfile,
): L12TemplateValidationResult {
  const issues: L12TemplateViolationIssue[] = [];

  if (!inUnit(p.invalidation_strength_score)) {
    issues.push(iss(
      L12TemplateViolationCode.L12T_INVALIDATION_STRENGTH_OUT_OF_RANGE,
      `invalidation_strength_score out of [0,1]: ${p.invalidation_strength_score}`,
      p.invalidation_id,
    ));
  }
  for (const [name, val] of [
    ['invalidation_evidence_quality', p.invalidation_evidence_quality],
    ['invalidation_freshness_score', p.invalidation_freshness_score],
    ['invalidation_monitorability_score', p.invalidation_monitorability_score],
    ['invalidation_materiality_score', p.invalidation_materiality_score],
    ['contradiction_pressure_score', p.contradiction_pressure_score],
  ] as const) {
    if (!inUnit(val)) {
      issues.push(iss(
        L12TemplateViolationCode.L12T_INVALIDATION_STRENGTH_OUT_OF_RANGE,
        `${name} out of [0,1]: ${val}`,
        p.invalidation_id,
      ));
    }
  }
  if (p.is_active && !p.confidence_cap_required) {
    issues.push(iss(
      L12TemplateViolationCode.L12T_ACTIVE_INVALIDATION_WITHOUT_CONFIDENCE_CAP,
      'active invalidation without confidence_cap_required',
      p.invalidation_id,
    ));
  }
  if (
    p.invalidation_strength_band === L12InvalidationStrengthBand.BLOCKING &&
    !p.is_blocking
  ) {
    issues.push(iss(
      L12TemplateViolationCode.L12T_BLOCKING_INVALIDATION_WITH_CLEAN_READINESS,
      'blocking band but is_blocking false',
      p.invalidation_id,
    ));
  }
  if (
    p.is_active &&
    p.invalidation_evidence_quality < 0.3
  ) {
    issues.push(iss(
      L12TemplateViolationCode.L12T_INVALIDATION_UNMONITORABLE_USED_AS_PROTECTION,
      'active invalidation lacks evidence',
      p.invalidation_id,
    ));
  }
  if (
    p.is_active &&
    p.invalidation_monitorability_score < 0.3
  ) {
    issues.push(iss(
      L12TemplateViolationCode.L12T_INVALIDATION_UNMONITORABLE_USED_AS_PROTECTION,
      'active invalidation unmonitorable',
      p.invalidation_id,
    ));
  }

  return { ok: issues.length === 0, issues };
}
