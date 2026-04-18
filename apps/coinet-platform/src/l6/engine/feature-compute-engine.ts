/**
 * L6.4 — FeatureComputeEngine
 *
 * §6.4.6.1–§6.4.6.7 — Executes primitive feature computation. The engine
 * itself is pure orchestration: it does not hard-code feature math. A caller
 * supplies an `L6FeatureComputor` function; the engine:
 *
 *   1. validates that all required inputs are present
 *   2. runs the computor
 *   3. applies the quality gate
 *   4. attaches confidence
 *   5. stamps lineage and replay_hash
 *   6. returns a `FeatureOutput` validated against L6.3 contract law
 *
 * Determinism law §6.4.8.5: given identical (definition, inputs, context,
 * window, baseline), the output is identical byte-for-byte.
 */

import {
  FeatureOutput,
  FeatureOutputValue,
  FeatureOutputLineage,
} from '../contracts/feature-output.contract';
import { FeatureDefinitionContract } from '../contracts/feature-definition.contract';
import {
  L6FeatureValidityState,
  L6QualityState,
  L6ConfidenceBand,
  L6FreshnessState,
  L6NullState,
} from '../contracts/feature-validity-state';
import { L6FeatureValueKind } from '../contracts/feature-contract';
import { computeReplayHash } from '../validation/replay-hash';
import { validateFeatureOutput } from '../validation/feature-output-contract.validator';
import { L6ContractValidationResult } from '../validation/contract-violation-codes';
import { L6ScopeRef } from '../runtime/dag-node';
import { L6ComputeRun, isHistoricalMode } from '../runtime/compute-run';
import { QualityGateEngine, QualityGateInput } from './quality-gate-engine';
import { ConfidenceAttachmentEngine, ConfidenceAttachmentInput } from './confidence-attachment-engine';
import { L6Window } from './window-builder';
import { L6Baseline } from './baseline-engine';

export interface L6FeatureComputeRequest {
  readonly compute_run: L6ComputeRun;
  readonly definition: FeatureDefinitionContract;
  readonly scope: L6ScopeRef;
  readonly as_of: string;
  readonly window: L6Window;
  readonly baseline: L6Baseline | null;
  readonly gate_input: QualityGateInput;
  readonly confidence_input: ConfidenceAttachmentInput;
  readonly material_inputs: Readonly<Record<string, unknown>>;
  readonly manifest_id: string;
  readonly trace_id: string;
  readonly envelope_id: string;
  readonly input_snapshot_ref: string;
  readonly late_arrival_flag: boolean;
}

export type L6FeatureComputor = (
  req: L6FeatureComputeRequest,
) => FeatureOutputValue;

export interface L6FeatureComputeResult {
  readonly output: FeatureOutput;
  readonly validation: L6ContractValidationResult;
  readonly blocked: boolean;
}

export class FeatureComputeEngine {
  private readonly quality = new QualityGateEngine();
  private readonly confidence = new ConfidenceAttachmentEngine();

  compute(
    req: L6FeatureComputeRequest,
    computor: L6FeatureComputor,
  ): L6FeatureComputeResult {
    const gate = this.quality.evaluate(req.definition, req.gate_input);
    const band: L6ConfidenceBand = this.confidence.attach(
      req.definition.confidence_derivation_spec,
      req.confidence_input,
    );

    let value_payload: FeatureOutputValue;
    if (gate.blocks_emission) {
      value_payload = emptyPayloadForKind(req.definition.value_kind);
    } else {
      value_payload = computor(req);
    }

    const material = {
      primitive_id: req.definition.primitive_id,
      primitive_version: req.definition.version,
      scope_type: req.scope.scope_type,
      scope_id: req.scope.scope_id,
      temporal_anchor: req.as_of,
      material_inputs: {
        window_id: req.window.window_id,
        baseline_id: req.baseline?.baseline_id ?? null,
        inputs: req.material_inputs,
        historical_mode: isHistoricalMode(req.compute_run.mode),
      },
    };
    const replay_hash = computeReplayHash(material);

    const lineage: FeatureOutputLineage = {
      manifest_id: req.manifest_id,
      trace_id: req.trace_id,
      envelope_id: req.envelope_id,
      evidence_pack_ref: null,
      input_snapshot_ref: req.input_snapshot_ref,
      replay_hash,
    };

    const output: FeatureOutput = {
      feature_id: req.definition.primitive_id,
      feature_version: req.definition.version,
      scope_type: req.scope.scope_type,
      scope_id: req.scope.scope_id,
      as_of: req.as_of,
      observed_window_start: req.window.start,
      observed_window_end: req.window.end,
      value_payload,
      validity_state: gate.blocks_emission ? L6FeatureValidityState.BLOCKED : gate.validity_state,
      quality_state: gate.quality_state,
      confidence_band: band,
      freshness_state: gate.freshness_state,
      null_state: gate.null_state,
      late_arrival_flag: req.late_arrival_flag,
      warmup_satisfied: req.gate_input.warmup_satisfied,
      lineage,
    };

    const validation = validateFeatureOutput(output, req.definition);

    return {
      output,
      validation,
      blocked: gate.blocks_emission || !validation.valid,
    };
  }
}

function emptyPayloadForKind(kind: L6FeatureValueKind): FeatureOutputValue {
  switch (kind) {
    case L6FeatureValueKind.BOOLEAN:
      return { value_kind: kind, value: null, baseline_value: null, normalized_value: null };
    case L6FeatureValueKind.NUMBER:
    case L6FeatureValueKind.ORDINAL:
      return { value_kind: kind, value: null, baseline_value: null, normalized_value: null };
    case L6FeatureValueKind.NUMBER_VECTOR:
      return { value_kind: kind, value: null, baseline_value: null, normalized_value: null };
    case L6FeatureValueKind.COMPOSITE:
      return { value_kind: kind, value: null, baseline_value: null, normalized_value: null };
    case L6FeatureValueKind.DIVERGENCE_PAIR:
      return { value_kind: kind, value: null, baseline_value: null, normalized_value: null };
  }
}

// Intentionally unused import signal to keep L6QualityState/L6FreshnessState/L6NullState
// part of this module's type surface for downstream callers.
void L6QualityState;
void L6FreshnessState;
void L6NullState;
