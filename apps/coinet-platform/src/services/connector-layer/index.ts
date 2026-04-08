/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     CONNECTOR & ROUTING LAYER — Layer 2                                       ║
 * ║                                                                               ║
 * ║   The translation and control boundary between external source reality        ║
 * ║   and Coinet's internal intelligence system.                                  ║
 * ║                                                                               ║
 * ║   Six non-negotiable guarantees:                                              ║
 * ║     1. Provider isolation                                                     ║
 * ║     2. Envelope standardization                                               ║
 * ║     3. Freshness awareness                                                    ║
 * ║     4. Routing discipline                                                     ║
 * ║     5. Controlled degradation                                                 ║
 * ║     6. Governed truth loss (4.3) — fallback as epistemic state change         ║
 * ║                                                                               ║
 * ║   Nothing enters Coinet intelligence directly from a provider.                ║
 * ║   Everything passes through a connector contract.                             ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

// ── Types ────────────────────────────────────────────────────────────────────
export type {
  ConnectorEnvelope,
  ConnectorResult,
  ConnectorConfig,
  ConnectorAcquireParams,
  ConnectorLifecycleTrace,
  EntityType,
  TrustClass,
  FallbackStatus,
  ConnectorCategory,
  FreshnessBucket,
  Freshness,
  RoutingMode,
  RoutingModeContract,
  IngressOrigin,
  ModeOperationalFlags,
  ScheduledCadenceTier,
  FallbackSemanticCategory,
  TruthStateKind,
  FallbackEpistemicMetadata,
  SubstitutionSemantics,
  JudgmentMeaningfulness,
  ContinuityHierarchyRank,
  TruthLossAccounting,
} from './types';

// ── Fallback design (4.3 governed truth loss) ─────────────────────────────────
export {
  // Doctrine constants
  FALLBACK_INVARIANTS,
  FALLBACK_INVARIANTS_4_3_7,
  PRODUCTION_FALLBACK_RULES,
  PRODUCTION_FALLBACK_RULES_4_3_8,
  READER_EXECUTION_DOCTRINE,
  READER_EXECUTION_DOCTRINE_4_3_11,
  TRUTH_DOMAIN_FALLBACK_DOCTRINE,
  FALLBACK_SEQUENCE_STEPS,
  CONTINUITY_HIERARCHY,
  THESIS_CRITICAL_CONFIDENCE_MULTIPLIER,
  MIN_MATERIAL_CONFIDENCE_PENALTY,
  // Inference
  inferTruthStateKind,
  inferFallbackSemanticCategory,
  computeDegradedModeActive,
  inferContinuityHierarchyRank,
  inferSubstitutionSemantics,
  inferJudgmentMeaningfulness,
  buildTruthLossAccounting,
  // Penalty engine
  buildConfidencePenaltySuggestion,
  applyThesisDependenceToPenalty,
  // Hard blockers
  evaluateHardBlocker,
  isTypicalStructuralSafetyHardBlocker,
  // User-visible
  buildUserVisibleLayerMessage,
  // Impact matrix
  getFallbackImpactMatrix,
  // Assembly
  buildFallbackEpistemicMetadata,
  buildFallbackEpistemicMetadataForFailure,
} from './fallback-design';
export type { TruthDomainFallbackDoctrine, HardBlockerContext } from './fallback-design';

// ── Routing Modes (4.2 operational doctrine) ─────────────────────────────────
export {
  getRoutingModeFromCategory,
  getRoutingModeContract,
  getModeDegradationPolicy,
  isFreshnessAcceptableForMode,
  isLatencyDegradedForMode,
  compareModePriority,
  getModesByPriority,
  getIngressOriginForRoutingMode,
  resolveIngressOrigin,
  computeModeOperationalFlags,
  sortModulesByRoutingPriority,
  shouldPreemptScheduledForHigherModes,
  CATEGORY_TO_MODE,
  ROUTING_MODE_TO_INGRESS_ORIGIN,
  ROUTING_MODE_CONTRACTS,
  MODE_DEGRADATION_POLICIES,
  ROUTING_MODE_BOUNDARIES,
  PRODUCTION_ROUTING_RULES_4_2_9,
  READER_EXECUTION_DOCTRINE_4_2_12,
  PROVIDER_ROUTING_MODE_REFERENCE,
} from './routing-modes';
export type { ModeDegradationPolicy, DegradationAction } from './routing-modes';

