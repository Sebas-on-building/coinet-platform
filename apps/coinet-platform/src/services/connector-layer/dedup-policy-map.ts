/**
 * L2.4 — Dedup Policy Map
 *
 * Dedup behavior must differ by field family, observation kind,
 * route mode, criticality, and stream/snapshot semantics.
 */

import type { FingerprintFamily } from './event-fingerprint';

// ═══════════════════════════════════════════════════════════════════════════════
// DEDUP POLICY
// ═══════════════════════════════════════════════════════════════════════════════

export interface DedupPolicy {
  policyId: string;
  fieldFamily: string;
  observationKind: FingerprintFamily;
  routeModes: string[];

  dedupWindowMs: number;
  timeBucketMs: number;
  strictSequence: boolean;
  correctionPriority: boolean;
  replayIsolation: boolean;
  allowSameValueDistinctTime: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// POLICY REGISTRY
// ═══════════════════════════════════════════════════════════════════════════════

export const DEDUP_POLICIES: DedupPolicy[] = [

  // ── SNAPSHOT: spot price ──────────────────────────────────────────────
  {
    policyId: 'ddp-spot-price',
    fieldFamily: 'price.spot',
    observationKind: 'SNAPSHOT',
    routeModes: ['realtime', 'scheduled'],
    dedupWindowMs: 60_000,
    timeBucketMs: 10_000,
    strictSequence: false,
    correctionPriority: true,
    replayIsolation: true,
    allowSameValueDistinctTime: true,
  },

  // ── SNAPSHOT: derivatives funding ─────────────────────────────────────
  {
    policyId: 'ddp-funding',
    fieldFamily: 'derivatives.funding',
    observationKind: 'SNAPSHOT',
    routeModes: ['realtime', 'scheduled'],
    dedupWindowMs: 120_000,
    timeBucketMs: 30_000,
    strictSequence: false,
    correctionPriority: true,
    replayIsolation: true,
    allowSameValueDistinctTime: true,
  },

  // ── SNAPSHOT: derivatives OI ──────────────────────────────────────────
  {
    policyId: 'ddp-oi',
    fieldFamily: 'derivatives.oi',
    observationKind: 'SNAPSHOT',
    routeModes: ['realtime', 'scheduled'],
    dedupWindowMs: 120_000,
    timeBucketMs: 30_000,
    strictSequence: false,
    correctionPriority: true,
    replayIsolation: true,
    allowSameValueDistinctTime: true,
  },

  // ── EVENT: liquidations ───────────────────────────────────────────────
  {
    policyId: 'ddp-liquidations',
    fieldFamily: 'derivatives.liquidation',
    observationKind: 'EVENT',
    routeModes: ['realtime'],
    dedupWindowMs: 300_000,
    timeBucketMs: 1_000,
    strictSequence: true,
    correctionPriority: true,
    replayIsolation: true,
    allowSameValueDistinctTime: true,
  },

  // ── EVENT: on-chain transfers ─────────────────────────────────────────
  {
    policyId: 'ddp-transfers',
    fieldFamily: 'onchain.transfers',
    observationKind: 'EVENT',
    routeModes: ['realtime', 'scheduled'],
    dedupWindowMs: 600_000,
    timeBucketMs: 1_000,
    strictSequence: true,
    correctionPriority: true,
    replayIsolation: true,
    allowSameValueDistinctTime: true,
  },

  // ── SNAPSHOT: protocol TVL ────────────────────────────────────────────
  {
    policyId: 'ddp-tvl',
    fieldFamily: 'protocol.tvl',
    observationKind: 'SNAPSHOT',
    routeModes: ['scheduled', 'on_demand'],
    dedupWindowMs: 600_000,
    timeBucketMs: 300_000,
    strictSequence: false,
    correctionPriority: true,
    replayIsolation: true,
    allowSameValueDistinctTime: true,
  },

  // ── LABEL: entity labels ──────────────────────────────────────────────
  {
    policyId: 'ddp-entity-labels',
    fieldFamily: 'entity.labels',
    observationKind: 'LABEL',
    routeModes: ['scheduled', 'on_demand'],
    dedupWindowMs: 3_600_000,
    timeBucketMs: 3_600_000,
    strictSequence: false,
    correctionPriority: false,
    replayIsolation: true,
    allowSameValueDistinctTime: false,
  },

  // ── LABEL: security flags ────────────────────────────────────────────
  {
    policyId: 'ddp-security-flags',
    fieldFamily: 'security.token.flags',
    observationKind: 'LABEL',
    routeModes: ['scheduled', 'on_demand'],
    dedupWindowMs: 1_800_000,
    timeBucketMs: 1_800_000,
    strictSequence: false,
    correctionPriority: true,
    replayIsolation: true,
    allowSameValueDistinctTime: false,
  },

  // ── SNAPSHOT: narrative ───────────────────────────────────────────────
  {
    policyId: 'ddp-narrative',
    fieldFamily: 'narrative.attention',
    observationKind: 'SNAPSHOT',
    routeModes: ['scheduled', 'on_demand'],
    dedupWindowMs: 300_000,
    timeBucketMs: 300_000,
    strictSequence: false,
    correctionPriority: false,
    replayIsolation: true,
    allowSameValueDistinctTime: true,
  },

  // ── AGGREGATE: DEX liquidity ──────────────────────────────────────────
  {
    policyId: 'ddp-dex-liquidity',
    fieldFamily: 'dex.liquidity',
    observationKind: 'AGGREGATE',
    routeModes: ['realtime', 'scheduled'],
    dedupWindowMs: 120_000,
    timeBucketMs: 60_000,
    strictSequence: false,
    correctionPriority: true,
    replayIsolation: true,
    allowSameValueDistinctTime: true,
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// DEFAULT
// ═══════════════════════════════════════════════════════════════════════════════

export const DEFAULT_DEDUP_POLICY: DedupPolicy = {
  policyId: 'ddp-default',
  fieldFamily: '*',
  observationKind: 'SNAPSHOT',
  routeModes: ['realtime', 'scheduled', 'on_demand', 'backfill'],
  dedupWindowMs: 300_000,
  timeBucketMs: 60_000,
  strictSequence: false,
  correctionPriority: true,
  replayIsolation: true,
  allowSameValueDistinctTime: true,
};

// ═══════════════════════════════════════════════════════════════════════════════
// QUERY
// ═══════════════════════════════════════════════════════════════════════════════

export function findDedupPolicy(fieldFamily: string, routeMode?: string): DedupPolicy {
  let best: DedupPolicy | null = null;
  let bestScore = 0;

  for (const p of DEDUP_POLICIES) {
    const fieldMatch = p.fieldFamily === fieldFamily;
    if (!fieldMatch) continue;

    const routeMatch = !routeMode || p.routeModes.includes(routeMode);
    if (!routeMatch) continue;

    let score = 10;
    if (routeMode && p.routeModes.includes(routeMode)) score += 5;

    if (score > bestScore) {
      bestScore = score;
      best = p;
    }
  }

  return best ?? DEFAULT_DEDUP_POLICY;
}

export function getAllDedupPolicies(): readonly DedupPolicy[] {
  return DEDUP_POLICIES;
}
