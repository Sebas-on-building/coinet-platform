/**
 * L6.7 — Materialization Policy
 *
 * §6.7.1.4 — The legal write path for every L6 persistence operation:
 *
 *   contract/legality validation
 *   → materialization preparation
 *   → L6 → L5 envelope adaptation
 *   → L5 StorageEnvelope construction
 *   → L5 manifest creation
 *   → authoritative store write / historical projection / archive write
 *   → replay-safe indexing and read-surface discoverability
 *
 * This module encodes the pipeline steps as a typed, deterministic decision
 * surface. It does not itself perform writes — it produces a prepared
 * `L6MaterializationDecision` that the L5 client executes.
 */

import {
  L6DurableSurfaceId,
  L6MaterializationMode,
  L6PersistenceClass,
  L6PersistenceEnvelope,
  L6PersistenceIdentity,
  DURABLE_SURFACE_REGISTRY,
  isHistoricalMaterializationMode,
  isRematerializationMode,
} from '../contracts/l6-persistence-surface';

export enum L6MaterializationPipelineStep {
  CONTRACT_LEGALITY = 'CONTRACT_LEGALITY',
  PREPARATION = 'PREPARATION',
  L5_ENVELOPE_ADAPTATION = 'L5_ENVELOPE_ADAPTATION',
  STORAGE_ENVELOPE_CONSTRUCTION = 'STORAGE_ENVELOPE_CONSTRUCTION',
  MANIFEST_CREATION = 'MANIFEST_CREATION',
  AUTHORITATIVE_WRITE = 'AUTHORITATIVE_WRITE',
  REPLAY_INDEXING = 'REPLAY_INDEXING',
  READ_SURFACE_DISCOVERY = 'READ_SURFACE_DISCOVERY',
}

export const PIPELINE_ORDER: readonly L6MaterializationPipelineStep[] = [
  L6MaterializationPipelineStep.CONTRACT_LEGALITY,
  L6MaterializationPipelineStep.PREPARATION,
  L6MaterializationPipelineStep.L5_ENVELOPE_ADAPTATION,
  L6MaterializationPipelineStep.STORAGE_ENVELOPE_CONSTRUCTION,
  L6MaterializationPipelineStep.MANIFEST_CREATION,
  L6MaterializationPipelineStep.AUTHORITATIVE_WRITE,
  L6MaterializationPipelineStep.REPLAY_INDEXING,
  L6MaterializationPipelineStep.READ_SURFACE_DISCOVERY,
];

export interface L6MaterializationRequest {
  readonly identity: L6PersistenceIdentity;
  readonly persistence_class: L6PersistenceClass;
  readonly materialization_mode: L6MaterializationMode;
  readonly target_surface: L6DurableSurfaceId;
  readonly evidence_pack_ref: string | null;
  readonly payload_keys: readonly string[];
  readonly contract_legal: boolean;
  readonly temporal_legal: boolean;
}

export interface L6MaterializationDecision {
  readonly ok: boolean;
  readonly envelope: L6PersistenceEnvelope | null;
  readonly pipeline: readonly L6MaterializationPipelineStep[];
  readonly replay_indexed: boolean;
  readonly discoverable: boolean;
  readonly rationale: string;
}

/**
 * §6.7.1.4 — Produce a deterministic materialization decision for a request.
 * The decision carries the full canonical pipeline and a prepared
 * `L6PersistenceEnvelope` the L5 client can execute.
 */
export function prepareMaterialization(
  req: L6MaterializationRequest,
): L6MaterializationDecision {
  if (!req.contract_legal) {
    return {
      ok: false, envelope: null, pipeline: [], replay_indexed: false, discoverable: false,
      rationale: 'contract legality failed — pipeline not entered',
    };
  }
  if (!req.temporal_legal) {
    return {
      ok: false, envelope: null, pipeline: [], replay_indexed: false, discoverable: false,
      rationale: 'temporal legality failed — pipeline not entered',
    };
  }

  const spec = DURABLE_SURFACE_REGISTRY[req.target_surface];
  if (spec.persistence_class !== req.persistence_class) {
    return {
      ok: false, envelope: null, pipeline: [], replay_indexed: false, discoverable: false,
      rationale: `target surface ${req.target_surface} is ${spec.persistence_class}, not ${req.persistence_class}`,
    };
  }

  const l5EnvelopeId = `l5env_${req.identity.compute_run_id}_${req.identity.primitive_id}`;
  const manifestId = `mfst_${req.identity.compute_run_id}_${req.identity.primitive_id}`;

  const envelope: L6PersistenceEnvelope = {
    identity: {
      ...req.identity,
      storage_manifest_id: req.identity.storage_manifest_id || manifestId,
    },
    persistence_class: req.persistence_class,
    materialization_mode: req.materialization_mode,
    target_surface: req.target_surface,
    l5_envelope_id: l5EnvelopeId,
    evidence_pack_ref: req.evidence_pack_ref,
    payload_keys: req.payload_keys,
    emitted_at: new Date().toISOString(),
  };

  const replayIndexed =
    spec.replay_identity_required || isHistoricalMaterializationMode(req.materialization_mode) ||
    isRematerializationMode(req.materialization_mode);

  return {
    ok: true,
    envelope,
    pipeline: PIPELINE_ORDER,
    replay_indexed: replayIndexed,
    discoverable: true,
    rationale: 'prepared via legal L6→L5 pipeline',
  };
}
