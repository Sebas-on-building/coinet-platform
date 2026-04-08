/**
 * L1.5 Conflict Resolution Logic — Type System
 *
 * L1.2 decides who owns truth.
 * L1.3 decides what may legally substitute.
 * L1.4 decides what is still speakable.
 * L1.5 decides what happens when valid truths collide.
 *
 * Core doctrine: Not all disagreement is error.
 * Some disagreement is information.
 *
 * Conflict is a governed event that changes what Coinet
 * is allowed to conclude.
 */

import type { TruthClass } from '../registry';
import type { ClaimPermission, FieldCriticality, HealthState, IntegrityState } from './health-types';

export const L15_PLATFORM_VERSION = '1.0.0' as const;

// ═══════════════════════════════════════════════════════════════════════════════
// CONFLICT KIND
// ═══════════════════════════════════════════════════════════════════════════════

export type ConflictKind =
  | 'NUMERIC_DRIFT'
  | 'CATEGORICAL_LABEL_CONFLICT'
  | 'METHODOLOGY_CONFLICT'
  | 'SCOPE_CONFLICT'
  | 'TIME_BASIS_CONFLICT'
  | 'AUTHORITY_CONFLICT'
  | 'CROSS_CLASS_CONTRADICTION'
  | 'BLOCKER_CONFLICT'
  | 'INTEGRITY_CONFLICT'
  | 'UNCOMPARABLE_CLAIMS';

export type ConflictSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export const CONFLICT_SEVERITY_RANK: Record<ConflictSeverity, number> = {
  LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4,
};

// ═══════════════════════════════════════════════════════════════════════════════
// CONFLICT OUTCOME — THE FIVE CONSTITUTIONAL OUTPUTS
// ═══════════════════════════════════════════════════════════════════════════════

export type ConflictOutcome =
  | 'RESOLVE_BY_AUTHORITY'
  | 'RESOLVE_BY_FUSION'
  | 'PRESERVE_CONTRADICTION'
  | 'DEGRADE_CLAIM'
  | 'SUPPRESS_CLAIM'
  | 'BLOCK_OUTPUT'
  | 'ESCALATE_INCIDENT'
  | 'FILTER_INVALID';

export const CONFLICT_OUTCOME_SPEAKABLE: Record<ConflictOutcome, boolean> = {
  RESOLVE_BY_AUTHORITY: true,
  RESOLVE_BY_FUSION: true,
  PRESERVE_CONTRADICTION: true,
  DEGRADE_CLAIM: true,
  SUPPRESS_CLAIM: false,
  BLOCK_OUTPUT: false,
  ESCALATE_INCIDENT: false,
  FILTER_INVALID: true,
};

// ═══════════════════════════════════════════════════════════════════════════════
// WINNER RULE
// ═══════════════════════════════════════════════════════════════════════════════

export type WinnerRule =
  | 'NATIVE_OVER_DERIVED'
  | 'SPECIALIST_OVER_BREADTH'
  | 'OWNER_OVER_CONFIRMER'
  | 'CO_AUTHORITY_PRESERVE_CONTRADICTION'
  | 'FRESHER_WINS'
  | 'HEALTHIER_WINS'
  | 'NO_WINNER';

// ═══════════════════════════════════════════════════════════════════════════════
// FUSION LEGALITY GATES
// ═══════════════════════════════════════════════════════════════════════════════

export type FusionGate =
  | 'same_field_id'
  | 'same_unit'
  | 'same_scope'
  | 'same_quote_basis'
  | 'time_basis_compatible'
  | 'methodology_compatible'
  | 'variance_within_threshold'
  | 'no_integrity_concern'
  | 'no_blocker_conflict'
  | 'constitution_allows_fusion';

