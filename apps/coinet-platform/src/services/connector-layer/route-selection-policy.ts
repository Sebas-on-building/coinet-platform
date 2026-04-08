/**
 * L2.3 — Route Selection Policy
 *
 * Maps source class + field family + claim usage + criticality
 * to admissible route candidates. This is where the planner
 * gets its legal candidate set.
 *
 * Hard rule: cost may optimize within admissible routes.
 * It may not determine admissibility.
 */

import type { L23RouteMode, CostToleranceMode } from './routing-mode-types';

// ═══════════════════════════════════════════════════════════════════════════════
// SELECTION POLICY
// ═══════════════════════════════════════════════════════════════════════════════

export interface RouteSelectionPolicy {
  policyId: string;
  fieldFamily: string;
  sourceClasses: string[];
  claimUsages: string[];
  criticality: 'MISSION_CRITICAL' | 'THESIS_CRITICAL' | 'CONTEXTUAL' | 'ENRICHMENT_ONLY';

  admissibleModes: L23RouteMode[];
  preferredMode: L23RouteMode;
  prohibitedModes: L23RouteMode[];

  costTolerance: CostToleranceMode;
  requireOwnerPath: boolean;
  allowConfirmerFallback: boolean;
  allowCacheSubstitution: boolean;

  truthFidelityWeight: number;
  freshnessFitnessWeight: number;
  failureResilienceWeight: number;
  costDisciplineWeight: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// POLICY REGISTRY
// ═══════════════════════════════════════════════════════════════════════════════

export const ROUTE_SELECTION_POLICIES: RouteSelectionPolicy[] = [

  // ── REALTIME CRITICAL: spot price for live scoring ─────────────────────
  {
    policyId: 'rsp-rt-spot-live',
    fieldFamily: 'price.spot',
    sourceClasses: ['market_data'],
    claimUsages: ['LIVE_SCORING', 'SCENARIO_CONFIRMATION', 'CONTRADICTION_EVIDENCE'],
    criticality: 'MISSION_CRITICAL',
    admissibleModes: ['REALTIME', 'SCHEDULED'],
    preferredMode: 'REALTIME',
    prohibitedModes: ['BACKFILL'],
    costTolerance: 'TRUTH_FIRST',
    requireOwnerPath: true,
    allowConfirmerFallback: true,
    allowCacheSubstitution: false,
    truthFidelityWeight: 0.40,
    freshnessFitnessWeight: 0.35,
    failureResilienceWeight: 0.15,
    costDisciplineWeight: 0.10,
  },

  // ── REALTIME CRITICAL: derivatives funding ─────────────────────────────
  {
    policyId: 'rsp-rt-funding-live',
    fieldFamily: 'derivatives.funding',
    sourceClasses: ['derivatives'],
    claimUsages: ['LIVE_SCORING', 'SCENARIO_CONFIRMATION', 'CONTRADICTION_EVIDENCE'],
    criticality: 'MISSION_CRITICAL',
    admissibleModes: ['REALTIME', 'SCHEDULED'],
    preferredMode: 'REALTIME',
    prohibitedModes: ['BACKFILL'],
    costTolerance: 'TRUTH_FIRST',
    requireOwnerPath: true,
    allowConfirmerFallback: true,
    allowCacheSubstitution: false,
    truthFidelityWeight: 0.40,
    freshnessFitnessWeight: 0.35,
    failureResilienceWeight: 0.15,
    costDisciplineWeight: 0.10,
  },

  // ── REALTIME CRITICAL: derivatives OI ──────────────────────────────────
  {
    policyId: 'rsp-rt-oi-live',
    fieldFamily: 'derivatives.oi',
    sourceClasses: ['derivatives'],
    claimUsages: ['LIVE_SCORING', 'SCENARIO_CONFIRMATION'],
    criticality: 'MISSION_CRITICAL',
    admissibleModes: ['REALTIME', 'SCHEDULED'],
    preferredMode: 'REALTIME',
    prohibitedModes: ['BACKFILL'],
    costTolerance: 'TRUTH_FIRST',
    requireOwnerPath: true,
    allowConfirmerFallback: true,
    allowCacheSubstitution: false,
    truthFidelityWeight: 0.40,
    freshnessFitnessWeight: 0.35,
    failureResilienceWeight: 0.15,
    costDisciplineWeight: 0.10,
  },

  // ── REALTIME CRITICAL: liquidations ────────────────────────────────────
  {
    policyId: 'rsp-rt-liq-live',
    fieldFamily: 'derivatives.liquidation',
    sourceClasses: ['derivatives'],
    claimUsages: ['LIVE_SCORING', 'ALERTING'],
    criticality: 'MISSION_CRITICAL',
    admissibleModes: ['REALTIME'],
    preferredMode: 'REALTIME',
    prohibitedModes: ['SCHEDULED', 'BACKFILL'],
    costTolerance: 'TRUTH_FIRST',
    requireOwnerPath: true,
    allowConfirmerFallback: false,
    allowCacheSubstitution: false,
    truthFidelityWeight: 0.45,
    freshnessFitnessWeight: 0.35,
    failureResilienceWeight: 0.15,
    costDisciplineWeight: 0.05,
  },

  // ── REALTIME IMPORTANT: DEX liquidity ──────────────────────────────────
  {
    policyId: 'rsp-rt-dex-liq',
    fieldFamily: 'dex.liquidity',
    sourceClasses: ['dex_discovery'],
    claimUsages: ['LIVE_SCORING', 'DISPLAY'],
    criticality: 'THESIS_CRITICAL',
    admissibleModes: ['REALTIME', 'SCHEDULED', 'ON_DEMAND'],
    preferredMode: 'REALTIME',
    prohibitedModes: ['BACKFILL'],
    costTolerance: 'BALANCED',
    requireOwnerPath: false,
    allowConfirmerFallback: true,
    allowCacheSubstitution: true,
    truthFidelityWeight: 0.30,
    freshnessFitnessWeight: 0.30,
    failureResilienceWeight: 0.20,
    costDisciplineWeight: 0.20,
  },

  // ── SCHEDULED HIGH: protocol TVL ───────────────────────────────────────
  {
    policyId: 'rsp-sch-tvl',
    fieldFamily: 'protocol.tvl',
    sourceClasses: ['fundamentals'],
    claimUsages: ['LIVE_SCORING', 'DISPLAY', 'SCENARIO_CONFIRMATION'],
    criticality: 'THESIS_CRITICAL',
    admissibleModes: ['SCHEDULED', 'ON_DEMAND'],
    preferredMode: 'SCHEDULED',
    prohibitedModes: ['BACKFILL'],
    costTolerance: 'BALANCED',
    requireOwnerPath: false,
    allowConfirmerFallback: true,
    allowCacheSubstitution: true,
    truthFidelityWeight: 0.35,
    freshnessFitnessWeight: 0.25,
    failureResilienceWeight: 0.20,
    costDisciplineWeight: 0.20,
  },

  // ── SCHEDULED HIGH: security flags ─────────────────────────────────────
  {
    policyId: 'rsp-sch-security',
    fieldFamily: 'security.token.flags',
    sourceClasses: ['security'],
    claimUsages: ['LIVE_SCORING', 'DISPLAY', 'ALERTING'],
    criticality: 'MISSION_CRITICAL',
    admissibleModes: ['SCHEDULED', 'ON_DEMAND'],
    preferredMode: 'SCHEDULED',
    prohibitedModes: ['BACKFILL'],
    costTolerance: 'TRUTH_FIRST',
    requireOwnerPath: true,
    allowConfirmerFallback: true,
    allowCacheSubstitution: false,
    truthFidelityWeight: 0.45,
    freshnessFitnessWeight: 0.20,
    failureResilienceWeight: 0.25,
    costDisciplineWeight: 0.10,
  },

  // ── SCHEDULED MODERATE: narrative attention ────────────────────────────
  {
    policyId: 'rsp-sch-narrative',
    fieldFamily: 'narrative.attention',
    sourceClasses: ['narrative'],
    claimUsages: ['DISPLAY', 'SCENARIO_CONFIRMATION'],
    criticality: 'CONTEXTUAL',
    admissibleModes: ['SCHEDULED', 'ON_DEMAND'],
    preferredMode: 'SCHEDULED',
    prohibitedModes: [],
    costTolerance: 'BALANCED',
    requireOwnerPath: false,
    allowConfirmerFallback: true,
    allowCacheSubstitution: true,
    truthFidelityWeight: 0.25,
    freshnessFitnessWeight: 0.25,
    failureResilienceWeight: 0.20,
    costDisciplineWeight: 0.30,
  },

  // ── SCHEDULED MODERATE: entity labels ──────────────────────────────────
  {
    policyId: 'rsp-sch-entity-labels',
    fieldFamily: 'entity.labels',
    sourceClasses: ['entity'],
    claimUsages: ['DISPLAY', 'AUDIT'],
    criticality: 'CONTEXTUAL',
    admissibleModes: ['SCHEDULED', 'ON_DEMAND', 'BACKFILL'],
    preferredMode: 'SCHEDULED',
    prohibitedModes: [],
    costTolerance: 'BALANCED',
    requireOwnerPath: false,
    allowConfirmerFallback: true,
    allowCacheSubstitution: true,
    truthFidelityWeight: 0.25,
    freshnessFitnessWeight: 0.20,
    failureResilienceWeight: 0.20,
    costDisciplineWeight: 0.35,
  },

  // ── ON-DEMAND: deep verification ──────────────────────────────────────
  {
    policyId: 'rsp-od-verification',
    fieldFamily: '*',
    sourceClasses: ['*'],
    claimUsages: ['AUDIT', 'DEEP_VERIFICATION'],
    criticality: 'CONTEXTUAL',
    admissibleModes: ['ON_DEMAND', 'SCHEDULED'],
    preferredMode: 'ON_DEMAND',
    prohibitedModes: [],
    costTolerance: 'FORENSIC_FIRST',
    requireOwnerPath: false,
    allowConfirmerFallback: true,
    allowCacheSubstitution: false,
    truthFidelityWeight: 0.40,
    freshnessFitnessWeight: 0.15,
    failureResilienceWeight: 0.15,
    costDisciplineWeight: 0.30,
  },

  // ── BACKFILL: historical reconstruction ────────────────────────────────
  {
    policyId: 'rsp-bf-historical',
    fieldFamily: '*',
    sourceClasses: ['*'],
    claimUsages: ['HISTORICAL_REPLAY', 'AUDIT', 'CALIBRATION_BUILD'],
    criticality: 'CONTEXTUAL',
    admissibleModes: ['BACKFILL'],
    preferredMode: 'BACKFILL',
    prohibitedModes: ['REALTIME'],
    costTolerance: 'RECOVERY_FIRST',
    requireOwnerPath: false,
    allowConfirmerFallback: true,
    allowCacheSubstitution: false,
    truthFidelityWeight: 0.35,
    freshnessFitnessWeight: 0.05,
    failureResilienceWeight: 0.30,
    costDisciplineWeight: 0.30,
  },

  // ── SPOT PRICE — display only (relaxed) ────────────────────────────────
  {
    policyId: 'rsp-spot-display',
    fieldFamily: 'price.spot',
    sourceClasses: ['market_data'],
    claimUsages: ['DISPLAY'],
    criticality: 'CONTEXTUAL',
    admissibleModes: ['REALTIME', 'SCHEDULED', 'ON_DEMAND'],
    preferredMode: 'REALTIME',
    prohibitedModes: ['BACKFILL'],
    costTolerance: 'BALANCED',
    requireOwnerPath: false,
    allowConfirmerFallback: true,
    allowCacheSubstitution: true,
    truthFidelityWeight: 0.25,
    freshnessFitnessWeight: 0.30,
    failureResilienceWeight: 0.20,
    costDisciplineWeight: 0.25,
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// DEFAULT FALLBACK POLICY
// ═══════════════════════════════════════════════════════════════════════════════

export const DEFAULT_ROUTE_SELECTION_POLICY: RouteSelectionPolicy = {
  policyId: 'rsp-default',
  fieldFamily: '*',
  sourceClasses: ['*'],
  claimUsages: ['*'],
  criticality: 'CONTEXTUAL',
  admissibleModes: ['SCHEDULED', 'ON_DEMAND'],
  preferredMode: 'SCHEDULED',
  prohibitedModes: [],
  costTolerance: 'BALANCED',
  requireOwnerPath: false,
  allowConfirmerFallback: true,
  allowCacheSubstitution: true,
  truthFidelityWeight: 0.30,
  freshnessFitnessWeight: 0.25,
  failureResilienceWeight: 0.20,
  costDisciplineWeight: 0.25,
};

// ═══════════════════════════════════════════════════════════════════════════════
// QUERY
// ═══════════════════════════════════════════════════════════════════════════════

export function findSelectionPolicy(
  fieldFamily: string,
  sourceClass: string,
  claimUsage: string,
): RouteSelectionPolicy {
  let best: RouteSelectionPolicy | null = null;
  let bestScore = 0;

  for (const p of ROUTE_SELECTION_POLICIES) {
    const fieldExact = p.fieldFamily === fieldFamily;
    const fieldWild = p.fieldFamily === '*';
    if (!fieldExact && !fieldWild) continue;

    const classExact = p.sourceClasses.includes(sourceClass);
    const classWild = p.sourceClasses.includes('*');
    if (!classExact && !classWild) continue;

    const usageExact = p.claimUsages.includes(claimUsage);
    const usageWild = p.claimUsages.includes('*');
    if (!usageExact && !usageWild) continue;

    let score = 0;
    if (fieldExact) score += 10;
    if (classExact) score += 10;
    if (usageExact) score += 5;

    if (score > bestScore) {
      bestScore = score;
      best = p;
    }
  }

  return best ?? DEFAULT_ROUTE_SELECTION_POLICY;
}

export function getAllSelectionPolicies(): readonly RouteSelectionPolicy[] {
  return ROUTE_SELECTION_POLICIES;
}

export function isRouteModeAdmissible(
  fieldFamily: string,
  sourceClass: string,
  claimUsage: string,
  routeMode: L23RouteMode,
): boolean {
  const policy = findSelectionPolicy(fieldFamily, sourceClass, claimUsage);
  if (policy.prohibitedModes.includes(routeMode)) return false;
  return policy.admissibleModes.includes(routeMode);
}
