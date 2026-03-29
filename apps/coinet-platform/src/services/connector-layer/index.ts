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

// ── Freshness ────────────────────────────────────────────────────────────────
export {
  computeFreshness,
  computeFreshnessNoSourceTime,
  getProviderFreshnessThreshold,
} from './freshness';

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
