/**
 * L8.4 — RegimeConfidenceEngine
 *
 * §8.4.6.4 — Consumes classified regime state + transition profile +
 * quality outputs + consumed L7 surfaces, derives a raw regime-call
 * confidence, applies the subject's cap-chain, and emits a
 * contract-valid `L8RegimeConfidenceContract`.
 */

import type { L8RegimeSubjectContract } from '../contracts/regime-subject.contract';
import {
  L8RegimeConfidenceContract,
  L8RegimeConfidenceFactors,
  L8ConfidenceCap,
  resolveL8RegimeConfidenceBand,
  l8CapChainIsLegal,
} from '../contracts/regime-confidence.contract';
import type {
  L8ClassificationOutput,
  L8TransitionOutput,
  L8QualityOutput,
} from '../runtime/regime-execution-context';
import {
  L8RuntimeViolation,
  L8RuntimeViolationCode,
} from '../validation/l8-runtime-violation-codes';
import { L8EngineResult, fail, ok } from './engine-types';

export interface L8ConfidenceEngineInput {
  readonly subject: L8RegimeSubjectContract;
  readonly regime_result_id: string;
  readonly classification: L8ClassificationOutput;
  readonly transition: L8TransitionOutput;
  readonly qualities: readonly L8QualityOutput[];
  readonly consumed_restriction_refs: readonly string[];
  readonly consumed_contradiction_refs: readonly string[];
  /**
   * §8.4.4.3 — Set by the validation-consumption resolver when at least
   * one consumed L7 surface was narrowed (contradiction posture or
   * restricted rights). When true, the cap chain applies a RESTRICTION
   * cap.
   */
  readonly had_narrowed_consumption: boolean;
  readonly historical_reliability_score: number;
  readonly cross_domain_agreement_score: number;
  readonly validation_quality_posture_score: number;
  readonly support_breadth_score: number;
  readonly freshness_score: number;
  readonly compute_run_id: string;
  readonly trace_id: string;
  readonly manifest_id: string;
}

