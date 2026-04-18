/**
 * L8.2 — Regime Output Object Validator
 *
 * §8.2.10.3 — Validates a proposed regime output object against the
 * L8.2 object-model requirements: it must be anchored to a governed
 * regime state, carry the expected posture flags, and match a
 * registered output class.
 *
 * This layer is deliberately stricter than the L8.1 output-surface
 * registry: it enforces object-shape discipline per output class, not
 * just surface registration.
 */

import { L8RegimeOutputClass } from '../contracts/regime-output-class';
import { L8RegimeObjectViolationCode } from '../contracts/regime-output-class';
import {
  L8RegimeOutputClassRegistry,
  getDefaultL8RegimeOutputClassRegistry,
} from '../registry/regime-output-class.registry';
import { containsL8ForbiddenNaming } from '../contracts/l8-boundary';

export interface L8RegimeOutputObject {
  readonly output_class: L8RegimeOutputClass;
  readonly regime_state_id: string;
  readonly description: string;
  /** Supporting refs anchored to L6/L7 governed surfaces. */
  readonly supporting_surface_refs: readonly string[];
  /** L7 contradiction bundle ref, when required. */
  readonly contradiction_bundle_ref: string | null;
  /** L7 restriction profile ref, when required. */
  readonly restriction_profile_ref: string | null;
  /** Whether the caller preserved ambiguity (coexistence) posture. */
  readonly preserves_ambiguity_posture: boolean;
  /** Shape check — multipliers must anchor to regime_state_id. */
  readonly is_final_score_shape: boolean;
}

export interface L8RegimeOutputIssue {
  readonly code: L8RegimeObjectViolationCode;
  readonly message: string;
  readonly details?: Record<string, unknown>;
}

export interface L8RegimeOutputReport {
  readonly valid: boolean;
  readonly issues: readonly L8RegimeOutputIssue[];
}

export function validateRegimeOutputObject(
  output: L8RegimeOutputObject,
  registry:
    L8RegimeOutputClassRegistry = getDefaultL8RegimeOutputClassRegistry(),
): L8RegimeOutputReport {
  const issues: L8RegimeOutputIssue[] = [];

  if (!registry.isRegistered(output.output_class)) {
    issues.push({
      code: L8RegimeObjectViolationCode.OUTPUT_UNREGISTERED_CLASS,
      message: `Output class ${output.output_class} is not registered`,
    });
    return { valid: false, issues };
  }

  if (!output.regime_state_id) {
    issues.push({
      code: L8RegimeObjectViolationCode.OUTPUT_MISSING_REGIME_ANCHOR,
      message: 'Output must anchor to a regime_state_id',
    });
  }

  if (registry.requiresEvidence(output.output_class)) {
    if (!output.supporting_surface_refs ||
        output.supporting_surface_refs.length === 0) {
      issues.push({
        code: L8RegimeObjectViolationCode.OUTPUT_MISSING_EVIDENCE,
        message:
          `Output class ${output.output_class} requires evidence refs but none provided`,
      });
    }
  }

  if (registry.requiresContradictionPosture(output.output_class)) {
    if (!output.contradiction_bundle_ref) {
      issues.push({
        code: L8RegimeObjectViolationCode.OUTPUT_MISSING_CONTRADICTION_POSTURE,
        message:
          `Output class ${output.output_class} requires an L7 contradiction bundle ref`,
      });
    }
  }

  if (registry.requiresRestrictionPosture(output.output_class)) {
    if (!output.restriction_profile_ref) {
      issues.push({
        code: L8RegimeObjectViolationCode.OUTPUT_MISSING_RESTRICTION_POSTURE,
        message:
          `Output class ${output.output_class} requires an L7 restriction profile ref`,
      });
    }
  }

  if (registry.requiresAmbiguityPosture(output.output_class)) {
    if (!output.preserves_ambiguity_posture) {
      issues.push({
        code: L8RegimeObjectViolationCode.OUTPUT_MISSING_AMBIGUITY_POSTURE,
        message:
          `Output class ${output.output_class} must preserve ambiguity posture`,
      });
    }
  }

  if (output.output_class === L8RegimeOutputClass.REGIME_MULTIPLIER_PROFILE &&
      output.is_final_score_shape) {
    issues.push({
      code: L8RegimeObjectViolationCode.OUTPUT_SCORE_OVERRIDE,
      message:
        'Multiplier profile must not emit a final score shape (§8.2.8.5)',
    });
  }

  if (containsL8ForbiddenNaming(output.description)) {
    issues.push({
      code: L8RegimeObjectViolationCode.OUTPUT_JUDGMENT_LEAK,
      message:
        'Output description contains forbidden judgment/scenario/recommendation semantics',
    });
  }

  return { valid: issues.length === 0, issues };
}
