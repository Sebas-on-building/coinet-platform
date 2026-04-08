/**
 * L4.1 — Relation Ontology
 *
 * The lawbook of graph relations. No graph edge may exist above Layer 4
 * unless it matches an edge contract declared here.
 *
 * Organized into seven sections:
 *   1. Type declarations
 *   2. Node compatibility model
 *   3. Contract registry
 *   4. Bootstrap contract set
 *   5. Validation functions
 *   6. Collision and deprecation rules
 *   7. Read APIs
 */

import type {
  GraphNodeClass, CanonicalNodeType, GraphNativeNodeType,
} from './graph-node-types';
import {
  ALL_CANONICAL_NODE_TYPES, ALL_GRAPH_NATIVE_NODE_TYPES,
} from './graph-node-types';

// ╔═══════════════════════════════════════════════════════════════════════════════╗
// ║  SECTION 1 — TYPE DECLARATIONS                                               ║
// ╚═══════════════════════════════════════════════════════════════════════════════╝

export type EdgeType =
  | 'ASSET_BELONGS_TO_PROTOCOL'
  | 'PROTOCOL_OPERATES_ON_CHAIN'
  | 'ASSET_DEPENDS_ON_CHAIN'
  | 'PROTOCOL_HAS_TOKEN'
  | 'PROTOCOL_HAS_COMPETITOR'
  | 'WALLET_INTERACTS_WITH_PROTOCOL'
  | 'WALLET_ROTATES_INTO_ASSET'
  | 'ENTITY_EXPOSED_TO_ASSET'
  | 'NARRATIVE_AFFECTS_ASSET'
  | 'NARRATIVE_AFFECTS_PROTOCOL'
  | 'NARRATIVE_DOMINATES_SECTOR'
  | 'UNLOCK_IMPACTS_FLOAT'
  | 'GOVERNANCE_EVENT_AFFECTS_PROTOCOL'
  | 'SECURITY_EVENT_AFFECTS_ASSET'
  | 'ASSET_IN_SECTOR'
  | 'ASSET_IN_ECOSYSTEM'
  | 'ASSET_HAS_COMPETITOR';

export const ALL_EDGE_TYPES: readonly EdgeType[] = [
  'ASSET_BELONGS_TO_PROTOCOL', 'PROTOCOL_OPERATES_ON_CHAIN', 'ASSET_DEPENDS_ON_CHAIN',
  'PROTOCOL_HAS_TOKEN', 'PROTOCOL_HAS_COMPETITOR',
  'WALLET_INTERACTS_WITH_PROTOCOL', 'WALLET_ROTATES_INTO_ASSET', 'ENTITY_EXPOSED_TO_ASSET',
  'NARRATIVE_AFFECTS_ASSET', 'NARRATIVE_AFFECTS_PROTOCOL', 'NARRATIVE_DOMINATES_SECTOR',
  'UNLOCK_IMPACTS_FLOAT', 'GOVERNANCE_EVENT_AFFECTS_PROTOCOL', 'SECURITY_EVENT_AFFECTS_ASSET',
  'ASSET_IN_SECTOR', 'ASSET_IN_ECOSYSTEM', 'ASSET_HAS_COMPETITOR',
];

export type SemanticFamily =
  | 'STRUCTURAL'
  | 'OPERATIONAL'
  | 'INTERACTIONAL'
  | 'EXPOSURE'
  | 'NARRATIVE'
  | 'COMPETITIVE'
  | 'EVENT_IMPACT'
  | 'DERIVED_CLUSTER'
  | 'CAUSAL_HYPOTHESIS';

export const ALL_SEMANTIC_FAMILIES: readonly SemanticFamily[] = [
  'STRUCTURAL', 'OPERATIONAL', 'INTERACTIONAL', 'EXPOSURE',
  'NARRATIVE', 'COMPETITIVE', 'EVENT_IMPACT', 'DERIVED_CLUSTER', 'CAUSAL_HYPOTHESIS',
];

export type Directionality = 'DIRECTED' | 'UNDIRECTED';

export type TemporalMode =
  | 'PERSISTENT'
  | 'ROLLING'
  | 'EVENT_BOUNDED'
  | 'DECAYING'
  | 'EPISODIC';

export const ALL_TEMPORAL_MODES: readonly TemporalMode[] = [
  'PERSISTENT', 'ROLLING', 'EVENT_BOUNDED', 'DECAYING', 'EPISODIC',
];