// ── Trace ────────────────────────────────────────────────────────────────────
export { generateTraceId, traceIdTimestamp } from './trace';

// ── Freshness (legacy) ──────────────────────────────────────────────────────
export {
  computeFreshness,
  computeFreshnessNoSourceTime,
  getProviderFreshnessThreshold,
} from './freshness';

// ── L2.2 Freshness Ontology ─────────────────────────────────────────────────
export { L22_VERSION } from './freshness-ontology';
export type {
  FreshnessFamily, FreshnessClass as L22FreshnessClass,
  FreshnessState as L22FreshnessState, DominantClock, ClaimUsage,
  FreshnessUsageRight, FreshnessCriticality, TimingAges,
  FreshnessDecisionRecord, FreshnessEvaluationInput,
} from './freshness-ontology';

export {
  findPolicy, getAllPolicies, getPoliciesByFamily, getPoliciesByCriticality,
  DEFAULT_POLICY,
  type FreshnessPolicy,
} from './freshness-policy-map';

export {
  resolveDominantClock, computeTimingAges, assignFreshnessState,
  applyTransportGapEscalation, applyClaimUsageOverride,
  type StateResult,
} from './freshness-state-machine';

export {
  evaluateFreshness, evaluateForUsage, evaluateMultipleFields,
  verifyRightsHonesty, summarizeDecision,
  isUsableForLive, isDisplayable, worstState,
  getEvaluationLedger, clearEvaluationLedger,
} from './freshness-evaluator';

// ── Base Connector ───────────────────────────────────────────────────────────
export { BaseConnector, type RawAcquisition } from './base-connector';

// ── Envelope Factory ─────────────────────────────────────────────────────────
export {
  createEnvelope,
  createEnvelopesFromEvidence,
  getModuleDoctrine,
  getAllModuleDoctrines,
  type EnvelopeFactoryInput,
  type ModuleDoctrine,
} from './envelope-factory';

// ── Envelope Validator ───────────────────────────────────────────────────────
export {
  validateEnvelope,
  assessProductionReadiness,
  type EnvelopeValidationResult,
  type EnvelopeViolation,
  type ProductionReadinessResult,
} from './envelope-validator';

// ── Connector Registry & Routing ─────────────────────────────────────────────
export {
  registerConnector,
  getConnector,
  getConnectorChain,
  getConnectorByProvider,
  getRegisteredModules,
  getRegistryDiagnostics,
  executeWithFallback,
  executeModules,
  type RegistryEntry,
  type RoutingDecision,
  type ExecutionSummary,
} from './connector-registry';

// ── Concrete Connectors ──────────────────────────────────────────────────────
export {
  initializeConnectors,
  DexScreenerConnector,
  CoinGlassConnector,
  GoPlusSecurityConnector,
  GoPlusHoldersConnector,
  LunarCrushConnector,
  CryptoPanicConnector,
  AlchemyConnector,
  CoinGeckoConnector,
} from './connectors';

