/**
 * L8.7 — Regime Multiplier Policy Validator
 *
 * §8.7.5 / §8.7.6 / §8.7.8 — Enforces the multiplier policy on top of
 * the L8.3 structural multiplier validator. Checks:
 *   - every required dimension present + in range
 *   - not score-shaped and not uniformly directional
 *   - parent regime + confidence band + transition class all present
 *   - narrowing is applied when posture requires it
 *   - narrowing may not widen rights beyond the default
 */

import {
  L8RegimeMultiplierProfileContract,
  L8_REQUIRED_MULTIPLIER_DIMENSION_NAMES,
  L8_MULTIPLIER_MIN, L8_MULTIPLIER_MAX,
  multiplierIsScoreShaped,
  multiplierDescriptionHasActionBias,
  listMissingOrOorMultiplierDimensions,
} from '../contracts/regime-multiplier-profile.contract';
import {
  L8RegimeMultiplierNarrowingReason,
  multiplierIsUniformlyDirectional,
  multiplierProfileRespectsNarrowing,
  resolveL8DefaultMultiplierPosture,
} from '../contracts/regime-multiplier.policy';
import {
  L8RegimeRelianceViolation,
  L8RegimeRelianceViolationCode,
} from './l8-reliance-violation-codes';

/**
 * Derivation context exposed to the multiplier policy validator. This
 * tells the validator which narrowing reasons were *required* by the
 * upstream reliance posture so the check can detect missing narrowing.
 */
export interface L8MultiplierDerivationContext {
  readonly restriction_narrowed: boolean;
  readonly contradiction_unresolved: boolean;
  readonly transition_high: boolean;
  readonly ambiguity_high: boolean;
  readonly staleness_material: boolean;
  readonly degradation_material: boolean;
}

export interface L8MultiplierPolicyInput {
  readonly multiplier: L8RegimeMultiplierProfileContract;
  readonly derivation_context: L8MultiplierDerivationContext;
  readonly declared_narrowing_reasons:
    readonly L8RegimeMultiplierNarrowingReason[];
  readonly subject_ref?: string;
}

export interface L8MultiplierPolicyResult {
  readonly ok: boolean;
  readonly violations: readonly L8RegimeRelianceViolation[];
  readonly required_narrowing_reasons:
    readonly L8RegimeMultiplierNarrowingReason[];
}

function push(
  v: L8RegimeRelianceViolation[], code: L8RegimeRelianceViolationCode,
  detail: string, subject_ref?: string,
): void { v.push({ code, detail, subject_ref }); }

export function requiredMultiplierNarrowingReasons(
  ctx: L8MultiplierDerivationContext,
): readonly L8RegimeMultiplierNarrowingReason[] {
  const out: L8RegimeMultiplierNarrowingReason[] = [];
  if (ctx.restriction_narrowed) {
    out.push(L8RegimeMultiplierNarrowingReason.NARROWED_BY_RESTRICTION);
  }
  if (ctx.contradiction_unresolved) {
    out.push(L8RegimeMultiplierNarrowingReason.NARROWED_BY_CONTRADICTION);
  }
  if (ctx.transition_high) {
    out.push(L8RegimeMultiplierNarrowingReason.NARROWED_BY_TRANSITION);
  }
  if (ctx.ambiguity_high) {
    out.push(L8RegimeMultiplierNarrowingReason.NARROWED_BY_AMBIGUITY);
  }
  if (ctx.staleness_material) {
    out.push(L8RegimeMultiplierNarrowingReason.NARROWED_BY_STALENESS);
  }
  if (ctx.degradation_material) {
    out.push(L8RegimeMultiplierNarrowingReason.NARROWED_BY_DEGRADATION);
  }
  return out;
}

