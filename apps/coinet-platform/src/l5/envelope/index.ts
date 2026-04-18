/**
 * L5.4 — Universal Write Contract
 *
 * Public API surface for the storage envelope ingress law.
 */

// Errors
export { L5EnvelopeErrorCode, L5EnvelopeError } from './envelope-errors';

// Enums
export { L5WriteClass, ALL_WRITE_CLASSES, getWriteClassRequirements } from './write-class';
export type { WriteClassRequirements } from './write-class';

export { L5ProducerLayer, ALL_PRODUCER_LAYERS } from './producer-layer';
export { L5IngressMode, ALL_INGRESS_MODES } from './ingress-mode';
export { L5DerivationKind, ALL_DERIVATION_KINDS, isDerived } from './derivation-kind';

// Lifecycle
export {
  L5EnvelopeLifecycleState, ALL_LIFECYCLE_STATES, TERMINAL_LIFECYCLE_STATES,
  isLegalLifecycleTransition, getLegalLifecycleTransitions,
  isTerminalLifecycleState, assertLifecycleTransition, isMonotonicAdvancement,
} from './envelope-lifecycle';

// Types
export type { StorageEnvelopeDraft, ValidatedStorageEnvelope, ResolvedStorageEnvelope, EnvelopeRoutingBlock } from './storage-envelope.types';

// Canonicalization
export { canonicalizePayload, payloadsCanonicallyEqual, CANONICAL_SERIALIZATION_VERSION } from './payload-canonicalizer';
export { computePayloadHash, verifyPayloadHash } from './payload-hash';
export { computeDedupeKey, computeDedupeKeyFromDraft, extractDedupeComponents, classifyDuplicate } from './dedupe-key';
export type { DedupeKeyComponents, DuplicateVerdict } from './dedupe-key';

// Producer registry
export { registerProducer, getProducer, isRegisteredProducer, getAllProducers, resetProducerRegistry, checkProducerLegality } from './producer-registry';
export type { ProducerProfile, ProducerLegalityResult } from './producer-registry';

// Typed projection
export { validateTypedProjection } from './typed-projection';
export type { TypedProjectionValidation } from './typed-projection';

// Validator
export { validateEnvelope, validateStructuralOnly, validateSemanticOnly } from './envelope-validator';
export type { EnvelopeValidationResult, ValidationViolation, ValidationSeverity } from './envelope-validator';

// Quarantine
export { determineDisposition, isAccepted } from './envelope-quarantine';
export type { EnvelopeDisposition, EnvelopeDispositionResult } from './envelope-quarantine';

// Resolver
export { resolveEnvelope } from './envelope-resolver';
export type { ResolveResult } from './envelope-resolver';

// Ready-for-manifest
export { validateReadyForManifest } from './ready-for-manifest';
export type { ManifestReadinessResult } from './ready-for-manifest';

// Invariants
export { assertEnvelopeInvariant, assertAllEnvelopeInvariants, enforceAllEnvelopeInvariants, ALL_ENVELOPE_INVARIANT_IDS } from './envelope-invariants';
export type { L5EnvelopeInvariantId, EnvelopeInvariantResult, EnvelopeInvariantContext } from './envelope-invariants';