export interface FusionGateResult {
  gate: FusionGate;
  passed: boolean;
  reason: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// BLOCKER CLASSES
// ═══════════════════════════════════════════════════════════════════════════════

export type BlockerClass =
  | 'STRUCTURAL_SAFETY_VETO'
  | 'INTEGRITY_BROKEN_MISSION_CRITICAL'
  | 'NO_FALLBACK_OWNER_ABSENT'
  | 'IDENTITY_WITHOUT_PROVENANCE'
  | 'SEVERE_CO_AUTHORITY_DIVERGENCE'
  | 'METHODOLOGY_BROKEN_SUBSTANCE'
  | 'REASONING_OVERCLAIM';

export interface BlockerRecord {
  blockerClass: BlockerClass;
  fieldId: string;
  triggeredBy: string;
  overrides: string[];
  suppresses: string[];
  forcesContradiction: boolean;
  blocksScore: boolean;
  escalatesIncident: boolean;
  description: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONFLICT CLAIM — input to adjudication
// ═══════════════════════════════════════════════════════════════════════════════

export interface ConflictClaim {
  providerId: string;
  fieldId: string;
  value: unknown;
  unit?: string;
  scope?: string;
  timeBasis?: string;
  methodologyId?: string;
  authorityTier: number;
  healthState: HealthState;
  integrityState: IntegrityState;
  observedAt?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONFLICT RECORD — output of adjudication
// ═══════════════════════════════════════════════════════════════════════════════

export interface ConflictRecord {
  conflictId: string;
  fieldId: string;
  conflictKind: ConflictKind;
  severity: ConflictSeverity;

  claimA: ConflictClaim;
  claimB: ConflictClaim;

  comparable: boolean;
  fusionLegal: boolean;
  fusionGates: FusionGateResult[];

  outcome: ConflictOutcome;
  winnerRule: WinnerRule | null;
  winnerId: string | null;

  confidencePenalty: number;
  disclosureRequired: boolean;
  downstreamEffects: string[];
  reasonCodes: string[];

  blockers: BlockerRecord[];