export type EdgeCreationMode =
  | 'DIRECT_ONLY'
  | 'DERIVED_ALLOWED'
  | 'EVENT_DERIVED_ONLY'
  | 'CLUSTER_DERIVED_ONLY';

export type ConfidenceBand = 'HIGH' | 'MEDIUM' | 'LOW';

export type UseDomain =
  | 'context_enrichment'
  | 'comparison'
  | 'propagation'
  | 'clustering'
  | 'judgment_support'
  | 'explanation'
  | 'competitor_discovery'
  | 'forensic_replay';

export type GraphNodeType = CanonicalNodeType | GraphNativeNodeType;

export interface EvidenceRequirements {
  minEvidenceCount: number;
  requireLineageRefs: boolean;
  requireCanonicalSubjects: boolean;
  requireMetricSupport?: boolean;
  requireEventNodeSupport?: boolean;
}

export interface ConfidencePolicy {
  minimumSubjectConfidence?: ConfidenceBand;
  minimumObjectConfidence?: ConfidenceBand;
  allowUnresolvedEdgeCreation: boolean;
}

export interface ReplayCompatibility {
  schemaVersion: string;
}

export interface EdgeContract {
  edgeType: EdgeType;
  contractVersion: string;
  subjectNodeClass: GraphNodeClass | 'ANY';
  subjectNodeType: GraphNodeType;
  objectNodeClass: GraphNodeClass | 'ANY';
  objectNodeType: GraphNodeType;
  directionality: Directionality;
  semanticFamily: SemanticFamily;
  temporalMode: TemporalMode;
  evidenceRequirements: EvidenceRequirements;
  confidencePolicy: ConfidencePolicy;
  allowedUses: UseDomain[];
  blockedUsesUnderUncertainty: UseDomain[];
  supportsDirectPropagation: boolean;
  supportsRulePathPropagation: boolean;
  querySurfacesAllowed: string[];
  edgeCreationMode: EdgeCreationMode;
  blockedMutations: string[];
  replayCompatibility: ReplayCompatibility;
  defaultDecayPolicy?: string;
  staleAfterMs?: number;
  expireAfterMs?: number;
  deprecated?: boolean;
  deprecatedBy?: EdgeType;
}

export interface EdgeContractViolation {
  code: string;
  message: string;
}

export interface EdgeContractValidationResult {
  valid: boolean;
  violations: EdgeContractViolation[];
}

// ╔═══════════════════════════════════════════════════════════════════════════════╗
// ║  SECTION 2 — NODE COMPATIBILITY MODEL                                        ║
// ╚═══════════════════════════════════════════════════════════════════════════════╝

const CANONICAL_TYPES_SET = new Set<string>(ALL_CANONICAL_NODE_TYPES);
const NATIVE_TYPES_SET = new Set<string>(ALL_GRAPH_NATIVE_NODE_TYPES);

function resolveNodeClass(nodeType: string): GraphNodeClass | undefined {
  if (CANONICAL_TYPES_SET.has(nodeType)) return 'CANONICAL';
  if (NATIVE_TYPES_SET.has(nodeType)) return 'GRAPH_NATIVE';
  return undefined;
}

function nodeClassMatches(
  declared: GraphNodeClass | 'ANY',
  actual: GraphNodeClass,
): boolean {
  return declared === 'ANY' || declared === actual;
}

// ╔═══════════════════════════════════════════════════════════════════════════════╗
// ║  SECTION 3 — CONTRACT REGISTRY                                               ║
// ╚═══════════════════════════════════════════════════════════════════════════════╝

const _byEdgeType = new Map<EdgeType, EdgeContract>();
const _byFamily = new Map<SemanticFamily, EdgeContract[]>();
const _bySubjectType = new Map<string, EdgeContract[]>();
const _byObjectType = new Map<string, EdgeContract[]>();
const _byTemporalMode = new Map<TemporalMode, EdgeContract[]>();
const _directPropagation: EdgeContract[] = [];
const _rulePathPropagation: EdgeContract[] = [];
const _byQuerySurface = new Map<string, EdgeContract[]>();
const _deprecatedContracts: EdgeContract[] = [];

