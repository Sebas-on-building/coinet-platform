/**
 * L13.7 — Alert Output Validator
 *
 * §13.7.11.5 / §13.7.18 — Validates an `L13AlertOutput`.
 */

import {
  L13AlertClass,
  type L13AlertOutput,
} from '../contracts/alert-output';
import { L13ViolationSeverity } from '../contracts/l13-constitutional-types';
import { L13ModeViolationCode } from './l13-mode-violation-codes';
import {
  l13ModeResult,
  type L13ModeIssue,
  type L13ModeValidationResult,
} from './_l13-mode-issue';

const SEV = L13ViolationSeverity;

export function validateL13AlertOutput(
  alert: L13AlertOutput,
): L13ModeValidationResult {
  const issues: L13ModeIssue[] = [];
  if (!alert.alert_output_id) {
    issues.push({
      code: L13ModeViolationCode.L13M_MODE_PAYLOAD_MISSING,
      severity: SEV.CRITICAL,
      message: 'alert_output_id missing',
    });
  }
  if (!alert.replay_hash) {
    issues.push({
      code: L13ModeViolationCode.L13M_MODE_REPLAY_HASH_MISSING,
      severity: SEV.CRITICAL,
      message: 'replay_hash missing',
    });
  }
  if (alert.lineage_refs.length === 0) {
    issues.push({
      code: L13ModeViolationCode.L13M_MODE_LINEAGE_MISSING,
      severity: SEV.CRITICAL,
      message: 'lineage_refs empty',
    });
  }
  if (!alert.changed_subject_ref) {
    issues.push({
      code: L13ModeViolationCode.L13M_ALERT_CHANGE_SUBJECT_MISSING,
      severity: SEV.CRITICAL,
      message: 'changed_subject_ref missing',
    });
  }
  if (!alert.what_changed || alert.what_changed.trim().length === 0) {
    issues.push({
      code: L13ModeViolationCode.L13M_ALERT_CHANGE_SUBJECT_MISSING,
      severity: SEV.CRITICAL,
      message: 'what_changed missing',
    });
  }
  if (
    !alert.why_it_matters ||
    alert.why_it_matters.trim().length === 0
  ) {
    issues.push({
      code: L13ModeViolationCode.L13M_ALERT_WHY_IT_MATTERS_MISSING,
      severity: SEV.CRITICAL,
      message: 'why_it_matters missing',
    });
  }
  // Trigger / invalidation requirement for trigger/invalidation
  // alert classes.
  if (alert.alert_class === L13AlertClass.TRIGGER_ACTIVATED) {
    if (alert.activated_trigger_refs.length === 0) {
      issues.push({
        code: L13ModeViolationCode.L13M_ALERT_TRIGGER_OR_INVALIDATION_OMITTED,
        severity: SEV.CRITICAL,
        message:
          'TRIGGER_ACTIVATED alert without activated_trigger_refs',
      });
    }
  }
  if (alert.alert_class === L13AlertClass.INVALIDATION_ACTIVATED) {
    if (alert.activated_invalidation_refs.length === 0) {
      issues.push({
        code: L13ModeViolationCode.L13M_ALERT_TRIGGER_OR_INVALIDATION_OMITTED,
        severity: SEV.CRITICAL,
        message:
          'INVALIDATION_ACTIVATED alert without activated_invalidation_refs',
      });
    }
  }
  if (alert.alert_class === L13AlertClass.CONFIDENCE_DEGRADED) {
    if (alert.confidence_change_profile.direction !== 'NARROWED') {
      issues.push({
        code: L13ModeViolationCode.L13M_ALERT_CONFIDENCE_SHIFT_HIDDEN,
        severity: SEV.CRITICAL,
        message:
          'CONFIDENCE_DEGRADED alert must mark confidence_change.direction=NARROWED',
      });
    }
  }
  if (alert.evidence_refs.length === 0) {
    issues.push({
      code: L13ModeViolationCode.L13M_MODE_REQUIRED_DISCLOSURE_MISSING,
      severity: SEV.ERROR,
      message: 'alert evidence_refs empty',
    });
  }
  return l13ModeResult(issues);
}
