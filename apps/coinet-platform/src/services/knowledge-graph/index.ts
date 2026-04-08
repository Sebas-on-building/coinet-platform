/**
 * Knowledge Graph — public API.
 *
 * Provides relational intelligence to all platform engines.
 * Use getEntityContext() for the primary enrichment query.
 */

export { graph } from './graph';
export type {
  Relationship,
  RelationshipType,
  EntityContext,
  SectorContext,
  GraphNode,
} from './types';

// L4.0 — Graph Object Model Bootstrap
export type {
  GraphNodeClass, CanonicalNodeType, GraphNativeNodeType,
  GraphNodeOrigin, GraphNodeLifecycleState,
  GraphNodeCapabilities, GraphNodeRestrictions, GraphNodeRecord,
} from './graph-node-types';
export {
  ALL_CANONICAL_NODE_TYPES, ALL_GRAPH_NATIVE_NODE_TYPES,
  REQUIRED_NATIVE_METADATA,
  getDefaultCanonicalCapabilities, getDefaultCanonicalRestrictions,
  getDefaultGraphNativeCapabilities, getDefaultGraphNativeRestrictions,
} from './graph-node-types';

export {
  registerGraphNode, getGraphNodeById, getGraphNodeByCanonicalObjectId,
  listGraphNodesByClass, listGraphNodesByCanonicalSubtype,
  listGraphNodesByNativeSubtype, listGraphNodesByLifecycle,
  getEventNodesByAffectedObject, getClusterNodeByKey,
  getCohortNodeByKey, getNodesByDerivationBasis, getAllGraphNodes,
  markGraphNodeDeprecated, markGraphNodeStale, markGraphNodeHistorical,
  resetGraphNodeRegistry,
} from './graph-node-registry';

export {
  validateGraphNode, validateCanonicalProjection, validateGraphNativeNode,
  assertGraphNodeMutationAllowed,
} from './graph-node-validator';
export type {
  GraphNodeValidationResult, GraphNodeViolation,
} from './graph-node-validator';

export {
  projectCanonicalObjectToGraphNode, syncCanonicalGraphNode,
  rebuildCanonicalNodeProjection, buildCanonicalNodeId, buildNativeNodeId,
  mapL3TypeToCanonicalNodeType,
} from './graph-node-projection';
export type { CanonicalProjectionInput, ProjectionResult } from './graph-node-projection';

// L4.1 — Relation Ontology
export type {
  EdgeType, SemanticFamily, Directionality, TemporalMode,
  EdgeCreationMode, ConfidenceBand, UseDomain, GraphNodeType,
  EvidenceRequirements, ConfidencePolicy, ReplayCompatibility,
  EdgeContract, EdgeContractViolation, EdgeContractValidationResult,
} from './relation-ontology';
export {
  ALL_EDGE_TYPES, ALL_SEMANTIC_FAMILIES, ALL_TEMPORAL_MODES,
  registerEdgeContract, getEdgeContract, isEdgeTypeRegistered,
  validateEdgeContract, validateEdgeSubjectObjectPair,
  listEdgeTypesByFamily, listAllowedEdgesForNodeType,
  listEdgesBySubjectType, listEdgesByObjectType,
  listEdgesByTemporalMode, listAllowedQuerySurfacesForEdge,
  isPropagationAllowedForEdge, isRulePathPropagationAllowed, getBlockedUsesForEdge,
  listPropagationEligibleContracts, listRulePathPropagationContracts, listDeprecatedContracts,
  getAllRegisteredContracts, detectEdgeSemanticCollision,
  deprecateEdgeContract, bootstrapRelationOntology, resetRelationOntology,
} from './relation-ontology';

// L4.2 — Edge Confidence and Evidence Lineage
export type {
  EdgeEvidenceClass, EdgeEvidenceRecord, AppendEvidenceResult,
} from './edge-evidence-ledger';
export {
  ALL_EVIDENCE_CLASSES, EVIDENCE_STRENGTH_RANK,
  appendEdgeEvidence, getEvidenceById, getEvidenceForEdge,
  getEvidenceByEdgeType, getEvidenceBySource, getEvidenceByClass,
  getEvidenceForNodePair, getEvidenceBySubjectNode, getEvidenceByObjectNode,
  getEvidenceAtReplayTime, getLatestConfirmationTime,
  getAllEvidence, resetEdgeEvidenceLedger,
} from './edge-evidence-ledger';

