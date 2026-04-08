/**
 * Layer 3 Master Certification — Replay Timelines
 *
 * Three frozen timelines for deterministic replay testing.
 * Each timeline is a sequence of events with explicit timestamps
 * so the same inputs always produce the same reconstructed state.
 */

export interface TimelineEvent {
  timestamp: string;
  eventType: string;
  objectId: string;
  detail: Record<string, unknown>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TIMELINE A — Clean evolution (no contested state)
// ═══════════════════════════════════════════════════════════════════════════════

export const TIMELINE_A: TimelineEvent[] = [
  {
    timestamp: '2025-01-01T00:00:00.000Z',
    eventType: 'ENTITY_CREATED',
    objectId: 'ast_tla_btc',
    detail: { name: 'Bitcoin', symbol: 'BTC', assetKind: 'NATIVE', confidence: 'HIGH', score: 92 },
  },
  {
    timestamp: '2025-01-01T01:00:00.000Z',
    eventType: 'ALIAS_ADDED',
    objectId: 'ast_tla_btc',
    detail: { alias: 'XBT', aliasType: 'TICKER' },
  },
  {
    timestamp: '2025-01-01T02:00:00.000Z',
    eventType: 'METRIC_OBSERVATION',
    objectId: 'ast_tla_btc',
    detail: { metricPath: 'price.spot.usd', value: 67500, providerId: 'coingecko' },
  },
  {
    timestamp: '2025-01-01T03:00:00.000Z',
    eventType: 'CONFIDENCE_CHANGED',
    objectId: 'ast_tla_btc',
    detail: { bandBefore: 'HIGH', bandAfter: 'HIGH', scoreBefore: 92, scoreAfter: 94, reason: 'IMPROVED_PROVENANCE' },
  },
  {
    timestamp: '2025-01-01T04:00:00.000Z',
    eventType: 'METRIC_OBSERVATION',
    objectId: 'ast_tla_btc',
    detail: { metricPath: 'price.spot.usd', value: 68000, providerId: 'coingecko' },
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// TIMELINE B — Contested evolution
// ═══════════════════════════════════════════════════════════════════════════════

export const TIMELINE_B: TimelineEvent[] = [
  {
    timestamp: '2025-02-01T00:00:00.000Z',
    eventType: 'ENTITY_CREATED',
    objectId: 'ent_tlb_wallet',
    detail: { entityKind: 'WALLET', address: '0xabc', confidence: 'MEDIUM', score: 74, scars: [] },
  },
  {
    timestamp: '2025-02-01T01:00:00.000Z',
    eventType: 'PROVIDER_CLAIM_ADDED',
    objectId: 'ent_tlb_wallet',
    detail: { providerId: 'arkham', label: 'Alameda Research', claimClass: 'ANCHOR' },
  },
  {
    timestamp: '2025-02-01T02:00:00.000Z',
    eventType: 'PROVIDER_CLAIM_ADDED',
    objectId: 'ent_tlb_wallet',
    detail: { providerId: 'nansen', label: 'Unknown Fund', claimClass: 'CONFLICT' },
  },
  {
    timestamp: '2025-02-01T03:00:00.000Z',
    eventType: 'RECONCILIATION_MODE_CHANGED',
    objectId: 'ent_tlb_wallet',
    detail: { modeBefore: 'DETERMINISTIC_MERGE', modeAfter: 'CONTESTED_MERGE', reason: 'CO_AUTHORITY_CONFLICT' },
  },
  {
    timestamp: '2025-02-01T04:00:00.000Z',
    eventType: 'CONFIDENCE_CHANGED',
    objectId: 'ent_tlb_wallet',
    detail: { bandBefore: 'MEDIUM', bandAfter: 'LOW', scoreBefore: 74, scoreAfter: 58, scars: ['PROVIDER_DISAGREEMENT', 'ENTITY_ATTRIBUTION_RISK'] },
  },
  {
    timestamp: '2025-02-01T05:00:00.000Z',
    eventType: 'UNRESOLVED_CONFLICT_ADDED',
    objectId: 'ent_tlb_wallet',
    detail: { conflictClass: 'ENTITY_ATTRIBUTION', severity: 'HIGH', claimIds: ['claim_arkham_1', 'claim_nansen_1'] },
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// TIMELINE C — Mutation-heavy evolution
// ═══════════════════════════════════════════════════════════════════════════════

export const TIMELINE_C: TimelineEvent[] = [
  {
    timestamp: '2025-03-01T00:00:00.000Z',
    eventType: 'ENTITY_CREATED',
    objectId: 'ast_tlc_parent',
    detail: { name: 'SomeToken', symbol: 'STK', assetKind: 'TOKEN', confidence: 'MEDIUM', score: 76 },
  },
  {
    timestamp: '2025-03-01T01:00:00.000Z',
    eventType: 'METRIC_CONTRACT_ADDED',
    objectId: 'price.spot.usd',
    detail: { contractVersion: '1.0.0' },
  },
  {
    timestamp: '2025-03-01T02:00:00.000Z',
    eventType: 'ENTITY_SPLIT',
    objectId: 'ast_tlc_parent',
    detail: { childIds: ['ast_tlc_child_a', 'ast_tlc_child_b'], reason: 'CROSS_CHAIN_DIVERGENCE' },
  },
  {
    timestamp: '2025-03-01T03:00:00.000Z',
    eventType: 'METRIC_CONTRACT_REVISED',
    objectId: 'price.spot.usd',
    detail: { contractVersion: '1.1.0', fieldChanged: 'blockedUsesUnderUncertainty' },
  },
  {
    timestamp: '2025-03-01T04:00:00.000Z',
    eventType: 'ENTITY_MERGED',
    objectId: 'ast_tlc_child_a',
    detail: { mergedWith: 'ast_tlc_child_b', resultId: 'ast_tlc_merged', reason: 'FALSE_PRIOR_SPLIT' },
  },
  {
    timestamp: '2025-03-01T05:00:00.000Z',
    eventType: 'ROLLBACK_APPLIED',
    objectId: 'ast_tlc_merged',
    detail: { rollbackOf: 'ENTITY_MERGED', reason: 'MERGE_WAS_INCORRECT', restoredTo: 'ast_tlc_child_a' },
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// REPLAY EXPECTATIONS
// ═══════════════════════════════════════════════════════════════════════════════

export const REPLAY_EXPECTATIONS = {
  timelineA: {
    atT0: { objectExists: true, confidence: 'HIGH', aliases: ['BTC'] },
    atT1: { aliases: ['BTC', 'XBT'] },
    atT2: { latestMetricValue: 67500 },
    atT4: { latestMetricValue: 68000 },
  },
  timelineB: {
    atT0: { confidence: 'MEDIUM', scars: [] },
    atT4: { confidence: 'LOW', scars: ['PROVIDER_DISAGREEMENT', 'ENTITY_ATTRIBUTION_RISK'] },
    atT5: { unresolvedConflicts: 1 },
  },
  timelineC: {
    atT0: { objectExists: true, lifecycleState: 'ACTIVE' },
    atT2: { lifecycleState: 'SPLIT', childCount: 2 },
    atT4: { mergeOccurred: true },
    atT5: { rollbackOccurred: true, originalPreserved: true },
  },
};