function indexContract(c: EdgeContract): void {
  _byEdgeType.set(c.edgeType, c);

  const fam = _byFamily.get(c.semanticFamily) ?? [];
  fam.push(c); _byFamily.set(c.semanticFamily, fam);

  const sub = _bySubjectType.get(c.subjectNodeType) ?? [];
  sub.push(c); _bySubjectType.set(c.subjectNodeType, sub);

  const obj = _byObjectType.get(c.objectNodeType) ?? [];
  obj.push(c); _byObjectType.set(c.objectNodeType, obj);

  const tm = _byTemporalMode.get(c.temporalMode) ?? [];
  tm.push(c); _byTemporalMode.set(c.temporalMode, tm);

  if (c.supportsDirectPropagation) _directPropagation.push(c);
  if (c.supportsRulePathPropagation) _rulePathPropagation.push(c);

  for (const qs of c.querySurfacesAllowed) {
    const qsl = _byQuerySurface.get(qs) ?? [];
    qsl.push(c); _byQuerySurface.set(qs, qsl);
  }

  if (c.deprecated) _deprecatedContracts.push(c);
}

// ╔═══════════════════════════════════════════════════════════════════════════════╗
// ║  SECTION 3.1 — REGISTRATION                                                  ║
// ╚═══════════════════════════════════════════════════════════════════════════════╝

export function registerEdgeContract(
  contract: EdgeContract,
): { success: boolean; error?: string } {
  const v = validateEdgeContract(contract);
  if (!v.valid) {
    return { success: false, error: v.violations.map(vl => vl.code).join(', ') };
  }

  const existing = _byEdgeType.get(contract.edgeType);
  if (existing && !existing.deprecated) {
    return { success: false, error: `DUPLICATE_EDGE_TYPE:${contract.edgeType}` };
  }

  const collision = detectEdgeSemanticCollision(contract);
  if (collision) {
    return { success: false, error: collision };
  }

  indexContract(contract);
  return { success: true };
}

// ╔═══════════════════════════════════════════════════════════════════════════════╗
// ║  SECTION 4 — BOOTSTRAP CONTRACT SET                                          ║
// ╚═══════════════════════════════════════════════════════════════════════════════╝

const REPLAY_V1: ReplayCompatibility = { schemaVersion: 'v1' };

function structural(
  edgeType: EdgeType,
  subject: GraphNodeType, object: GraphNodeType,
  overrides?: Partial<EdgeContract>,
): EdgeContract {
  return {
    edgeType,
    contractVersion: 'v1',
    subjectNodeClass: resolveNodeClass(subject) ?? 'CANONICAL',
    subjectNodeType: subject,
    objectNodeClass: resolveNodeClass(object) ?? 'CANONICAL',
    objectNodeType: object,
    directionality: 'DIRECTED',
    semanticFamily: 'STRUCTURAL',
    temporalMode: 'PERSISTENT',
    evidenceRequirements: {
      minEvidenceCount: 1,
      requireLineageRefs: true,
      requireCanonicalSubjects: true,
    },
    confidencePolicy: {
      minimumSubjectConfidence: 'MEDIUM',
      minimumObjectConfidence: 'MEDIUM',
      allowUnresolvedEdgeCreation: false,
    },
    allowedUses: ['context_enrichment', 'judgment_support', 'explanation', 'comparison'],
    blockedUsesUnderUncertainty: ['propagation', 'clustering'],
    supportsDirectPropagation: false,
    supportsRulePathPropagation: true,
    querySurfacesAllowed: ['entity_context', 'comparison', 'judgment'],
    edgeCreationMode: 'DIRECT_ONLY',
    blockedMutations: ['RETYPE', 'REVERSE_DIRECTION'],
    replayCompatibility: REPLAY_V1,
    ...overrides,
  };
}

function interactional(
  edgeType: EdgeType,
  subject: GraphNodeType, object: GraphNodeType,
  overrides?: Partial<EdgeContract>,
): EdgeContract {
  return {
    edgeType,
    contractVersion: 'v1',
    subjectNodeClass: resolveNodeClass(subject) ?? 'CANONICAL',
    subjectNodeType: subject,
    objectNodeClass: resolveNodeClass(object) ?? 'CANONICAL',
    objectNodeType: object,
    directionality: 'DIRECTED',
    semanticFamily: 'INTERACTIONAL',
    temporalMode: 'ROLLING',
    evidenceRequirements: {
      minEvidenceCount: 1,
      requireLineageRefs: false,
      requireCanonicalSubjects: false,
    },
    confidencePolicy: {
      minimumSubjectConfidence: 'LOW',
      minimumObjectConfidence: 'MEDIUM',
      allowUnresolvedEdgeCreation: false,
    },
    allowedUses: ['context_enrichment', 'explanation', 'forensic_replay'],
    blockedUsesUnderUncertainty: ['judgment_support', 'competitor_discovery'],
    supportsDirectPropagation: false,
    supportsRulePathPropagation: false,
    querySurfacesAllowed: ['entity_context', 'forensic'],
    edgeCreationMode: 'DIRECT_ONLY',
    blockedMutations: ['RETYPE'],
    replayCompatibility: REPLAY_V1,
    staleAfterMs: 7 * 24 * 60 * 60 * 1000,
    expireAfterMs: 30 * 24 * 60 * 60 * 1000,
    ...overrides,
  };
}

