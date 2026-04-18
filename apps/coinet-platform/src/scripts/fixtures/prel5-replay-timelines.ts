/**
 * Pre-L5 Integrated Certification — Replay Timelines
 *
 * Five timeline families that exercise L3 mutation → L4 graph state →
 * propagation → query → package reconstruction at arbitrary time T.
 */

export interface PreL5TimelineEvent {
  timestamp: string;
  layer: 'L3' | 'L4';
  eventType: string;
  subjectId: string;
  detail: Record<string, unknown>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TIMELINE 1 — Clean evolution (no contested state)
// ═══════════════════════════════════════════════════════════════════════════════

export const TIMELINE_CLEAN: PreL5TimelineEvent[] = [
  { timestamp: '2025-01-01T00:00:00Z', layer: 'L3', eventType: 'OBJECT_CREATED', subjectId: 'ast_tl1_btc', detail: { label: 'Bitcoin', objectType: 'ASSET', confidence: 'HIGH' } },
  { timestamp: '2025-01-01T01:00:00Z', layer: 'L4', eventType: 'NODE_PROJECTED', subjectId: 'ast_tl1_btc', detail: { nodeId: 'gn:canonical:asset:ast_tl1_btc' } },
  { timestamp: '2025-01-01T02:00:00Z', layer: 'L4', eventType: 'EDGE_CREATED', subjectId: 'ge_tl1_btc_proto', detail: { type: 'ASSET_BELONGS_TO_PROTOCOL', objectNodeId: 'gn:canonical:protocol:proto_tl1_uni', family: 'STRUCTURAL', confidence: 'HIGH' } },
  { timestamp: '2025-01-15T00:00:00Z', layer: 'L3', eventType: 'METRIC_OBSERVED', subjectId: 'ast_tl1_btc', detail: { metricPath: 'price.spot.usd', value: 67500 } },
  { timestamp: '2025-02-01T00:00:00Z', layer: 'L3', eventType: 'CONFIDENCE_UPGRADED', subjectId: 'ast_tl1_btc', detail: { from: 'HIGH', to: 'HIGH', scoreFrom: 88, scoreTo: 94 } },
  { timestamp: '2025-03-01T00:00:00Z', layer: 'L4', eventType: 'PROPAGATION_FIRED', subjectId: 'ge_tl1_btc_proto', detail: { ruleId: 'RULE_TEST', effectClass: 'DEPENDENCY_IMPACT' } },
];

// ═══════════════════════════════════════════════════════════════════════════════
// TIMELINE 2 — Contested evolution
// ═══════════════════════════════════════════════════════════════════════════════

export const TIMELINE_CONTESTED: PreL5TimelineEvent[] = [
  { timestamp: '2025-02-01T00:00:00Z', layer: 'L3', eventType: 'OBJECT_CREATED', subjectId: 'ast_tl2_usdc', detail: { label: 'USDC', objectType: 'ASSET', confidence: 'MEDIUM' } },
  { timestamp: '2025-02-01T01:00:00Z', layer: 'L4', eventType: 'NODE_PROJECTED', subjectId: 'ast_tl2_usdc', detail: { nodeId: 'gn:canonical:asset:ast_tl2_usdc' } },
  { timestamp: '2025-02-15T00:00:00Z', layer: 'L3', eventType: 'PROVIDER_CONFLICT', subjectId: 'ast_tl2_usdc', detail: { providerA: 'coingecko', providerB: 'coinmarketcap', field: 'chainId' } },
  { timestamp: '2025-03-01T00:00:00Z', layer: 'L4', eventType: 'EDGE_CONTESTED', subjectId: 'ge_tl2_usdc_chain', detail: { temporalStatus: 'CONTESTED', reason: 'PROVIDER_CONFLICT' } },
  { timestamp: '2025-04-01T00:00:00Z', layer: 'L3', eventType: 'CONFLICT_RESOLVED', subjectId: 'ast_tl2_usdc', detail: { resolution: 'PROVIDER_A_WINS', confidence: 'HIGH' } },
  { timestamp: '2025-04-01T01:00:00Z', layer: 'L4', eventType: 'EDGE_RESTORED', subjectId: 'ge_tl2_usdc_chain', detail: { temporalStatus: 'ACTIVE' } },
];

// ═══════════════════════════════════════════════════════════════════════════════
// TIMELINE 3 — Mutation-heavy evolution
// ═══════════════════════════════════════════════════════════════════════════════

export const TIMELINE_MUTATION_HEAVY: PreL5TimelineEvent[] = [
  { timestamp: '2025-01-01T00:00:00Z', layer: 'L3', eventType: 'OBJECT_CREATED', subjectId: 'ent_tl3_fund', detail: { label: 'Crypto Fund A', objectType: 'ENTITY', confidence: 'MEDIUM' } },
  { timestamp: '2025-01-15T00:00:00Z', layer: 'L3', eventType: 'ALIAS_ADDED', subjectId: 'ent_tl3_fund', detail: { alias: 'Fund Alpha', aliasType: 'DISPLAY_NAME' } },
  { timestamp: '2025-02-01T00:00:00Z', layer: 'L3', eventType: 'CONFIDENCE_DOWNGRADED', subjectId: 'ent_tl3_fund', detail: { from: 'MEDIUM', to: 'LOW', reason: 'WEAK_PROVENANCE' } },
  { timestamp: '2025-03-01T00:00:00Z', layer: 'L3', eventType: 'ENTITY_SPLIT', subjectId: 'ent_tl3_fund', detail: { newIds: ['ent_tl3_fund_a', 'ent_tl3_fund_b'], reason: 'STRUCTURAL_DIVERGENCE' } },
  { timestamp: '2025-04-01T00:00:00Z', layer: 'L3', eventType: 'CONFIDENCE_UPGRADED', subjectId: 'ent_tl3_fund_a', detail: { from: 'LOW', to: 'MEDIUM', reason: 'MULTI_PROVIDER_CONFIRMED' } },
  { timestamp: '2025-05-01T00:00:00Z', layer: 'L3', eventType: 'METRIC_CONTRACT_REVISED', subjectId: 'metric_tvl_v2', detail: { change: 'UNIT_PRECISION_TIGHTENED' } },
  { timestamp: '2025-06-01T00:00:00Z', layer: 'L3', eventType: 'ROLLBACK', subjectId: 'ent_tl3_fund_b', detail: { targetVersion: 'v1', reason: 'DATA_QUALITY_ISSUE' } },
];

// ═══════════════════════════════════════════════════════════════════════════════
// TIMELINE 4 — Narrative decay
// ═══════════════════════════════════════════════════════════════════════════════

export const TIMELINE_NARRATIVE_DECAY: PreL5TimelineEvent[] = [
  { timestamp: '2025-01-01T00:00:00Z', layer: 'L4', eventType: 'NARRATIVE_CREATED', subjectId: 'nar_tl4_meme', detail: { label: 'Meme Season', confidence: 'MEDIUM' } },
  { timestamp: '2025-01-15T00:00:00Z', layer: 'L4', eventType: 'EDGE_CREATED', subjectId: 'ge_tl4_eth_meme', detail: { type: 'OBJECT_MENTIONED_IN_NARRATIVE', confidence: 'HIGH', family: 'NARRATIVE' } },
  { timestamp: '2025-02-01T00:00:00Z', layer: 'L3', eventType: 'METRIC_OBSERVED', subjectId: 'topic_meme', detail: { metricPath: 'narrative.intensity', value: 95 } },
  { timestamp: '2025-03-01T00:00:00Z', layer: 'L4', eventType: 'EDGE_STALE', subjectId: 'ge_tl4_eth_meme', detail: { temporalStatus: 'STALE', reason: 'DECAY' } },
  { timestamp: '2025-04-01T00:00:00Z', layer: 'L3', eventType: 'METRIC_OBSERVED', subjectId: 'topic_meme', detail: { metricPath: 'narrative.intensity', value: 15 } },
  { timestamp: '2025-05-01T00:00:00Z', layer: 'L4', eventType: 'EDGE_EXPIRED', subjectId: 'ge_tl4_eth_meme', detail: { temporalStatus: 'EXPIRED' } },
];

// ═══════════════════════════════════════════════════════════════════════════════
// TIMELINE 5 — Event window (bounded unlock context)
// ═══════════════════════════════════════════════════════════════════════════════

export const TIMELINE_EVENT_WINDOW: PreL5TimelineEvent[] = [
  { timestamp: '2025-03-01T00:00:00Z', layer: 'L4', eventType: 'EVENT_NODE_CREATED', subjectId: 'event_unlock_jup', detail: { label: 'JUP Token Unlock', windowStart: '2025-04-01T00:00:00Z', windowEnd: '2025-04-15T00:00:00Z' } },
  { timestamp: '2025-03-15T00:00:00Z', layer: 'L4', eventType: 'EDGE_CREATED', subjectId: 'ge_tl5_jup_unlock', detail: { type: 'EVENT_IMPACTS_ASSET', confidence: 'HIGH', family: 'EVENT_IMPACT' } },
  { timestamp: '2025-04-01T00:00:00Z', layer: 'L4', eventType: 'PROPAGATION_FIRED', subjectId: 'ge_tl5_jup_unlock', detail: { effectClass: 'FLOAT_PRESSURE', target: 'ast_jup' } },
  { timestamp: '2025-04-15T00:00:00Z', layer: 'L4', eventType: 'EVENT_WINDOW_CLOSED', subjectId: 'event_unlock_jup', detail: { expired: true } },
  { timestamp: '2025-05-01T00:00:00Z', layer: 'L4', eventType: 'PROPAGATION_EXPIRED', subjectId: 'ge_tl5_jup_unlock', detail: { reason: 'EVENT_WINDOW_CLOSED' } },
];

// ═══════════════════════════════════════════════════════════════════════════════
// REPLAY EXPECTATIONS — what should be true at specific timestamps
// ═══════════════════════════════════════════════════════════════════════════════

export const REPLAY_EXPECTATIONS = {
  clean: {
    at_2025_01_15: { objectExists: true, confidence: 'HIGH', edgeActive: true, propagationActive: false },
    at_2025_03_15: { objectExists: true, confidence: 'HIGH', edgeActive: true, propagationActive: true },
  },
  contested: {
    at_2025_02_15: { edgeContested: false, conflictActive: false },
    at_2025_03_15: { edgeContested: true, conflictActive: true },
    at_2025_04_15: { edgeContested: false, conflictResolved: true },
  },
  narrativeDecay: {
    at_2025_01_15: { narrativeActive: true, intensityHigh: true },
    at_2025_03_15: { narrativeStale: true },
    at_2025_05_15: { narrativeExpired: true },
  },
  eventWindow: {
    at_2025_03_15: { eventPending: true, propagationActive: false },
    at_2025_04_08: { eventActive: true, propagationActive: true },
    at_2025_05_15: { eventExpired: true, propagationExpired: true },
  },
};
