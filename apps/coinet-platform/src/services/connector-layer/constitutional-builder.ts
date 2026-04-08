/**
 * L2.1 Constitutional Envelope Builder
 *
 * Factory that creates a ConstitutionalEnvelope from:
 *   - raw connector output
 *   - existing v1 ConnectorEnvelope (upgrade path)
 *   - explicit structured input
 *
 * Every piece of data entering Coinet passes through this builder.
 */

import { createHash, randomBytes } from 'crypto';
import { generateTraceId } from './trace';
import { validateConstitutionalEnvelope } from './constitutional-validator';
import type {
  ConstitutionalEnvelope, EnvelopeKind, EntityType, EntityScope,
  RouteMode, FreshnessClass, FreshnessState, FallbackUsageStatus,
  AuthorityRole, SubstitutionRight, SpeakabilityPrecheck,
  IngressTrustClass, PayloadFormat, PayloadCompression,
  TimingCompleteness, CanonicalResolutionState, BlindSpotFlag,
  EnvelopeIdentity, SourceContext, CanonicalContext, EnvelopeTiming,
  RouteContext, AuthorityContext, PayloadContext, ReplayContext,
  ValidationContext, LineageContext,
  ObservationKind, SamplingBasis, ObservationSemantics,
  NormalizedFieldLineage, FieldLineageContext, NormalizationOutcomeContext,
  TimestampPrecision, ClockConfidence, TemporalUncertaintyContext,
  AttestationContext, PolicyContext,
  PermittedUse, ProhibitedUse, IngressUsageRights,
  IngressDisposition, DispositionContext,
  CorrectionType, SupersessionContext,
  OrderingContext,
} from './constitutional-envelope';
import { L21_PROTOCOL_VERSION } from './constitutional-envelope';
import type { SourceClass } from '../source-systems/registry';

// ═══════════════════════════════════════════════════════════════════════════════
// BUILDER INPUT
// ═══════════════════════════════════════════════════════════════════════════════

export interface ConstitutionalBuilderInput {
  kind?: EnvelopeKind;
  source: string;
  providerId: string;
  sourceClass: SourceClass;
  entityType: EntityType;
  entityScope?: EntityScope;
  chain?: string;
  venueScope?: string;

  canonicalCandidateIds: string[];
  canonicalConfidence?: number;
  canonicalState?: CanonicalResolutionState;
  representativeFieldTupleId?: string;

  observedAt?: number;
  publishedAt?: number;
  rawPayload: unknown;
  normalizedPayload: unknown;
  payloadFormat?: PayloadFormat;

  routeMode?: RouteMode;
  routePriority?: number;
  fallbackStatus?: FallbackUsageStatus;
  fallbackReason?: string;
  blindSpotFlags?: BlindSpotFlag[];

  trustClass?: IngressTrustClass;
  authorityRole?: AuthorityRole;
  substitutionRight?: SubstitutionRight;
  speakabilityPrecheck?: SpeakabilityPrecheck;
  healthSnapshotRef?: string;

  connectorName: string;
  connectorVersion: string;
  normalizationVersion?: string;

  replayGeneration?: number;
  backfillBatchId?: string;
  correctionOfEnvelopeId?: string;
  eventSequenceKey?: string;

  requestId?: string;
  routeId?: string;
  connectorInstanceId?: string;

  // L2.1.1
  observationKind?: ObservationKind;
  samplingBasis?: SamplingBasis;
  metricFamily?: string;
  aggregationWindowMs?: number;
  methodologyId?: string;
  endpointId?: string;
  endpointVersion?: string;
  sourceDeclaredAs?: string;
  normalizedFieldIds?: string[];
  suppressedFieldIds?: string[];
  failedFieldIds?: string[];
  provisionalFieldIds?: string[];
  fieldLineage?: NormalizedFieldLineage[];

  // L2.1.2
  observedTimestampPrecision?: TimestampPrecision;
  publishedTimestampPrecision?: TimestampPrecision;
  sourceClockConfidence?: ClockConfidence;
  estimatedClockSkewMs?: number;
  temporalUncertaintyMs?: number;
  connectorConfigHash?: string;