function narrativeEdge(
  edgeType: EdgeType,
  subject: GraphNodeType, object: GraphNodeType,
  overrides?: Partial<EdgeContract>,
): EdgeContract {
  return {
    edgeType,
    contractVersion: 'v1',
    subjectNodeClass: resolveNodeClass(subject) ?? 'CANONICAL',
    subjectNodeType: subject,
    objectNodeClass: resolveNodeClass(object) ?? 'CANONICAL',
    objectNodeType: object,
    directionality: 'DIRECTED',
    semanticFamily: 'NARRATIVE',
    temporalMode: 'DECAYING',
    evidenceRequirements: {
      minEvidenceCount: 1,
      requireLineageRefs: false,
      requireCanonicalSubjects: false,
    },
    confidencePolicy: {
      minimumSubjectConfidence: 'LOW',
      minimumObjectConfidence: 'MEDIUM',
      allowUnresolvedEdgeCreation: true,
    },
    allowedUses: ['context_enrichment', 'propagation', 'explanation'],
    blockedUsesUnderUncertainty: ['judgment_support', 'clustering'],
    supportsDirectPropagation: true,
    supportsRulePathPropagation: true,
    querySurfacesAllowed: ['entity_context', 'narrative', 'propagation'],
    edgeCreationMode: 'DERIVED_ALLOWED',
    blockedMutations: ['RETYPE'],
    replayCompatibility: REPLAY_V1,
    defaultDecayPolicy: 'linear_7d',
    staleAfterMs: 3 * 24 * 60 * 60 * 1000,
    ...overrides,
  };
}

function eventImpact(
  edgeType: EdgeType,
  subject: GraphNativeNodeType, object: GraphNodeType,
  overrides?: Partial<EdgeContract>,
): EdgeContract {
  return {
    edgeType,
    contractVersion: 'v1',
    subjectNodeClass: 'GRAPH_NATIVE',
    subjectNodeType: subject,
    objectNodeClass: resolveNodeClass(object) ?? 'CANONICAL',
    objectNodeType: object,
    directionality: 'DIRECTED',
    semanticFamily: 'EVENT_IMPACT',
    temporalMode: 'EVENT_BOUNDED',
    evidenceRequirements: {
      minEvidenceCount: 1,
      requireLineageRefs: true,
      requireCanonicalSubjects: false,
      requireEventNodeSupport: true,
    },
    confidencePolicy: {
      minimumSubjectConfidence: undefined,
      minimumObjectConfidence: 'MEDIUM',
      allowUnresolvedEdgeCreation: false,
    },
    allowedUses: ['context_enrichment', 'propagation', 'explanation', 'forensic_replay'],
    blockedUsesUnderUncertainty: ['competitor_discovery'],
    supportsDirectPropagation: true,
    supportsRulePathPropagation: true,
    querySurfacesAllowed: ['entity_context', 'event_timeline', 'propagation', 'forensic'],
    edgeCreationMode: 'EVENT_DERIVED_ONLY',
    blockedMutations: ['RETYPE', 'REVERSE_DIRECTION'],
    replayCompatibility: REPLAY_V1,
    staleAfterMs: 14 * 24 * 60 * 60 * 1000,
    expireAfterMs: 90 * 24 * 60 * 60 * 1000,
    ...overrides,
  };
}

