/**
 * Layer 3 — Canonicalization Layer
 *
 * L3.1: Canonical Entity Ontology
 *   Defines the internal object model Coinet is allowed to reason on.
 *   Six canonical types: Asset, Pair, Protocol, Entity, Chain, NarrativeTopic.
 *   No provider fragment may silently define Coinet's internal reality.
 *
 * L3.2: Canonical Identity Resolution
 *   Resolves aliases, contracts, symbols, chain variants, and provider
 *   mismatches into governed identity decisions. False merge is dangerous;
 *   system prefers UNRESOLVED / CONTESTED / RESOLVED_WITH_SCAR over
 *   clean-but-wrong collapse.
 *
 * L3.3: Entity Confidence Model & Enforcement Fabric
 *   Carries confidence as part of identity itself. Confidence is not a
 *   probability — it is a permission model for downstream use. No canonical
 *   identity may leave Layer 3 without explicit confidence state, factor
 *   breakdown, scar-aware restrictions, and downstream usage rights.
 *
 * L3.4: Cross-Provider Reconciliation
 *   Merges multiple provider identity claims into one internal object
 *   without letting any one provider define reality.
 *
 * L3.5: Canonical Metric Namespace
 *   Defines one internal namespace for all metrics so later layers never
 *   reason on provider-specific field names, incompatible measurements,
 *   mixed bases, mixed scopes, mixed units, or mixed windows. A metric
 *   is valid only when it is mapped into a canonical contract.
 *
 * L3.6: Canonical Versioning and Mutation Control
 *   Makes canonical reality mutable in a disciplined way without
 *   rewriting history. Every mutation is versioned, diffable,
 *   reversible, and auditable. No canonical write bypasses
 *   mutation control. Replay reconstructs historical state.
 */

// ─── L3.1 Core types ─────────────────────────────────────────────────────────
export {
  L31_ONTOLOGY_VERSION,
  CANONICAL_ID_PREFIXES,
  generateCanonicalId,
  extractObjectTypeFromId,
} from './canonical-entity-types';

export type {
  CanonicalObjectType,
  ConfidenceBand,
  LifecycleState,
  MutationOrigin,
  AuditMetadata,
  VersionHistoryRef,
  ProviderClaimRef,
  AliasType,
  AliasRecord,
  CanonicalObjectBase,
  AssetKind,
  ChainRepresentationKind,
  AssetChainRepresentation,
  SupplyAnchorType,
  SupplyAnchor,
  AssetObject,
  PairMarketType,
  PairScope,
  PairAnchorType,
  PairIdentityAnchor,
  InvertibilityRule,
  PairObject,
  ProtocolSector,
  ControlledContractRef,
  GovernanceAnchorType,
  GovernanceAnchor,
  ProtocolObject,
  EntityKind,
  AddressRecord,
  LabelProvenance,
  AttributionClaim,
  EntityObject,
  ExecutionModelTag,
  BridgeRelationship,
  ChainObject,
  AnyCanonicalObject,
} from './canonical-entity-types';

// ─── L3.1 Lifecycle ──────────────────────────────────────────────────────────
export {
  LEGAL_TRANSITIONS,
  LIFECYCLE_STATES,
  FORBIDDEN_TRANSITIONS,
  validateTransition,
  isLegalTransition,
  getAllLegalTransitionsFrom,
  getAllLegalTransitionsTo,
} from './entity-lifecycle-types';

export type {
  LifecycleTransitionRecord,
  LifecycleValidationResult,
} from './entity-lifecycle-types';

// ─── L3.1 Narrative topic types ──────────────────────────────────────────────
export type {
  TopicClass,
  TopicStatus,
  TopicRelationType,
  TopicRelation,
  AmbiguityMarkerKind,
  AmbiguityMarker,
  OverlapMarkerKind,
  OverlapMarker,
  NarrativeTopicObject,
} from './narrative-topic-types';

// ─── L3.1 Ontology registry ─────────────────────────────────────────────────
export {
  validateObject,
  getRequiredFields,
  getAllObjectTypes,
  getIdPrefix,
  validateLifecycleTransition,
  getOntologyVersion,
} from './canonical-ontology-registry';

