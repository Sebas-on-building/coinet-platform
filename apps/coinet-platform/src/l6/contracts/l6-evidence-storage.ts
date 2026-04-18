/**
 * L6.7 — Evidence Pack Storage Contracts
 *
 * §6.7.5 — Feature and event evidence packs are first-class supporting
 * artifacts. They must live in object storage (§6.7.5.3), carry identity
 * and archive pointers (§6.7.5.4), be discoverable (§6.7.5.5), and remain
 * immutable once written (§6.7.5.6).
 */

/**
 * §6.7.5.2 — Two evidence pack classes, one per primitive class.
 */
export enum L6EvidencePackClass {
  FEATURE_EVIDENCE_PACK = 'FEATURE_EVIDENCE_PACK',
  EVENT_EVIDENCE_PACK = 'EVENT_EVIDENCE_PACK',
}

export const ALL_EVIDENCE_PACK_CLASSES: readonly L6EvidencePackClass[] =
  Object.values(L6EvidencePackClass);

/**
 * §6.7.5.4 — Identity law.
 */
export interface L6EvidencePackIdentity {
  readonly evidence_pack_id: string;
  readonly pack_class: L6EvidencePackClass;
  readonly primitive_id: string;
  readonly primitive_version: string;
  readonly scope_type: string;
  readonly scope_id: string;
  readonly anchor_at: string;
  readonly compute_run_id: string;
  readonly trace_id: string;
  readonly replay_hash: string;
}

export interface L6EvidenceArchivePointer {
  readonly archive_uri: string;
  readonly archive_checksum: string;
  readonly manifest_id: string;
  readonly pointer_index_ref: string;
}

/**
 * §6.7.5.2 — Required payload components per class. These are the logical
 * fields an evidence pack must describe; concrete JSON shapes live in L5.
 */
export interface L6FeatureEvidencePayload {
  readonly input_surfaces_used: readonly string[];
  readonly windows_used: readonly string[];
  readonly baselines_used: readonly string[];
  readonly null_policy_interpretation: string;
  readonly late_data_interpretation: string;
  readonly quality_derivation_context: string;
  readonly confidence_derivation_context: string;
  readonly contract_version_refs: readonly string[];
  readonly compute_metadata: Record<string, unknown>;
}

export interface L6EventEvidencePayload {
  readonly triggering_feature_values: readonly {
    readonly feature_id: string;
    readonly value_ref: string;
  }[];
  readonly candidate_conditions: readonly string[];
  readonly confirmation_conditions: readonly string[];
  readonly lifecycle_transition_basis: string;
  readonly suppression_basis: string;
  readonly dedupe_basis: string;
  readonly evidence_refs: readonly string[];
  readonly compute_metadata: Record<string, unknown>;
}

export interface L6EvidencePack {
  readonly identity: L6EvidencePackIdentity;
  readonly archive: L6EvidenceArchivePointer;
  readonly feature_payload: L6FeatureEvidencePayload | null;
  readonly event_payload: L6EventEvidencePayload | null;
  readonly written_at: string;
}

/**
 * §6.7.5.3 — Recommended path patterns for evidence archives. Helpers
 * produce deterministic keys so that reads and audits always resolve to
 * the same pointer.
 */
export function featureEvidencePath(
  feature_id: string,
  version: string,
  scope_id: string,
  as_of: string,
): string {
  return `evidence/features/feature_id=${feature_id}/version=${version}/scope=${scope_id}/as_of=${as_of}`;
}

export function eventEvidencePath(
  event_id: string,
  event_instance_id: string,
  lifecycle_state: string,
): string {
  return `evidence/events/event_id=${event_id}/instance=${event_instance_id}/state=${lifecycle_state}`;
}

/**
 * §6.7.5.6 — Immutability. Once written, an evidence pack may never be
 * mutated; a revised interpretation becomes a new pack linked via
 * `supersedes_pack_id`.
 */
export interface L6EvidencePackSupersession {
  readonly superseded_pack_id: string;
  readonly new_pack_id: string;
  readonly reason: string;
  readonly superseded_at: string;
}
