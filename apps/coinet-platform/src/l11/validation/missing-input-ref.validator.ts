/**
 * L11.5 — Missing-Input Ref Validator (§11.5.6.2)
 */

import {
  L11MissingInputRef,
  L11MissingDataConditionClass,
  L11FormulaInputDependencyClass,
  ALL_L11_MISSING_INPUT_SOURCE_LAYERS,
} from '../contracts';
import {
  L11MissingRegimeIssue,
  L11MissingRegimeViolationCode,
  makeL11MissingRegimeIssue,
} from './l11-missing-regime-violation-codes';

export interface ValidateMissingInputRefArgs {
  readonly ref: L11MissingInputRef;
}

export interface ValidateMissingInputRefResult {
  readonly ok: boolean;
  readonly issues: readonly L11MissingRegimeIssue[];
}

export function validateL11MissingInputRef(
  args: ValidateMissingInputRefArgs,
): ValidateMissingInputRefResult {
  const issues: L11MissingRegimeIssue[] = [];
  const r = args.ref;

  if (!r.input_ref_id) {
    issues.push(makeL11MissingRegimeIssue(
      L11MissingRegimeViolationCode.L11M_INPUT_REF_ID_MISSING,
      'input_ref_id missing'));
  }
  if (!r.input_surface_ref) {
    issues.push(makeL11MissingRegimeIssue(
      L11MissingRegimeViolationCode.L11M_INPUT_SURFACE_REF_MISSING,
      'input_surface_ref missing',
      { input_ref_id: r.input_ref_id }));
  }
  if (!r.source_layer || !ALL_L11_MISSING_INPUT_SOURCE_LAYERS.includes(r.source_layer)) {
    issues.push(makeL11MissingRegimeIssue(
      L11MissingRegimeViolationCode.L11M_INPUT_SOURCE_LAYER_MISSING,
      `source_layer missing or unknown: ${r.source_layer}`,
      { input_ref_id: r.input_ref_id }));
  }
  if (!r.dependency_class) {
    issues.push(makeL11MissingRegimeIssue(
      L11MissingRegimeViolationCode.L11M_INPUT_DEPENDENCY_CLASS_MISSING,
      'dependency_class missing',
      { input_ref_id: r.input_ref_id }));
  }
  if (!r.condition_class) {
    issues.push(makeL11MissingRegimeIssue(
      L11MissingRegimeViolationCode.L11M_INPUT_CONDITION_CLASS_MISSING,
      'condition_class missing',
      { input_ref_id: r.input_ref_id }));
  }
  if (r.dependency_class === L11FormulaInputDependencyClass.REQUIRED &&
      r.required_for_component_refs.length === 0) {
    issues.push(makeL11MissingRegimeIssue(
      L11MissingRegimeViolationCode.L11M_REQUIRED_INPUT_LACKS_COMPONENT_REFS,
      'REQUIRED input must declare required_for_component_refs',
      { input_ref_id: r.input_ref_id }));
  }
  if (r.condition_class === L11MissingDataConditionClass.STALE_REQUIRED_INPUT ||
      r.condition_class === L11MissingDataConditionClass.STALE_OPTIONAL_INPUT) {
    if (typeof r.freshness_budget_ms !== 'number' ||
        typeof r.observed_age_ms !== 'number') {
      issues.push(makeL11MissingRegimeIssue(
        L11MissingRegimeViolationCode.L11M_STALE_INPUT_LACKS_FRESHNESS_DATA,
        'STALE input requires freshness_budget_ms and observed_age_ms',
        { input_ref_id: r.input_ref_id }));
    }
  }
  if (r.condition_class === L11MissingDataConditionClass.DEGRADED_REQUIRED_INPUT ||
      r.condition_class === L11MissingDataConditionClass.DEGRADED_OPTIONAL_INPUT) {
    if (!r.degradation_reason_codes || r.degradation_reason_codes.length === 0) {
      issues.push(makeL11MissingRegimeIssue(
        L11MissingRegimeViolationCode.L11M_DEGRADED_INPUT_LACKS_REASON,
        'DEGRADED input requires degradation_reason_codes',
        { input_ref_id: r.input_ref_id }));
    }
  }
  if (r.condition_class === L11MissingDataConditionClass.RESTRICTED_INPUT) {
    if (!r.restriction_refs || r.restriction_refs.length === 0) {
      issues.push(makeL11MissingRegimeIssue(
        L11MissingRegimeViolationCode.L11M_RESTRICTED_INPUT_LACKS_RESTRICTION_REFS,
        'RESTRICTED input requires restriction_refs',
        { input_ref_id: r.input_ref_id }));
    }
  }
  if (r.condition_class === L11MissingDataConditionClass.CONFLICTING_INPUT) {
    if (!r.contradiction_refs || r.contradiction_refs.length === 0) {
      issues.push(makeL11MissingRegimeIssue(
        L11MissingRegimeViolationCode.L11M_CONFLICTING_INPUT_LACKS_CONTRADICTION_REFS,
        'CONFLICTING input requires contradiction_refs',
        { input_ref_id: r.input_ref_id }));
    }
  }
  if (!r.lineage_refs || r.lineage_refs.length === 0) {
    issues.push(makeL11MissingRegimeIssue(
      L11MissingRegimeViolationCode.L11M_INPUT_REF_LINEAGE_MISSING,
      'lineage_refs missing',
      { input_ref_id: r.input_ref_id }));
  }
  return { ok: issues.length === 0, issues };
}
