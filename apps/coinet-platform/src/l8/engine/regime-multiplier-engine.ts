/**
 * L8.4 — RegimeMultiplierEngine
 *
 * §8.4.6.5 — Consumes classification + confidence + transition +
 * restriction posture and emits a contract-valid
 * `L8RegimeMultiplierProfileContract`. The engine narrows multipliers
 * when transition or ambiguity is high. It must never produce
 * score-shaped or action-biased outputs.
 */

import type { L8RegimeSubjectContract } from '../contracts/regime-subject.contract';
import {
  L8RegimeMultiplierProfileContract,
  L8RegimeMultiplierDimensions,
  L8_REQUIRED_MULTIPLIER_DIMENSION_NAMES,
  multiplierIsScoreShaped,
  multiplierDescriptionHasActionBias,
} from '../contracts/regime-multiplier-profile.contract';
import type { L8RegimeConfidenceContract } from '../contracts/regime-confidence.contract';
import {
  L8TransitionRiskClass,
} from '../contracts/regime-state';
import type {
  L8ClassificationOutput,
  L8TransitionOutput,
} from '../runtime/regime-execution-context';
import {
  L8RuntimeViolation,
  L8RuntimeViolationCode,
} from '../validation/l8-runtime-violation-codes';
import { L8EngineResult, fail, ok } from './engine-types';

export interface L8MultiplierEngineInput {
  readonly subject: L8RegimeSubjectContract;
  readonly regime_result_id: string;
  readonly classification: L8ClassificationOutput;
  readonly confidence: L8RegimeConfidenceContract;
  readonly transition: L8TransitionOutput;
  readonly consumed_restriction_refs: readonly string[];
  readonly compute_run_id: string;
  readonly trace_id: string;
  readonly manifest_id: string;
}

export function deriveRegimeMultiplier(
  input: L8MultiplierEngineInput,
): L8EngineResult<L8RegimeMultiplierProfileContract> {
  const violations: L8RuntimeViolation[] = [];
  const s = input.subject;

  // §8.4.6.5 — restriction guard
  if (s.restriction_consumption_policy?.required &&
      input.consumed_restriction_refs.length === 0) {
    violations.push(v(
      L8RuntimeViolationCode.MULTIPLIER_IGNORES_RESTRICTION, s,
      'subject required restriction consumption but multiplier engine got no refs',
      {},
    ));
    return fail(violations);
  }

  // Base dimensions — neutral 1.0 for all, then modulate by regime posture.
  const base: L8RegimeMultiplierDimensions = {
    trend_amplification: 1.0,
    momentum_trust_multiplier: 1.0,
    breakout_skepticism_multiplier: 1.0,
    leverage_risk_multiplier: 1.0,
    liquidity_fragility_multiplier: 1.0,
    narrative_sensitivity_multiplier: 1.0,
    risk_overhang_sensitivity_multiplier: 1.0,
  };

  // Narrow based on transition risk
  const tScore = input.transition.transition_risk_score;
  const narrow = tScore >= 0.6 ? 0.8 : tScore >= 0.35 ? 0.9 : 1.0;
  if (narrow < 1.0) {
    (Object.keys(base) as (keyof L8RegimeMultiplierDimensions)[])
      .forEach(k => {
        (base as unknown as Record<string, number>)[k] *= narrow;
      });
  }

  // Narrow based on confidence band
  const band = input.confidence.confidence_band;
  const bandFactor = band === 'FULL' ? 1.0 :
    band === 'HIGH' ? 0.95 :
      band === 'MODERATE' ? 0.85 : 0.75;
  (Object.keys(base) as (keyof L8RegimeMultiplierDimensions)[])
    .forEach(k => {
      (base as unknown as Record<string, number>)[k] *= bandFactor;
    });

  // Clamp into legal range
  const clamp = (v: number) => Math.max(0, Math.min(3, v));
  const dimensions: L8RegimeMultiplierDimensions = {
    trend_amplification: clamp(base.trend_amplification * 1.1),
    momentum_trust_multiplier: clamp(base.momentum_trust_multiplier * 1.05),
    breakout_skepticism_multiplier:
      clamp(base.breakout_skepticism_multiplier * 0.95),
    leverage_risk_multiplier: clamp(base.leverage_risk_multiplier * 0.9),
    liquidity_fragility_multiplier:
      clamp(base.liquidity_fragility_multiplier * 0.92),
    narrative_sensitivity_multiplier:
      clamp(base.narrative_sensitivity_multiplier * 1.0),
    risk_overhang_sensitivity_multiplier:
      clamp(base.risk_overhang_sensitivity_multiplier * 0.98),
  };

  // Check dimensions are in range
  for (const k of L8_REQUIRED_MULTIPLIER_DIMENSION_NAMES) {
    const val = dimensions[k];
    if (!Number.isFinite(val) || val < 0 || val > 3) {
      violations.push(v(
        L8RuntimeViolationCode.MULTIPLIER_DIMENSION_OUT_OF_RANGE, s,
        `dimension ${k} OOR: ${val}`, { dimension: k, value: val },
      ));
      return fail(violations);
    }
  }

  const description = 'regime-conditioned interpretive multiplier profile';
  if (multiplierDescriptionHasActionBias(description)) {
    violations.push(v(
      L8RuntimeViolationCode.MULTIPLIER_ACTION_BIAS, s,
      'multiplier description has action bias', {},
    ));
    return fail(violations);
  }

  const contract: L8RegimeMultiplierProfileContract = {
    multiplier_profile_id: `rmul:${input.regime_result_id}`,
    regime_subject_id: s.regime_subject_id,
    regime_result_id: input.regime_result_id,

    multiplier_contract_version: '8.3.0',
    schema_version: '8.3.0',
    policy_version: s.policy_version,

    primary_regime: input.classification.primary_regime,
    secondary_regime: input.classification.secondary_regime,
    regime_confidence_band: input.confidence.confidence_band,
    transition_risk_class:
      L8TransitionRiskClass[input.classification.transition_risk_class],

    dimensions,
    derivation_spec_ref: s.multiplier_derivation_spec.policy_id,

    restriction_consumption_refs: input.consumed_restriction_refs.map(ref => ({
      restriction_profile_ref: ref,
      consumed_rights: ['REGIME_CONDITIONING', 'MULTIPLIER_INPUT'],
    })),

    lineage_refs: {
      trace_id: input.trace_id,
      manifest_id: input.manifest_id,
    },
    compute_run_id: input.compute_run_id,
    replay_hash:
      `rhash:mul:${input.regime_result_id}:${band}:${input.classification.transition_risk_class}`,

    description,
  };

  if (multiplierIsScoreShaped({
    dimensions: contract.dimensions,
    description: contract.description,
  })) {
    violations.push(v(
      L8RuntimeViolationCode.MULTIPLIER_SCORE_SHAPED, s,
      'derived multiplier is score-shaped', {},
    ));
    return fail(violations);
  }

  return ok(contract);
}

function v(
  code: L8RuntimeViolationCode,
  s: L8RegimeSubjectContract,
  detail: string,
  context: Record<string, unknown>,
): L8RuntimeViolation {
  return {
    code,
    source: 'regime-multiplier-engine',
    nodeId: null,
    regime_run_id: null,
    regime_subject_id: s.regime_subject_id,
    detail,
    context,
  };
}
