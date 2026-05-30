/**
 * L13.10 — Persistence Envelope Builders
 *
 * §13.10.13 — Every L5-routed write must go through an envelope.
 * Pure builder helpers — no I/O.
 */

import { L13DurableSurfaceId, type L13PersistenceEnvelope } from '../contracts/l13-persistence-surface';
import { L13PersistenceClass, L13PersistenceWriteIntent } from '../contracts/l13-persistence-class';
import {
  L13MaterializationMode,
  L13StorageAuthorityClass,
} from '../contracts/l13-storage-authority';
import { fnv1a } from '../context/_fnv1a';

const POLICY_V = 'l13.persistence.v1';

export interface L13PersistenceEnvelopeInput {
  readonly surface_id: L13DurableSurfaceId;
  readonly persistence_class: L13PersistenceClass;
  readonly materialization_mode: L13MaterializationMode;
  readonly storage_authority_class: L13StorageAuthorityClass;
  readonly source_artifact_ref: string;
  readonly durable_record_ref?: string;
  readonly write_intent: L13PersistenceWriteIntent;
  readonly append_safe_required: boolean;
  readonly current_authority_update: boolean;
  readonly evidence_storage_ref?: string;
  readonly lineage_refs?: readonly string[];
}

export function buildL13PersistenceEnvelope(
  input: L13PersistenceEnvelopeInput,
): L13PersistenceEnvelope {
  const lineage = input.lineage_refs ?? ['l13.persistence.lineage'];
  const replayHash = fnv1a(
    [
      input.surface_id,
      input.persistence_class,
      input.materialization_mode,
      input.storage_authority_class,
      input.source_artifact_ref,
      input.durable_record_ref ?? '',
      input.write_intent,
      String(input.append_safe_required),
      String(input.current_authority_update),
      input.evidence_storage_ref ?? '',
      POLICY_V,
    ].join('|'),
  );
  return {
    persistence_envelope_id: `l13.persist.env.${replayHash}`,
    surface_id: input.surface_id,
    persistence_class: input.persistence_class,
    materialization_mode: input.materialization_mode,
    storage_authority_class: input.storage_authority_class,
    source_artifact_ref: input.source_artifact_ref,
    durable_record_ref: input.durable_record_ref,
    write_intent: input.write_intent,
    append_safe_required: input.append_safe_required,
    current_authority_update: input.current_authority_update,
    evidence_storage_ref: input.evidence_storage_ref,
    lineage_refs: lineage,
    replay_hash: replayHash,
    policy_version: POLICY_V,
  };
}
