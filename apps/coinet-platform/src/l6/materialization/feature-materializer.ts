/**
 * L6.4 — FeatureMaterializer
 *
 * §6.4.8.2 — Prepares a FeatureOutput for L5-bound persistence. The
 * materializer never writes directly to stores; it emits a
 * `FeatureMaterializationPayload` that must be handed to the L5 coordinator.
 *
 * If the output fails contract validation, materialization is blocked.
 */

import { FeatureOutput } from '../contracts/feature-output.contract';
import { FeatureDefinitionContract } from '../contracts/feature-definition.contract';
import { validateFeatureOutput } from '../validation/feature-output-contract.validator';
import { L6ContractValidationResult } from '../validation/contract-violation-codes';
import { L6EvidencePack } from '../engine/evidence-pack-builder';
import { L6ComputeRun } from '../runtime/compute-run';

export interface FeatureMaterializationPayload {
  readonly kind: 'FEATURE';
  readonly compute_run_id: string;
  readonly primitive_id: string;
  readonly primitive_version: string;
  readonly scope_type: string;
  readonly scope_id: string;
  readonly output: FeatureOutput;
  readonly evidence_pack_id: string | null;
  readonly is_replay: boolean;
  readonly is_repair: boolean;
}

export interface FeatureMaterializationResult {
  readonly payload: FeatureMaterializationPayload | null;
  readonly validation: L6ContractValidationResult;
  readonly blocked: boolean;
  readonly block_reasons: readonly string[];
}

export class FeatureMaterializer {
  prepare(
    compute_run: L6ComputeRun,
    def: FeatureDefinitionContract,
    output: FeatureOutput,
    evidence: L6EvidencePack | null,
  ): FeatureMaterializationResult {
    const reasons: string[] = [];
    const linked: FeatureOutput = evidence
      ? { ...output, lineage: { ...output.lineage, evidence_pack_ref: evidence.evidence_pack_id } }
      : output;

    const validation = validateFeatureOutput(linked, def);
    if (!validation.valid) reasons.push('CONTRACT_VALIDATION_FAILED');

    if (def.evidence_pack_policy === 'ALWAYS_REQUIRED' && !evidence) {
      reasons.push('EVIDENCE_PACK_REQUIRED_BUT_MISSING');
    }

    const blocked = reasons.length > 0;
    const payload: FeatureMaterializationPayload | null = blocked ? null : {
      kind: 'FEATURE',
      compute_run_id: compute_run.compute_run_id,
      primitive_id: def.primitive_id,
      primitive_version: def.version,
      scope_type: linked.scope_type,
      scope_id: linked.scope_id,
      output: linked,
      evidence_pack_id: evidence?.evidence_pack_id ?? null,
      is_replay: compute_run.replay_mode_flag,
      is_repair: compute_run.repair_mode_flag,
    };

    return { payload, validation, blocked, block_reasons: reasons };
  }
}