export type {
  EdgeConfidenceBand, EdgeRight, EdgeRightsProfile,
  EdgeScarCode, RecencyBand, NodeConfidenceInput,
  FactorEvaluation, EdgeConfidenceInput, GraphEdgeState,
  EdgeConfidenceAuditEvent,
} from './edge-confidence-model';
export {
  evaluateEdgeConfidence, deriveEdgeRightsProfile,
  computeEdgeRecencyScore, applyEdgeConfidenceCaps,
  reEvaluateEdgeConfidence, emitEdgeConfidenceAuditEvent,
} from './edge-confidence-model';

// L4.3 — Temporal Graph State
export type {
  TemporalEdgeStatus, DecayKind, RelevanceClass,
  DecayPolicy, TimeBoundedRelevance, ActiveRightsSnapshot,
  HistoricalVisibility, ContestedWindow,
  TemporalEdgeState, TemporalTransitionRecord, TemporalEdgeHistoryRecord,
  CreateTemporalStateInput, CreateTemporalStateResult,
  TransitionInput, TransitionResult,
  TemporalEvaluationInput, TemporalTransitionEvent,
} from './temporal-graph-state';
export {
  ALL_TEMPORAL_STATUSES,
  createTemporalState, applyTemporalTransition, isLegalTransition,
  evaluateTemporalTransition, computeDecayFactor,
  computeStaleAt, computeExpireAt,
  getTemporalStateForEdge, getTemporalStateForEdgeAtTime,
  getActiveEdgesAtTime, getEdgesByTemporalStatusAtTime,
  getEdgeIdsByStatus, reconstructGraphStateAtTime,
  getTemporalHistoryForEdge, getTransitionsForEdge,
  getTemporalRightsNarrowing, emitTemporalTransitionEvent,
  resetTemporalGraphState,
} from './temporal-graph-state';

// L4.4 — Propagation Logic
export type {
  PropagationEffectClass, PropagationStrengthModel, PropagationUseDomain,
  PropagationRule, PropagationTrigger, PropagationTrailStep, PropagationTrail,
  PropagationEvent, TargetImpactState, RuleValidationResult,
  BlockedReason, SourceEdgeContext, EligibilityResult,
  GraphEdgeForTraversal, TraversalResult, TraversalTarget,
  PropagationEvaluationInput, PropagationEvaluationResult,
  ConfidenceBand as PropagationConfidenceBand,
} from './graph-propagation-engine';
export {
  ALL_EFFECT_CLASSES,
  validatePropagationRule, registerPropagationRule,
  getPropagationRule, listRulesByEffectClass, listRulesBySourceEdgeType,
  getAllPropagationRules,
  validateTrigger, checkPropagationEligibility,
  traversePropagationPaths, computePropagationStrength,
  evaluatePropagationTrigger,
  getPropagationEventsForNode, getPropagationEventById,
  getActivePropagationForNodeAtTime, getPropagationTrail,
  getTargetImpactState, getAllPropagationEvents,
  bootstrapPropagationRules, resetPropagationEngine,
} from './graph-propagation-engine';

// L4.5 — Graph Query Surfaces
export type {
  GraphQueryType, QueryFamily, QConfidenceBand, QTemporalStatus, QEdgeRight,
  EdgeRightsMap, LiveGraphEdge, GraphQueryOptions, PathSummary,
  GraphQueryResult, QueryFamilyPolicy,
} from './graph-query-surfaces';
export {
  getQueryPolicy, registerLiveGraphEdge, getLiveGraphEdge, resolveSubjectNode,
  executeGraphQuery, pruneQueryGraph,
  summarizeQueryConfidence, summarizeQueryTemporalState, collectQueryEvidenceRefs,
  getProtocolContextForAsset, getChainContextForProtocol, getNarrativeContextForObject,
  getPeerSetByProtocol, getPeerSetBySector, getSharedDependencyGraph,
  getSpilloverPathsFromEvent, getExposureRadius, getCapitalRotationGraph,
  getSectorCluster, getEcosystemCluster, getBehavioralCluster,
  getCompetitorSet, getClosestSubstitutes, getNarrativeOverlapCompetitors,
  executeGraphQueryAtTime, executeHistoricalGraphQuery,
  resetGraphQuerySurfaces,
} from './graph-query-surfaces';
