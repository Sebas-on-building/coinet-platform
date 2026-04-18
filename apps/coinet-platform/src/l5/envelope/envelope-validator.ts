/**
 * L5.4 Universal Write Contract — Envelope Validator
 *
 * §5.4.12 — Validation Law (Phases A through E)
 */

import type { StorageEnvelopeDraft } from './storage-envelope.types';
import { ALL_WRITE_CLASSES, getWriteClassRequirements, L5WriteClass } from './write-class';
import { ALL_PRODUCER_LAYERS } from './producer-layer';
import { ALL_INGRESS_MODES } from './ingress-mode';
import { ALL_DERIVATION_KINDS, isDerived } from './derivation-kind';
import { verifyPayloadHash } from './payload-hash';
import { checkProducerLegality, isRegisteredProducer } from './producer-registry';
import { validateTypedProjection } from './typed-projection';
import { L5EnvelopeErrorCode } from './envelope-errors';

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION RESULT
// ═══════════════════════════════════════════════════════════════════════════════

export type ValidationSeverity = 'REJECT' | 'QUARANTINE' | 'WARN';

export interface ValidationViolation {
  readonly code: L5EnvelopeErrorCode;
  readonly message: string;
  readonly severity: ValidationSeverity;
  readonly phase: 'STRUCTURAL' | 'SEMANTIC' | 'CONSTITUTIONAL' | 'TOPOLOGY' | 'PRE_MANIFEST';
}