export type {
  ValidationViolation,
  ValidationResult,
} from './canonical-ontology-registry';

// ─── L3.2 Resolution types ──────────────────────────────────────────────────
export {
  L32_RESOLUTION_VERSION,
  ALL_HARD_VETOES,
  SCORE_LIMITS,
  PENALTY_LIMITS,
  OUTCOME_THRESHOLDS,
  isOutcomeSafeForMissionCritical,
  isOutcomeSafeForContextual,
} from './identity-resolution-types';

export type {
  IdentityResolutionOutcome,
  IdentityResolutionState,
  ResolutionScar,
  HardVeto,
  IdentityResolutionDecision,
  ResolutionPreflight,
  AnchorStrength,
  DeterministicAnchorResult,
  AliasExpansionResult,
  ContextDisambiguationResult,
  CrossProviderComparisonResult,
  ScoreBuckets,
  PenaltyBuckets,
  ResolutionInput,
  ProviderIdentityClaim,
  ContractTuple,
  MissionCriticalUse,
} from './identity-resolution-types';

// ─── L3.2 Alias registry ────────────────────────────────────────────────────
export {
  normalizeAlias,
  registerAlias,
  registerForbiddenRule,
  isForbidden,
  lookupAlias,
  expandAliases,
  detectCollisions,
  resetAliasRegistry,
} from './alias-registry';

export type {
  AliasEntry,
  AliasStrengthContext,
  AliasCollision,
  ForbiddenAliasRule,
} from './alias-registry';

// ─── L3.2 Contract resolution ────────────────────────────────────────────────
export {
  normalizeAddress,
  registerContract,
  lookupByContract,
  lookupByCanonicalId,
  resolveByContractTuples,
  resolvePoolAddress,
  resolveDerivativeContract,
  resolveAddressIdentity,
  detectWrappedRelation,
  resetContractIndex,
} from './contract-resolution';

export type {
  ContractIndexEntry,
  WrappedRelationResult,
} from './contract-resolution';

// ─── L3.2 Provider identity claims ──────────────────────────────────────────
export {
  normalizeClaim,
  normalizeClaims,
  recordClaim,
  getClaimsForCandidate,
  getClaimsByProvider,
  compareProviderClaims,
  hasProvenanceSupport,
  resetClaimState,
} from './provider-identity-claims';

export type {
  NormalizedProviderClaim,
  ProviderAgreementKey,
} from './provider-identity-claims';

// ─── L3.2 Identity resolver ─────────────────────────────────────────────────
export {
  computeScoreBuckets,
  computePenalties,
  totalScore,
  detectHardVetoes,
  detectScars,
  mapOutcome,
  mapState,
  selectCandidate,
  adjudicate,
} from './identity-resolver';

export type {
  PenaltyContext,
  VetoContext,
  ScarContext,
  AdjudicationInput,
} from './identity-resolver';

// ─── L3.2 Pipeline ──────────────────────────────────────────────────────────
export {
  resolveIdentity,
  getDecisionLedger,
  getUnresolvedQueue,
  resetPipelineState,
} from './identity-resolution-pipeline';

// ─── L3.3 Confidence factors (v2 constitutional) ───────────────────────────
export {
  L33_CONFIDENCE_VERSION,
  L33_POLICY_VERSION,
  FACTOR_WEIGHTS,
  BAND_THRESHOLDS,
  evaluateIdentifierStrength,
  evaluateCrossProviderAgreement,
  evaluateTemporalStability,
  evaluateScopeParity,
  evaluateProvenanceStrength,
  evaluateAllFactors,
  aggregateConfidenceFactors,
  buildConfidenceEvaluationInput,
  makeScar,
  mapResolutionStateToEpistemic,
} from './confidence-factors';

export type {
  ConfidenceBand as L33ConfidenceBand,
  ConfidenceRightDecision,
  ConfidenceEpistemicState,
  ConfidenceFactorFamily,
  ConfidenceScarCode,
  ScarSeverity,
  ConfidenceScar,
  FactorEvaluation,
  ConfidenceEvaluationInput,
  ConfidenceInputOverrides,
  AggregationResult,
} from './confidence-factors';