function derivedCluster(
  edgeType: EdgeType,
  subject: GraphNodeType, object: GraphNodeType,
  overrides?: Partial<EdgeContract>,
): EdgeContract {
  return {
    edgeType,
    contractVersion: 'v1',
    subjectNodeClass: resolveNodeClass(subject) ?? 'CANONICAL',
    subjectNodeType: subject,
    objectNodeClass: resolveNodeClass(object) ?? 'GRAPH_NATIVE',
    objectNodeType: object,
    directionality: 'DIRECTED',
    semanticFamily: 'DERIVED_CLUSTER',
    temporalMode: 'PERSISTENT',
    evidenceRequirements: {
      minEvidenceCount: 1,
      requireLineageRefs: false,
      requireCanonicalSubjects: true,
    },
    confidencePolicy: {
      minimumSubjectConfidence: 'MEDIUM',
      minimumObjectConfidence: undefined,
      allowUnresolvedEdgeCreation: false,
    },
    allowedUses: ['context_enrichment', 'clustering', 'explanation'],
    blockedUsesUnderUncertainty: ['judgment_support', 'propagation'],
    supportsDirectPropagation: false,
    supportsRulePathPropagation: false,
    querySurfacesAllowed: ['entity_context', 'clustering'],
    edgeCreationMode: 'CLUSTER_DERIVED_ONLY',
    blockedMutations: ['RETYPE'],
    replayCompatibility: REPLAY_V1,
    ...overrides,
  };
}

const BOOTSTRAP_CONTRACTS: EdgeContract[] = [
  // ── STRUCTURAL ──────────────────────────────────────────────────────
  structural('ASSET_BELONGS_TO_PROTOCOL', 'ASSET', 'PROTOCOL'),
  structural('PROTOCOL_OPERATES_ON_CHAIN', 'PROTOCOL', 'CHAIN'),
  structural('ASSET_DEPENDS_ON_CHAIN', 'ASSET', 'CHAIN'),
  structural('PROTOCOL_HAS_TOKEN', 'PROTOCOL', 'ASSET', {
    allowedUses: ['context_enrichment', 'judgment_support', 'explanation', 'comparison', 'competitor_discovery'],
  }),

  // ── COMPETITIVE ─────────────────────────────────────────────────────
  structural('PROTOCOL_HAS_COMPETITOR', 'PROTOCOL', 'PROTOCOL', {
    semanticFamily: 'COMPETITIVE',
    directionality: 'UNDIRECTED',
    supportsDirectPropagation: false,
    supportsRulePathPropagation: true,
    allowedUses: ['context_enrichment', 'comparison', 'competitor_discovery', 'explanation'],
    blockedUsesUnderUncertainty: ['propagation', 'judgment_support'],
    querySurfacesAllowed: ['entity_context', 'comparison', 'competitor'],
  }),

  // ── INTERACTIONAL ──────────────────────────────────────────────────
  interactional('WALLET_INTERACTS_WITH_PROTOCOL', 'WALLET_COHORT', 'PROTOCOL'),
  interactional('WALLET_ROTATES_INTO_ASSET', 'WALLET_COHORT', 'ASSET'),

  // ── EXPOSURE ───────────────────────────────────────────────────────
  interactional('ENTITY_EXPOSED_TO_ASSET', 'ENTITY', 'ASSET', {
    semanticFamily: 'EXPOSURE',
    temporalMode: 'ROLLING',
    confidencePolicy: {
      minimumSubjectConfidence: 'MEDIUM',
      minimumObjectConfidence: 'MEDIUM',
      allowUnresolvedEdgeCreation: false,
    },
    allowedUses: ['context_enrichment', 'explanation', 'forensic_replay', 'judgment_support'],
    blockedUsesUnderUncertainty: ['propagation'],
    supportsDirectPropagation: true,
    supportsRulePathPropagation: true,
    querySurfacesAllowed: ['entity_context', 'exposure', 'forensic'],
  }),

  // ── NARRATIVE ──────────────────────────────────────────────────────
  narrativeEdge('NARRATIVE_AFFECTS_ASSET', 'NARRATIVE_TOPIC', 'ASSET'),
  narrativeEdge('NARRATIVE_AFFECTS_PROTOCOL', 'NARRATIVE_TOPIC', 'PROTOCOL'),
  narrativeEdge('NARRATIVE_DOMINATES_SECTOR', 'NARRATIVE_TOPIC', 'SECTOR_CLUSTER', {
    objectNodeClass: 'GRAPH_NATIVE',
    supportsDirectPropagation: true,
    supportsRulePathPropagation: true,
  }),

  // ── EVENT_IMPACT ───────────────────────────────────────────────────
  eventImpact('UNLOCK_IMPACTS_FLOAT', 'UNLOCK_EVENT', 'ASSET'),
  eventImpact('GOVERNANCE_EVENT_AFFECTS_PROTOCOL', 'GOVERNANCE_EVENT', 'PROTOCOL'),
  eventImpact('SECURITY_EVENT_AFFECTS_ASSET', 'GOVERNANCE_EVENT', 'ASSET', {
    subjectNodeType: 'GOVERNANCE_EVENT',
    evidenceRequirements: {
      minEvidenceCount: 2,
      requireLineageRefs: true,
      requireCanonicalSubjects: false,
      requireEventNodeSupport: true,
    },
  }),

  // ── DERIVED_CLUSTER ────────────────────────────────────────────────
  derivedCluster('ASSET_IN_SECTOR', 'ASSET', 'SECTOR_CLUSTER'),
  derivedCluster('ASSET_IN_ECOSYSTEM', 'ASSET', 'ECOSYSTEM_CLUSTER'),
  derivedCluster('ASSET_HAS_COMPETITOR', 'ASSET', 'COMPETITOR_CLUSTER', {
    semanticFamily: 'DERIVED_CLUSTER',
    allowedUses: ['context_enrichment', 'comparison', 'competitor_discovery', 'explanation'],
    querySurfacesAllowed: ['entity_context', 'comparison', 'competitor', 'clustering'],
  }),
];