export interface EnvelopeValidationResult {
  readonly valid: boolean;
  readonly shouldReject: boolean;
  readonly shouldQuarantine: boolean;
  readonly violations: readonly ValidationViolation[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE A — STRUCTURAL VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

function validateStructural(draft: StorageEnvelopeDraft): ValidationViolation[] {
  const v: ValidationViolation[] = [];
  const phase = 'STRUCTURAL' as const;

  if (!draft.envelope_id) v.push({ code: L5EnvelopeErrorCode.MISSING_REQUIRED_FIELD, message: 'Missing envelope_id', severity: 'REJECT', phase });
  if (!draft.trace_id) v.push({ code: L5EnvelopeErrorCode.MISSING_REQUIRED_FIELD, message: 'Missing trace_id', severity: 'REJECT', phase });
  if (!draft.producer_service) v.push({ code: L5EnvelopeErrorCode.MISSING_REQUIRED_FIELD, message: 'Missing producer_service', severity: 'REJECT', phase });
  if (!draft.schema_version) v.push({ code: L5EnvelopeErrorCode.MISSING_SCHEMA_VERSION, message: 'Missing schema_version', severity: 'REJECT', phase });
  if (!draft.payload_hash_sha256) v.push({ code: L5EnvelopeErrorCode.MISSING_PAYLOAD_HASH, message: 'Missing payload_hash_sha256', severity: 'REJECT', phase });
  if (!draft.dedupe_key) v.push({ code: L5EnvelopeErrorCode.MISSING_DEDUPE_KEY, message: 'Missing dedupe_key', severity: 'REJECT', phase });
  if (!draft.canonical_serialization_version) v.push({ code: L5EnvelopeErrorCode.MISSING_REQUIRED_FIELD, message: 'Missing canonical_serialization_version', severity: 'REJECT', phase });
  if (!draft.source_observed_at) v.push({ code: L5EnvelopeErrorCode.MISSING_REQUIRED_FIELD, message: 'Missing source_observed_at', severity: 'REJECT', phase });
  if (!draft.ingested_at) v.push({ code: L5EnvelopeErrorCode.MISSING_REQUIRED_FIELD, message: 'Missing ingested_at', severity: 'REJECT', phase });
  if (!draft.normalized_at) v.push({ code: L5EnvelopeErrorCode.MISSING_REQUIRED_FIELD, message: 'Missing normalized_at', severity: 'REJECT', phase });
  if (draft.payload === undefined) v.push({ code: L5EnvelopeErrorCode.MISSING_REQUIRED_FIELD, message: 'Missing payload', severity: 'REJECT', phase });

  if (!ALL_WRITE_CLASSES.includes(draft.write_class)) v.push({ code: L5EnvelopeErrorCode.INVALID_TYPE, message: `Invalid write_class '${draft.write_class}'`, severity: 'REJECT', phase });
  if (!ALL_PRODUCER_LAYERS.includes(draft.producer_layer)) v.push({ code: L5EnvelopeErrorCode.INVALID_TYPE, message: `Invalid producer_layer '${draft.producer_layer}'`, severity: 'REJECT', phase });
  if (!ALL_INGRESS_MODES.includes(draft.ingress_mode)) v.push({ code: L5EnvelopeErrorCode.INVALID_TYPE, message: `Invalid ingress_mode '${draft.ingress_mode}'`, severity: 'REJECT', phase });
  if (!ALL_DERIVATION_KINDS.includes(draft.derivation_kind)) v.push({ code: L5EnvelopeErrorCode.INVALID_TYPE, message: `Invalid derivation_kind '${draft.derivation_kind}'`, severity: 'REJECT', phase });

  // Timestamp ordering
  if (draft.source_observed_at && draft.ingested_at && draft.ingested_at < draft.source_observed_at) {
    if (draft.ingress_mode !== 'BACKFILL' && draft.ingress_mode !== 'REPLAY') {
      v.push({ code: L5EnvelopeErrorCode.INVALID_TIMESTAMP_ORDER, message: 'ingested_at < source_observed_at outside backfill/replay', severity: 'REJECT', phase });
    }
  }
  if (draft.normalized_at && draft.ingested_at && draft.normalized_at < draft.ingested_at) {
    v.push({ code: L5EnvelopeErrorCode.INVALID_TIMESTAMP_ORDER, message: 'normalized_at < ingested_at', severity: 'WARN', phase });
  }

  return v;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE B — SEMANTIC VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

function validateSemantic(draft: StorageEnvelopeDraft): ValidationViolation[] {
  const v: ValidationViolation[] = [];
  const phase = 'SEMANTIC' as const;
  const reqs = getWriteClassRequirements(draft.write_class);

  if (reqs.requiresCanonicalSubject && !draft.canonical_subject_id) {
    v.push({ code: L5EnvelopeErrorCode.MISSING_CANONICAL_REFERENCE, message: `Write class '${draft.write_class}' requires canonical_subject_id`, severity: 'QUARANTINE', phase });
  }

  if (reqs.requiresMetricContract && !draft.metric_contract_id) {
    v.push({ code: L5EnvelopeErrorCode.MISSING_METRIC_CONTRACT, message: `Write class '${draft.write_class}' requires metric_contract_id`, severity: 'QUARANTINE', phase });
  }

  if (reqs.requiresExpiresAt && !draft.expires_at) {
    v.push({ code: L5EnvelopeErrorCode.MISSING_REQUIRED_FIELD, message: `Write class '${draft.write_class}' requires expires_at`, severity: 'QUARANTINE', phase });
  }

  if (reqs.requiresParentLineage && (!draft.parent_envelope_id || !draft.parent_trace_id)) {
    v.push({ code: L5EnvelopeErrorCode.ILLEGAL_DERIVATION, message: 'Derived materialization requires parent lineage', severity: 'QUARANTINE', phase });
  }

  if (reqs.requiresUserId && !draft.user_id) {
    v.push({ code: L5EnvelopeErrorCode.MISSING_REQUIRED_FIELD, message: `Write class '${draft.write_class}' requires user_id`, severity: 'QUARANTINE', phase });
  }

  if (reqs.requiresActorInfo && !draft.typed_projection) {
    v.push({ code: L5EnvelopeErrorCode.MISSING_REQUIRED_FIELD, message: 'Audit event requires typed_projection with actor info', severity: 'QUARANTINE', phase });
  }

  if (isDerived(draft.derivation_kind) && !draft.parent_envelope_id) {
    v.push({ code: L5EnvelopeErrorCode.ILLEGAL_DERIVATION, message: 'Derived write without parent_envelope_id', severity: 'QUARANTINE', phase });
  }

  // Producer legality
  if (isRegisteredProducer(draft.producer_service)) {
    const producerCheck = checkProducerLegality(
      draft.producer_service, draft.write_class, draft.source_class,
      draft.ingress_mode, draft.derivation_kind, draft.payload_size_bytes,
    );
    if (!producerCheck.legal) {
      for (const msg of producerCheck.violations) {
        v.push({ code: L5EnvelopeErrorCode.ILLEGAL_PRODUCER_LAYER, message: msg, severity: 'QUARANTINE', phase });
      }
    }
  } else if (draft.producer_service) {
    v.push({ code: L5EnvelopeErrorCode.UNREGISTERED_PRODUCER, message: `Producer '${draft.producer_service}' not registered`, severity: 'QUARANTINE', phase });
  }

  // Typed projection validation
  if (draft.typed_projection !== null && draft.typed_projection !== undefined) {
    const projVal = validateTypedProjection(draft.payload, draft.typed_projection);
    if (!projVal.valid) {
      for (const msg of projVal.violations) {
        v.push({ code: L5EnvelopeErrorCode.PAYLOAD_PROJECTION_MISMATCH, message: msg, severity: 'QUARANTINE', phase });
      }
    }
  }

  // Payload hash integrity
  if (draft.payload_hash_sha256 && draft.payload !== undefined) {
    if (!verifyPayloadHash(draft.payload, draft.payload_hash_sha256)) {
      v.push({ code: L5EnvelopeErrorCode.MISSING_PAYLOAD_HASH, message: 'payload_hash_sha256 does not match computed hash', severity: 'QUARANTINE', phase });
    }
  }

  return v;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════════════════

export function validateEnvelope(draft: StorageEnvelopeDraft): EnvelopeValidationResult {
  const structural = validateStructural(draft);
  const semantic = structural.some(v => v.severity === 'REJECT') ? [] : validateSemantic(draft);
  const all = [...structural, ...semantic];

  const shouldReject = all.some(v => v.severity === 'REJECT');
  const shouldQuarantine = !shouldReject && all.some(v => v.severity === 'QUARANTINE');

  return {
    valid: !shouldReject && !shouldQuarantine,
    shouldReject,
    shouldQuarantine,
    violations: all,
  };
}

export function validateStructuralOnly(draft: StorageEnvelopeDraft): EnvelopeValidationResult {
  const violations = validateStructural(draft);
  const shouldReject = violations.some(v => v.severity === 'REJECT');
  return { valid: !shouldReject, shouldReject, shouldQuarantine: false, violations };
}

export function validateSemanticOnly(draft: StorageEnvelopeDraft): EnvelopeValidationResult {
  const violations = validateSemantic(draft);
  const shouldQuarantine = violations.some(v => v.severity === 'QUARANTINE');
  return { valid: !shouldQuarantine, shouldReject: false, shouldQuarantine, violations };
}
