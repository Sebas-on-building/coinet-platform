/**
 * L4.0 — Graph Object Model Bootstrap: Type System
 *
 * Defines the full node type system for the knowledge graph.
 * Two top-level classes: CANONICAL (L3 projections) and GRAPH_NATIVE
 * (reasoning helpers that must never contaminate ontology).
 */

// ═══════════════════════════════════════════════════════════════════════════════
// NODE CLASS HIERARCHY
// ═══════════════════════════════════════════════════════════════════════════════

export type GraphNodeClass =
  | 'CANONICAL'
  | 'GRAPH_NATIVE';

export type CanonicalNodeType =
  | 'ASSET'
  | 'PAIR'
  | 'PROTOCOL'
  | 'ENTITY'
  | 'CHAIN'
  | 'NARRATIVE_TOPIC';

export type GraphNativeNodeType =
  | 'SECTOR_CLUSTER'
  | 'ECOSYSTEM_CLUSTER'
  | 'COMPETITOR_CLUSTER'
  | 'UNLOCK_EVENT'
  | 'GOVERNANCE_EVENT'
  | 'VENUE'
  | 'LIQUIDITY_VENUE_CLUSTER'
  | 'THEMATIC_CLUSTER'
  | 'WALLET_COHORT';

export const ALL_CANONICAL_NODE_TYPES: readonly CanonicalNodeType[] = [
  'ASSET', 'PAIR', 'PROTOCOL', 'ENTITY', 'CHAIN', 'NARRATIVE_TOPIC',
];

export const ALL_GRAPH_NATIVE_NODE_TYPES: readonly GraphNativeNodeType[] = [
  'SECTOR_CLUSTER', 'ECOSYSTEM_CLUSTER', 'COMPETITOR_CLUSTER',
  'UNLOCK_EVENT', 'GOVERNANCE_EVENT', 'VENUE',
  'LIQUIDITY_VENUE_CLUSTER', 'THEMATIC_CLUSTER', 'WALLET_COHORT',
];

// ═══════════════════════════════════════════════════════════════════════════════
// NODE ORIGIN — how the node entered the graph
// ═══════════════════════════════════════════════════════════════════════════════

export type GraphNodeOrigin =
  | 'L3_CANONICAL_PROJECTION'
  | 'GRAPH_DERIVED'
  | 'EVENT_DERIVED'
  | 'CLUSTER_DERIVED'
  | 'MANUAL_CONSTITUTIONAL';

// ═══════════════════════════════════════════════════════════════════════════════
// NODE LIFECYCLE
// ═══════════════════════════════════════════════════════════════════════════════

export type GraphNodeLifecycleState =
  | 'ACTIVE'
  | 'PROVISIONAL'
  | 'STALE'
  | 'HISTORICAL'
  | 'DEPRECATED';

// ═══════════════════════════════════════════════════════════════════════════════
// CAPABILITIES — what a node is allowed to do in the graph
// ═══════════════════════════════════════════════════════════════════════════════

