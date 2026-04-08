/**
 * L2.5 — Replay & Forensic Recoverability Types
 *
 * If Coinet cannot reconstruct how a judgment entered the system,
 * the system is not truly auditable.
 *
 * Three stores: immutable raw archive, normalized artifact store, replay index.
 * One graph: forensic lineage (request → route → envelope → raw → normalized →
 * dedup → correction → downstream claim).
 */

export const L25_VERSION = '2.0.0' as const;

// ═══════════════════════════════════════════════════════════════════════════════
// VERSION PINS — historical policy state at ingestion time
// ═══════════════════════════════════════════════════════════════════════════════

export interface IngressVersionPins {
  envelopeProtocolVersion: string;
  freshnessOntologyVersion: string;
  routingDoctrineVersion: string;
  dedupEngineVersion: string;
  connectorBinaryVersion: string;
  normalizationVersion: string;
  authorityConstitutionVersion?: string;
  substitutionConstitutionVersion?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// RAW PAYLOAD ARCHIVE — immutable source-origin evidence
// ═══════════════════════════════════════════════════════════════════════════════

export type PayloadFormat = 'json' | 'csv' | 'xml' | 'text' | 'binary' | 'websocket_event';

export interface RawPayloadRecord {
  rawPayloadRef: string;
  contentAddress: string;
  rawPayloadHash: string;
  payloadFormat: PayloadFormat;
  blobSizeBytes: number;
  blob: unknown;

  source: string;
  providerId: string;
  connectorInstanceId: string;
  routeId: string;
  routeMode: string;

  observedTimestamp?: string;
  publishedTimestamp?: string;
  receivedTimestamp: string;
  ingestedTimestamp: string;

  schemaVersion?: string;
  replayGeneration: number;
  backfillBatchId?: string;

  createdAt: string;
}

export interface ArchiveWriteResult {
  rawPayloadRef: string;
  contentAddress: string;
  rawPayloadHash: string;
  bytesStored: number;
}

export interface ArchiveIntegrityResult {
  rawPayloadRef: string;
  valid: boolean;
  expectedHash: string;
  actualHash: string;
  issues: string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// NORMALIZED ARTIFACT STORE — post-normalization evidence
// ═══════════════════════════════════════════════════════════════════════════════

export interface NormalizedFieldLineage {
  fragmentId: string;
  fieldId: string;
  sourcePointer: string;
  normalizationRuleId: string;
  representativeFieldTupleId?: string;
  validationResult: 'PASS' | 'WARN' | 'FAIL';
  suppressionReason?: string;
}

export interface NormalizedArtifactRecord {
  envelopeId: string;
  normalizationVersion: string;
  normalizedPayloadFragment: unknown;
  canonicalCandidateIds: string[];
  canonicalResolutionState: 'resolved' | 'ambiguous' | 'unresolved';
  representativeFieldTupleId?: string;
  normalizedFieldLineage: NormalizedFieldLineage[];
  suppressedFieldIds: string[];
  provisionalFieldIds: string[];
  warnings: string[];
  replayGeneration: number;
  createdAt: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// REPLAY INDEX — fast lookup for deterministic replay
// ═══════════════════════════════════════════════════════════════════════════════

export interface ReplayIndexRecord {
  envelopeId: string;
  traceId: string;
  requestId?: string;
  routeId: string;
  routeMode: string;
  source: string;
  providerId: string;
  sourceClass: string;
  fieldFamily?: string;

  idempotencyKey: string;
  dedupFingerprint: string;
  eventSequenceKey?: string;

  replayGeneration: number;
  backfillBatchId?: string;
  correctionOfEnvelopeId?: string;
  supersessionChainRootId?: string;

  rawPayloadRef: string;
  normalizationVersion: string;
  versionPins: IngressVersionPins;

  identityVerdict?: string;
  freshnessState?: string;
  routeState?: string;
  blindSpots: string[];