// ─── L3.3 Confidence policy map (v2 constitutional) ────────────────────────
export {
  applyEpistemicStateCap,
  applyHardVetoCap,
  applyScarCap,
  applyProbationCap,
  applyObjectFamilyCap,
  applyAllCaps,
  deriveRightsProfile,
  isMissionCriticalUseAllowed,
  createProbation,
  shouldEnterProbation,
} from './confidence-policy-map';

export type {
  RightsProfile,
  ProbationState,
  CapResult,
  CapChainResult,
} from './confidence-policy-map';

// ─── L3.3 Entity confidence model (v2 constitutional) ──────────────────────
export {
  evaluateEntityConfidence,
  evaluateAssetConfidence,
  evaluatePairConfidence,
  evaluateProtocolConfidence,
  evaluateEntityTypeConfidence,
  evaluateChainConfidence,
  evaluateNarrativeTopicConfidence,
  getCurrentState,
  getHistoryLog,
  getHistoryForCanonicalId,
  getReviewQueues,
  getReviewQueueByType,
  resetConfidenceStores,
} from './entity-confidence-model';

export type {
  EntityConfidenceState,
  ConfidenceTransitionEvent,
  ReviewQueueType,
  ReviewQueueEntry,
} from './entity-confidence-model';

// ─── L3.3-B Confidence enforcement gate ─────────────────────────────────────
export {
  evaluateConfidenceGate,
  canUseForScoring,
  canUseForContradiction,
  canUseForScenario,
  canUseForJudgment,
  canUseForGraphRelation,
  canUseForReplayOrForensic,
  getGateAuditLog,
  resetGateAuditLog,
} from './confidence-gate';

export type {
  ConfidenceUseDomain,
  ConfidenceGateInput,
  ConfidenceGateDecision,
  GateAuditStamp,
} from './confidence-gate';

// ─── L3.4 Provider claim ledger ─────────────────────────────────────────────
export {
  L34_LEDGER_VERSION,
  L34_CLAIM_SCHEMA_VERSION,
  appendProviderClaim,
  getClaimById,
  getClaimsForCanonicalObject,
  getClaimsByProvider as getLedgerClaimsByProvider,
  getConflictingClaims,
  getWinningCandidateClaims,
  getActiveAnchorClaims,
  getActiveConflictClaims,
  markClaimRejected,
  markClaimSuperseded,
  markClaimHistorical,
  linkConflict,
  getClaimsAtReplayTime,
  getAllClaims,
  resetClaimLedger,
} from './provider-claim-ledger';

export type {
  ProviderClaimClass,
  ProviderClaimStatus,
  ProviderClaimRecord,
} from './provider-claim-ledger';

// ─── L3.4 Cross-provider reconciliation ─────────────────────────────────────
export {
  L34_RECONCILIATION_VERSION,
  L34_POLICY_VERSION,
  L34_RECONCILED_STATE_SCHEMA_VERSION,
  L34_ANCHOR_SCHEMA_VERSION,
  L34_CONFLICT_SCHEMA_VERSION,
  evaluateClaimAdmissibility,
  groupClaimsByReconciliationSurface,
  selectReconciliationMode,
  deriveWinningAnchors,
  deriveRejectedAnchors,
  deriveUnresolvedConflicts,
  reconcileCanonicalObject,
  getReconciledStatesForCanonicalId,
  getLatestReconciledState,
  getAllReconciledStates,
  resetReconciliationState,
} from './cross-provider-reconciliation';

export type {
  ReconciliationMode,
  ClaimAdmissibility,
  ClaimAdmissibilityResult,
  WinningAnchor,
  RejectedAnchor,
  UnresolvedConflictRecord,
  ReconciledCanonicalState,
  ClaimGroup,
  ReconciliationInput,
  ReconciliationOutput,
} from './cross-provider-reconciliation';