// ╔═══════════════════════════════════════════════════════════════════════════════╗
// ║  SECTION 5 — VALIDATION                                                      ║
// ╚═══════════════════════════════════════════════════════════════════════════════╝

function err(code: string, message: string): EdgeContractViolation {
  return { code, message };
}

export function validateEdgeContract(c: EdgeContract): EdgeContractValidationResult {
  const v: EdgeContractViolation[] = [];

  if (!c.edgeType) v.push(err('MISSING_EDGE_TYPE', 'Edge type required'));
  if (!c.contractVersion) v.push(err('MISSING_CONTRACT_VERSION', 'Contract version required'));
  if (!c.subjectNodeType) v.push(err('MISSING_SUBJECT_TYPE', 'Subject node type required'));
  if (!c.objectNodeType) v.push(err('MISSING_OBJECT_TYPE', 'Object node type required'));

  if (c.semanticFamily && !(ALL_SEMANTIC_FAMILIES as readonly string[]).includes(c.semanticFamily)) {
    v.push(err('INVALID_SEMANTIC_FAMILY', `Unknown semantic family: ${c.semanticFamily}`));
  }
  if (c.temporalMode && !(ALL_TEMPORAL_MODES as readonly string[]).includes(c.temporalMode)) {
    v.push(err('INVALID_TEMPORAL_MODE', `Unknown temporal mode: ${c.temporalMode}`));
  }

  if (!c.allowedUses || c.allowedUses.length === 0) {
    v.push(err('MISSING_ALLOWED_USES', 'Contract must declare allowed uses'));
  }
  if (!c.blockedUsesUnderUncertainty || c.blockedUsesUnderUncertainty.length === 0) {
    v.push(err('MISSING_BLOCKED_USES', 'Contract must declare blocked uses under uncertainty'));
  }

  if (c.subjectNodeType) {
    const subjectClass = resolveNodeClass(c.subjectNodeType);
    if (!subjectClass) v.push(err('INVALID_SUBJECT_TYPE', `Unknown node type: ${c.subjectNodeType}`));
    else if (c.subjectNodeClass !== 'ANY' && !nodeClassMatches(c.subjectNodeClass, subjectClass)) {
      v.push(err('SUBJECT_CLASS_MISMATCH', `Subject ${c.subjectNodeType} is ${subjectClass}, declared ${c.subjectNodeClass}`));
    }
  }
  if (c.objectNodeType) {
    const objectClass = resolveNodeClass(c.objectNodeType);
    if (!objectClass) v.push(err('INVALID_OBJECT_TYPE', `Unknown node type: ${c.objectNodeType}`));
    else if (c.objectNodeClass !== 'ANY' && !nodeClassMatches(c.objectNodeClass, objectClass)) {
      v.push(err('OBJECT_CLASS_MISMATCH', `Object ${c.objectNodeType} is ${objectClass}, declared ${c.objectNodeClass}`));
    }
  }

  validateTemporalPolicy(c, v);
  validatePropagationConsistency(c, v);

  return v.length > 0 ? { valid: false, violations: v } : { valid: true, violations: [] };
}