export function deriveRegimeConfidence(
  input: L8ConfidenceEngineInput,
): L8EngineResult<L8RegimeConfidenceContract> {
  const violations: L8RuntimeViolation[] = [];
  const s = input.subject;

  const ambiguity = input.qualities.find(q => q.domain === 'AMBIGUITY');
  const staleness = input.qualities.find(q => q.domain === 'STALENESS');
  const degradation = input.qualities.find(q => q.domain === 'DEGRADATION');

  if (!ambiguity || !staleness || !degradation) {
    violations.push(v(
      L8RuntimeViolationCode.CONFIDENCE_BEFORE_CLASSIFICATION, s,
      'confidence engine invoked before full quality evaluation', {},
    ));
    return fail(violations);
  }

  // §8.4.6.4 — restriction consumption guard
  if (s.restriction_consumption_policy?.required &&
      input.consumed_restriction_refs.length === 0) {
    violations.push(v(
      L8RuntimeViolationCode.CONFIDENCE_MISSING_RESTRICTION_REFS, s,
      'subject required restriction consumption but no refs provided',
      {},
    ));
    return fail(violations);
  }

  // §8.4.6.4 — factor breakdown
  const factors: L8RegimeConfidenceFactors = {
    support_breadth: clamp01(input.support_breadth_score),
    freshness: clamp01(input.freshness_score),
    validation_quality_posture:
      clamp01(input.validation_quality_posture_score),
    contradiction_pressure:
      1 - Math.min(1, input.consumed_contradiction_refs.length / 4),
    transition_instability: 1 - input.transition.transition_risk_score,
    cross_domain_agreement: clamp01(input.cross_domain_agreement_score),
    historical_reliability: clamp01(input.historical_reliability_score),
    ambiguity_pressure: 1 - ambiguity.score,
  };

  const weights = s.confidence_derivation_spec.factor_weights;
  const names = s.confidence_derivation_spec.required_factors;

  let weighted = 0;
  let weightSum = 0;
  for (const name of names) {
    const w = weights[name] ?? 0;
    const val = (factors as unknown as Record<string, number>)[name];
    if (typeof val !== 'number' || !Number.isFinite(val)) {
      violations.push(v(
        L8RuntimeViolationCode.CONFIDENCE_SCORE_OUT_OF_RANGE, s,
        `factor ${name} missing from computed breakdown`, { name },
      ));
      return fail(violations);
    }
    weighted += w * val;
    weightSum += w;
  }
  const raw = weightSum > 0 ? Math.max(0, Math.min(1, weighted / weightSum)) : 0;

  // §8.4.6.4 — cap chain
  const caps: L8ConfidenceCap[] = [];
  let capped = raw;
  if (input.transition.transition_risk_score >= 0.6) {
    const cap = Math.min(capped, 0.5);
    caps.push({
      cap_id: 'regime-cap-transition-high',
      cap_reason: 'TRANSITION_HIGH',
      max_after_cap: cap,
      applied: true,
    });
    capped = cap;
  } else if (input.transition.transition_risk_score >= 0.35) {
    const cap = Math.min(capped, 0.7);
    caps.push({
      cap_id: 'regime-cap-transition-elevated',
      cap_reason: 'TRANSITION_HIGH',
      max_after_cap: cap,
      applied: capped > cap,
    });
    if (capped > cap) capped = cap;
  }
  if (ambiguity.score >= 0.5) {
    const cap = Math.min(capped, 0.55);
    caps.push({
      cap_id: 'regime-cap-ambiguity',
      cap_reason: 'AMBIGUITY_MATERIAL',
      max_after_cap: cap,
      applied: capped > cap,
    });
    if (capped > cap) capped = cap;
  }
  if (staleness.score >= 0.5) {
    const cap = Math.min(capped, 0.6);
    caps.push({
      cap_id: 'regime-cap-staleness',
      cap_reason: 'STALENESS_MATERIAL',
      max_after_cap: cap,
      applied: capped > cap,
    });
    if (capped > cap) capped = cap;
  }
  if (degradation.score >= 0.5) {
    const cap = Math.min(capped, 0.55);
    caps.push({
      cap_id: 'regime-cap-degradation',
      cap_reason: 'DEGRADATION_MATERIAL',
      max_after_cap: cap,
      applied: capped > cap,
    });
    if (capped > cap) capped = cap;
  }
  if (input.had_narrowed_consumption) {
    // Apply a restriction cap when consumption was actually narrowed.
    const cap = Math.min(capped, 0.85);
    caps.push({
      cap_id: 'regime-cap-restriction',
      cap_reason: 'RESTRICTION_TIGHT',
      max_after_cap: cap,
      applied: capped > cap,
    });
    if (capped > cap) capped = cap;
  }

  if (!l8CapChainIsLegal({
    confidence_score_raw: raw,
    confidence_score_capped: capped,
    cap_chain: caps,
  })) {
    violations.push(v(
      L8RuntimeViolationCode.CONFIDENCE_CAP_CHAIN_ILLEGAL, s,
      'computed cap chain illegal vs raw/capped scores', { raw, capped },
    ));
    return fail(violations);
  }

  // §8.4.6.4 — explicit ignores guards
  if (ambiguity.score >= 0.4 && capped >= 0.85) {
    violations.push(v(
      L8RuntimeViolationCode.CONFIDENCE_IGNORES_AMBIGUITY, s,
      `capped=${capped} while ambiguity=${ambiguity.score}`, {},
    ));
    return fail(violations);
  }
  if (input.transition.transition_risk_score >= 0.6 && capped >= 0.6) {
    violations.push(v(
      L8RuntimeViolationCode.CONFIDENCE_IGNORES_TRANSITION, s,
      `capped=${capped} while transition=${input.transition.transition_risk_score}`,
      {},
    ));
    return fail(violations);
  }
  if (staleness.score >= 0.5 && capped >= 0.7) {
    violations.push(v(
      L8RuntimeViolationCode.CONFIDENCE_IGNORES_STALENESS, s,
      `capped=${capped} while staleness=${staleness.score}`, {},
    ));
    return fail(violations);
  }
  if (degradation.score >= 0.5 && capped >= 0.6) {
    violations.push(v(
      L8RuntimeViolationCode.CONFIDENCE_IGNORES_DEGRADATION, s,
      `capped=${capped} while degradation=${degradation.score}`, {},
    ));
    return fail(violations);
  }

  const contract: L8RegimeConfidenceContract = {
    confidence_assessment_id: `rconf:${input.regime_result_id}`,
    regime_subject_id: s.regime_subject_id,
    regime_result_id: input.regime_result_id,

    confidence_contract_version: '8.3.0',
    schema_version: '8.3.0',
    policy_version: s.policy_version,

    confidence_score_raw: raw,
    confidence_score_capped: capped,
    confidence_band: resolveL8RegimeConfidenceBand(capped),

    factor_breakdown: factors,
    cap_chain: caps,
    rationale_codes: [
      `transition_class:${input.classification.transition_risk_class}`,
      `coexistence:${input.classification.coexistence_class}`,
    ],

    l7_restriction_profile_refs: [...input.consumed_restriction_refs].sort(),
    l7_contradiction_bundle_refs: [...input.consumed_contradiction_refs].sort(),

    lineage_refs: {
      trace_id: input.trace_id,
      manifest_id: input.manifest_id,
    },
    compute_run_id: input.compute_run_id,
    replay_hash: `rhash:conf:${input.regime_result_id}:${raw.toFixed(3)}:${capped.toFixed(3)}`,
  };

  return ok(contract);
}

function clamp01(x: number): number {
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(1, x));
}

function v(
  code: L8RuntimeViolationCode,
  s: L8RegimeSubjectContract,
  detail: string,
  context: Record<string, unknown>,
): L8RuntimeViolation {
  return {
    code,
    source: 'regime-confidence-engine',
    nodeId: null,
    regime_run_id: null,
    regime_subject_id: s.regime_subject_id,
    detail,
    context,
  };
}