// ─── L3.4 Entity merge/split engine ─────────────────────────────────────────
export {
  L34_MUTATION_VERSION,
  L34_MERGE_SCHEMA_VERSION,
  L34_SPLIT_SCHEMA_VERSION,
  L34_MUTATION_EVENT_SCHEMA_VERSION,
  createMergePlan,
  createSplitPlan,
  applyMergeMutation,
  applySplitMutation,
  getMutationHistory,
  getMutationHistoryForCanonicalId,
  getAncestryLinks,
  getMutationPlan,
  getAllMutationPlans,
  resetMutationHistory,
} from './entity-merge-split-engine';

export type {
  MutationType,
  AncestryLink,
  MergePlan,
  SplitPlan,
  MutationPlan,
  MutationHistoryEvent,
} from './entity-merge-split-engine';

// ─── L3.4 Reconciliation report ─────────────────────────────────────────────
export {
  L34_REPORT_VERSION,
  L34_REPORT_SCHEMA_VERSION,
  L34_REVIEW_SCHEMA_VERSION,
  buildReconciliationReport,
  serializeReconciliationReport,
  getReconciliationDiff,
  getReportByReconciliationId,
  getHistoricalReconciliationReports,
  getReconciliationReportStore,
  getReconciliationReviewQueue,
  getReconciliationReviewsByType,
  resetReportStore,
} from './canonical-reconciliation-report';

export type {
  ReconciliationReviewQueueType,
  ReconciliationReviewStatus,
  ReconciliationReviewEntry,
  ReconciliationReport,
  DiffEntry,
  ReconciliationDiff,
  BuildReportInput,
} from './canonical-reconciliation-report';

// ─── L3.5-A Metric contracts ────────────────────────────────────────────────
export {
  L35_CONTRACTS_VERSION,
  L35_CONTRACT_SCHEMA_VERSION,
  registerMetricContract,
  getMetricContract,
  getMetricContractVersion,
  getAllMetricContracts,
  listMetricContractPaths,
  getContractsByFamily,
  resetContractRegistry,
  bootstrapContracts,
  deriveComparabilitySignature,
} from './metric-contracts';

export type {
  MetricUnit,
  MetricValueType,
  MetricAggregationRule,
  MetricWindowKind,
  MetricWindowUnit,
  MetricNullability,
  MetricUseDomain,
  MetricScope,
  MetricBasis,
  MetricWindow,
  MetricFreshnessExpectations,
  MetricProvenanceRequirements,
  MetricPrecisionRules,
  MetricContract,
} from './metric-contracts';

// ─── L3.5-A Metric namespace ────────────────────────────────────────────────
export {
  L35_NAMESPACE_VERSION,
  L35_OBSERVATION_SCHEMA_VERSION,
  registerMetricPath,
  getMetricPathDefinition,
  listMetricPathsByFamily,
  listAllMetricPaths,
  resetPathRegistry,
  bootstrapNamespacePaths,
  buildCanonicalMetricObservation,
  persistObservation,
  getObservationsForObject,
  getLatestObservation,
  getAllObservations,
  resetObservationStore,
} from './metric-namespace';

export type {
  MetricPathDefinition,
  MetricProvenance,
  CanonicalMetricObservation,
  BuildObservationInput,
} from './metric-namespace';

// ─── L3.5-A Provider metric mappers ─────────────────────────────────────────
export {
  L35_MAPPER_VERSION,
  registerProviderMetricMapper,
  getProviderMetricMapper,
  listMappableProviderFields,
  getAllMappingArtifacts,
  resetMapperState,
  mapProviderMetric,
  emitMetricMappingArtifact,
} from './provider-metric-mappers';

export type {
  MetricMappingStatus,
  ProviderFieldMapping,
  ProviderMetricMapperConfig,
  MetricMappingArtifact,
  MapProviderMetricInput,
  MapProviderMetricResult,
} from './provider-metric-mappers';

// ─── L3.5-A Metric compatibility rules ──────────────────────────────────────
export {
  L35_COMPAT_VERSION,
  evaluateMetricCompatibility,
  canMergeMetricObservations,
  canCompareMetricObservations,
  getMetricMergeBlockReasons,
} from './metric-compatibility-rules';

export type {
  MetricCompatibilityOutcome,
  MetricCompatibilityDecision,
} from './metric-compatibility-rules';