function validateTemporalPolicy(c: EdgeContract, v: EdgeContractViolation[]): void {
  if (c.temporalMode === 'EVENT_BOUNDED') {
    if (!c.staleAfterMs) v.push(err('EVENT_BOUNDED_MISSING_STALE', 'Event-bounded edges require staleAfterMs'));
  }
  if (c.temporalMode === 'DECAYING') {
    if (!c.defaultDecayPolicy) v.push(err('DECAYING_MISSING_DECAY_POLICY', 'Decaying edges require defaultDecayPolicy'));
    if (!c.staleAfterMs) v.push(err('DECAYING_MISSING_STALE', 'Decaying edges require staleAfterMs'));
  }
  if (c.temporalMode === 'ROLLING') {
    if (!c.staleAfterMs) v.push(err('ROLLING_MISSING_STALE', 'Rolling edges require staleAfterMs'));
    if (!c.expireAfterMs) v.push(err('ROLLING_MISSING_EXPIRE', 'Rolling edges require expireAfterMs'));
  }
  if (c.temporalMode === 'PERSISTENT' && c.defaultDecayPolicy) {
    v.push(err('PERSISTENT_WITH_DECAY', 'Persistent edges must not declare decay policy'));
  }
}

function validatePropagationConsistency(c: EdgeContract, v: EdgeContractViolation[]): void {
  const familiesBlockedFromDirectPropagation: SemanticFamily[] = ['STRUCTURAL', 'COMPETITIVE'];
  if (c.supportsDirectPropagation && familiesBlockedFromDirectPropagation.includes(c.semanticFamily)) {
    v.push(err('DIRECT_PROPAGATION_FAMILY_MISMATCH',
      `Semantic family ${c.semanticFamily} may not support direct propagation`));
  }
}

export function validateEdgeSubjectObjectPair(
  edgeType: EdgeType,
  subjectNodeType: string,
  objectNodeType: string,
): EdgeContractValidationResult {
  const contract = _byEdgeType.get(edgeType);
  if (!contract) {
    return { valid: false, violations: [err('UNKNOWN_EDGE_TYPE', `No contract for: ${edgeType}`)] };
  }

  const v: EdgeContractViolation[] = [];

  if (contract.subjectNodeType !== subjectNodeType) {
    v.push(err('SUBJECT_TYPE_MISMATCH', `Expected subject ${contract.subjectNodeType}, got ${subjectNodeType}`));
  }
  if (contract.objectNodeType !== objectNodeType) {
    v.push(err('OBJECT_TYPE_MISMATCH', `Expected object ${contract.objectNodeType}, got ${objectNodeType}`));
  }

  const subjectClass = resolveNodeClass(subjectNodeType);
  if (subjectClass && contract.subjectNodeClass !== 'ANY' && !nodeClassMatches(contract.subjectNodeClass, subjectClass)) {
    v.push(err('SUBJECT_CLASS_VIOLATION', `Subject class ${subjectClass} not allowed, need ${contract.subjectNodeClass}`));
  }
  const objectClass = resolveNodeClass(objectNodeType);
  if (objectClass && contract.objectNodeClass !== 'ANY' && !nodeClassMatches(contract.objectNodeClass, objectClass)) {
    v.push(err('OBJECT_CLASS_VIOLATION', `Object class ${objectClass} not allowed, need ${contract.objectNodeClass}`));
  }

  return v.length > 0 ? { valid: false, violations: v } : { valid: true, violations: [] };
}

// ╔═══════════════════════════════════════════════════════════════════════════════╗
// ║  SECTION 6 — COLLISION AND DEPRECATION                                       ║
// ╚═══════════════════════════════════════════════════════════════════════════════╝

export function detectEdgeSemanticCollision(candidate: EdgeContract): string | null {
  for (const [existingType, existing] of _byEdgeType) {
    if (existingType === candidate.edgeType) continue;
    if (existing.deprecated) continue;

    const sameSubject = existing.subjectNodeType === candidate.subjectNodeType;
    const sameObject = existing.objectNodeType === candidate.objectNodeType;
    const sameFamily = existing.semanticFamily === candidate.semanticFamily;
    const sameDirection = existing.directionality === candidate.directionality;
    const sameTemporal = existing.temporalMode === candidate.temporalMode;

    if (sameSubject && sameObject && sameFamily && sameDirection && sameTemporal) {
      const usesOverlap = candidate.allowedUses.filter(u => existing.allowedUses.includes(u));
      if (usesOverlap.length >= Math.min(candidate.allowedUses.length, existing.allowedUses.length) * 0.7) {
        return `SEMANTIC_COLLISION:${candidate.edgeType} collides with ${existingType}`;
      }
    }
  }
  return null;
}

