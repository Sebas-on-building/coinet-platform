/**
 * L13.5 — Confidence Ceiling Engine
 *
 * §13.5.15 — Derives the maximum legal expression confidence band
 * for a Layer 13 output, given:
 *   - the L13.2 confidence breakdown (inherited ceiling)
 *   - the L13.2 uncertainty profile (active conditions)
 *   - the L13.4 grounding result (claim-level posture)
 *   - the L13.5 restriction composition (composed restriction
 *     level), if available at derivation time
 *
 * Law (§13.5.15.3):
 *   - The engine may only NARROW the inherited band; it never
 *     raises it.
 *   - Each active narrowing factor lowers the ceiling
 *     monotonically using `l13NarrowConfidenceBand`.
 *   - When grounding posture is blocked-unsupported or
 *     blocked-contradicted, the ceiling collapses to BLOCKED.
 *   - When the restriction composition level is BLOCKED, the
 *     ceiling collapses to BLOCKED.
 *
 * The engine returns the derived ceiling, the ordered list of
 * reason codes, and the set of `L13ExpressionUncertaintySource`
 * entries that materially narrowed it.
 */

import type { L13AIInputPackage } from '../contracts/ai-input-package';
import { L13ExplanationConfidenceBand } from '../contracts/confidence-breakdown';
import type { L13ClaimGroundingResult } from '../contracts/claim-grounding';
import { L13GroundingReadinessClass } from '../contracts/claim-grounding';
import {
  l13NarrowConfidenceBand,
  l13WouldRaiseConfidence,
} from '../contracts/explanation-confidence-band';
import {
  L13ConfidenceCeilingReasonCode,
  L13ExpressionUncertaintySource,
} from '../contracts/uncertainty-disclosure-profile';
import { L13RestrictionLevel } from '../contracts/restriction-composition';

export interface L13ConfidenceCeilingInput {
  readonly input_package: L13AIInputPackage;
  readonly grounding_result: L13ClaimGroundingResult;
  /**
   * Optional. When provided, BLOCKED restriction collapses the
   * ceiling. The restriction-composition engine may run before or
   * after this engine; when run after, callers should re-derive
   * the ceiling once the composition is known.
   */
  readonly composed_restriction_level?: L13RestrictionLevel;
}

export interface L13ConfidenceCeilingResult {
  readonly inherited_band: L13ExplanationConfidenceBand;
  readonly confidence_ceiling: L13ExplanationConfidenceBand;
  readonly reason_codes: readonly L13ConfidenceCeilingReasonCode[];
  readonly contributing_sources:
    readonly L13ExpressionUncertaintySource[];
}

/**
 * Map from a single L13.2 uncertainty source enum to one or more
 * L13.5 expression sources. The expression layer refines several
 * L13.2 names (e.g., `L9_DECAY` → `L9_SEQUENCE_DECAY`) and adds
 * granular sources that L13.2 does not distinguish.
 */
export const L13_2_TO_L13_5_UNCERTAINTY_MAP:
  Readonly<Record<string, readonly L13ExpressionUncertaintySource[]>> = {
  L7_CONTRADICTION: [L13ExpressionUncertaintySource.L7_CONTRADICTION],
  L8_TRANSITION_RISK: [L13ExpressionUncertaintySource.L8_TRANSITION_RISK],
  L9_SEQUENCE_AMBIGUITY: [
    L13ExpressionUncertaintySource.L9_SEQUENCE_AMBIGUITY,
  ],
  L9_DECAY: [L13ExpressionUncertaintySource.L9_SEQUENCE_DECAY],
  L10_NARROW_HYPOTHESIS_SPREAD: [
    L13ExpressionUncertaintySource.L10_NARROW_HYPOTHESIS_SPREAD,
  ],
  L11_MISSING_DATA: [
    L13ExpressionUncertaintySource.L11_MISSING_VISIBILITY,
  ],
  L11_DRIFT: [L13ExpressionUncertaintySource.L11_DRIFT],
  L12_NARROW_SCENARIO_SPREAD: [
    L13ExpressionUncertaintySource.L12_NARROW_SCENARIO_SPREAD,
  ],
  L12_ACTIVE_INVALIDATION: [
    L13ExpressionUncertaintySource.L12_ACTIVE_INVALIDATION,
  ],
  L12_UNRESOLVED_TRIGGER: [
    L13ExpressionUncertaintySource.L12_UNRESOLVED_TRIGGER,
  ],
  L12_CONFIDENCE_CAP: [
    L13ExpressionUncertaintySource.L12_PATH_CONFIDENCE_CAP,
  ],
};

