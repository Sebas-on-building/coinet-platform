/**
 * L2.2 — Freshness Policy Map
 *
 * Field-family / source-class / route-mode / criticality policies
 * with per-state rights, penalties, and disclosure templates.
 */

import type {
  FreshnessFamily, FreshnessClass, FreshnessState,
  FreshnessUsageRight, FreshnessCriticality,
} from './freshness-ontology';

// ═══════════════════════════════════════════════════════════════════════════════
// POLICY TYPE
// ═══════════════════════════════════════════════════════════════════════════════

export interface FreshnessPolicy {
  policyId: string;
  freshnessFamily: FreshnessFamily;
  freshnessClass: FreshnessClass;
  fieldFamily: string;
  sourceClasses: string[];
  routeModes: Array<'realtime' | 'scheduled' | 'on_demand' | 'backfill'>;
  criticality: FreshnessCriticality;

  currentMaxMs: number;
  slippingMaxMs: number;
  staleButUsableMaxMs: number;
  staleConstrainedMaxMs: number;

  maxTransportGapMs: number;
  maxPublicationGapMs: number;

  rightsByState: Record<FreshnessState, FreshnessUsageRight[]>;
  disclosureByState: Partial<Record<FreshnessState, string>>;
  confidencePenaltyByState: Partial<Record<FreshnessState, number>>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// RIGHTS TEMPLATES
// ═══════════════════════════════════════════════════════════════════════════════

const FULL_LIVE: FreshnessUsageRight[] = ['DISPLAY_ALLOWED', 'LIVE_SCORING_ALLOWED', 'SCENARIO_CONFIRMATION_ALLOWED', 'CONTRADICTION_EVIDENCE_ALLOWED'];
const DISPLAY_AND_EVIDENCE: FreshnessUsageRight[] = ['DISPLAY_ALLOWED', 'CONTRADICTION_EVIDENCE_ALLOWED'];
const DISPLAY_ONLY: FreshnessUsageRight[] = ['DISPLAY_ALLOWED'];
const AUDIT_ONLY: FreshnessUsageRight[] = ['AUDIT_ONLY'];
const NOT_ALLOWED: FreshnessUsageRight[] = ['NOT_ALLOWED'];
const HISTORICAL: FreshnessUsageRight[] = ['HISTORICAL_REPLAY_ALLOWED', 'AUDIT_ONLY'];

// ═══════════════════════════════════════════════════════════════════════════════
// POLICY REGISTRY
// ═══════════════════════════════════════════════════════════════════════════════

export const FRESHNESS_POLICIES: FreshnessPolicy[] = [

  // ── REALTIME CRITICAL ──────────────────────────────────────────────────
  {
    policyId: 'rt-crit-spot-price',
    freshnessFamily: 'REALTIME',
    freshnessClass: 'REALTIME_CRITICAL',
    fieldFamily: 'price.spot',
    sourceClasses: ['market_data'],
    routeModes: ['realtime', 'scheduled'],
    criticality: 'MISSION_CRITICAL',
    currentMaxMs: 10_000,
    slippingMaxMs: 30_000,
    staleButUsableMaxMs: 120_000,
    staleConstrainedMaxMs: 300_000,
    maxTransportGapMs: 5_000,
    maxPublicationGapMs: 15_000,
    rightsByState: {
      F0_CURRENT: FULL_LIVE,
      F1_SLIPPING: FULL_LIVE,
      F2_STALE_BUT_USABLE: DISPLAY_AND_EVIDENCE,
      F3_STALE_AND_CONSTRAINED: DISPLAY_ONLY,
      F4_UNUSABLE: AUDIT_ONLY,
      F5_UNKNOWN: AUDIT_ONLY,
    },
    disclosureByState: {
      F2_STALE_BUT_USABLE: 'Spot price slightly stale — scoring confidence reduced',
      F3_STALE_AND_CONSTRAINED: 'Spot price significantly stale — display only',
      F4_UNUSABLE: 'Spot price too old for any live use',
    },
    confidencePenaltyByState: { F1_SLIPPING: 0.03, F2_STALE_BUT_USABLE: 0.10, F3_STALE_AND_CONSTRAINED: 0.25, F4_UNUSABLE: 1.0 },
  },
  {
    policyId: 'rt-crit-derivatives-funding',
    freshnessFamily: 'REALTIME',
    freshnessClass: 'REALTIME_CRITICAL',
    fieldFamily: 'derivatives.funding',
    sourceClasses: ['derivatives'],
    routeModes: ['realtime', 'scheduled'],
    criticality: 'MISSION_CRITICAL',
    currentMaxMs: 15_000,
    slippingMaxMs: 60_000,
    staleButUsableMaxMs: 180_000,
    staleConstrainedMaxMs: 600_000,
    maxTransportGapMs: 10_000,
    maxPublicationGapMs: 30_000,
    rightsByState: {
      F0_CURRENT: FULL_LIVE,
      F1_SLIPPING: FULL_LIVE,
      F2_STALE_BUT_USABLE: DISPLAY_AND_EVIDENCE,
      F3_STALE_AND_CONSTRAINED: DISPLAY_ONLY,
      F4_UNUSABLE: AUDIT_ONLY,
      F5_UNKNOWN: AUDIT_ONLY,
    },
    disclosureByState: {
      F2_STALE_BUT_USABLE: 'Funding rate slightly stale — leverage claims softened',
      F3_STALE_AND_CONSTRAINED: 'Funding data significantly stale — fragility claims constrained',
      F4_UNUSABLE: 'Funding data too old for live derivatives assessment',
    },
    confidencePenaltyByState: { F1_SLIPPING: 0.04, F2_STALE_BUT_USABLE: 0.12, F3_STALE_AND_CONSTRAINED: 0.28, F4_UNUSABLE: 1.0 },
  },
  {
    policyId: 'rt-crit-derivatives-oi',
    freshnessFamily: 'REALTIME',
    freshnessClass: 'REALTIME_CRITICAL',
    fieldFamily: 'derivatives.oi',
    sourceClasses: ['derivatives'],
    routeModes: ['realtime', 'scheduled'],
    criticality: 'MISSION_CRITICAL',
    currentMaxMs: 15_000,
    slippingMaxMs: 60_000,
    staleButUsableMaxMs: 180_000,
    staleConstrainedMaxMs: 600_000,
    maxTransportGapMs: 10_000,
    maxPublicationGapMs: 30_000,
    rightsByState: {
      F0_CURRENT: FULL_LIVE, F1_SLIPPING: FULL_LIVE,
      F2_STALE_BUT_USABLE: DISPLAY_AND_EVIDENCE, F3_STALE_AND_CONSTRAINED: DISPLAY_ONLY,
      F4_UNUSABLE: AUDIT_ONLY, F5_UNKNOWN: AUDIT_ONLY,
    },
    disclosureByState: { F2_STALE_BUT_USABLE: 'OI data slightly stale', F4_UNUSABLE: 'OI data too old' },
    confidencePenaltyByState: { F1_SLIPPING: 0.04, F2_STALE_BUT_USABLE: 0.12, F3_STALE_AND_CONSTRAINED: 0.28, F4_UNUSABLE: 1.0 },
  },
  {
    policyId: 'rt-crit-liquidations',
    freshnessFamily: 'REALTIME',
    freshnessClass: 'REALTIME_CRITICAL',
    fieldFamily: 'derivatives.liquidation',
    sourceClasses: ['derivatives'],
    routeModes: ['realtime', 'scheduled'],
    criticality: 'MISSION_CRITICAL',
    currentMaxMs: 10_000,
    slippingMaxMs: 30_000,
    staleButUsableMaxMs: 120_000,
    staleConstrainedMaxMs: 300_000,
    maxTransportGapMs: 5_000,
    maxPublicationGapMs: 15_000,
    rightsByState: {
      F0_CURRENT: FULL_LIVE, F1_SLIPPING: FULL_LIVE,
      F2_STALE_BUT_USABLE: DISPLAY_AND_EVIDENCE, F3_STALE_AND_CONSTRAINED: DISPLAY_ONLY,
      F4_UNUSABLE: AUDIT_ONLY, F5_UNKNOWN: AUDIT_ONLY,
    },
    disclosureByState: { F2_STALE_BUT_USABLE: 'Liquidation data slightly stale', F4_UNUSABLE: 'Liquidation data too old' },
    confidencePenaltyByState: { F1_SLIPPING: 0.05, F2_STALE_BUT_USABLE: 0.15, F3_STALE_AND_CONSTRAINED: 0.30, F4_UNUSABLE: 1.0 },
  },

  // ── REALTIME IMPORTANT ─────────────────────────────────────────────────
  {
    policyId: 'rt-imp-dex-liquidity',
    freshnessFamily: 'REALTIME',
    freshnessClass: 'REALTIME_IMPORTANT',
    fieldFamily: 'dex.liquidity',
    sourceClasses: ['dex_discovery'],
    routeModes: ['realtime', 'scheduled'],
    criticality: 'THESIS_CRITICAL',
    currentMaxMs: 30_000,
    slippingMaxMs: 120_000,
    staleButUsableMaxMs: 300_000,
    staleConstrainedMaxMs: 900_000,
    maxTransportGapMs: 15_000,
    maxPublicationGapMs: 60_000,
    rightsByState: {
      F0_CURRENT: FULL_LIVE, F1_SLIPPING: FULL_LIVE,
      F2_STALE_BUT_USABLE: DISPLAY_AND_EVIDENCE, F3_STALE_AND_CONSTRAINED: DISPLAY_ONLY,
      F4_UNUSABLE: AUDIT_ONLY, F5_UNKNOWN: AUDIT_ONLY,
    },
    disclosureByState: { F2_STALE_BUT_USABLE: 'DEX liquidity snapshot aging', F4_UNUSABLE: 'DEX liquidity too old' },
    confidencePenaltyByState: { F1_SLIPPING: 0.03, F2_STALE_BUT_USABLE: 0.08, F3_STALE_AND_CONSTRAINED: 0.20, F4_UNUSABLE: 1.0 },
  },
  {
    policyId: 'rt-imp-onchain-transfers',
    freshnessFamily: 'REALTIME',
    freshnessClass: 'REALTIME_IMPORTANT',
    fieldFamily: 'onchain.transfers',
    sourceClasses: ['onchain'],
    routeModes: ['realtime', 'scheduled'],
    criticality: 'THESIS_CRITICAL',
    currentMaxMs: 30_000,
    slippingMaxMs: 120_000,
    staleButUsableMaxMs: 300_000,
    staleConstrainedMaxMs: 900_000,
    maxTransportGapMs: 15_000,
    maxPublicationGapMs: 60_000,
    rightsByState: {
      F0_CURRENT: FULL_LIVE, F1_SLIPPING: FULL_LIVE,
      F2_STALE_BUT_USABLE: DISPLAY_AND_EVIDENCE, F3_STALE_AND_CONSTRAINED: DISPLAY_ONLY,
      F4_UNUSABLE: AUDIT_ONLY, F5_UNKNOWN: AUDIT_ONLY,
    },
    disclosureByState: { F2_STALE_BUT_USABLE: 'On-chain transfer data aging' },
    confidencePenaltyByState: { F1_SLIPPING: 0.03, F2_STALE_BUT_USABLE: 0.08, F3_STALE_AND_CONSTRAINED: 0.20, F4_UNUSABLE: 1.0 },
  },

  // ── SCHEDULED HIGH ─────────────────────────────────────────────────────
  {
    policyId: 'sch-high-protocol-tvl',
    freshnessFamily: 'SCHEDULED',
    freshnessClass: 'SCHEDULED_HIGH',
    fieldFamily: 'protocol.tvl',
    sourceClasses: ['fundamentals'],
    routeModes: ['scheduled', 'on_demand'],
    criticality: 'THESIS_CRITICAL',
    currentMaxMs: 600_000,
    slippingMaxMs: 1_200_000,
    staleButUsableMaxMs: 3_600_000,
    staleConstrainedMaxMs: 14_400_000,
    maxTransportGapMs: 60_000,
    maxPublicationGapMs: 300_000,
    rightsByState: {
      F0_CURRENT: FULL_LIVE, F1_SLIPPING: FULL_LIVE,
      F2_STALE_BUT_USABLE: DISPLAY_AND_EVIDENCE, F3_STALE_AND_CONSTRAINED: DISPLAY_ONLY,
      F4_UNUSABLE: AUDIT_ONLY, F5_UNKNOWN: AUDIT_ONLY,
    },
    disclosureByState: { F2_STALE_BUT_USABLE: 'Protocol TVL snapshot aging — cadence behind', F4_UNUSABLE: 'Protocol TVL too old for scoring' },
    confidencePenaltyByState: { F1_SLIPPING: 0.02, F2_STALE_BUT_USABLE: 0.06, F3_STALE_AND_CONSTRAINED: 0.15, F4_UNUSABLE: 1.0 },
  },
  {
    policyId: 'sch-high-security-flags',
    freshnessFamily: 'SCHEDULED',
    freshnessClass: 'SCHEDULED_HIGH',
    fieldFamily: 'security.token.flags',
    sourceClasses: ['security'],
    routeModes: ['scheduled', 'on_demand'],
    criticality: 'MISSION_CRITICAL',
    currentMaxMs: 600_000,
    slippingMaxMs: 1_200_000,
    staleButUsableMaxMs: 3_600_000,
    staleConstrainedMaxMs: 7_200_000,
    maxTransportGapMs: 60_000,
    maxPublicationGapMs: 300_000,
    rightsByState: {
      F0_CURRENT: FULL_LIVE, F1_SLIPPING: FULL_LIVE,
      F2_STALE_BUT_USABLE: DISPLAY_AND_EVIDENCE, F3_STALE_AND_CONSTRAINED: DISPLAY_ONLY,
      F4_UNUSABLE: AUDIT_ONLY, F5_UNKNOWN: AUDIT_ONLY,
    },
    disclosureByState: { F2_STALE_BUT_USABLE: 'Security check slightly stale', F4_UNUSABLE: 'Safety visibility too old' },
    confidencePenaltyByState: { F1_SLIPPING: 0.03, F2_STALE_BUT_USABLE: 0.10, F3_STALE_AND_CONSTRAINED: 0.22, F4_UNUSABLE: 1.0 },
  },

  // ── SCHEDULED MODERATE ─────────────────────────────────────────────────
  {
    policyId: 'sch-mod-narrative',
    freshnessFamily: 'SCHEDULED',
    freshnessClass: 'SCHEDULED_MODERATE',
    fieldFamily: 'narrative.attention',
    sourceClasses: ['narrative'],
    routeModes: ['scheduled', 'on_demand'],
    criticality: 'CONTEXTUAL',
    currentMaxMs: 300_000,
    slippingMaxMs: 900_000,
    staleButUsableMaxMs: 3_600_000,
    staleConstrainedMaxMs: 14_400_000,
    maxTransportGapMs: 120_000,
    maxPublicationGapMs: 600_000,
    rightsByState: {
      F0_CURRENT: FULL_LIVE, F1_SLIPPING: FULL_LIVE,
      F2_STALE_BUT_USABLE: DISPLAY_AND_EVIDENCE, F3_STALE_AND_CONSTRAINED: DISPLAY_ONLY,
      F4_UNUSABLE: AUDIT_ONLY, F5_UNKNOWN: AUDIT_ONLY,
    },
    disclosureByState: { F2_STALE_BUT_USABLE: 'Narrative attention data aging', F4_UNUSABLE: 'Narrative data too old' },
    confidencePenaltyByState: { F1_SLIPPING: 0.02, F2_STALE_BUT_USABLE: 0.05, F3_STALE_AND_CONSTRAINED: 0.12, F4_UNUSABLE: 1.0 },
  },
  {
    policyId: 'sch-mod-entity-labels',
    freshnessFamily: 'SCHEDULED',
    freshnessClass: 'SCHEDULED_MODERATE',
    fieldFamily: 'entity.labels',
    sourceClasses: ['entity'],
    routeModes: ['scheduled', 'on_demand'],
    criticality: 'CONTEXTUAL',
    currentMaxMs: 900_000,
    slippingMaxMs: 1_800_000,
    staleButUsableMaxMs: 7_200_000,
    staleConstrainedMaxMs: 28_800_000,
    maxTransportGapMs: 120_000,
    maxPublicationGapMs: 600_000,
    rightsByState: {
      F0_CURRENT: FULL_LIVE, F1_SLIPPING: FULL_LIVE,
      F2_STALE_BUT_USABLE: DISPLAY_AND_EVIDENCE, F3_STALE_AND_CONSTRAINED: DISPLAY_ONLY,
      F4_UNUSABLE: AUDIT_ONLY, F5_UNKNOWN: AUDIT_ONLY,
    },
    disclosureByState: { F2_STALE_BUT_USABLE: 'Entity labels aging', F4_UNUSABLE: 'Entity labels too old' },
    confidencePenaltyByState: { F1_SLIPPING: 0.01, F2_STALE_BUT_USABLE: 0.04, F3_STALE_AND_CONSTRAINED: 0.10, F4_UNUSABLE: 1.0 },
  },

  // ── HISTORICAL ─────────────────────────────────────────────────────────
  {
    policyId: 'hist-locked',
    freshnessFamily: 'HISTORICAL',
    freshnessClass: 'HISTORICAL_LOCKED',
    fieldFamily: '*',
    sourceClasses: ['*'],
    routeModes: ['backfill'],
    criticality: 'CONTEXTUAL',
    currentMaxMs: Infinity,
    slippingMaxMs: Infinity,
    staleButUsableMaxMs: Infinity,
    staleConstrainedMaxMs: Infinity,
    maxTransportGapMs: Infinity,
    maxPublicationGapMs: Infinity,
    rightsByState: {
      F0_CURRENT: HISTORICAL,
      F1_SLIPPING: HISTORICAL,
      F2_STALE_BUT_USABLE: HISTORICAL,
      F3_STALE_AND_CONSTRAINED: HISTORICAL,
      F4_UNUSABLE: AUDIT_ONLY,
      F5_UNKNOWN: AUDIT_ONLY,
    },
    disclosureByState: {},
    confidencePenaltyByState: {},
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// DEFAULT FALLBACK POLICY
// ═══════════════════════════════════════════════════════════════════════════════

export const DEFAULT_POLICY: FreshnessPolicy = {
  policyId: 'default',
  freshnessFamily: 'SCHEDULED',
  freshnessClass: 'SCHEDULED_MODERATE',
  fieldFamily: '*',
  sourceClasses: ['*'],
  routeModes: ['realtime', 'scheduled', 'on_demand', 'backfill'],
  criticality: 'CONTEXTUAL',
  currentMaxMs: 120_000,
  slippingMaxMs: 300_000,
  staleButUsableMaxMs: 900_000,
  staleConstrainedMaxMs: 3_600_000,
  maxTransportGapMs: 60_000,
  maxPublicationGapMs: 300_000,
  rightsByState: {
    F0_CURRENT: FULL_LIVE, F1_SLIPPING: FULL_LIVE,
    F2_STALE_BUT_USABLE: DISPLAY_AND_EVIDENCE, F3_STALE_AND_CONSTRAINED: DISPLAY_ONLY,
    F4_UNUSABLE: AUDIT_ONLY, F5_UNKNOWN: AUDIT_ONLY,
  },
  disclosureByState: { F2_STALE_BUT_USABLE: 'Data aging', F4_UNUSABLE: 'Data too old' },
  confidencePenaltyByState: { F1_SLIPPING: 0.03, F2_STALE_BUT_USABLE: 0.08, F3_STALE_AND_CONSTRAINED: 0.20, F4_UNUSABLE: 1.0 },
};

// ═══════════════════════════════════════════════════════════════════════════════
// QUERY
// ═══════════════════════════════════════════════════════════════════════════════

export function findPolicy(sourceClass: string, fieldFamily?: string, routeMode?: string): FreshnessPolicy {
  let best: FreshnessPolicy | null = null;
  let bestScore = 0;

  for (const p of FRESHNESS_POLICIES) {
    const classExact = p.sourceClasses.includes(sourceClass);
    const classWild = p.sourceClasses.includes('*');
    if (!classExact && !classWild) continue;

    const fieldExact = fieldFamily != null && p.fieldFamily === fieldFamily;
    const fieldWild = p.fieldFamily === '*';
    if (fieldFamily != null && !fieldExact && !fieldWild) continue;

    const routeExact = routeMode != null && p.routeModes.includes(routeMode as any);
    if (routeMode != null && !routeExact) continue;

    let score = 0;
    if (classExact) score += 10;
    if (fieldExact) score += 10;
    if (routeExact) score += 5;

    if (score > bestScore) {
      bestScore = score;
      best = p;
    }
  }

  return best ?? DEFAULT_POLICY;
}

export function getAllPolicies(): readonly FreshnessPolicy[] {
  return FRESHNESS_POLICIES;
}

export function getPoliciesByFamily(family: FreshnessFamily): FreshnessPolicy[] {
  return FRESHNESS_POLICIES.filter(p => p.freshnessFamily === family);
}

export function getPoliciesByCriticality(crit: FreshnessCriticality): FreshnessPolicy[] {
  return FRESHNESS_POLICIES.filter(p => p.criticality === crit);
}
