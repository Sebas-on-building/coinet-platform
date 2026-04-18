/**
 * Pre-L5 Integrated Certification — Mutation Scenarios
 *
 * L3 mutation events that must produce coherent L4 graph state
 * changes, preserving ancestry, version chains, and historical
 * reconstructability.
 */

// ═══════════════════════════════════════════════════════════════════════════════
// ENTITY SPLIT SCENARIO
// ═══════════════════════════════════════════════════════════════════════════════

export const ENTITY_SPLIT = {
  originalId: 'ent_pre_split',
  originalLabel: 'Multi-Strategy Fund',
  originalType: 'ENTITY' as const,
  splitAt: '2025-03-15T00:00:00Z',
  childIds: ['ent_post_split_a', 'ent_post_split_b'],
  childLabels: ['Alpha Trading', 'Beta Custody'],
  reason: 'STRUCTURAL_DIVERGENCE',
  expectations: {
    originalBecomes: 'HISTORICAL',
    childrenAreActive: true,
    ancestryPreserved: true,
    graphNodesCreatedForChildren: true,
    originalGraphNodeMarkedHistorical: true,
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// ENTITY MERGE SCENARIO
// ═══════════════════════════════════════════════════════════════════════════════

export const ENTITY_MERGE = {
  sourceIds: ['ent_merge_a', 'ent_merge_b'],
  sourceLabels: ['Wallet Group A', 'Wallet Group B'],
  sourceType: 'ENTITY' as const,
  mergedAt: '2025-04-01T00:00:00Z',
  targetId: 'ent_merged',
  targetLabel: 'Combined Wallet Group',
  reason: 'IDENTITY_CONFIRMED',
  expectations: {
    sourcesBecome: 'HISTORICAL',
    targetIsActive: true,
    ancestryPreserved: true,
    graphNodeCreatedForTarget: true,
    sourceGraphNodesMarkedHistorical: true,
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIDENCE CHANGE SCENARIO
// ═══════════════════════════════════════════════════════════════════════════════

export const CONFIDENCE_DOWNGRADE = {
  objectId: 'ast_conf_test',
  objectType: 'ASSET' as const,
  label: 'Confidence Test Asset',
  initialBand: 'HIGH' as const,
  downgradedBand: 'LOW' as const,
  downgradedAt: '2025-03-01T00:00:00Z',
  reason: 'PROVENANCE_DEGRADATION',
  expectations: {
    edgeRightsMayNarrow: true,
    graphNodeVersionUpdated: true,
    historicalConfidencePreserved: true,
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// RECONCILIATION MODE SHIFT
// ═══════════════════════════════════════════════════════════════════════════════

export const RECONCILIATION_SHIFT = {
  objectId: 'ast_recon_test',
  objectType: 'ASSET' as const,
  label: 'Reconciliation Test Asset',
  initialMode: 'SINGLE_SOURCE' as const,
  shiftedMode: 'MULTI_SOURCE_WEIGHTED' as const,
  shiftedAt: '2025-02-15T00:00:00Z',
  expectations: {
    versionBumped: true,
    reconciliationReportGenerated: true,
    graphEdgesStayValid: true,
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// METRIC CONTRACT REVISION
// ═══════════════════════════════════════════════════════════════════════════════

export const METRIC_CONTRACT_REVISION = {
  metricPath: 'price.spot.usd',
  revisionAt: '2025-05-01T00:00:00Z',
  change: 'PRECISION_TIGHTENED',
  expectations: {
    newObservationsUseNewContract: true,
    oldObservationsRemainReplayable: true,
    historicalMeaningPreserved: true,
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// ROLLBACK CHAIN
// ═══════════════════════════════════════════════════════════════════════════════

export const ROLLBACK_CHAIN = {
  objectId: 'ast_rollback_test',
  objectType: 'ASSET' as const,
  label: 'Rollback Test Asset',
  versionSequence: ['v1', 'v2', 'v3'],
  rollbackFrom: 'v3',
  rollbackTo: 'v2',
  rolledBackAt: '2025-06-01T00:00:00Z',
  reason: 'DATA_QUALITY_ISSUE',
  expectations: {
    currentVersionAfterRollback: 'v2',
    v3Superseded: true,
    v3HistoricallyVisible: true,
    graphNodeRevertedToV2State: true,
    propagatedHistoryPreserved: true,
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// ALIAS MUTATION
// ═══════════════════════════════════════════════════════════════════════════════

export const ALIAS_MUTATION = {
  objectId: 'ast_alias_test',
  objectType: 'ASSET' as const,
  label: 'Alias Test Asset',
  initialAliases: ['BTC', 'XBT'],
  addedAlias: 'SAT',
  removedAlias: 'XBT',
  expectations: {
    graphNodeLabelUnchanged: true,
    versionBumped: true,
    historicalAliasesReconstructable: true,
  },
};
