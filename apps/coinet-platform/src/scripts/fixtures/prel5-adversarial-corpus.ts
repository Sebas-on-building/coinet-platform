/**
 * Pre-L5 Integrated Certification — Adversarial Corpus
 *
 * Known failure modes that must be structurally blocked by
 * the combined L3 + L4 stack. Each trap targets a specific
 * cross-layer boundary.
 */

import type { LiveGraphEdge, EdgeRightsMap } from '../../services/knowledge-graph/graph-query-surfaces';

const ALLOW_ALL: EdgeRightsMap = {
  contextEnrichment: 'ALLOW', comparison: 'ALLOW', clustering: 'ALLOW',
  propagation: 'ALLOW', judgmentSupport: 'ALLOW', explanation: 'ALLOW',
  competitorDiscovery: 'ALLOW',
};

function trapEdge(
  id: string, type: string, sub: string, obj: string,
  subType: string, objType: string, family: string,
  overrides: Partial<LiveGraphEdge> = {},
): LiveGraphEdge {
  return {
    edgeId: id, edgeType: type,
    subjectNodeId: sub, objectNodeId: obj,
    subjectNodeType: subType, objectNodeType: objType,
    confidenceBand: 'HIGH', temporalStatus: 'ACTIVE',
    rights: { ...ALLOW_ALL }, evidenceRefs: [`ev_${id}`],
    semanticFamily: family, scars: [],
    validFrom: '2025-01-01T00:00:00Z',
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// IDENTITY TRAPS — cross-layer identity boundary attacks
// ═══════════════════════════════════════════════════════════════════════════════

export const IDENTITY_TRAPS = {
  sameTickerDifferentChains: {
    description: 'USDC on Ethereum vs USDC.e on Arbitrum must remain distinct canonical objects',
    objectA: { canonicalObjectId: 'ast_usdc_eth', objectType: 'ASSET', label: 'USDC (Ethereum)' },
    objectB: { canonicalObjectId: 'ast_usdc_arb', objectType: 'ASSET', label: 'USDC.e (Arbitrum)' },
    mustRemainDistinctInGraph: true,
    mustNotShareNodeId: true,
  },
  wrappedNativeConfusion: {
    description: 'WBTC graph node must not collapse into BTC graph node',
    nativeId: 'ast_btc', wrappedId: 'ast_wbtc',
    mustRemainDistinct: true,
    mayHaveRelationEdge: true,
  },
  protocolTokenOverlap: {
    description: 'Uniswap protocol and UNI token must remain distinct L4 nodes',
    protocolId: 'proto_uniswap', tokenId: 'ast_uni',
    mustRemainDistinct: true,
  },
  entityLabelWeakProvenance: {
    description: 'Single-provider wallet label must not become high-confidence graph identity',
    entityId: 'ent_weak_label',
    singleProviderLabel: 'Alameda Research',
    mustNotBeHighConfidence: true,
  },
  narrativeOverlapDistinct: {
    description: 'AI Agents and AI Infra share terms but must remain distinct topics',
    topicA: { canonicalObjectId: 'topic_ai_agents', objectType: 'NARRATIVE_TOPIC', label: 'AI Agents' },
    topicB: { canonicalObjectId: 'topic_ai_infra', objectType: 'NARRATIVE_TOPIC', label: 'AI Infra' },
    mustRemainDistinct: true,
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// METRIC TRAPS — metric semantics must survive graph transit
// ═══════════════════════════════════════════════════════════════════════════════

export const METRIC_TRAPS = {
  markPriceAsSpot: {
    description: 'Mark price named price must not merge with spot price',
    pathA: 'price.spot.usd', pathB: 'price.mark.usd',
    mustNeverMerge: true,
  },
  poolQuoteAsSpot: {
    description: 'DEX pool quote must not substitute for spot price',
    pathA: 'price.spot.usd', pathB: 'price.pool.quote',
    mustNeverMerge: true,
  },
  treasuryAsTvl: {
    description: 'Protocol treasury must not be confused with TVL',
    pathA: 'protocol.tvl.usd', pathB: 'protocol.treasury.usd',
    mustNeverMerge: true,
  },
  staleMetricFreshTimestamp: {
    description: 'Observation with stale data but fresh timestamp must be caught',
    metricPath: 'price.spot.usd',
    observedAt: '2026-03-15T12:00:00Z',
    dataAge: 'STALE',
    mustNotPassFreshnessCheck: true,
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// GRAPH TRAPS — L4 boundary violations
// ═══════════════════════════════════════════════════════════════════════════════

export const GRAPH_TRAPS = {
  sectorAsOntology: {
    description: 'Sector cluster must not behave as Layer 3 ontology truth',
    edge: trapEdge('trap_sect', 'ASSET_BELONGS_TO_SECTOR', 'ast_trap', 'sector_trap', 'ASSET', 'SECTOR_CLUSTER', 'DERIVED_CLUSTER'),
    mustNotClaimOntologyStatus: true,
  },
  narrativeAsStructural: {
    description: 'Narrative edge must not behave as structural dependency',
    edge: trapEdge('trap_nar_struct', 'OBJECT_MENTIONED_IN_NARRATIVE', 'ast_trap', 'nar_trap', 'ASSET', 'NARRATIVE_NODE', 'NARRATIVE'),
    mustNotAppearInStructuralContext: true,
  },
  walletCohortAsIdentity: {
    description: 'Wallet cohort cluster must not become identity claim',
    edge: trapEdge('trap_cohort', 'ENTITY_BELONGS_TO_COHORT', 'ent_trap', 'cohort_trap', 'ENTITY', 'COHORT_NODE', 'DERIVED_CLUSTER'),
    mustNotClaimIdentity: true,
  },
  expiredEventInLive: {
    description: 'Expired event edge must not appear in live spillover',
    edge: trapEdge('trap_expired', 'EVENT_IMPACTS_ASSET', 'event_trap', 'ast_trap', 'EVENT_NODE', 'ASSET', 'EVENT_IMPACT',
      { temporalStatus: 'EXPIRED', validFrom: '2024-01-01T00:00:00Z', validTo: '2024-12-31T23:59:59Z' }),
    mustNotAppearInLiveQuery: true,
  },
  competitorFromNameOnly: {
    description: 'Competitor edge from name similarity only must carry caveat',
    edge: trapEdge('trap_name_comp', 'COMPETES_WITH', 'ast_trap_a', 'ast_trap_b', 'ASSET', 'ASSET', 'COMPETITIVE',
      { confidenceBand: 'LOW', evidenceRefs: [] }),
    mustHaveLowConfidence: true,
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// PROPAGATION TRAPS — bounded propagation violations
// ═══════════════════════════════════════════════════════════════════════════════

export const PROPAGATION_TRAPS = {
  staleSourcePropagation: {
    description: 'Stale source edge must not produce active propagation event',
    sourceTemporalStatus: 'STALE' as const,
    mustBlock: true,
  },
  lowConfidenceHighOutput: {
    description: 'LOW confidence input must not produce HIGH confidence output',
    inputConfidence: 'LOW' as const,
    outputMustNotExceed: 'LOW' as const,
  },
  narrativeAsCausal: {
    description: 'Narrative-only propagation must not claim deterministic causality',
    effectClass: 'NARRATIVE_TRANSMISSION',
    mustIncludeBoundedLanguage: true,
  },
  cycleAmplification: {
    description: 'Cycle in graph must not amplify propagation strength',
    mustBlockCycles: true,
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// PACKAGE TRAPS — context package honesty violations
// ═══════════════════════════════════════════════════════════════════════════════

export const PACKAGE_TRAPS = {
  staleNarrativeAsCurrent: {
    description: 'Stale narrative must not appear as current in package without caveat',
    narrativeTemporalStatus: 'STALE' as const,
    mustHaveCaveat: true,
  },
  blockedCompetitorSilentDrop: {
    description: 'Blocked competitor path must not silently disappear from package',
    mustReportBlocked: true,
  },
  propagationNoteAsFact: {
    description: 'Propagation note must not be phrased as deterministic fact',
    mustIncludeBoundedLanguage: true,
  },
  sectorOverwritingProtocol: {
    description: 'Sector context must not overwrite protocol structural truth',
    mustKeepSectionsDistinct: true,
  },
  historicalContaminatedByLive: {
    description: 'Historical package must not contain live-only graph state',
    mustIsolateHistorical: true,
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// MUTATION TRAPS — L3 mutation and L4 alignment
// ═══════════════════════════════════════════════════════════════════════════════

export const MUTATION_TRAPS = {
  entitySplitBreaksGraph: {
    description: 'Entity split must not break graph node projection lineage',
    mustPreserveAncestry: true,
  },
  confidenceDowngradeGraph: {
    description: 'L3 confidence downgrade must propagate to L4 edge rights',
    mustAffectEdgeRights: true,
  },
  rollbackErasesHistory: {
    description: 'Rollback must not erase propagated history',
    mustPreserveHistoricalRecord: true,
  },
};