// ─── L3.5-B Metric namespace validator & gate ───────────────────────────────
export {
  L35_VALIDATOR_VERSION,
  validateMappedMetric,
  validateCanonicalMetricObservation,
  enforceMetricNamespaceGate,
  isMetricAllowedForUse,
  getValidationReports,
  getGateDecisions as getMetricGateDecisions,
  resetValidatorState,
  emitMetricValidationReport,
} from './metric-namespace-validator';

export type {
  MetricValidationStatus,
  MetricValidationViolation,
  MetricValidationReport,
  MetricNamespaceGateDecision,
  ValidateMappedMetricInput,
} from './metric-namespace-validator';

// ─── L3.6 Mutation ledger ───────────────────────────────────────────────────
export {
  L36_LEDGER_VERSION,
  L36_MUTATION_SCHEMA_VERSION,
  appendMutationRecord,
  generateMutationId,
  getMutationById,
  getMutationsForObject,
  getMutationsForMetricContract,
  getMutationsAtReplayTime,
  getMutationsByType,
  getAllMutationRecords,
  markMutationValidated,
  markMutationStaged,
  markMutationCommitted,
  markMutationReversible,
  markMutationSuperseded,
  isMutationTransitionLegal,
  linkRollbackMutation,
  resetMutationLedger,
  LEGAL_MUTATION_TRANSITIONS,
} from './mutation-ledger';

export type {
  CanonicalMutationType,
  MutationLifecycleState,
  ReplayCompatibilityMeta,
  RollbackEligibility,
  CanonicalMutationRecord,
} from './mutation-ledger';

// ─── L3.6 Canonical versioning ──────────────────────────────────────────────
export {
  L36_VERSIONING_VERSION,
  L36_VERSION_SCHEMA_VERSION,
  createCanonicalVersion,
  getCanonicalVersionById,
  getCurrentCanonicalVersion,
  getCanonicalVersionChain,
  reconstructCanonicalStateAtVersion,
  reconstructCanonicalStateAtTime,
  getCurrentMetricContractVersion as getL36CurrentMetricContractVersion,
  getMetricContractVersionChain,
  reconstructMetricContractAtVersion,
  reconstructMetricContractAtTime,
  getAllVersionRecords,
  resetVersionStore,
} from './canonical-versioning';

export type {
  VersionType,
  CanonicalVersionRecord,
  CreateVersionInput,
} from './canonical-versioning';

// ─── L3.6 Entity diff engine ────────────────────────────────────────────────
export {
  L36_DIFF_VERSION,
  L36_DIFF_SCHEMA_VERSION,
  buildStructuredDiff,
  diffCanonicalObject,
  diffMetricContract,
  diffReconciliationState as diffReconciliationStateDiff,
  diffConfidenceState,
  classifyMutationSeverity,
  getDiffById,
  getDiffByMutationId,
  getAllDiffs,
  resetDiffStore,
} from './entity-diff-engine';

export type {
  DiffSemanticClass,
  DiffSeverity,
  FieldChange,
  StructuredMutationDiff,
} from './entity-diff-engine';

// ─── L3.6 Mutation control ──────────────────────────────────────────────────
export {
  L36_CONTROL_VERSION,
  proposeMutation,
  validateMutation,
  stageMutation,
  commitMutation,
  applyCanonicalMutation,
  supersedeMutation,
  emitMutationAuditEvent,
  getMutationAuditEvents,
  getMutationAuditEventsForMutation,
  resetAuditEvents,
} from './mutation-control';

export type {
  MutationProposalInput,
  MutationValidationOutcome,
  MutationValidationResult,
  MutationAuditEvent,
  MutationProposalResult,
  CommitMutationResult,
  ApplyMutationResult,
} from './mutation-control';

// ─── L3.6 Rollback engine ──────────────────────────────────────────────────
export {
  L36_ROLLBACK_VERSION,
  isRollbackAllowed,
  buildRollbackPlan,
  applyRollback,
  getRollbackChain,
  getRollbackTargetVersion,
  getAllRollbackPlans,
  resetRollbackState,
} from './rollback-engine';

export type {
  RollbackPlan,
  RollbackResult,
} from './rollback-engine';