// ── L2.1 Constitutional Envelope Protocol ────────────────────────────────
export { L21_PROTOCOL_VERSION } from './constitutional-envelope';
export type {
  ConstitutionalEnvelope,
  EnvelopeKind,
  EnvelopeIdentity,
  SourceContext,
  CanonicalContext,
  EnvelopeTiming,
  RouteContext,
  AuthorityContext,
  PayloadContext,
  ReplayContext,
  ValidationContext,
  LineageContext,
  EntityScope,
  RouteMode,
  FreshnessState,
  FallbackUsageStatus,
  BlindSpotFlag,
  AuthorityRole,
  SubstitutionRight,
  SpeakabilityPrecheck,
  IngressTrustClass,
  PayloadFormat,
  PayloadCompression,
  TimingCompleteness,
  CanonicalResolutionState,
  ObservationKind, SamplingBasis, ObservationSemantics,
  NormalizedFieldLineage, FieldLineageContext, NormalizationOutcomeContext,
  FieldValidationResult,
  TimestampPrecision, ClockConfidence, TemporalUncertaintyContext,
  AttestationContext, PolicyContext,
  PermittedUse, ProhibitedUse, IngressUsageRights,
  IngressDisposition, DispositionContext,
  CorrectionType, SupersessionContext,
  OrderingContext,
} from './constitutional-envelope';

export {
  validateConstitutionalEnvelope,
  type ConstitutionalValidationResult,
  type ConstitutionalViolation,
  type ViolationSeverity,
} from './constitutional-validator';

export {
  buildConstitutionalEnvelope,
  type ConstitutionalBuilderInput,
} from './constitutional-builder';

export {
  processEnvelopeIngress,
  isDuplicate,
  registerDedup,
  isCorrection,
  getCorrectionChain,
  getReplayLedger,
  getReplayLedgerSince,
  getAllBackfillBatches,
  buildLineageAudit,
  verifyLineageIntegrity,
  resetAllLineageState,
  type ReplayLedgerEvent,
  type LineageAuditRecord,
  type IngestResult,
} from './envelope-lineage';

// ── L2.3 Routing Mode Doctrine ──────────────────────────────────────────────
export { L23_VERSION } from './routing-mode-types';
export type {
  L23RouteMode, RouteState, RouteProbationState, LatencyClass, LatencyBands,
  CostToleranceMode, RouteConsumer, RouteIntention,
  RouteFailoverOutcome, RouteBlindSpot, DegradationSemantic,
  RouteDecisionRecord, RejectedCandidate, FallbackCandidate,
  RoutePlanningInput, AvailableRoute, RouteIncident,
} from './routing-mode-types';

export {
  ROUTE_CONSTITUTIONS,
  getConstitution, isConsumerAllowed, isConsumerConditional,
  isConsumerProhibited, getConsumerVerdict,
  REALTIME_CONSTITUTION, SCHEDULED_CONSTITUTION,
  ON_DEMAND_CONSTITUTION, BACKFILL_CONSTITUTION,
  type RouteModeConstitution,
} from './routing-constitution';

export {
  findSelectionPolicy, getAllSelectionPolicies,
  isRouteModeAdmissible, DEFAULT_ROUTE_SELECTION_POLICY,
  type RouteSelectionPolicy,
} from './route-selection-policy';

export {
  planRoute, verifyRouteChoiceHonesty,
  getPlanningLedger, clearPlanningLedger,
} from './route-planner';

export {
  evaluateFailover, evaluateRestoration,
  recordRouteDegradation, recordRouteStable,
  getRestorationState, advanceRestoration, resetRouteHealth,
  type FailoverRequest, type FailoverDecision,
  type RestorationState, type RestorationDecision,
} from './route-failover-governor';

// ── L2.4 Idempotency & Deduplication ────────────────────────────────────────
export { L24_VERSION } from './event-fingerprint';
export {
  computeFingerprint, computeIdempotencyKey, computeSequenceKey,
  semanticHash, timeBucket, detectFingerprintFamily, getBucketMs,
  type FingerprintFamily, type FingerprintInput, type FingerprintResult,
  type IdempotencyKeyInput, type SequenceKeyInput,
} from './event-fingerprint';

export {
  findDedupPolicy, getAllDedupPolicies, DEFAULT_DEDUP_POLICY,
  type DedupPolicy,
} from './dedup-policy-map';