  createdAt: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// REPLAY MODES & SESSION
// ═══════════════════════════════════════════════════════════════════════════════

export type ReplayMode =
  | 'STRICT_FORENSIC'
  | 'STRUCTURAL_REPLAY'
  | 'BATCH_REPLAY'
  | 'DRY_RUN_AUDIT';

export type ReplaySessionStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'PARTIAL';

export interface ReplayScope {
  envelopeIds?: string[];
  traceId?: string;
  backfillBatchId?: string;
  timeRangeStart?: string;
  timeRangeEnd?: string;
  sourceFilter?: string;
  fieldFamilyFilter?: string;
  maxEnvelopes?: number;
}

export interface ReplayRequest {
  scope: ReplayScope;
  replayMode: ReplayMode;
  pinnedVersions: IngressVersionPins;
  replayGeneration: number;
}

export interface ReplaySession {
  sessionId: string;
  createdAt: string;
  completedAt?: string;
  status: ReplaySessionStatus;
  replayMode: ReplayMode;
  replayGeneration: number;
  versionPins: IngressVersionPins;
  scope: ReplayScope;
  results: ReplayResults;
}

export interface ReplayResults {
  totalEnvelopes: number;
  reconstructed: number;
  failedReconstruction: number;
  divergenceDetected: boolean;
  integrityViolations: string[];
  driftDetected: DriftRecord[];
  divergenceReasons: string[];
}

export interface DriftRecord {
  envelopeId: string;
  dimension: 'FRESHNESS' | 'ROUTING' | 'IDENTITY' | 'LINEAGE' | 'POLICY';
  originalValue: string;
  replayedValue: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  reasonCode: string;
}

export interface SingleReplayOutcome {
  envelopeId: string;
  success: boolean;
  integrityScore: number;
  drifts: DriftRecord[];
  divergenceReasons: string[];
  reconstructedSnapshot?: ForensicSnapshot;
}

// ═══════════════════════════════════════════════════════════════════════════════
// FORENSIC SNAPSHOT — complete point-in-time ingress record
// ═══════════════════════════════════════════════════════════════════════════════

export interface ForensicSnapshot {
  snapshotId: string;
  envelopeId: string;
  capturedAt: string;

  versionPins: IngressVersionPins;

  envelope: EnvelopeSummary;
  freshnessDecision: FreshnessSummary;
  routingDecision: RoutingSummary;
  identityDecision: IdentitySummary;

  downstreamTrace: DownstreamTrace;
  blindSpotRecord: BlindSpotRecord;

  reconstructionIntegrity: ReconstructionIntegrity;
}

export interface EnvelopeSummary {
  envelopeId: string;
  envelopeKind: string;
  source: string;
  providerId: string;
  sourceClass: string;
  fieldFamily?: string;
  entityType?: string;
  canonicalCandidateCount: number;
  observedTimestamp?: string;
  ingestedTimestamp: string;
  routeMode: string;
  rawPayloadRef: string;
  rawPayloadHash: string;
  normalizationVersion: string;
  lineageComplete: boolean;
  timingCompleteness: string;
}

export interface FreshnessSummary {
  freshnessFamily: string;
  freshnessClass: string;
  freshnessState: string;
  dominantClock: string;
  observationAgeMs?: number;
  rights: string[];
  confidencePenalty: number;
  disclosureRequired: boolean;
}

export interface RoutingSummary {
  routeMode: string;
  selectedConnector: string;
  routeState: string;
  truthFidelityScore: number;
  compositeScore: number;
  provenanceScore: number;
  allowedConsumers: string[];
  blindSpots: string[];
  fallbackUsed: boolean;
}

export interface IdentitySummary {
  verdict: string;
  idempotencyKey: string;
  dedupFingerprint: string;
  sequenceKey?: string;
  priorEnvelopeIds: string[];
  correctionType?: string;
  correctionOfEnvelopeId?: string;
  downstreamEmissionAllowed: boolean;
  liveStateMutationAllowed: boolean;
}

export interface BlindSpotRecord {
  routeBlindSpots: string[];
  fieldGaps: string[];
  fallbackScars: string[];
  degradationState?: string;
}

export interface DownstreamTrace {
  consumers: string[];
  judgmentRefs: string[];
  scoringRefs: string[];
  contradictionRefs: string[];
  scenarioRefs: string[];
  explanationRefs: string[];
}

export interface ReconstructionIntegrity {
  envelopeReconstructable: boolean;
  freshnessReplayable: boolean;
  routingReplayable: boolean;
  identityReplayable: boolean;
  versionsPinned: boolean;
  lineageComplete: boolean;
  rawPayloadRecoverable: boolean;
  integrityScore: number;
  issues: string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// FORENSIC RECONSTRUCTION — historical ingress story
// ═══════════════════════════════════════════════════════════════════════════════

export type ReconstructionTarget = 'judgment' | 'score' | 'contradiction' | 'scenario' | 'envelope' | 'trace';

export interface ForensicReconstructionRequest {
  targetType: ReconstructionTarget;
  targetId: string;
}

/**
 * L3.3-B — Confidence state summary captured at ingress time.
 * Replay and forensic views must show confidence state as it was,
 * not as it is now. This snapshot preserves that invariant.
 */
export interface ConfidenceStateSummary {
  stateId: string;
  canonicalId: string;
  band: string;
  epistemicState: string;
  finalScore: number;
  activeScars: string[];
  capChain: string[];
  policyVersion: string;
  evaluatorVersion: string;
  evaluatedAt: string;
}

export interface ForensicReconstruction {
  reconstructedAt: string;
  targetType: ReconstructionTarget;
  targetId: string;