export function deprecateEdgeContract(edgeType: EdgeType): boolean {
  const contract = _byEdgeType.get(edgeType);
  if (!contract) return false;
  contract.deprecated = true;
  _deprecatedContracts.push(contract);
  return true;
}

// ╔═══════════════════════════════════════════════════════════════════════════════╗
// ║  SECTION 7 — READ APIs                                                       ║
// ╚═══════════════════════════════════════════════════════════════════════════════╝

export function getEdgeContract(edgeType: EdgeType): EdgeContract | undefined {
  return _byEdgeType.get(edgeType);
}

export function isEdgeTypeRegistered(edgeType: EdgeType): boolean {
  return _byEdgeType.has(edgeType);
}

export function listEdgeTypesByFamily(family: SemanticFamily): readonly EdgeContract[] {
  return _byFamily.get(family) ?? [];
}

export function listAllowedEdgesForNodeType(nodeType: string): readonly EdgeContract[] {
  const asSubject = _bySubjectType.get(nodeType) ?? [];
  const asObject = _byObjectType.get(nodeType) ?? [];
  const combined = new Map<EdgeType, EdgeContract>();
  for (const c of [...asSubject, ...asObject]) combined.set(c.edgeType, c);
  return [...combined.values()];
}

export function listEdgesBySubjectType(nodeType: string): readonly EdgeContract[] {
  return _bySubjectType.get(nodeType) ?? [];
}

export function listEdgesByObjectType(nodeType: string): readonly EdgeContract[] {
  return _byObjectType.get(nodeType) ?? [];
}

export function listEdgesByTemporalMode(mode: TemporalMode): readonly EdgeContract[] {
  return _byTemporalMode.get(mode) ?? [];
}

export function listAllowedQuerySurfacesForEdge(edgeType: EdgeType): readonly string[] {
  return _byEdgeType.get(edgeType)?.querySurfacesAllowed ?? [];
}

export function isPropagationAllowedForEdge(edgeType: EdgeType): boolean {
  return _byEdgeType.get(edgeType)?.supportsDirectPropagation ?? false;
}

export function isRulePathPropagationAllowed(edgeType: EdgeType): boolean {
  return _byEdgeType.get(edgeType)?.supportsRulePathPropagation ?? false;
}

export function getBlockedUsesForEdge(edgeType: EdgeType): readonly UseDomain[] {
  return _byEdgeType.get(edgeType)?.blockedUsesUnderUncertainty ?? [];
}

export function listPropagationEligibleContracts(): readonly EdgeContract[] {
  return _directPropagation;
}

export function listRulePathPropagationContracts(): readonly EdgeContract[] {
  return _rulePathPropagation;
}

export function listDeprecatedContracts(): readonly EdgeContract[] {
  return _deprecatedContracts;
}

export function getAllRegisteredContracts(): readonly EdgeContract[] {
  return [..._byEdgeType.values()];
}

// ╔═══════════════════════════════════════════════════════════════════════════════╗
// ║  BOOTSTRAP + RESET                                                           ║
// ╚═══════════════════════════════════════════════════════════════════════════════╝

function clearRegistry(): void {
  _byEdgeType.clear(); _byFamily.clear(); _bySubjectType.clear();
  _byObjectType.clear(); _byTemporalMode.clear();
  _directPropagation.length = 0; _rulePathPropagation.length = 0;
  _byQuerySurface.clear(); _deprecatedContracts.length = 0;
}

export function resetRelationOntology(): void {
  clearRegistry();
}

export function bootstrapRelationOntology(): { registered: number; errors: string[] } {
  clearRegistry();
  let registered = 0;
  const errors: string[] = [];

  for (const contract of BOOTSTRAP_CONTRACTS) {
    const result = registerEdgeContract(contract);
    if (result.success) registered++;
    else errors.push(`${contract.edgeType}: ${result.error}`);
  }

  return { registered, errors };
}

bootstrapRelationOntology();