export {
  checkIdempotency, getIdempotencyEntry,
  getIdempotencyRegistrySize, resetIdempotencyRegistry,
  type IdempotencyDecision, type IdempotencyEntry,
  type IdempotencyCheckInput, type IdempotencyResult,
} from './idempotency-engine';

export {
  checkDedup, registerDedupEntry,
  getDedupStoreSize, resetDedupEngine,
  type DedupDecision, type DedupCheckInput, type DedupResult,
} from './dedup-engine';

export {
  adjudicateCorrectionVsDuplicate,
  type CorrectionDecision, type CorrectionType as L24CorrectionType,
  type CorrectionAdjudicationInput, type CorrectionAdjudicationResult,
  type DownstreamInvalidation,
} from './correction-vs-duplicate';

export {
  recordIdentityDecision, getIdentityLedger,
  getIdentityLedgerByVerdict, getIdentityLedgerForEnvelope,
  resetIdentityLedger, verifyIdentityCollapseHonesty,
  type IngressIdentityVerdict, type IngressIdentityDecision,
} from './dedup-ledger';

// ── L2.5 Replay & Forensic Recoverability ───────────────────────────────────
export { L25_VERSION } from './replay-types';
export type {
  IngressVersionPins, ForensicSnapshot,
  EnvelopeSummary as L25EnvelopeSummary,
  FreshnessSummary as L25FreshnessSummary,
  RoutingSummary as L25RoutingSummary,
  IdentitySummary as L25IdentitySummary,
  DownstreamTrace, ReconstructionIntegrity,
  BlindSpotRecord, RawPayloadRecord, NormalizedArtifactRecord,
  NormalizedFieldLineage as L25NormalizedFieldLineage,
  ReplayIndexRecord, ReplayMode,
  ReplaySession, ReplayScope, ReplayResults, ReplayRequest, DriftRecord,
  SingleReplayOutcome, ForensicReconstruction, ForensicReconstructionRequest,
  ReconstructionTarget, ClaimLineagePack, CorrectionChain,
  BackfillBatchConstitution, BackfillReproducibilityResult,
  ArchiveWriteResult, ArchiveIntegrityResult,
  LineageEdge, LineageEdgeKind,
  PayloadFormat as L25PayloadFormat,
} from './replay-types';

export {
  REPLAY_DOCTRINE,
  captureCurrentVersionPins, validateVersionPins, detectVersionDrift,
  computeReconstructionIntegrity, evaluateReplayPromotion,
  type VersionDrift, type IntegrityInput, type ReplayPromotionDecision,
} from './replay-constitution';

export {
  archiveRawPayload, readRawPayload, rawPayloadExists,
  verifyArchiveIntegrity, getArchiveBySource, getArchiveByBatch,
  getArchiveByGeneration, getArchiveSize, getAllArchiveRefs, resetArchive,
  type RawPayloadInput,
} from './raw-payload-archive';

export {
  registerInReplayIndex, getByEnvelopeId, getByTraceId, getByBatchId,
  getByRouteId, getByDedupFingerprint, getByIdempotencyKey,
  getCorrectionChain as getReplayCorrectionChain,
  getByReplayGeneration, getReplaySlice,
  addDownstreamEdge, getLineageEdgesFrom, getLineageEdgesTo,
  getFullLineageGraph, getIndexSize, getLineageEdgeCount, resetReplayIndex,
} from './replay-index';

export {
  replaySingleEnvelope, createReplaySession as createIngressReplaySession,
  executeReplaySession as executeIngressReplaySession,
  getReplaySession, getAllReplaySessions, resetIngressReplayEngine,
  verifyReplayHonesty,
} from './ingress-replay-engine';

export {
  reconstruct, storeNormalizedArtifact, getNormalizedArtifact,
  getAllNormalizedArtifacts, resetNormalizedStore,
  registerDownstreamClaim, getClaimLink, resetClaimRegistry,
  verifyForensicFaithfulness,
  type DownstreamClaimLink,
} from './forensic-reconstruction';

