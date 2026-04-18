/**
 * L7.6 — Local Regime-Compatibility Validator
 *
 * §7.6.6.5 — Verifies that a local regime-compatibility result is
 * legal under the L7.6 lawbook:
 *
 *   - score lies inside [0,1]
 *   - factor weight (when consumed) lies inside the registered max
 *     legal envelope (REGIME_FACTOR_OUT_OF_BOUNDS)
 *   - subject declared at least one input class
 *     (REGIME_FACTOR_USED_WITHOUT_DECLARATION)
 *   - posture does not impersonate final regime classification
 *     (REGIME_FACTOR_IMPERSONATES_FINAL_REGIME)
 *   - factor does not override contradiction or stale/degraded posture
 *     (REGIME_FACTOR_OVERRIDES_*)
 *
 * The validator reports violations only; the engine remains the
 * authoritative producer of regime compatibility values.
 */

import {
  L7LocalRegimeResult,
  L7_LOCAL_REGIME_MAX_CONFIDENCE_INFLUENCE,
  L7LocalRegimePosture,
} from '../contracts/local-regime-compatibility';
import { L7ContradictionSeverity, compareSeverity } from '../contracts/contradiction-bundle';
import {
  L7ConfidenceViolation,
  L7ConfidenceViolationCode,
} from './l7-confidence-violation-codes';

export interface L7LocalRegimeValidationContext {
  readonly subject_id: string;
  /** Effective weight assigned to the regime-compatibility factor in policy. */
  readonly applied_factor_weight: number;
  readonly contradiction_severity: L7ContradictionSeverity;
  readonly staleness_material: boolean;
  readonly degradation_material: boolean;
  /** True if downstream code attempts to use this score as final regime classification. */
  readonly used_as_final_regime: boolean;
  /** True if downstream code uses this factor to override contradiction. */
  readonly used_to_override_contradiction: boolean;
  /** True if downstream code uses this factor to override stale/degraded posture. */
  readonly used_to_override_state: boolean;
}

export interface L7LocalRegimeValidationResult {
  readonly ok: boolean;
  readonly violations: readonly L7ConfidenceViolation[];
}

export class L7LocalRegimeCompatibilityValidator {
  validate(
    result: L7LocalRegimeResult,
    ctx: L7LocalRegimeValidationContext,
  ): L7LocalRegimeValidationResult {
    const violations: L7ConfidenceViolation[] = [];
    const sid = ctx.subject_id;

    if (
      !isFinite(result.compatibility_score) ||
      result.compatibility_score < 0 ||
      result.compatibility_score > 1
    ) {
      violations.push(
        v(
          L7ConfidenceViolationCode.REGIME_FACTOR_OUT_OF_BOUNDS,
          sid,
          `score ${result.compatibility_score} outside [0,1]`,
        ),
      );
    }
    if (
      !isFinite(ctx.applied_factor_weight) ||
      ctx.applied_factor_weight < 0 ||
      ctx.applied_factor_weight > L7_LOCAL_REGIME_MAX_CONFIDENCE_INFLUENCE
    ) {
      violations.push(
        v(
          L7ConfidenceViolationCode.REGIME_FACTOR_OUT_OF_BOUNDS,
          sid,
          `weight ${ctx.applied_factor_weight} outside [0,${L7_LOCAL_REGIME_MAX_CONFIDENCE_INFLUENCE}]`,
        ),
      );
    }
    if (result.used_without_declaration) {
      violations.push(
        v(
          L7ConfidenceViolationCode.REGIME_FACTOR_USED_WITHOUT_DECLARATION,
          sid,
          'subject did not declare any regime-compatibility input classes',
        ),
      );
    }
    if (ctx.used_as_final_regime) {
      violations.push(
        v(
          L7ConfidenceViolationCode.REGIME_FACTOR_IMPERSONATES_FINAL_REGIME,
          sid,
          'local regime-compatibility used as final regime classification',
        ),
      );
    }
    if (ctx.used_to_override_contradiction) {
      violations.push(
        v(
          L7ConfidenceViolationCode.REGIME_FACTOR_OVERRIDES_CONTRADICTION,
          sid,
          'local regime-compatibility used to override contradiction law',
        ),
      );
    }
    if (ctx.used_to_override_state) {
      violations.push(
        v(
          L7ConfidenceViolationCode.REGIME_FACTOR_OVERRIDES_STALE_OR_DEGRADED,
          sid,
          'local regime-compatibility used to override stale/degraded state',
        ),
      );
    }

    // High posture under severe contradiction is a red flag.
    if (
      result.posture === L7LocalRegimePosture.COMPATIBLE &&
      compareSeverity(ctx.contradiction_severity, L7ContradictionSeverity.SEVERE) >= 0
    ) {
      violations.push(
        v(
          L7ConfidenceViolationCode.REGIME_FACTOR_OVERRIDES_CONTRADICTION,
          sid,
          'COMPATIBLE posture asserted while contradiction severity SEVERE+',
        ),
      );
    }
    if (
      result.posture === L7LocalRegimePosture.COMPATIBLE &&
      (ctx.staleness_material || ctx.degradation_material)
    ) {
      violations.push(
        v(
          L7ConfidenceViolationCode.REGIME_FACTOR_OVERRIDES_STALE_OR_DEGRADED,
          sid,
          'COMPATIBLE posture asserted while state material stale/degraded',
        ),
      );
    }

    return { ok: violations.length === 0, violations };
  }
}

function v(
  code: L7ConfidenceViolationCode,
  subjectId: string,
  detail: string,
  context: Record<string, unknown> = {},
): L7ConfidenceViolation {
  return {
    code,
    source: 'local-regime-compatibility.validator',
    subject_id: subjectId,
    factor_group: 'REGIME_COMPATIBILITY',
    cap_class: null,
    right: null,
    detail,
    context,
  };
}
