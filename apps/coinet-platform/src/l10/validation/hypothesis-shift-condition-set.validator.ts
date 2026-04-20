/**
 * L10.2 — HypothesisShiftConditionSet Validator §10.2.15.4
 */

import { L10HypothesisShiftConditionSet } from '../contracts/hypothesis-shift-condition-set';
import {
  L10ObjectValidationIssue,
  L10ObjectValidationReport,
  L10ObjectViolationCode,
} from './hypothesis-object-violation-codes';

export interface L10ShiftValidationInput {
  readonly shift: L10HypothesisShiftConditionSet;
  readonly competitionSize: number;
}

export function validateL10HypothesisShiftConditionSet(
  input: L10ShiftValidationInput,
): L10ObjectValidationReport {
  const issues: L10ObjectValidationIssue[] = [];
  const s = input.shift;

  if (!s.shift_condition_set_id) {
    issues.push({ code: L10ObjectViolationCode.SHIFT_MISSING_ID, message: 'shift_condition_set_id required' });
  }
  if (!s.current_primary_ref) {
    issues.push({ code: L10ObjectViolationCode.SHIFT_MISSING_PRIMARY, message: 'current_primary_ref required' });
  }
  if (input.competitionSize > 1 && !s.current_secondary_ref) {
    issues.push({
      code: L10ObjectViolationCode.SHIFT_MISSING_SECONDARY_WHEN_COMPETITION,
      message: 'current_secondary_ref required when competition_size > 1',
    });
  }
  if (s.promotion_conditions_for_secondary.length === 0 && input.competitionSize > 1) {
    issues.push({
      code: L10ObjectViolationCode.SHIFT_MISSING_PROMOTION_CONDITIONS,
      message: 'promotion_conditions_for_secondary required when competition_size > 1',
    });
  }
  if (s.reinforcement_conditions_for_primary.length === 0) {
    issues.push({
      code: L10ObjectViolationCode.SHIFT_MISSING_REINFORCEMENT_CONDITIONS,
      message: 'reinforcement_conditions_for_primary required',
    });
  }
  if (s.collapse_conditions_for_primary.length === 0) {
    issues.push({
      code: L10ObjectViolationCode.SHIFT_MISSING_COLLAPSE_CONDITIONS,
      message: 'collapse_conditions_for_primary required',
    });
  }
  if (!s.lineage_refs || s.lineage_refs.length === 0) {
    issues.push({ code: L10ObjectViolationCode.SHIFT_MISSING_LINEAGE, message: 'lineage_refs required' });
  }

  return { valid: issues.length === 0, issues };
}
