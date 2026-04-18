/**
 * L5.4 Universal Write Contract — Storage Envelope Types
 *
 * §5.4.4 — Universal Primitive (Three Stages)
 */

import { L5WriteClass } from './write-class';
import { L5ProducerLayer } from './producer-layer';
import { L5IngressMode } from './ingress-mode';
import { L5DerivationKind } from './derivation-kind';
import { L5EnvelopeLifecycleState } from './envelope-lifecycle';

// ═══════════════════════════════════════════════════════════════════════════════
// STAGE A — DRAFT
// ═══════════════════════════════════════════════════════════════════════════════

export interface StorageEnvelopeDraft {
  // Identity and lineage
  readonly envelope_id: string;
  readonly trace_id: string;
  readonly correlation_id: string | null;
  readonly producer_service: string;
  readonly producer_layer: L5ProducerLayer;
  readonly producer_instance_id: string;
  readonly producer_capability_id: string;
  readonly parent_envelope_id: string | null;
  readonly parent_trace_id: string | null;
  readonly derivation_kind: L5DerivationKind;
  readonly ingress_mode: L5IngressMode;

  // Classification
  readonly write_class: L5WriteClass;
  readonly source_class: string;
  readonly source_provider: string | null;
  readonly source_endpoint: string | null;
  readonly source_event_id: string | null;
  readonly source_transport: string;
  readonly source_format: string;
  readonly source_batch_id: string | null;
  readonly source_partition_key: string | null;

  // Timing
  readonly source_observed_at: string;
  readonly source_emitted_at: string | null;
  readonly ingested_at: string;
  readonly normalized_at: string;
  readonly effective_at: string | null;
  readonly expires_at: string | null;
  readonly late_arrival_detected_at: string | null;

  // Canonical references
  readonly canonical_subject_id: string | null;
  readonly canonical_subject_type: string | null;
  readonly canonical_object_id: string | null;
  readonly canonical_object_type: string | null;
  readonly canonical_scope_type: string | null;
  readonly canonical_scope_id: string | null;
  readonly authority_scope_type: string | null;
  readonly authority_scope_id: string | null;
  readonly metric_contract_id: string | null;
  readonly edge_id: string | null;
  readonly context_package_id: string | null;
  readonly report_id: string | null;
  readonly score_id: string | null;
  readonly user_id: string | null;
  readonly tenant_id: string | null;

  // State qualifiers
  readonly confidence_band: string | null;
  readonly rights_profile: string | null;
  readonly freshness_state: string | null;
  readonly temporal_state: string | null;
  readonly identity_resolution_state: string | null;
  readonly reconciliation_state: string | null;
  readonly semantic_quality_state: string | null;

  // Integrity and replay
  readonly schema_version: string;
  readonly canonical_serialization_version: string;
  readonly payload_hash_sha256: string;
  readonly dedupe_key: string;
  readonly archive_required: boolean;
  readonly replay_required: boolean;
  readonly archive_uri: string | null;
  readonly archive_checksum: string | null;
  readonly payload_size_bytes: number;
  readonly late_arrival_flag: boolean;
  readonly quarantine_flag: boolean;
  readonly quarantine_reason_codes: readonly string[];
  readonly replay_window_id: string | null;
  readonly integrity_verification_state: string;

  // Payload
  readonly payload_content_type: string;
  readonly projection_schema_id: string | null;
  readonly payload: unknown;
  readonly typed_projection: unknown;
}

// ═══════════════════════════════════════════════════════════════════════════════
// STAGE B — VALIDATED
// ═══════════════════════════════════════════════════════════════════════════════

export interface ValidatedStorageEnvelope extends StorageEnvelopeDraft {
  readonly lifecycle_state: L5EnvelopeLifecycleState;
  readonly structural_validation_passed: boolean;
  readonly semantic_validation_passed: boolean;
  readonly validated_at: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// STAGE C — RESOLVED (includes L5.1/L5.2/L5.3 outputs)
// ═══════════════════════════════════════════════════════════════════════════════

export interface EnvelopeRoutingBlock {
  readonly primary_state_class: string;
  readonly primary_authority_store: string;
  readonly authority_tier: string;
  readonly required_projection_plan: readonly string[];
  readonly optional_projection_plan: readonly string[];
  readonly manifest_required: boolean;
  readonly topology_mode: string;
  readonly loss_semantics_code: string;
}

export interface ResolvedStorageEnvelope extends ValidatedStorageEnvelope {
  readonly routing: EnvelopeRoutingBlock;
  readonly classification_resolved: boolean;
  readonly authority_allocated: boolean;
  readonly topology_validated: boolean;
  readonly archive_proof_verified: boolean;
  readonly resolved_at: string;
}
