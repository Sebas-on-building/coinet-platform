/**
 * L6.5 §6.5.6.7 — NullPolicyValidator
 *
 * Enforces:
 *   - every contract declares an explicit null policy (no implicit fallback)
 *   - missingness is always classified into one of the legal classes
 *   - null-state vs validity-state consistency:
 *       a primitive may never be classified VALID while its null state
 *       indicates a required-missingness class
 *   - hidden zero-fill / neutral-fill patterns are rejected via the forbidden
 *     token list (L6.2's `FORBIDDEN_NULL_POLICY_TOKENS`)
 */

import {
  L6NullPolicy,
  FORBIDDEN_NULL_POLICY_TOKENS,
  NullPolicySpec,
} from '../contracts/primitive-null-policy';
import {
  L6NullStateClass,
  L6NullPolicyDecision,
  L6NullPolicyMode,
  isMissingnessClass,
} from '../contracts/null-state';
import { L6FeatureValidityState } from '../contracts/feature-validity-state';
import { L6TemporalViolationCode } from '../contracts/temporal-honesty';

export interface L6NullPolicyViolation {
  readonly code: L6TemporalViolationCode;
  readonly field: string;
  readonly detail: string;
}

export interface L6NullPolicyValidationResult {
  readonly ok: boolean;
  readonly violations: readonly L6NullPolicyViolation[];
  readonly policy_mode: L6NullPolicyMode | null;
}

/**
 * Map L6.2's contract-facing `L6NullPolicy` to the L6.5 behavioral mode.
 */
export function policyToMode(p: L6NullPolicy): L6NullPolicyMode {
  switch (p) {
    case L6NullPolicy.REJECT_IF_MISSING:
    case L6NullPolicy.BLOCKED_UNTIL_RECOVERED:
      return L6NullPolicyMode.BLOCK;
    case L6NullPolicy.DEGRADE_EXPLICITLY:
      return L6NullPolicyMode.DEGRADE;
    case L6NullPolicy.PROVISIONAL_IF_PARTIAL:
      return L6NullPolicyMode.PROVISIONAL;
    case L6NullPolicy.EXPLICIT_ABSENT_STATE:
      return L6NullPolicyMode.SPARSE_EMIT;
  }
}

export class NullPolicyValidator {
  validateSpec(spec: NullPolicySpec): L6NullPolicyValidationResult {
    const v: L6NullPolicyViolation[] = [];
    if (!spec || !spec.policy) {
      v.push({
        code: L6TemporalViolationCode.NULL_POLICY_MISSING,
        field: 'policy',
        detail: 'null policy is required',
      });
      return { ok: false, violations: v, policy_mode: null };
    }

    // §6.5.6.2 — reject forbidden fallback tokens hiding inside the
    // rationale / fields (we cannot inspect runtime code, but we can guard
    // declarative surfaces).
    const rationaleUpper = (spec.rationale ?? '').toUpperCase();
    for (const forbidden of FORBIDDEN_NULL_POLICY_TOKENS) {
      if (rationaleUpper.includes(forbidden)) {
        v.push({
          code: L6TemporalViolationCode.NULL_POLICY_FORBIDDEN_FALLBACK,
          field: 'rationale',
          detail: `rationale references forbidden fallback ${forbidden}`,
        });
      }
    }

    if (!spec.fieldsCovered || spec.fieldsCovered.length === 0) {
      v.push({
        code: L6TemporalViolationCode.NULL_POLICY_MISSING,
        field: 'fieldsCovered',
        detail: 'at least one field must be covered by a null policy',
      });
    }

    return {
      ok: v.length === 0,
      violations: v,
      policy_mode: policyToMode(spec.policy),
    };
  }

  /**
   * §6.5.6.6 — Null/output consistency. A feature output may never be
   * classified VALID if its null_state_class represents missingness.
   */
  validateDecision(
    decision: L6NullPolicyDecision,
    requested_validity: L6FeatureValidityState,
  ): L6NullPolicyValidationResult {
    const v: L6NullPolicyViolation[] = [];

    if (
      requested_validity === L6FeatureValidityState.VALID &&
      isMissingnessClass(decision.null_state_class)
    ) {
      v.push({
        code: L6TemporalViolationCode.NULL_STATE_INCONSISTENT_WITH_VALIDITY,
        field: 'validity_state',
        detail: `VALID incompatible with null_state_class=${decision.null_state_class}`,
      });
    }

    if (
      decision.policy_mode === L6NullPolicyMode.BLOCK &&
      requested_validity !== L6FeatureValidityState.BLOCKED
    ) {
      v.push({
        code: L6TemporalViolationCode.NULL_STATE_INCONSISTENT_WITH_VALIDITY,
        field: 'policy_mode',
        detail: 'policy_mode=BLOCK requires validity_state=BLOCKED',
      });
    }

    if (
      decision.policy_mode === L6NullPolicyMode.PROVISIONAL &&
      requested_validity !== L6FeatureValidityState.PROVISIONAL &&
      requested_validity !== L6FeatureValidityState.DEGRADED
    ) {
      v.push({
        code: L6TemporalViolationCode.NULL_STATE_INCONSISTENT_WITH_VALIDITY,
        field: 'policy_mode',
        detail: 'policy_mode=PROVISIONAL requires validity PROVISIONAL|DEGRADED',
      });
    }

    if (
      decision.null_state_class === L6NullStateClass.NONE &&
      decision.reason_code !== null
    ) {
      v.push({
        code: L6TemporalViolationCode.NULL_STATE_INCONSISTENT_WITH_VALIDITY,
        field: 'reason_code',
        detail: 'null_state_class=NONE must not carry a reason_code',
      });
    }

    if (
      isMissingnessClass(decision.null_state_class) &&
      decision.reason_code === null
    ) {
      v.push({
        code: L6TemporalViolationCode.NULL_STATE_INCONSISTENT_WITH_VALIDITY,
        field: 'reason_code',
        detail: 'missingness null_state_class requires an explicit reason_code',
      });
    }

    return { ok: v.length === 0, violations: v, policy_mode: decision.policy_mode };
  }
}