export {
  declareBackfillConstitution, getBackfillConstitution,
  getAllConstitutions, resetConstitutionRegistry,
  checkReproducibility, compareBackfillRuns, verifyBackfillHonesty,
  type BackfillComparisonResult,
} from './backfill-reproducibility';

// ── L2.6 Per-Request Traceability ─────────────────────────────────────────
export { L26_VERSION } from './trace-graph';
export type {
  RequestKind, RequestIntention,
  TraceNodeKind, TraceNode, TraceEdgeKind, TraceEdge,
  IngressDisposition as L26IngressDisposition, SurvivalMode,
  BlindSpotType, BlindSpotSeverity,
  RequestIngressSummary, RequestTrace,
  RouteCandidateTrace, FallbackTraceStep, RouteTrace,
  EnvelopeTrace, BlindSpotTrace,
} from './trace-graph';
export {
  addNode as addTraceNode, addEdge as addTraceEdge,
  getNode as getTraceNode, getNodesOfKind, getEdgesFrom as getTraceEdgesFrom,
  getEdgesTo as getTraceEdgesTo, getEdgesOfKind,
  getNodeCount as getTraceNodeCount, getEdgeCount as getTraceEdgeCount,
  validateGraphInvariants, resetTraceGraph,
} from './trace-graph';

export {
  openRequestTrace, recordRouteTrace, recordEnvelopeTrace,
  recordBlindSpotTrace, finalizeRequestTrace,
  getRequestTrace, getRouteTrace, getEnvelopeTrace, getBlindSpotTrace,
  getAllRequestTraces, getRouteTracesForRequest,
  getEnvelopeTracesForRequest, getBlindSpotTracesForRequest,
  resetTraceBuilder,
  type RequestTraceOpenInput,
} from './request-trace-builder';

export {
  buildRouteTrace, analyzeCounterfactual, detectRouteScars,
  type RouteTraceInput, type CounterfactualAnalysis, type RouteScar,
} from './route-trace-recorder';

export {
  buildLineagePack, storeLineagePack, getLineagePack,
  getLineagePackByTrace, getAllLineagePacks, resetLineagePackStore,
  verifyLineagePackHonesty,
  type LineagePack, type LineagePackInput,
} from './lineage-pack';

// ── L2.7 Fallback & Blind-Spot Signaling ─────────────────────────────────
export { L27_VERSION } from './fallback-semantics';
export type {
  BlindSpotScope, BlindSpotCause, BlindSpotClaimConstraint,
  FallbackEquivalence, FallbackSemanticsRecord, FallbackEvalInput,
} from './fallback-semantics';
export { evaluateFallbackSemantics } from './fallback-semantics';

export {
  computeBlindSpotFingerprint, dedupBlindSpot,
  getFingerprintCount, resetFingerprintRegistry,
  type BlindSpotFingerprint, type BlindSpotFingerprintInput, type DedupResult as BlindSpotDedupResult,
} from './blindspot-fingerprint';

export {
  compileBlindSpots,
  recordBlindSpots, getBlindSpotLedger,
  getBlindSpotsByRequest, getBlindSpotsBySeverity,
  resetBlindSpotLedger,
  type BlindSpotRecord as L27BlindSpotRecord,
  type BlindSpotEngineInput, type BlindSpotEngineResult,
  type BlindSpotSummary,
  type RouteOutcome as L27RouteOutcome,
  type EnvelopeOutcome as L27EnvelopeOutcome,
} from './blindspot-engine';

export {
  propagateBlindSpots, verifyPropagationHonesty,
  type PropagationTarget, type PropagationEffectType,
  type BlindSpotPropagationEffect,
  type BlindSpotLineageAugmentation,
  type PropagationResult,
} from './blindspot-propagation';

