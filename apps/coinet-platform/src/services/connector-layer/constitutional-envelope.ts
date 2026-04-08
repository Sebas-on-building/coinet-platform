/**
 * L2.1 — Constitutional Connector Envelope Protocol
 *
 * The only legal way reality enters the system.
 * Not a helper object. Not a convenience wrapper.
 * Everything downstream trusts the envelope, not the connector.
 *
 * Core law: An observation is not evidence until it is enveloped.
 */

import type { SourceClass, TruthClass } from '../source-systems/registry';

export const L21_PROTOCOL_VERSION = '1.1.0' as const;

// ═══════════════════════════════════════════════════════════════════════════════
// ENVELOPE KIND
// ═══════════════════════════════════════════════════════════════════════════════

export type EnvelopeKind =
  | 'observation'
  | 'correction'
  | 'snapshot'
  | 'event'
  | 'backfill_record';

// ═══════════════════════════════════════════════════════════════════════════════
// ENTITY TAXONOMY
// ═══════════════════════════════════════════════════════════════════════════════

export type EntityType =
  | 'asset' | 'pool' | 'protocol' | 'wallet' | 'contract'
  | 'exchange' | 'cluster' | 'sector' | 'macro_event'
  | 'pair' | 'chain' | 'narrative' | 'market_event';

export type EntityScope =
  | 'exact_asset' | 'exact_pool' | 'exact_wallet' | 'exact_contract'
  | 'protocol_aggregate' | 'venue_aggregate' | 'chain_aggregate'
  | 'sector_aggregate' | 'global_aggregate' | 'unknown';

// ═══════════════════════════════════════════════════════════════════════════════
// ROUTING ENUMS
// ═══════════════════════════════════════════════════════════════════════════════

export type RouteMode = 'realtime' | 'scheduled' | 'on_demand' | 'backfill';

export type FreshnessClass = 'live' | 'fresh' | 'acceptable' | 'stale' | 'expired';

export type FreshnessState = 'within_sla' | 'approaching_sla' | 'beyond_sla' | 'unknown';

export type FallbackUsageStatus =
  | 'none' | 'candidate' | 'used' | 'forced' | 'illegal';

export type BlindSpotFlag =
  | 'owner_unavailable' | 'confirmer_unavailable' | 'partial_field_missing'
  | 'semantic_loss' | 'route_degraded' | 'trace_incomplete'
  | 'integrity_broken' | 'recovery_probation' | 'substitution_active';

// ═══════════════════════════════════════════════════════════════════════════════
// AUTHORITY ENUMS
// ═══════════════════════════════════════════════════════════════════════════════

export type AuthorityRole =
  | 'owner' | 'confirmer' | 'enricher' | 'discovery_only' | 'prohibited_non_owner' | 'unknown';

export type SubstitutionRight = 'full' | 'degraded' | 'partial' | 'none' | 'unknown';

export type SpeakabilityPrecheck = 'pass' | 'caution' | 'fail' | 'unknown';

export type IngressTrustClass =
  | 'verified' | 'audited' | 'official' | 'third_party'
  | 'heuristic' | 'modeled' | 'unknown';

// ═══════════════════════════════════════════════════════════════════════════════
// PAYLOAD ENUMS
// ═══════════════════════════════════════════════════════════════════════════════

export type PayloadFormat = 'json' | 'csv' | 'xml' | 'text' | 'binary' | 'websocket_event';

export type PayloadCompression = 'none' | 'gzip' | 'zstd';

export type TimingCompleteness = 'full' | 'partial' | 'minimal';

// ═══════════════════════════════════════════════════════════════════════════════
// CANONICAL RESOLUTION
// ═══════════════════════════════════════════════════════════════════════════════

export type CanonicalResolutionState = 'resolved' | 'ambiguous' | 'unresolved';

// ═══════════════════════════════════════════════════════════════════════════════
// 1. IDENTITY BLOCK
// ═══════════════════════════════════════════════════════════════════════════════

