/**
 * L11.5 — Missing Input Reference (§11.5.6)
 *
 * Per-input runtime ref describing exactly which input was missing,
 * its source layer, dependency class, freshness/age data, and the
 * lower-layer evidence that justified the visibility classification.
 */

import { L11MissingDataConditionClass } from './missing-data-condition';

/**
 * §11.5.6 — Dependency class of a formula input. Required vs
 * optional vs evidence-only must be tracked at the runtime layer
 * because the same `L11InputConditionClass` (e.g. STALE) maps to
 * different `L11MissingDataConditionClass` values depending on
 * required-vs-optional. `REQUIRED_GROUP` denotes membership in a
 * required input set (§11.5.3.3 INSUFFICIENT_INPUT_SET).
 */
export enum L11FormulaInputDependencyClass {
  REQUIRED = 'REQUIRED',
  OPTIONAL = 'OPTIONAL',
  EVIDENCE_ONLY = 'EVIDENCE_ONLY',
  REQUIRED_GROUP = 'REQUIRED_GROUP',
}

export const ALL_L11_FORMULA_INPUT_DEPENDENCY_CLASSES:
  readonly L11FormulaInputDependencyClass[] =
  Object.values(L11FormulaInputDependencyClass);

export type L11MissingInputSourceLayer = 'L6' | 'L7' | 'L8' | 'L9' | 'L10';

export const ALL_L11_MISSING_INPUT_SOURCE_LAYERS:
  readonly L11MissingInputSourceLayer[] =
  ['L6', 'L7', 'L8', 'L9', 'L10'];

export interface L11MissingInputRef {
  readonly input_ref_id: string;

  readonly input_surface_ref: string;
  readonly source_layer: L11MissingInputSourceLayer;
  readonly dependency_class: L11FormulaInputDependencyClass;

  readonly condition_class: L11MissingDataConditionClass;

  readonly required_for_component_refs: readonly string[];

  readonly freshness_budget_ms?: number;
  readonly observed_age_ms?: number;

  readonly degradation_reason_codes?: readonly string[];
  readonly restriction_refs?: readonly string[];
  readonly contradiction_refs?: readonly string[];

  readonly default_policy_ref?: string;
  readonly fallback_policy_ref?: string;

  readonly lineage_refs: readonly string[];
}

/**
 * §11.5.6.2 — Structural legality. Pre-validation gate; full
 * validator at `missing-input-ref.validator.ts` produces issues
 * with violation codes.
 */
export function isL11MissingInputRefStructurallyValid(
  r: L11MissingInputRef,
): { ok: boolean; reason: string } {
  if (!r.input_ref_id) return { ok: false, reason: 'input_ref_id missing' };
  if (!r.input_surface_ref) return { ok: false, reason: 'input_surface_ref missing' };
  if (!r.source_layer) return { ok: false, reason: 'source_layer missing' };
  if (!r.dependency_class) return { ok: false, reason: 'dependency_class missing' };
  if (!r.condition_class) return { ok: false, reason: 'condition_class missing' };
  if (!r.lineage_refs || r.lineage_refs.length === 0) {
    return { ok: false, reason: 'lineage_refs missing' };
  }
  if (r.dependency_class === L11FormulaInputDependencyClass.REQUIRED &&
      r.required_for_component_refs.length === 0) {
    return {
      ok: false,
      reason: 'REQUIRED input must declare required_for_component_refs',
    };
  }
  if (r.condition_class === L11MissingDataConditionClass.STALE_REQUIRED_INPUT ||
      r.condition_class === L11MissingDataConditionClass.STALE_OPTIONAL_INPUT) {
    if (typeof r.freshness_budget_ms !== 'number' ||
        typeof r.observed_age_ms !== 'number') {
      return { ok: false, reason: 'STALE input requires freshness_budget_ms and observed_age_ms' };
    }
  }
  if (r.condition_class === L11MissingDataConditionClass.DEGRADED_REQUIRED_INPUT ||
      r.condition_class === L11MissingDataConditionClass.DEGRADED_OPTIONAL_INPUT) {
    if (!r.degradation_reason_codes || r.degradation_reason_codes.length === 0) {
      return { ok: false, reason: 'DEGRADED input requires degradation_reason_codes' };
    }
  }
  if (r.condition_class === L11MissingDataConditionClass.RESTRICTED_INPUT) {
    if (!r.restriction_refs || r.restriction_refs.length === 0) {
      return { ok: false, reason: 'RESTRICTED input requires restriction_refs' };
    }
  }
  if (r.condition_class === L11MissingDataConditionClass.CONFLICTING_INPUT) {
    if (!r.contradiction_refs || r.contradiction_refs.length === 0) {
      return { ok: false, reason: 'CONFLICTING input requires contradiction_refs' };
    }
  }
  return { ok: true, reason: 'ok' };
}

/**
 * §11.5.3.3 — A required-input set may be incomplete even when
 * individual inputs are present. The engine must flag these as
 * INSUFFICIENT_INPUT_SET so the score caps/penalties apply.
 */
export interface L11InsufficientInputSetRef {
  readonly insufficient_set_id: string;
  readonly required_input_surface_refs: readonly string[];
  readonly observed_input_surface_refs: readonly string[];
  readonly missing_input_surface_refs: readonly string[];
  readonly required_for_component_refs: readonly string[];
  readonly reason_code: string;
  readonly lineage_refs: readonly string[];
}

export function isL11InsufficientInputSetRefStructurallyValid(
  r: L11InsufficientInputSetRef,
): { ok: boolean; reason: string } {
  if (!r.insufficient_set_id) return { ok: false, reason: 'insufficient_set_id missing' };
  if (!r.required_input_surface_refs || r.required_input_surface_refs.length === 0) {
    return { ok: false, reason: 'required_input_surface_refs missing' };
  }
  if (!r.missing_input_surface_refs || r.missing_input_surface_refs.length === 0) {
    return { ok: false, reason: 'missing_input_surface_refs must be non-empty' };
  }
  if (!r.reason_code) return { ok: false, reason: 'reason_code missing' };
  if (!r.lineage_refs || r.lineage_refs.length === 0) {
    return { ok: false, reason: 'lineage_refs missing' };
  }
  return { ok: true, reason: 'ok' };
}
