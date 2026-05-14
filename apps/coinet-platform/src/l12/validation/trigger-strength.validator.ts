/**
 * L12.5 — Trigger strength validator (§12.5.11.5).
 */

import {
  L12TriggerStrengthBand,
  L12TriggerStrengthProfile,
} from '../contracts/trigger-strength-profile';
import {
  L12TemplateValidationResult,
  L12TemplateViolationCode,
  L12TemplateViolationIssue,
  l12TemplateIssueOf as iss,
} from './l12-template-violation-codes';

function inUnit(x: number): boolean {
  return Number.isFinite(x) && x >= 0 && x <= 1;
}

export function validateL12TriggerStrengthProfile(
  p: L12TriggerStrengthProfile,
): L12TemplateValidationResult {
  const issues: L12TemplateViolationIssue[] = [];

  if (!inUnit(p.trigger_strength_score)) {
    issues.push(iss(
      L12TemplateViolationCode.L12T_TRIGGER_STRENGTH_OUT_OF_RANGE,
      `trigger_strength_score out of [0,1]: ${p.trigger_strength_score}`,
      p.trigger_id,
    ));
  }
  for (const [name, val] of [
    ['trigger_evidence_quality', p.trigger_evidence_quality],
    ['trigger_freshness_score', p.trigger_freshness_score],
    ['trigger_monitorability_score', p.trigger_monitorability_score],
    ['trigger_materiality_score', p.trigger_materiality_score],
    ['contradiction_pressure_score', p.contradiction_pressure_score],
    ['score_context_support_score', p.score_context_support_score],
  ] as const) {
    if (!inUnit(val)) {
      issues.push(iss(
        L12TemplateViolationCode.L12T_TRIGGER_STRENGTH_OUT_OF_RANGE,
        `${name} out of [0,1]: ${val}`,
        p.trigger_id,
      ));
    }
  }
  if (
    p.trigger_strength_band === L12TriggerStrengthBand.DECISIVE &&
    p.trigger_evidence_quality < 0.7
  ) {
    issues.push(iss(
      L12TemplateViolationCode.L12T_TRIGGER_DECISIVE_WITH_WEAK_EVIDENCE,
      'decisive trigger with weak evidence',
      p.trigger_id,
    ));
  }
  if (
    (p.trigger_strength_band === L12TriggerStrengthBand.STRONG ||
      p.trigger_strength_band === L12TriggerStrengthBand.DECISIVE) &&
    p.trigger_monitorability_score < 0.5
  ) {
    issues.push(iss(
      L12TemplateViolationCode.L12T_TRIGGER_STRONG_WHILE_UNMONITORABLE,
      'strong/decisive trigger while unmonitorable',
      p.trigger_id,
    ));
  }

  return { ok: issues.length === 0, issues };
}