/**
 * §13.5.4 — Translate the L13.2 uncertainty profile + grounding
 * result into the expression uncertainty source set. Sources are
 * de-duplicated; ordering follows the enum declaration order.
 */
export function deriveL13ExpressionUncertaintySources(
  input: L13ConfidenceCeilingInput,
): readonly L13ExpressionUncertaintySource[] {
  const pkg = input.input_package;
  const profile = pkg.uncertainty_profile;
  const set = new Set<L13ExpressionUncertaintySource>();
  for (const src of profile.uncertainty_sources) {
    const mapped = L13_2_TO_L13_5_UNCERTAINTY_MAP[String(src)] ?? [];
    for (const m of mapped) set.add(m);
  }
  // Augment with conditions implied by booleans (defensive).
  if (profile.active_invalidation_present) {
    set.add(L13ExpressionUncertaintySource.L12_ACTIVE_INVALIDATION);
  }
  if (profile.unresolved_trigger_present) {
    set.add(L13ExpressionUncertaintySource.L12_UNRESOLVED_TRIGGER);
  }
  if (profile.active_contradiction_present) {
    set.add(L13ExpressionUncertaintySource.L7_CONTRADICTION);
  }
  if (profile.material_missing_data_present) {
    set.add(L13ExpressionUncertaintySource.L11_MISSING_VISIBILITY);
  }
  if (profile.material_drift_present) {
    set.add(L13ExpressionUncertaintySource.L11_DRIFT);
  }
  // Grounding-derived sources (§13.5.4 — claim-level narrowing).
  const grounding = input.grounding_result;
  if (grounding.rewrite_required_claim_refs.length > 0) {
    set.add(L13ExpressionUncertaintySource.L13_GROUNDED_CLAIM_NARROWED);
  }
  if (
    grounding.blocked_claim_refs.length > 0 ||
    grounding.any_unsupported_claim_emitted
  ) {
    set.add(
      L13ExpressionUncertaintySource.L13_GROUNDED_CLAIM_UNCERTAIN_ONLY,
    );
  }
  // Confidence breakdown signal: very-low overall confidence is an
  // expression-layer source in its own right.
  const inherited =
    pkg.confidence_breakdown.overall_explanation_confidence_band;
  if (
    inherited === L13ExplanationConfidenceBand.VERY_LOW ||
    inherited === L13ExplanationConfidenceBand.LOW
  ) {
    set.add(L13ExpressionUncertaintySource.LOW_SIGNAL_CONFIDENCE);
  }
  // Preserve enum declaration order.
  const ordered: L13ExpressionUncertaintySource[] = [];
  for (const value of Object.values(L13ExpressionUncertaintySource)) {
    if (set.has(value)) ordered.push(value);
  }
  return ordered;
}

/**
 * §13.5.15 — Derive the confidence ceiling. Returns inherited band
 * and final ceiling separately so callers may audit narrowing.
 */