  ingressArtifacts: ReplayIndexRecord[];
  rawPayloadRefs: string[];
  normalizedArtifacts: NormalizedArtifactRecord[];

  freshnessHistory: FreshnessSummary[];
  routeHistory: RoutingSummary[];
  identityHistory: IdentitySummary[];
  blindSpotHistory: BlindSpotRecord[];

  correctionChains: CorrectionChain[];

  claimLineagePack: ClaimLineagePack;

  /** L3.3-B: confidence state snapshots active during the forensic window */
  confidenceHistory?: ConfidenceStateSummary[];

  explanation: string[];
}

export interface CorrectionChain {
  rootEnvelopeId: string;
  chain: Array<{
    envelopeId: string;
    correctionType: string;
    timestamp: string;
  }>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CLAIM LINEAGE PACK — evidence-grade downstream traceability
// ═══════════════════════════════════════════════════════════════════════════════

export interface ClaimLineagePack {
  claimId: string;
  supportingEnvelopeIds: string[];
  supportingRawPayloadRefs: string[];
  routeIds: string[];
  traceIds: string[];
  replayGenerations: number[];
  blindSpotRefs: string[];
  correctionChainRefs: string[];
  versionPinsAtIngress: IngressVersionPins[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// BACKFILL BATCH CONSTITUTION
// ═══════════════════════════════════════════════════════════════════════════════

export interface BackfillBatchConstitution {
  backfillBatchId: string;
  sourceSet: string[];
  routeMode: 'BACKFILL';
  startTime: string;
  endTime: string;
  orderingPolicy: 'STRICT_CHRONOLOGICAL' | 'APPROXIMATE_CHRONOLOGICAL' | 'PROVIDER_DEFAULT' | 'UNORDERED';
  pinnedVersions: IngressVersionPins;
  replayGeneration: number;
  declaredAt: string;
}

export interface BackfillReproducibilityResult {
  batchId: string;
  reproducible: boolean;
  constitutionDeclared: boolean;
  totalArtifacts: number;
  matchedArtifacts: number;
  divergenceReasons: string[];
  missingArtifacts: string[];
  mismatchedVersions: string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// FORENSIC LINEAGE GRAPH — edges between ingress nodes
// ═══════════════════════════════════════════════════════════════════════════════

export type LineageEdgeKind =
  | 'ARRIVED_VIA'
  | 'NORMALIZED_FROM'
  | 'DEDUPED_AGAINST'
  | 'CORRECTS'
  | 'REPLAY_OF'
  | 'BACKFILL_OF'
  | 'SUPPORTED'
  | 'BLOCKED_BY'
  | 'DEGRADED_BY';

export interface LineageEdge {
  fromId: string;
  fromType: string;
  toId: string;
  toType: string;
  edgeKind: LineageEdgeKind;
  metadata?: Record<string, string>;
  createdAt: string;
}