export function validateRegimeMultiplierPolicy(
  input: L8MultiplierPolicyInput,
): L8MultiplierPolicyResult {
  const { multiplier: m, derivation_context: ctx, subject_ref,
    declared_narrowing_reasons: declared } = input;
  const violations: L8RegimeRelianceViolation[] = [];
  const required = requiredMultiplierNarrowingReasons(ctx);

  // §8.7.5.3 — every required dimension present and in range
  const missing = listMissingOrOorMultiplierDimensions(m);
  for (const k of missing) {
    const v = m.dimensions[k];
    if (!Number.isFinite(v) || v < L8_MULTIPLIER_MIN || v > L8_MULTIPLIER_MAX) {
      push(violations,
        L8RegimeRelianceViolationCode.MULTIPLIER_DIMENSION_OUT_OF_RANGE,
        `dim.${k}=${v}`, subject_ref);
    } else {
      push(violations,
        L8RegimeRelianceViolationCode.MULTIPLIER_MISSING_DIMENSION,
        `dim.${k} missing`, subject_ref);
    }
  }
  // Belt-and-braces: enforce every required name is present
  for (const n of L8_REQUIRED_MULTIPLIER_DIMENSION_NAMES) {
    const v = (m.dimensions as unknown as Record<string, number>)[n];
    if (v === undefined) {
      push(violations,
        L8RegimeRelianceViolationCode.MULTIPLIER_MISSING_DIMENSION,
        `dim.${n} missing`, subject_ref);
    }
  }

  // §8.7.6.4 — structural score-shape and uniform-direction detectors
  if (multiplierIsScoreShaped(m)) {
    push(violations,
      L8RegimeRelianceViolationCode.MULTIPLIER_SCORE_SHAPED,
      `dimensions collapse/out-of-range or description resembles a score`,
      subject_ref);
  }
  if (multiplierIsUniformlyDirectional(m.dimensions)) {
    push(violations,
      L8RegimeRelianceViolationCode.MULTIPLIER_UNIFORMLY_DIRECTIONAL,
      `all dimensions on the same side of neutral`, subject_ref);
  }
  if (multiplierDescriptionHasActionBias(m.description)) {
    push(violations,
      L8RegimeRelianceViolationCode.MULTIPLIER_ACTION_BIASED,
      `description carries action-biased wording`, subject_ref);
  }

  // §8.7.5.4 — parent-regime + band + risk must all be present
  if (!m.primary_regime) {
    push(violations,
      L8RegimeRelianceViolationCode.MULTIPLIER_PARENT_REGIME_MISSING,
      `primary_regime missing`, subject_ref);
  }
  if (!m.regime_confidence_band) {
    push(violations,
      L8RegimeRelianceViolationCode.MULTIPLIER_CONFIDENCE_BAND_MISSING,
      `regime_confidence_band missing`, subject_ref);
  }
  if (!m.transition_risk_class) {
    push(violations,
      L8RegimeRelianceViolationCode.MULTIPLIER_TRANSITION_CLASS_MISSING,
      `transition_risk_class missing`, subject_ref);
  }

  // §8.7.8.3 — if narrowing is required, declared reasons must contain it
  for (const r of required) {
    if (!declared.includes(r)) {
      push(violations,
        L8RegimeRelianceViolationCode.MULTIPLIER_NARROWING_REASON_MISSING,
        `required narrowing reason '${r}' not declared`, subject_ref);
    }
  }

  // §8.7.5.6 — ignoring transition/restriction/contradiction
  if (ctx.transition_high &&
      !declared.includes(L8RegimeMultiplierNarrowingReason.NARROWED_BY_TRANSITION)) {
    push(violations,
      L8RegimeRelianceViolationCode.MULTIPLIER_IGNORES_TRANSITION,
      `transition_high but no NARROWED_BY_TRANSITION`, subject_ref);
  }
  if (ctx.restriction_narrowed &&
      !declared.includes(L8RegimeMultiplierNarrowingReason.NARROWED_BY_RESTRICTION)) {
    push(violations,
      L8RegimeRelianceViolationCode.MULTIPLIER_IGNORES_RESTRICTION,
      `restriction_narrowed but no NARROWED_BY_RESTRICTION`, subject_ref);
  }
  if (ctx.contradiction_unresolved &&
      !declared.includes(L8RegimeMultiplierNarrowingReason.NARROWED_BY_CONTRADICTION)) {
    push(violations,
      L8RegimeRelianceViolationCode.MULTIPLIER_IGNORES_CONTRADICTION,
      `contradiction_unresolved but no NARROWED_BY_CONTRADICTION`, subject_ref);
  }

  // §8.7.6.5 — narrowed posture may not widen rights beyond default.
  //   Every dimension of the emitted profile must be at least as
  //   neutral as the default when narrowing was required.
  if (required.length > 0 && m.primary_regime) {
    const defaults = resolveL8DefaultMultiplierPosture(m.primary_regime);
    if (!multiplierProfileRespectsNarrowing(m.dimensions, defaults)) {
      push(violations,
        L8RegimeRelianceViolationCode.MULTIPLIER_NARROWING_WIDENS_RIGHTS,
        `narrowed posture further from neutral than template default`,
        subject_ref);
    }
  }

  return { ok: violations.length === 0, violations, required_narrowing_reasons: required };
}
