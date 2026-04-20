/**
 * L9.5 — Lead-Lag Validator
 *
 * §9.5.5 — Enforces the lead-lag semantic lawbook: admissibility,
 * quality derivation, contradiction-voiding, causality-laundering ban,
 * and early-vs-late posture.
 */

import { L9SequenceFamily } from '../contracts/sequence-family';
import {
  L9LagContradictionPosture,
  L9LeadLagRelation,
} from '../contracts/lead-lag-relation';
import {
  L9LeadLagQualityClass,
  L9SemanticLagClass,
  deriveL9LeadLagQuality,
  getL9LeadLagAdmissibility,
  isL9LagAdmissible,
  l9LagSupportsEarlyStructure,
  l9LagSupportsOnlyLateness,
} from '../contracts/l9-lead-lag-policy';
import { L9TemporalSemanticTier } from '../contracts/l9-temporal-semantics-types';
import {
  L9TemporalSemanticViolation,
  L9TemporalSemanticViolationCode,
  violation,
} from './l9-temporal-semantic-violation-codes';

export interface L9LeadLagValidationInput {
  readonly family: L9SequenceFamily;
  readonly relation: L9LeadLagRelation;
  readonly scope_aligned: boolean;
  /** Optional declared early/late narrative for mismatch detection. */
  readonly declared_early_confirmation?: boolean;
  /** Optional declared quality class. */
  readonly declared_quality_class?: L9LeadLagQualityClass;
}

export interface L9LeadLagValidationResult {
  readonly ok: boolean;
  readonly semantic_lag_class: L9SemanticLagClass;
  readonly quality_class: L9LeadLagQualityClass;
  readonly narrowing_reasons: readonly string[];
  readonly violations: readonly L9TemporalSemanticViolation[];
}

export function validateL9LeadLag(
  input: L9LeadLagValidationInput,
): L9LeadLagValidationResult {
  const violations: L9TemporalSemanticViolation[] = [];
  const r = input.relation;

  if (!getL9LeadLagAdmissibility(input.family)) {
    violations.push(violation(
      L9TemporalSemanticViolationCode.LL_UNREGISTERED_FAMILY,
      L9TemporalSemanticTier.LEAD_LAG,
      `no admissibility registered for family ${input.family}`,
    ));
  }

  if (!Number.isFinite(r.lag_duration_ms) || r.lag_duration_ms < 0) {
    violations.push(violation(
      L9TemporalSemanticViolationCode.LL_LAG_NEGATIVE_OR_NON_FINITE,
      L9TemporalSemanticTier.LEAD_LAG,
      `lag_duration_ms=${r.lag_duration_ms} is invalid`,
    ));
  } else if (!isL9LagAdmissible(input.family, r.lag_duration_ms)) {
    violations.push(violation(
      L9TemporalSemanticViolationCode.LL_LAG_OUTSIDE_ADMISSIBLE_WINDOW,
      L9TemporalSemanticTier.LEAD_LAG,
      `lag ${r.lag_duration_ms}ms outside admissible window for ${input.family}`,
    ));
  }

  if (!input.scope_aligned) {
    violations.push(violation(
      L9TemporalSemanticViolationCode.LL_SCOPE_MISMATCH,
      L9TemporalSemanticTier.LEAD_LAG,
      'lead-lag scope mismatch',
    ));
  }

  if (!r.lineage_refs || r.lineage_refs.length === 0) {
    violations.push(violation(
      L9TemporalSemanticViolationCode.LL_LINEAGE_INCOMPLETE,
      L9TemporalSemanticTier.LEAD_LAG,
      'lead-lag relation missing lineage_refs',
    ));
  }

  const derived = deriveL9LeadLagQuality({
    family: input.family,
    lag_ms: r.lag_duration_ms,
    contradiction_posture: r.contradiction_posture,
    decay_adjustment: r.decay_adjustment,
    scope_aligned: input.scope_aligned,
    lineage_complete: r.lineage_refs?.length > 0,
  });

  // §9.5.5.6 — decisive contradiction must void the relation. This
  // check applies to BOTH the derived quality (engine bug) AND the
  // declared quality (engine lying about the posture).
  if (r.contradiction_posture === L9LagContradictionPosture.DECISIVE) {
    const derivedNotVoided =
      derived.quality_class !== L9LeadLagQualityClass.SEMANTICALLY_VOID &&
      derived.quality_class !== L9LeadLagQualityClass.BLOCKED;
    const declaredNotVoided = input.declared_quality_class !== undefined &&
      input.declared_quality_class !== L9LeadLagQualityClass.SEMANTICALLY_VOID &&
      input.declared_quality_class !== L9LeadLagQualityClass.BLOCKED;
    if (derivedNotVoided || declaredNotVoided) {
      violations.push(violation(
        L9TemporalSemanticViolationCode.LL_DECISIVE_CONTRADICTION_NOT_VOIDED,
        L9TemporalSemanticTier.LEAD_LAG,
        'decisive contradiction must void lead-lag relation',
      ));
    }
  }

  // §9.5.5.3 — causal-inference laundering
  const disclaimer = r.causal_restraint?.causal_inference_disclaimer ?? '';
  if (/caus(al|ality|ation)/i.test(disclaimer) && /proof|proven|inevitab|guarantee/i.test(disclaimer)) {
    violations.push(violation(
      L9TemporalSemanticViolationCode.LL_CAUSAL_INFERENCE_LAUNDERED,
      L9TemporalSemanticTier.LEAD_LAG,
      'causal-restraint disclaimer launders causal inference',
    ));
  }
  if (r.causal_restraint?.treated_as_temporal_only !== true) {
    violations.push(violation(
      L9TemporalSemanticViolationCode.LL_CAUSAL_INFERENCE_LAUNDERED,
      L9TemporalSemanticTier.LEAD_LAG,
      'lead-lag must declare treated_as_temporal_only:true',
    ));
  }

  // §9.5.5.7 — late-marked-as-early
  if (input.declared_early_confirmation === true &&
      l9LagSupportsOnlyLateness(derived.semantic_lag_class)) {
    violations.push(violation(
      L9TemporalSemanticViolationCode.LL_LATE_MARKED_AS_EARLY_CONFIRMATION,
      L9TemporalSemanticTier.LEAD_LAG,
      'late/too-late lag marked as early confirmation',
    ));
  }

  // Quality class mismatch
  if (input.declared_quality_class &&
      input.declared_quality_class !== derived.quality_class) {
    violations.push(violation(
      L9TemporalSemanticViolationCode.LL_QUALITY_CLASS_MISMATCH,
      L9TemporalSemanticTier.LEAD_LAG,
      `declared quality ${input.declared_quality_class} != derived ${derived.quality_class}`,
    ));
  }

  // suppress unused import in isolated builds
  void l9LagSupportsEarlyStructure;

  return {
    ok: violations.length === 0,
    semantic_lag_class: derived.semantic_lag_class,
    quality_class: derived.quality_class,
    narrowing_reasons: derived.narrowing_reasons,
    violations,
  };
}