export function deriveL13ConfidenceCeiling(
  input: L13ConfidenceCeilingInput,
): L13ConfidenceCeilingResult {
  const pkg = input.input_package;
  const inherited =
    pkg.confidence_breakdown.overall_explanation_confidence_band;
  const profile = pkg.uncertainty_profile;
  const grounding = input.grounding_result;

  let ceiling = inherited;
  const reasonCodes: L13ConfidenceCeilingReasonCode[] = [];
  const contributing: L13ExpressionUncertaintySource[] = [];

  // BLOCKED collapsing — restriction first, then grounding.
  if (
    input.composed_restriction_level === L13RestrictionLevel.BLOCKED
  ) {
    return {
      inherited_band: inherited,
      confidence_ceiling: L13ExplanationConfidenceBand.BLOCKED,
      reason_codes: [
        L13ConfidenceCeilingReasonCode.BLOCKED_BY_RESTRICTION,
      ],
      contributing_sources: [],
    };
  }
  if (
    grounding.grounding_readiness_class ===
      L13GroundingReadinessClass.GROUNDING_BLOCKED_UNSUPPORTED ||
    grounding.grounding_readiness_class ===
      L13GroundingReadinessClass.GROUNDING_BLOCKED_CONTRADICTED ||
    grounding.any_contradicted_claim_emitted
  ) {
    return {
      inherited_band: inherited,
      confidence_ceiling: L13ExplanationConfidenceBand.BLOCKED,
      reason_codes: [
        L13ConfidenceCeilingReasonCode.BLOCKED_BY_CONTRADICTED_EMITTED_CLAIM,
      ],
      contributing_sources: [
        L13ExpressionUncertaintySource.L13_GROUNDED_CLAIM_UNCERTAIN_ONLY,
      ],
    };
  }

  // Narrowing factors — applied in deterministic order.
  const both =
    profile.active_invalidation_present &&
    profile.unresolved_trigger_present;
  if (both) {
    ceiling = l13NarrowConfidenceBand(
      ceiling,
      L13ExplanationConfidenceBand.LOW,
    );
    reasonCodes.push(
      L13ConfidenceCeilingReasonCode.LOWERED_BY_BOTH_INVALIDATION_AND_TRIGGER,
    );
    contributing.push(
      L13ExpressionUncertaintySource.L12_ACTIVE_INVALIDATION,
      L13ExpressionUncertaintySource.L12_UNRESOLVED_TRIGGER,
    );
  } else {
    if (profile.active_invalidation_present) {
      ceiling = l13NarrowConfidenceBand(
        ceiling,
        L13ExplanationConfidenceBand.MEDIUM,
      );
      reasonCodes.push(
        L13ConfidenceCeilingReasonCode.LOWERED_BY_ACTIVE_INVALIDATION,
      );
      contributing.push(
        L13ExpressionUncertaintySource.L12_ACTIVE_INVALIDATION,
      );
    }
    if (profile.unresolved_trigger_present) {
      ceiling = l13NarrowConfidenceBand(
        ceiling,
        L13ExplanationConfidenceBand.MEDIUM,
      );
      reasonCodes.push(
        L13ConfidenceCeilingReasonCode.LOWERED_BY_UNRESOLVED_TRIGGER,
      );
      contributing.push(
        L13ExpressionUncertaintySource.L12_UNRESOLVED_TRIGGER,
      );
    }
  }
  if (profile.active_contradiction_present) {
    ceiling = l13NarrowConfidenceBand(
      ceiling,
      L13ExplanationConfidenceBand.MEDIUM,
    );
    reasonCodes.push(
      L13ConfidenceCeilingReasonCode.LOWERED_BY_CONTRADICTION,
    );
    contributing.push(L13ExpressionUncertaintySource.L7_CONTRADICTION);
  }
  if (profile.narrow_spread_present) {
    // Cannot tell scenario-vs-hypothesis from the boolean alone;
    // record both sources if their enum entries are present.
    const hasScenarioSpread = profile.uncertainty_sources.some(
      s => String(s) === 'L12_NARROW_SCENARIO_SPREAD',
    );
    const hasHypothesisSpread = profile.uncertainty_sources.some(
      s => String(s) === 'L10_NARROW_HYPOTHESIS_SPREAD',
    );
    if (hasScenarioSpread) {
      ceiling = l13NarrowConfidenceBand(
        ceiling,
        L13ExplanationConfidenceBand.MEDIUM,
      );
      reasonCodes.push(
        L13ConfidenceCeilingReasonCode.LOWERED_BY_NARROW_SCENARIO_SPREAD,
      );
      contributing.push(
        L13ExpressionUncertaintySource.L12_NARROW_SCENARIO_SPREAD,
      );
    }
    if (hasHypothesisSpread) {
      ceiling = l13NarrowConfidenceBand(
        ceiling,
        L13ExplanationConfidenceBand.MEDIUM,
      );
      reasonCodes.push(
        L13ConfidenceCeilingReasonCode.LOWERED_BY_NARROW_HYPOTHESIS_SPREAD,
      );
      contributing.push(
        L13ExpressionUncertaintySource.L10_NARROW_HYPOTHESIS_SPREAD,
      );
    }
    if (!hasScenarioSpread && !hasHypothesisSpread) {
      // Defensive — narrow_spread_present but neither source listed.
      ceiling = l13NarrowConfidenceBand(
        ceiling,
        L13ExplanationConfidenceBand.MEDIUM,
      );
      reasonCodes.push(
        L13ConfidenceCeilingReasonCode.LOWERED_BY_NARROW_SCENARIO_SPREAD,
      );
    }
  }
  const bothMissingAndDrift =
    profile.material_missing_data_present &&
    profile.material_drift_present;
  if (bothMissingAndDrift) {
    ceiling = l13NarrowConfidenceBand(
      ceiling,
      L13ExplanationConfidenceBand.LOW,
    );
    reasonCodes.push(
      L13ConfidenceCeilingReasonCode.LOWERED_BY_MISSING_VISIBILITY_AND_DRIFT,
    );
    contributing.push(
      L13ExpressionUncertaintySource.L11_MISSING_VISIBILITY,
      L13ExpressionUncertaintySource.L11_DRIFT,
    );
  } else {
    if (profile.material_missing_data_present) {
      ceiling = l13NarrowConfidenceBand(
        ceiling,
        L13ExplanationConfidenceBand.MEDIUM,
      );
      reasonCodes.push(
        L13ConfidenceCeilingReasonCode.LOWERED_BY_MISSING_VISIBILITY,
      );
      contributing.push(
        L13ExpressionUncertaintySource.L11_MISSING_VISIBILITY,
      );
    }
    if (profile.material_drift_present) {
      ceiling = l13NarrowConfidenceBand(
        ceiling,
        L13ExplanationConfidenceBand.MEDIUM,
      );
      reasonCodes.push(L13ConfidenceCeilingReasonCode.LOWERED_BY_DRIFT);
      contributing.push(L13ExpressionUncertaintySource.L11_DRIFT);
    }
  }
  if (
    profile.uncertainty_sources.some(
      s => String(s) === 'L8_TRANSITION_RISK',
    )
  ) {
    ceiling = l13NarrowConfidenceBand(
      ceiling,
      L13ExplanationConfidenceBand.MEDIUM,
    );
    reasonCodes.push(
      L13ConfidenceCeilingReasonCode.LOWERED_BY_TRANSITION_RISK,
    );
    contributing.push(L13ExpressionUncertaintySource.L8_TRANSITION_RISK);
  }
  if (
    profile.uncertainty_sources.some(
      s => String(s) === 'L9_SEQUENCE_AMBIGUITY',
    )
  ) {
    ceiling = l13NarrowConfidenceBand(
      ceiling,
      L13ExplanationConfidenceBand.MEDIUM,
    );
    reasonCodes.push(
      L13ConfidenceCeilingReasonCode.LOWERED_BY_SEQUENCE_AMBIGUITY,
    );
    contributing.push(
      L13ExpressionUncertaintySource.L9_SEQUENCE_AMBIGUITY,
    );
  }
  // Claim-level narrowing.
  if (grounding.rewrite_required_claim_refs.length > 0) {
    ceiling = l13NarrowConfidenceBand(
      ceiling,
      L13ExplanationConfidenceBand.LOW,
    );
    reasonCodes.push(
      L13ConfidenceCeilingReasonCode.LOWERED_BY_CLAIM_LEVEL_NARROWING,
    );
    contributing.push(
      L13ExpressionUncertaintySource.L13_GROUNDED_CLAIM_NARROWED,
    );
  }
  // Low-signal confidence — when inherited was already low, record
  // the source even though no further narrowing is required.
  if (
    inherited === L13ExplanationConfidenceBand.VERY_LOW ||
    inherited === L13ExplanationConfidenceBand.LOW
  ) {
    reasonCodes.push(
      L13ConfidenceCeilingReasonCode.LOWERED_BY_LOW_SIGNAL_CONFIDENCE,
    );
    contributing.push(
      L13ExpressionUncertaintySource.LOW_SIGNAL_CONFIDENCE,
    );
  }
  if (reasonCodes.length === 0) {
    reasonCodes.push(
      L13ConfidenceCeilingReasonCode.CEILING_INHERITED_UNCHANGED,
    );
  }

  // Defense in depth: never raise above inherited.
  if (l13WouldRaiseConfidence(inherited, ceiling)) {
    ceiling = inherited;
  }

  // Deduplicate contributing sources while preserving enum order.
  const seen = new Set<L13ExpressionUncertaintySource>();
  const ordered: L13ExpressionUncertaintySource[] = [];
  for (const v of Object.values(L13ExpressionUncertaintySource)) {
    if (contributing.includes(v) && !seen.has(v)) {
      ordered.push(v);
      seen.add(v);
    }
  }

  return {
    inherited_band: inherited,
    confidence_ceiling: ceiling,
    reason_codes: reasonCodes,
    contributing_sources: ordered,
  };
}
