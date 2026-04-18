/**
 * L6.4 — EventMaterializer
 *
 * §6.4.8.2 — Prepares an EventOutput for L5-bound persistence. Same law as
 * FeatureMaterializer: no direct writes, only validated payloads handed to
 * the L5 coordinator.
 */

import { EventOutput } from '../contracts/event-output.contract';
import { EventDefinitionContract } from '../contracts/event-definition.contract';
import { validateEventOutput } from '../validation/event-output-contract.validator';
import { L6ContractValidationResult } from '../validation/contract-violation-codes';
import { L6EvidencePack } from '../engine/evidence-pack-builder';
import { L6ComputeRun } from '../runtime/compute-run';

export interface EventMaterializationPayload {
  readonly kind: 'EVENT';
  readonly compute_run_id: string;
  readonly primitive_id: string;
  readonly primitive_version: string;
  readonly scope_type: string;
  readonly scope_id: string;
  readonly output: EventOutput;
  readonly evidence_pack_id: string;
  readonly is_replay: boolean;
  readonly is_repair: boolean;
}

export interface EventMaterializationResult {
  readonly payload: EventMaterializationPayload | null;
  readonly validation: L6ContractValidationResult;
  readonly blocked: boolean;
  readonly block_reasons: readonly string[];
}

export class EventMaterializer {
  prepare(
    compute_run: L6ComputeRun,
    def: EventDefinitionContract,
    output: EventOutput,
    evidence: L6EvidencePack,
  ): EventMaterializationResult {
    const reasons: string[] = [];
    const linked: EventOutput = {
      ...output,
      lineage: { ...output.lineage, evidence_pack_ref: evidence.evidence_pack_id },
    };

    const validation = validateEventOutput(linked, def);
    if (!validation.valid) reasons.push('CONTRACT_VALIDATION_FAILED');

    const blocked = reasons.length > 0;
    const payload: EventMaterializationPayload | null = blocked ? null : {
      kind: 'EVENT',
      compute_run_id: compute_run.compute_run_id,
      primitive_id: def.primitive_id,
      primitive_version: def.version,
      scope_type: linked.scope_type,
      scope_id: linked.scope_id,
      output: linked,
      evidence_pack_id: evidence.evidence_pack_id,
      is_replay: compute_run.replay_mode_flag,
      is_repair: compute_run.repair_mode_flag,
    };

    return { payload, validation, blocked, block_reasons: reasons };
  }
}
