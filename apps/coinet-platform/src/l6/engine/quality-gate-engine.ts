/**
 * L6.4 — QualityGateEngine
 *
 * §6.4.6.5 — Classifies primitive outputs as VALID / ABSENT / DEGRADED /
 * PROVISIONAL / BLOCKED from raw quality, freshness, null, and warmup inputs.
 * This is the ONLY legal place that decides a feature's validity state.
 */

import {
  L6FeatureValidityState,
  L6QualityState,
  L6FreshnessState,
  L6NullState,
  isValidEmissionLegal,
  requiredValidityStateFor,
} from '../contracts/feature-validity-state';
import { FeatureDefinitionContract } from '../contracts/feature-definition.contract';

export interface QualityGateInput {
  readonly input_quality_score: number;
  readonly freshness_score: number;
  readonly confidence_score: number;
  readonly warmup_satisfied: boolean;
  readonly required_inputs_present: boolean;
  readonly optional_inputs_missing: number;
  readonly is_stale: boolean;
  readonly is_expired: boolean;
  readonly is_degraded_explicitly: boolean;
}

export interface QualityGateOutput {
  readonly quality_state: L6QualityState;
  readonly freshness_state: L6FreshnessState;
  readonly null_state: L6NullState;
  readonly validity_state: L6FeatureValidityState;
  readonly blocks_emission: boolean;
  readonly emission_is_legal: boolean;
}

export class QualityGateEngine {
  evaluate(def: FeatureDefinitionContract, input: QualityGateInput): QualityGateOutput {
    const gate = def.quality_gate_spec;

    let quality_state: L6QualityState;
    if (input.input_quality_score >= gate.minInputQuality
      && input.confidence_score >= gate.minConfidence) {
      quality_state = L6QualityState.PASS;
    } else if (input.input_quality_score >= gate.minInputQuality * 0.75) {
      quality_state = L6QualityState.MARGINAL;
    } else {
      quality_state = L6QualityState.FAIL;
    }

    let freshness_state: L6FreshnessState;
    if (!input.warmup_satisfied) freshness_state = L6FreshnessState.WARMING_UP;
    else if (input.is_expired) freshness_state = L6FreshnessState.EXPIRED;
    else if (input.is_stale) freshness_state = L6FreshnessState.STALE;
    else freshness_state = L6FreshnessState.FRESH;

    let null_state: L6NullState;
    if (!input.required_inputs_present) null_state = L6NullState.ABSENT_REQUIRED;
    else if (input.is_degraded_explicitly) null_state = L6NullState.EXPLICITLY_DEGRADED;
    else if (input.optional_inputs_missing > 0) null_state = L6NullState.ABSENT_OPTIONAL;
    else null_state = L6NullState.PRESENT;

    const validity_state = requiredValidityStateFor(
      quality_state,
      freshness_state,
      null_state,
      input.warmup_satisfied,
    );

    const blocks_emission = gate.blocksOnFailure
      && (quality_state === L6QualityState.FAIL
        || null_state === L6NullState.ABSENT_REQUIRED
        || freshness_state === L6FreshnessState.EXPIRED
        || !input.warmup_satisfied);

    const emission_is_legal = isValidEmissionLegal(
      validity_state,
      quality_state,
      freshness_state,
      null_state,
    );

    return {
      quality_state,
      freshness_state,
      null_state,
      validity_state,
      blocks_emission,
      emission_is_legal,
    };
  }
}