  // L2.1.3
  permittedUses?: PermittedUse[];
  prohibitedUses?: ProhibitedUse[];
  usageReasonCodes?: string[];
  correctionType?: CorrectionType;
  correctionReasonCode?: string;
  supersessionChainRootId?: string;
  revisionNumber?: number;
  orderingDomain?: string;
  monotonicSequenceId?: string;
  causalParentEnvelopeIds?: string[];
  siblingEnvelopeIds?: string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// ID GENERATION
// ═══════════════════════════════════════════════════════════════════════════════

let envelopeCounter = 0;

function generateEnvelopeId(): string {
  const ts = Date.now().toString(16);
  const cnt = (envelopeCounter++).toString(16).padStart(6, '0');
  const rand = randomBytes(4).toString('hex');
  return `env-${ts}-${cnt}-${rand}`;
}

function computePayloadHash(payload: unknown): string {
  const serialized = typeof payload === 'string' ? payload : JSON.stringify(payload ?? '');
  return createHash('sha256').update(serialized).digest('hex').substring(0, 32);
}

function computeDedupFingerprint(source: string, fieldTupleId: string | undefined, candidates: string[], observedAt: string | undefined): string {
  const raw = `${source}|${fieldTupleId ?? ''}|${candidates.join(',')}|${observedAt ?? ''}`;
  return createHash('sha256').update(raw).digest('hex').substring(0, 24);
}

function computeIdempotencyKey(source: string, routeId: string, observedAt: string | undefined): string {
  const raw = `${source}|${routeId}|${observedAt ?? Date.now()}`;
  return createHash('sha256').update(raw).digest('hex').substring(0, 24);
}

// ═══════════════════════════════════════════════════════════════════════════════
// BUILDER
// ═══════════════════════════════════════════════════════════════════════════════

export function buildConstitutionalEnvelope(input: ConstitutionalBuilderInput): ConstitutionalEnvelope {
  const now = new Date();
  const nowIso = now.toISOString();
  const nowMs = now.getTime();

  const observedIso = input.observedAt ? new Date(input.observedAt).toISOString() : undefined;
  const publishedIso = input.publishedAt ? new Date(input.publishedAt).toISOString() : undefined;
  const routeId = input.routeId ?? generateTraceId();
  const instanceId = input.connectorInstanceId ?? `inst-${input.connectorName}-${process.pid}`;

  const connectorLatencyMs = input.observedAt ? nowMs - input.observedAt : undefined;
  const publicationLagMs = input.observedAt && input.publishedAt ? input.publishedAt - input.observedAt : undefined;
  const ingestionLagMs = input.observedAt ? nowMs - input.observedAt : undefined;

  let timingCompleteness: TimingCompleteness = 'minimal';
  if (observedIso && publishedIso) timingCompleteness = 'full';
  else if (observedIso || publishedIso) timingCompleteness = 'partial';

  const canonState: CanonicalResolutionState = input.canonicalState ??
    (input.canonicalCandidateIds.length === 1 ? 'resolved' :
     input.canonicalCandidateIds.length === 0 ? 'unresolved' : 'ambiguous');

  const payloadHash = computePayloadHash(input.rawPayload);
  const rawRef = `raw://${input.source}/${payloadHash}/${nowMs}`;
  const dedupFp = computeDedupFingerprint(input.source, input.representativeFieldTupleId, input.canonicalCandidateIds, observedIso);
  const idempKey = computeIdempotencyKey(input.source, routeId, observedIso);

  const freshnessClass: FreshnessClass = ingestionLagMs === undefined ? 'acceptable' :
    ingestionLagMs < 5000 ? 'live' :
    ingestionLagMs < 30000 ? 'fresh' :
    ingestionLagMs < 120000 ? 'acceptable' :
    ingestionLagMs < 600000 ? 'stale' : 'expired';

  const identity: EnvelopeIdentity = {
    envelopeId: generateEnvelopeId(),
    traceId: generateTraceId(),
    requestId: input.requestId,
    routeId,
    connectorInstanceId: instanceId,
    source: input.source,
    providerId: input.providerId,
    sourceClass: input.sourceClass,
  };

  const sourceContext: SourceContext = {
    entityType: input.entityType,
    entityScope: input.entityScope ?? 'unknown',
    chain: input.chain,
    venueScope: input.venueScope,
  };

  const canonicalContext: CanonicalContext = {
    canonicalCandidateIds: input.canonicalCandidateIds,
    canonicalResolutionConfidence: input.canonicalConfidence ?? (canonState === 'resolved' ? 0.9 : canonState === 'ambiguous' ? 0.5 : 0.1),
    canonicalResolutionState: canonState,
    representativeFieldTupleId: input.representativeFieldTupleId,
    resolutionReasonCodes: [],
  };

  const timing: EnvelopeTiming = {
    observedTimestamp: observedIso,
    publishedTimestamp: publishedIso,
    receivedTimestamp: nowIso,
    ingestedTimestamp: nowIso,
    connectorLatencyMs,
    publicationLagMs,
    ingestionLagMs,
    timingCompleteness,
  };

  const routeContext: RouteContext = {
    freshnessClass,
    freshnessState: freshnessClass === 'stale' || freshnessClass === 'expired' ? 'beyond_sla' : 'within_sla',
    routeMode: input.routeMode ?? 'scheduled',
    routePriority: input.routePriority ?? 5,
    fallbackStatus: input.fallbackStatus ?? 'none',
    fallbackReason: input.fallbackReason,
    blindSpotFlags: input.blindSpotFlags ?? [],
  };

  const authorityContext: AuthorityContext = {
    trustClass: input.trustClass ?? 'unknown',
    authorityRole: input.authorityRole ?? 'unknown',
    substitutionRight: input.substitutionRight ?? 'unknown',
    speakabilityPrecheck: input.speakabilityPrecheck ?? 'unknown',
    healthSnapshotRef: input.healthSnapshotRef,
  };

  const payloadContext: PayloadContext = {
    rawPayloadRef: rawRef,
    rawPayloadHash: payloadHash,
    rawPayloadCompression: 'none',
    normalizedPayloadFragment: input.normalizedPayload,
    normalizationVersion: input.normalizationVersion ?? '1.0.0',
    payloadFormat: input.payloadFormat ?? 'json',
  };

  const replayContext: ReplayContext = {
    idempotencyKey: idempKey,
    dedupFingerprint: dedupFp,
    eventSequenceKey: input.eventSequenceKey,
    replayGeneration: input.replayGeneration ?? 0,
    backfillBatchId: input.backfillBatchId,
    correctionOfEnvelopeId: input.correctionOfEnvelopeId,
  };

  const lineageContext: LineageContext = {
    upstreamConnectorName: input.connectorName,
    upstreamConnectorVersion: input.connectorVersion,
    normalizationPipelineName: 'coinet-standard',
    normalizationPipelineVersion: input.normalizationVersion ?? '1.0.0',
    lineagePath: [input.source, input.connectorName, 'envelope-builder', 'validator'],
  };

  // ── L2.1.1 Evidence-grade blocks ─────────────────────────────────────────
  const kind = input.kind ?? 'observation';
  const obsKind: ObservationKind = input.observationKind ??
    (kind === 'correction' ? 'CORRECTION' :
     kind === 'backfill_record' ? 'BACKFILL_RECONSTRUCTION' :
     kind === 'event' ? 'RAW_EVENT' : 'POINT_IN_TIME_SNAPSHOT');

  const observationSemantics: ObservationSemantics = {
    observationKind: obsKind,
    metricFamily: input.metricFamily,
    aggregationWindowMs: input.aggregationWindowMs,
    samplingBasis: input.samplingBasis ?? 'PROVIDER_DEFINED',
    methodologyId: input.methodologyId,
    endpointId: input.endpointId,
    endpointVersion: input.endpointVersion,
    sourceDeclaredAs: input.sourceDeclaredAs,
  };

  const allFieldIds = input.normalizedFieldIds ?? [];
  const suppressed = input.suppressedFieldIds ?? [];
  const failedF = input.failedFieldIds ?? [];
  const provisional = input.provisionalFieldIds ?? [];
  const totalAttempted = allFieldIds.length + suppressed.length + failedF.length;

  const normalizationOutcome: NormalizationOutcomeContext = {
    normalizedFieldIds: allFieldIds,
    suppressedFieldIds: suppressed,
    failedFieldIds: failedF,
    provisionalFieldIds: provisional,
    normalizationWarnings: [],
    fieldCompletenessRatio: totalAttempted > 0 ? allFieldIds.length / totalAttempted : 1,
  };

  const fieldLineage: FieldLineageContext = {
    normalizedFieldLineage: input.fieldLineage ?? [],
  };

  // ── L2.1.2 Forensic hardening blocks ───────────────────────────────────
  const temporalUncertainty: TemporalUncertaintyContext = {
    observedTimestampPrecision: input.observedTimestampPrecision,
    publishedTimestampPrecision: input.publishedTimestampPrecision,
    sourceClockConfidence: input.sourceClockConfidence ?? 'UNKNOWN',
    estimatedClockSkewMs: input.estimatedClockSkewMs,
    temporalUncertaintyMs: input.temporalUncertaintyMs,
  };

  const configHash = input.connectorConfigHash ?? computePayloadHash(`${input.connectorName}:${input.connectorVersion}`);
  const envelopeContentForHash = `${identity.envelopeId}|${payloadHash}|${nowIso}`;
  const envelopeHash = createHash('sha256').update(envelopeContentForHash).digest('hex').substring(0, 32);

  const attestation: AttestationContext = {
    canonicalSerializationVersion: '1.0',
    canonicalEnvelopeHash: envelopeHash,
    rawPayloadContentAddress: rawRef,
    connectorBinaryVersion: input.connectorVersion,
    connectorConfigHash: configHash,
    builderVersion: L21_PROTOCOL_VERSION,
  };

  const policyPins: PolicyContext = {
    authorityConstitutionVersion: '1.0.0',
    substitutionConstitutionVersion: '1.0.0',
    freshnessPolicyVersion: '1.0.0',
    integrityPolicyVersion: '1.0.0',
    envelopeSchemaVersion: L21_PROTOCOL_VERSION,
  };

  // ── L2.1.3 Operational rights blocks ───────────────────────────────────
  const isBackfill = kind === 'backfill_record';
  const isStale = freshnessClass === 'stale' || freshnessClass === 'expired';
  const defaultPermitted: PermittedUse[] = isBackfill
    ? ['REPLAY_ONLY', 'AUDIT_ONLY']
    : isStale
      ? ['DISPLAY', 'AUDIT_ONLY']
      : ['CANONICALIZATION', 'DISPLAY', 'LIVE_SCORING', 'SCENARIO_INPUT'];

  const usageRights: IngressUsageRights = {
    permittedUses: input.permittedUses ?? defaultPermitted,
    prohibitedUses: input.prohibitedUses ?? (isBackfill ? ['LIVE_SCORING', 'DIRECTIONAL_CLAIMS'] : []),
    usageReasonCodes: input.usageReasonCodes ?? [],
  };

  const hasWarnings = normalizationOutcome.suppressedFieldIds.length > 0 || normalizationOutcome.failedFieldIds.length > 0;
  const dispositionVal: IngressDisposition = hasWarnings ? 'ACCEPTED_WITH_WARNINGS' : 'ACCEPTED';

  const disposition: DispositionContext = {
    disposition: dispositionVal,
    dispositionReasonCodes: [
      ...(suppressed.length > 0 ? [`${suppressed.length}_fields_suppressed`] : []),
      ...(failedF.length > 0 ? [`${failedF.length}_fields_failed`] : []),
    ],
  };

  const supersession: SupersessionContext = {
    revisionNumber: input.revisionNumber ?? 0,
    supersedesEnvelopeId: input.correctionOfEnvelopeId,
    correctionType: input.correctionType,
    correctionReasonCode: input.correctionReasonCode,
    supersessionChainRootId: input.supersessionChainRootId,
  };

  const ordering: OrderingContext = {
    orderingDomain: input.orderingDomain ?? `${input.sourceClass}:${input.source}`,
    monotonicSequenceId: input.monotonicSequenceId,
    causalParentEnvelopeIds: input.causalParentEnvelopeIds ?? [],
    siblingEnvelopeIds: input.siblingEnvelopeIds ?? [],
  };

  const envelope: ConstitutionalEnvelope = {
    protocolVersion: L21_PROTOCOL_VERSION,
    envelopeKind: kind,
    identity,
    sourceContext,
    canonicalContext,
    timing,
    routeContext,
    authorityContext,
    payloadContext,
    replayContext,
    validationContext: {
      schemaValid: true,
      timingValid: true,
      payloadValid: true,
      lineageComplete: true,
      envelopeValid: true,
      validationReasonCodes: [],
    },
    lineageContext,
    observationSemantics,
    fieldLineage,
    normalizationOutcome,
    temporalUncertainty,
    attestation,
    policyPins,
    usageRights,
    disposition,
    supersession,
    ordering,
  };

  const result = validateConstitutionalEnvelope(envelope);
  envelope.validationContext = {
    schemaValid: result.hardFails === 0,
    timingValid: !result.violations.some(v => v.block === 'timing' && v.severity === 'hard_fail'),
    payloadValid: !result.violations.some(v => v.block === 'payloadContext' && v.severity === 'hard_fail'),
    lineageComplete: !result.violations.some(v => v.block === 'lineageContext' && v.severity === 'hard_fail'),
    envelopeValid: result.valid,
    validationReasonCodes: result.violations.map(v => `${v.code}:${v.message}`),
  };

  return envelope;
}