export interface GraphNodeCapabilities {
  canParticipateInStructuralEdges: boolean;
  canParticipateInContextEdges: boolean;
  canBeUsedInPropagation: boolean;
  canAppearInContextPackages: boolean;
  canCarryMetricContext: boolean;
  canBeClustered: boolean;
  canMutateL3Identity: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// RESTRICTIONS — what a node is forbidden from doing
// ═══════════════════════════════════════════════════════════════════════════════

export interface GraphNodeRestrictions {
  blockedFromCanonicalMutation: boolean;
  blockedFromIdentityAuthority: boolean;
  blockedFromOntologyProjection: boolean;
  blockedFromMetricAuthority: boolean;
  blockedFromDirectJudgmentClaims: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// NODE RECORD — the core graph node artifact
// ═══════════════════════════════════════════════════════════════════════════════

export interface GraphNodeRecord {
  nodeId: string;
  nodeClass: GraphNodeClass;
  canonicalNodeType?: CanonicalNodeType;
  nativeNodeType?: GraphNativeNodeType;
  origin: GraphNodeOrigin;
  canonicalObjectId?: string;
  label: string;
  version: string;
  lifecycleState: GraphNodeLifecycleState;
  capabilities: GraphNodeCapabilities;
  restrictions: GraphNodeRestrictions;
  createdAt: string;
  updatedAt: string;
  evidenceRefs: string[];
  lineageRefs: string[];
  metadata: Record<string, unknown>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DEFAULT CAPABILITIES — constitutional presets by node class
// ═══════════════════════════════════════════════════════════════════════════════

export function getDefaultCanonicalCapabilities(): GraphNodeCapabilities {
  return {
    canParticipateInStructuralEdges: true,
    canParticipateInContextEdges: true,
    canBeUsedInPropagation: true,
    canAppearInContextPackages: true,
    canCarryMetricContext: true,
    canBeClustered: true,
    canMutateL3Identity: false,
  };
}

export function getDefaultCanonicalRestrictions(): GraphNodeRestrictions {
  return {
    blockedFromCanonicalMutation: true,
    blockedFromIdentityAuthority: false,
    blockedFromOntologyProjection: false,
    blockedFromMetricAuthority: true,
    blockedFromDirectJudgmentClaims: false,
  };
}

export function getDefaultGraphNativeCapabilities(subtype: GraphNativeNodeType): GraphNodeCapabilities {
  const eventTypes: GraphNativeNodeType[] = ['UNLOCK_EVENT', 'GOVERNANCE_EVENT'];
  const clusterTypes: GraphNativeNodeType[] = [
    'SECTOR_CLUSTER', 'ECOSYSTEM_CLUSTER', 'COMPETITOR_CLUSTER',
    'LIQUIDITY_VENUE_CLUSTER', 'THEMATIC_CLUSTER',
  ];

  return {
    canParticipateInStructuralEdges: false,
    canParticipateInContextEdges: true,
    canBeUsedInPropagation: !['COMPETITOR_CLUSTER', 'THEMATIC_CLUSTER'].includes(subtype),
    canAppearInContextPackages: true,
    canCarryMetricContext: ['VENUE', 'WALLET_COHORT', ...eventTypes].includes(subtype),
    canBeClustered: clusterTypes.includes(subtype),
    canMutateL3Identity: false,
  };
}

export function getDefaultGraphNativeRestrictions(): GraphNodeRestrictions {
  return {
    blockedFromCanonicalMutation: true,
    blockedFromIdentityAuthority: true,
    blockedFromOntologyProjection: true,
    blockedFromMetricAuthority: true,
    blockedFromDirectJudgmentClaims: true,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// REQUIRED METADATA SCHEMAS per graph-native subtype
// ═══════════════════════════════════════════════════════════════════════════════

export const REQUIRED_NATIVE_METADATA: Record<GraphNativeNodeType, string[]> = {
  SECTOR_CLUSTER: ['sectorKey', 'sectorLabel', 'clusteringBasis', 'memberSelectionRule'],
  ECOSYSTEM_CLUSTER: ['ecosystemKey', 'ecosystemLabel', 'membershipRule'],
  COMPETITOR_CLUSTER: ['competitorBasis', 'similarityRule', 'comparisonSurface'],
  UNLOCK_EVENT: ['eventTimestamp', 'affectedObjectIds', 'unlockType', 'floatImpactClass'],
  GOVERNANCE_EVENT: ['governanceSystem', 'effectiveWindow', 'affectedObjectIds'],
  VENUE: ['venueType', 'venueId', 'venueScope', 'supportedObjectClasses'],
  LIQUIDITY_VENUE_CLUSTER: ['venueClusterKey', 'clusteringRule', 'includedVenueIds'],
  THEMATIC_CLUSTER: ['themeKey', 'themeBasis', 'inclusionRule'],
  WALLET_COHORT: ['cohortKey', 'cohortBasis', 'inclusionLogic', 'updateCadence'],
};