export interface EnvelopeIdentity {
  envelopeId: string;
  traceId: string;
  requestId?: string;
  routeId: string;
  connectorInstanceId: string;
  source: string;
  providerId: string;
  sourceClass: SourceClass;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2. SOURCE CONTEXT BLOCK
// ═══════════════════════════════════════════════════════════════════════════════

export interface SourceContext {
  entityType: EntityType;
  entityScope: EntityScope;
  chain?: string;
  networkScope?: string;
  venueScope?: string;
  marketScope?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3. CANONICAL CANDIDATE CONTEXT
// ═══════════════════════════════════════════════════════════════════════════════

export interface CanonicalContext {
  canonicalCandidateIds: string[];
  canonicalResolutionConfidence: number;
  canonicalResolutionState: CanonicalResolutionState;
  representativeFieldTupleId?: string;
  resolutionReasonCodes: string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// 4. TIMING BLOCK
// ═══════════════════════════════════════════════════════════════════════════════

export interface EnvelopeTiming {
  observedTimestamp?: string;
  publishedTimestamp?: string;
  receivedTimestamp: string;
  ingestedTimestamp: string;
  connectorLatencyMs?: number;
  publicationLagMs?: number;
  ingestionLagMs?: number;
  timingCompleteness: TimingCompleteness;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 5. ROUTE CONTEXT BLOCK
// ═══════════════════════════════════════════════════════════════════════════════

export interface RouteContext {
  freshnessClass: FreshnessClass;
  freshnessState: FreshnessState;
  routeMode: RouteMode;
  routePriority: number;
  fallbackStatus: FallbackUsageStatus;
  fallbackReason?: string;
  blindSpotFlags: BlindSpotFlag[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// 6. AUTHORITY CONTEXT BLOCK
// ═══════════════════════════════════════════════════════════════════════════════

export interface AuthorityContext {
  trustClass: IngressTrustClass;
  authorityRole: AuthorityRole;
  substitutionRight: SubstitutionRight;
  speakabilityPrecheck: SpeakabilityPrecheck;
  healthSnapshotRef?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 7. PAYLOAD CONTEXT BLOCK
// ═══════════════════════════════════════════════════════════════════════════════

export interface PayloadContext {
  rawPayloadRef: string;
  rawPayloadHash: string;
  rawPayloadSchemaVersion?: string;
  rawPayloadCompression: PayloadCompression;
  normalizedPayloadFragment: unknown;
  normalizationVersion: string;
  payloadFormat: PayloadFormat;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 8. REPLAY CONTEXT BLOCK
// ═══════════════════════════════════════════════════════════════════════════════

export interface ReplayContext {
  idempotencyKey: string;
  dedupFingerprint: string;
  eventSequenceKey?: string;
  replayGeneration: number;
  backfillBatchId?: string;
  correctionOfEnvelopeId?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 9. VALIDATION CONTEXT BLOCK
// ═══════════════════════════════════════════════════════════════════════════════

export interface ValidationContext {
  schemaValid: boolean;
  timingValid: boolean;
  payloadValid: boolean;
  lineageComplete: boolean;
  envelopeValid: boolean;
  validationReasonCodes: string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// 10. LINEAGE CONTEXT BLOCK
// ═══════════════════════════════════════════════════════════════════════════════

export interface LineageContext {
  upstreamConnectorName: string;
  upstreamConnectorVersion: string;
  normalizationPipelineName: string;
  normalizationPipelineVersion: string;
  lineagePath: string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// L2.1.1 — OBSERVATION SEMANTICS (what kind of truth entered)
// ═══════════════════════════════════════════════════════════════════════════════

export type ObservationKind =
  | 'RAW_EVENT' | 'POINT_IN_TIME_SNAPSHOT' | 'ROLLING_AGGREGATE'
  | 'WINDOWED_METRIC' | 'DERIVED_ESTIMATE' | 'CORRECTION' | 'BACKFILL_RECONSTRUCTION';

export type SamplingBasis = 'EVENT_DRIVEN' | 'FIXED_INTERVAL' | 'PROVIDER_DEFINED' | 'UNKNOWN';

export interface ObservationSemantics {
  observationKind: ObservationKind;
  metricFamily?: string;
  aggregationWindowMs?: number;
  samplingBasis: SamplingBasis;
  methodologyId?: string;
  endpointId?: string;
  endpointVersion?: string;
  sourceDeclaredAs?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// L2.1.1 — FIELD-LEVEL LINEAGE (which raw fragment produced which field)
// ═══════════════════════════════════════════════════════════════════════════════

export type FieldValidationResult = 'PASS' | 'WARN' | 'FAIL';

export interface NormalizedFieldLineage {
  fragmentId: string;
  fieldId: string;
  sourcePointer: string;
  normalizationRuleId: string;
  representativeFieldTupleId?: string;
  validationResult: FieldValidationResult;
  suppressionReason?: string;
}

export interface FieldLineageContext {
  normalizedFieldLineage: NormalizedFieldLineage[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// L2.1.1 — NORMALIZATION OUTCOME (partial normalization honesty)
// ═══════════════════════════════════════════════════════════════════════════════

export interface NormalizationOutcomeContext {
  normalizedFieldIds: string[];
  suppressedFieldIds: string[];
  failedFieldIds: string[];
  provisionalFieldIds: string[];
  normalizationWarnings: string[];
  fieldCompletenessRatio: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// L2.1.2 — TEMPORAL UNCERTAINTY (how trustworthy are the timestamps)
// ═══════════════════════════════════════════════════════════════════════════════

export type TimestampPrecision = 'MS' | 'SECOND' | 'MINUTE' | 'HOUR' | 'DAY';
export type ClockConfidence = 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN';

export interface TemporalUncertaintyContext {
  observedTimestampPrecision?: TimestampPrecision;
  publishedTimestampPrecision?: TimestampPrecision;
  sourceClockConfidence: ClockConfidence;
  estimatedClockSkewMs?: number;
  temporalUncertaintyMs?: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// L2.1.2 — ATTESTATION (tamper evidence and forensic proof)
// ═══════════════════════════════════════════════════════════════════════════════

export interface AttestationContext {
  canonicalSerializationVersion: string;
  canonicalEnvelopeHash: string;
  rawPayloadContentAddress: string;
  connectorBinaryVersion: string;
  connectorConfigHash: string;
  builderVersion: string;
  envelopeSignature?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// L2.1.2 — POLICY VERSION PINS (historically honest replay)
// ═══════════════════════════════════════════════════════════════════════════════

export interface PolicyContext {
  authorityConstitutionVersion: string;
  substitutionConstitutionVersion: string;
  freshnessPolicyVersion: string;
  integrityPolicyVersion: string;
  envelopeSchemaVersion: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// L2.1.3 — INGRESS USAGE RIGHTS (what may this envelope be used for)
// ═══════════════════════════════════════════════════════════════════════════════

export type PermittedUse =
  | 'CANONICALIZATION' | 'DISPLAY' | 'LIVE_SCORING' | 'SCENARIO_INPUT'
  | 'AUDIT_ONLY' | 'REPLAY_ONLY' | 'ENRICHMENT_ONLY';

export type ProhibitedUse =
  | 'LIVE_SCORING' | 'DIRECTIONAL_CLAIMS' | 'IDENTITY_ASSERTION' | 'SAFETY_VERDICT';

export interface IngressUsageRights {
  permittedUses: PermittedUse[];
  prohibitedUses: ProhibitedUse[];
  usageReasonCodes: string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// L2.1.3 — DISPOSITION (ingress acceptance state)
// ═══════════════════════════════════════════════════════════════════════════════

export type IngressDisposition =
  | 'ACCEPTED' | 'ACCEPTED_WITH_WARNINGS' | 'QUARANTINED'
  | 'REJECTED' | 'REPLAY_ONLY' | 'DEFERRED';

export interface DispositionContext {
  disposition: IngressDisposition;
  dispositionReasonCodes: string[];
  quarantineBucketId?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// L2.1.3 — SUPERSESSION (formal correction chain)
// ═══════════════════════════════════════════════════════════════════════════════

export type CorrectionType =
  | 'VALUE_CORRECTION' | 'SCOPE_CORRECTION' | 'TIMING_CORRECTION' | 'IDENTITY_CORRECTION';

export interface SupersessionContext {
  revisionNumber: number;
  supersedesEnvelopeId?: string;
  correctionType?: CorrectionType;
  correctionReasonCode?: string;
  supersessionChainRootId?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// L2.1.3 — ORDERING (event sequencing and causal relations)
// ═══════════════════════════════════════════════════════════════════════════════

export interface OrderingContext {
  orderingDomain: string;
  monotonicSequenceId?: string;
  causalParentEnvelopeIds: string[];
  siblingEnvelopeIds: string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTITUTIONAL ENVELOPE — THE TOP-LEVEL OBJECT
// ═══════════════════════════════════════════════════════════════════════════════

export interface ConstitutionalEnvelope {
  protocolVersion: string;
  envelopeKind: EnvelopeKind;

  // v1.0 blocks
  identity: EnvelopeIdentity;
  sourceContext: SourceContext;
  canonicalContext: CanonicalContext;
  timing: EnvelopeTiming;
  routeContext: RouteContext;
  authorityContext: AuthorityContext;
  payloadContext: PayloadContext;
  replayContext: ReplayContext;
  validationContext: ValidationContext;
  lineageContext: LineageContext;

  // L2.1.1 — Evidence-grade semantics
  observationSemantics: ObservationSemantics;
  fieldLineage: FieldLineageContext;
  normalizationOutcome: NormalizationOutcomeContext;

  // L2.1.2 — Forensic hardening
  temporalUncertainty: TemporalUncertaintyContext;
  attestation: AttestationContext;
  policyPins: PolicyContext;

  // L2.1.3 — Operational constitutional rights
  usageRights: IngressUsageRights;
  disposition: DispositionContext;
  supersession: SupersessionContext;
  ordering: OrderingContext;
}