  version: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PRESERVED CONTRADICTION
// ═══════════════════════════════════════════════════════════════════════════════

export interface PreservedContradiction {
  conflictId: string;
  fieldId: string;
  providerA: string;
  providerB: string;
  valueA: unknown;
  valueB: unknown;
  kind: ConflictKind;
  severity: ConflictSeverity;
  materialityNote: string;
  thesisImpact: string;
  confidencePenalty: number;
  disclosureText: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CROSS-CLASS CONTRADICTION
// ═══════════════════════════════════════════════════════════════════════════════

export interface CrossClassContradictionPattern {
  patternId: string;
  classA: TruthClass;
  classB: TruthClass;
  conditionA: string;
  conditionB: string;
  description: string;
  severity: ConflictSeverity;
  thesisImplication: string;
  confidencePenalty: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONFLICT DIAGNOSTICS
// ═══════════════════════════════════════════════════════════════════════════════

export interface ConflictDiagnostics {
  timestamp: string;
  totalConflicts: number;
  resolved: number;
  fused: number;
  contradictionsPreserved: number;
  degraded: number;
  suppressed: number;
  blocked: number;
  escalated: number;
  activeBlockers: BlockerRecord[];
  totalConfidencePenalty: number;
  version: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONFLICT THRESHOLDS (per-field numeric tolerance)
// ═══════════════════════════════════════════════════════════════════════════════

export interface ConflictThreshold {
  fieldId: string;
  tolerancePct: number;
  toleranceAbsolute?: number;
  fusionAllowed: boolean;
  preserveAbove: ConflictSeverity;
  degradeAbove: ConflictSeverity;
}

export const CONFLICT_THRESHOLDS: Record<string, ConflictThreshold> = {
  'price.spot.canonical': { fieldId: 'price.spot.canonical', tolerancePct: 0.5, fusionAllowed: true, preserveAbove: 'MEDIUM', degradeAbove: 'HIGH' },
  'price.ohlcv': { fieldId: 'price.ohlcv', tolerancePct: 1.0, fusionAllowed: true, preserveAbove: 'MEDIUM', degradeAbove: 'HIGH' },
  'market.cap': { fieldId: 'market.cap', tolerancePct: 2.0, fusionAllowed: true, preserveAbove: 'MEDIUM', degradeAbove: 'HIGH' },
  'market.supply.circulating': { fieldId: 'market.supply.circulating', tolerancePct: 3.0, fusionAllowed: false, preserveAbove: 'MEDIUM', degradeAbove: 'HIGH' },
  'dex.pool.liquidity': { fieldId: 'dex.pool.liquidity', tolerancePct: 5.0, fusionAllowed: true, preserveAbove: 'MEDIUM', degradeAbove: 'HIGH' },
  'dex.pool.price': { fieldId: 'dex.pool.price', tolerancePct: 1.0, fusionAllowed: true, preserveAbove: 'MEDIUM', degradeAbove: 'HIGH' },
  'dex.pair.discovery': { fieldId: 'dex.pair.discovery', tolerancePct: 0, fusionAllowed: false, preserveAbove: 'LOW', degradeAbove: 'MEDIUM' },
  'derivatives.oi.aggregate': { fieldId: 'derivatives.oi.aggregate', tolerancePct: 3.0, fusionAllowed: false, preserveAbove: 'MEDIUM', degradeAbove: 'HIGH' },
  'derivatives.funding.aggregate': { fieldId: 'derivatives.funding.aggregate', tolerancePct: 5.0, fusionAllowed: false, preserveAbove: 'MEDIUM', degradeAbove: 'HIGH' },
  'derivatives.liquidation.orderflow': { fieldId: 'derivatives.liquidation.orderflow', tolerancePct: 10.0, fusionAllowed: false, preserveAbove: 'MEDIUM', degradeAbove: 'HIGH' },
  'derivatives.leverage.stress': { fieldId: 'derivatives.leverage.stress', tolerancePct: 5.0, fusionAllowed: false, preserveAbove: 'MEDIUM', degradeAbove: 'HIGH' },
  'protocol.tvl.usd': { fieldId: 'protocol.tvl.usd', tolerancePct: 5.0, fusionAllowed: false, preserveAbove: 'MEDIUM', degradeAbove: 'HIGH' },
  'protocol.fees.daily': { fieldId: 'protocol.fees.daily', tolerancePct: 10.0, fusionAllowed: false, preserveAbove: 'MEDIUM', degradeAbove: 'HIGH' },
  'protocol.revenue.daily': { fieldId: 'protocol.revenue.daily', tolerancePct: 10.0, fusionAllowed: false, preserveAbove: 'MEDIUM', degradeAbove: 'HIGH' },
  'onchain.transfers.evm': { fieldId: 'onchain.transfers.evm', tolerancePct: 0, fusionAllowed: false, preserveAbove: 'LOW', degradeAbove: 'MEDIUM' },
  'onchain.transfers.solana': { fieldId: 'onchain.transfers.solana', tolerancePct: 0, fusionAllowed: false, preserveAbove: 'LOW', degradeAbove: 'MEDIUM' },
  'onchain.contract.events': { fieldId: 'onchain.contract.events', tolerancePct: 0, fusionAllowed: false, preserveAbove: 'LOW', degradeAbove: 'MEDIUM' },
  'onchain.whale.flows': { fieldId: 'onchain.whale.flows', tolerancePct: 10.0, fusionAllowed: false, preserveAbove: 'MEDIUM', degradeAbove: 'HIGH' },
  'security.token.flags': { fieldId: 'security.token.flags', tolerancePct: 0, fusionAllowed: false, preserveAbove: 'LOW', degradeAbove: 'MEDIUM' },
  'security.contract.risk': { fieldId: 'security.contract.risk', tolerancePct: 0, fusionAllowed: false, preserveAbove: 'LOW', degradeAbove: 'MEDIUM' },
  'narrative.news.velocity': { fieldId: 'narrative.news.velocity', tolerancePct: 20.0, fusionAllowed: true, preserveAbove: 'HIGH', degradeAbove: 'CRITICAL' },
  'narrative.social.velocity': { fieldId: 'narrative.social.velocity', tolerancePct: 20.0, fusionAllowed: true, preserveAbove: 'HIGH', degradeAbove: 'CRITICAL' },
  'narrative.retail.attention': { fieldId: 'narrative.retail.attention', tolerancePct: 25.0, fusionAllowed: true, preserveAbove: 'HIGH', degradeAbove: 'CRITICAL' },
  'entity.wallet.labels': { fieldId: 'entity.wallet.labels', tolerancePct: 0, fusionAllowed: false, preserveAbove: 'LOW', degradeAbove: 'MEDIUM' },
  'entity.smart_money': { fieldId: 'entity.smart_money', tolerancePct: 0, fusionAllowed: false, preserveAbove: 'LOW', degradeAbove: 'MEDIUM' },
  'entity.cluster.attribution': { fieldId: 'entity.cluster.attribution', tolerancePct: 0, fusionAllowed: false, preserveAbove: 'LOW', degradeAbove: 'MEDIUM' },
};

export function getConflictThreshold(fieldId: string): ConflictThreshold | undefined {
  return CONFLICT_THRESHOLDS[fieldId];
}
