/**
 * L12.5 — Trigger / invalidation interaction validator (§12.5.18).
 */

import { L12InvalidationStrengthBand } from '../contracts/invalidation-strength-profile';
import {
  L12TriggerInvalidationInteractionClass,
  L12TriggerInvalidationInteractionRecord,
} from '../contracts/trigger-invalidation-interaction';
import {
  L12TemplateValidationResult,
  L12TemplateViolationCode,
  L12TemplateViolationIssue,
  l12TemplateIssueOf as iss,
} from './l12-template-violation-codes';

export function validateL12TriggerInvalidationInteraction(
  r: L12TriggerInvalidationInteractionRecord,
): L12TemplateValidationResult {
  const issues: L12TemplateViolationIssue[] = [];

  if (
    r.invalidation_active &&
    r.invalidation_strength_band === L12InvalidationStrengthBand.BLOCKING &&
    r.interaction_class === L12TriggerInvalidationInteractionClass.TRIGGER_DOMINANT
  ) {
    issues.push(iss(
      L12TemplateViolationCode.L12T_INTERACTION_TRIGGER_DOMINANT_UNDER_BLOCKING,
      'trigger dominant under blocking invalidation',
      r.interaction_record_id,
    ));
  }
  if (r.trigger_overrides_blocked_invalidation_attempted && r.invalidation_blocking) {
    issues.push(iss(
      L12TemplateViolationCode.L12T_TRIGGER_OVERRIDES_BLOCKING_INVALIDATION,
      'trigger attempts to override blocking invalidation',
      r.interaction_record_id,
    ));
  }

  return { ok: issues.length === 0, issues };
}
