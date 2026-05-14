/**
 * L11.7 — Drift recommended-action validator (§11.7.10)
 */

import {
  L11DriftRecommendedAction,
  ALL_L11_DRIFT_RECOMMENDED_ACTIONS,
  isL11DriftActionLegalForSeverity,
  isL11DriftActionLegalForType,
  isL11DriftActionPassive,
} from '../contracts/drift-recommended-action';
import { L11DriftSeverity } from '../contracts/drift-severity';
import {
  L11ScoreDriftType,
  L11DriftTypeImpactClass,
  getL11DriftTypeImpactClass,
} from '../contracts/drift-type';
import {
  L11DriftViolationCode,
  L11DriftIssue,
  makeL11DriftIssue,
} from './l11-drift-violation-codes';

export interface L11DriftActionInput {
  readonly action: L11DriftRecommendedAction | undefined;
  readonly severity: L11DriftSeverity;
  readonly type: L11ScoreDriftType;
  readonly drift_report_id?: string;
}

export function validateL11DriftRecommendedAction(
  inp: L11DriftActionInput,
): L11DriftIssue[] {
  const issues: L11DriftIssue[] = [];
  const ref = inp.drift_report_id;
  const action = inp.action;
  if (!action) {
    issues.push(makeL11DriftIssue(
      L11DriftViolationCode.L11G_RECOMMENDED_ACTION_MISSING,
      'recommended_action missing',
      { drift_report_id: ref }));
    return issues;
  }
  if (!ALL_L11_DRIFT_RECOMMENDED_ACTIONS.includes(action)) {
    issues.push(makeL11DriftIssue(
      L11DriftViolationCode.L11G_RECOMMENDED_ACTION_MISSING,
      `recommended_action ${action} is not registered`,
      { drift_report_id: ref }));
    return issues;
  }
  if (inp.severity === L11DriftSeverity.CRITICAL && isL11DriftActionPassive(action)) {
    issues.push(makeL11DriftIssue(
      L11DriftViolationCode.L11G_CRITICAL_DRIFT_WITH_NO_ACTION,
      `CRITICAL drift cannot have passive action ${action}`,
      { drift_report_id: ref }));
  }
  if (!isL11DriftActionLegalForSeverity(action, inp.severity)) {
    issues.push(makeL11DriftIssue(
      L11DriftViolationCode.L11G_RECOMMENDED_ACTION_INCOMPATIBLE_WITH_SEVERITY,
      `recommended_action ${action} is not legal for severity ${inp.severity}`,
      { drift_report_id: ref }));
  }
  const typeCheck = isL11DriftActionLegalForType(action, inp.type, inp.severity);
  if (!typeCheck.ok) {
    const impact = getL11DriftTypeImpactClass(inp.type);
    if (impact === L11DriftTypeImpactClass.CALIBRATION) {
      issues.push(makeL11DriftIssue(
        L11DriftViolationCode.L11G_SEVERE_CALIBRATION_DRIFT_PASSIVE_ACTION,
        typeCheck.reason,
        { drift_report_id: ref }));
    } else if (impact === L11DriftTypeImpactClass.THRESHOLD) {
      issues.push(makeL11DriftIssue(
        L11DriftViolationCode.L11G_THRESHOLD_DRIFT_NO_THRESHOLD_ACTION,
        typeCheck.reason,
        { drift_report_id: ref }));
    } else if (impact === L11DriftTypeImpactClass.STRUCTURAL) {
      issues.push(makeL11DriftIssue(
        L11DriftViolationCode.L11G_STRUCTURAL_DRIFT_NO_MIGRATION_ACTION,
        typeCheck.reason,
        { drift_report_id: ref }));
    } else {
      issues.push(makeL11DriftIssue(
        L11DriftViolationCode.L11G_RECOMMENDED_ACTION_INCOMPATIBLE_WITH_SEVERITY,
        typeCheck.reason,
        { drift_report_id: ref }));
    }
  }
  return issues;
}