// ── Layer 2 Constitution ──────────────────────────────────────────────────
export {
  LAYER2_CONSTITUTION_VERSION,
  captureLayer2Versions, validateVersionCompatibility,
  LAYER2_INVARIANTS, LAYER2_PROPERTIES,
  getInvariantsByCertification, getInvariantsBySublayer, getHardFailInvariants,
  type Layer2VersionPins, type VersionCompatibilityResult, type VersionDriftEntry,
  type Layer2Invariant, type InvariantSeverity, type Layer2Certification,
} from './layer2-constitution';

// ── Layer 2 Control Plane ─────────────────────────────────────────────────
export {
  logIngressEvent, getLedger, getLedgerSize, getLedgerByKind,
  getLedgerByFieldFamily, getLedgerByProvider, getLedgerBySeverity,
  getLedgerSince, summarizeLedger, resetLedger,
  type IngressEventKind, type IngressLedgerEntry, type IngressLedgerSummary,
} from './ingress-ledger';

export {
  reportIncident, getIncidents, getIncidentsByKind, getIncidentsByProvider,
  getIncidentsByFieldFamily, getIncidentsBySeverity,
  clusterIncidents, summarizeIncidents, resetIncidents,
  type IncidentKind, type IncidentSeverity as ConnectorIncidentSeverity,
  type ConnectorIncident, type IncidentCluster, type IncidentSummary,
} from './connector-incidents';

export {
  buildRouteImpactRecord, recordRouteImpact,
  getRouteImpactRecords, getImpactByFieldFamily, getImpactByRouteMode,
  summarizeRouteImpact, resetRouteImpactStore,
  type RouteImpactRecord, type RouteImpactInput, type RouteImpactSummary,
} from './route-impact-report';

// ── Layer 2 Lineage Fitness ───────────────────────────────────────────────
export {
  computeLineageFitness, recordLineageFitness,
  getLineageFitnessScores, getLineageFitnessForRequest,
  getAverageLineageFitness, getLineageFitnessBelowThreshold,
  resetLineageFitnessStore,
  type LineageFitnessScore, type LineageFitnessInput,
} from './lineage-fitness';

// ── Layer 2 Shadow Routing ────────────────────────────────────────────────
export {
  executeShadowBenchmark, recordBenchmark, getBenchmarks,
  getBenchmarksByFieldFamily, computePlannerCorrectness, resetShadowRouting,
  type ShadowRouteResult, type RouteBenchmarkResult,
  type ShadowExecutionInput, type PlannerCorrectnessReport,
} from './shadow-routing';

// ── Layer 2 Replay Audit Scheduler ────────────────────────────────────────
export {
  getSchedule, getEnabledSchedule, addScheduleEntry,
  recordAuditRun, getAuditHistory, getAuditHistoryByCadence,
  getFailedAudits, getDriftIncidents, summarizeAudits, resetAuditHistory,
  type AuditCadence, type AuditTarget, type AuditScheduleEntry,
  type AuditCheckKind, type AuditCheck, type ReplayAuditRun, type ReplayAuditSummary,
} from './replay-audit-scheduler';

// ── Layer 2 Adversarial Ingress Lab ───────────────────────────────────────
export {
  ADVERSARIAL_SCENARIOS,
  recordScenarioRun, getScenarioHistory, getFailedScenarios,
  summarizeLab, resetAdversarialLab,
  type AdversarialScenario, type ExpectedOutcome,
  type ScenarioDefinition, type ScenarioRunResult, type AdversarialLabSummary,
} from './adversarial-ingress-lab';

// ── Layer 2 Field-Family SLOs ─────────────────────────────────────────────
export {
  DEFAULT_SLOS, getSLOForFieldFamily, getAllSLOs,
  evaluateSLO, recordSLOEvaluation, getSLOEvaluations, getSLOViolations,
  buildSLODashboard, resetSLOStore,
  type FieldFamilySLO, type FieldFamilyMeasurement,
  type SLOEvaluationResult, type SLOViolation, type SLODashboard,
} from './field-family-slos';
