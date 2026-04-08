/**
 * L1.4 Source Health & Quality Scoring — Type System
 *
 * A source can be online, returning JSON, and still be unhealthy
 * for the field Coinet is trying to speak about.
 *
 * Health exists at three stacked layers:
 *   1. Provider health  — is this provider technically alive?
 *   2. Field health     — is this provider healthy for THIS field?
 *   3. Class health     — is this truth class epistemically viable?
 */

import type { TruthClass, SourceClass } from '../registry';
import type { SemanticLossLevel } from './substitution-types';

export const L14_PLATFORM_VERSION = '1.0.0' as const;

// ═══════════════════════════════════════════════════════════════════════════════
// HEALTH STATE MACHINE
// ═══════════════════════════════════════════════════════════════════════════════

export type HealthState =
  | 'H0_HEALTHY'
  | 'H1_STRESSED'
  | 'H2_DEGRADED'
  | 'H3_PARTIAL_BLINDNESS'
  | 'H4_UNSAFE'
  | 'H5_SUPPRESSED';

export const HEALTH_STATE_LABELS: Record<HealthState, string> = {
  H0_HEALTHY: 'Healthy — full trust',
  H1_STRESSED: 'Stressed — usable with small penalties',
  H2_DEGRADED: 'Degraded — usable with explicit caveats',
  H3_PARTIAL_BLINDNESS: 'Partial blindness — only some fields safe',
  H4_UNSAFE: 'Unsafe — truth not safe to propagate',
  H5_SUPPRESSED: 'Suppressed — class or field claim blocked',
};

export const HEALTH_STATE_THRESHOLDS: Record<HealthState, [number, number]> = {
  H0_HEALTHY: [0.85, 1.00],
  H1_STRESSED: [0.70, 0.85],
  H2_DEGRADED: [0.50, 0.70],
  H3_PARTIAL_BLINDNESS: [0.30, 0.50],
  H4_UNSAFE: [0.10, 0.30],
  H5_SUPPRESSED: [0.00, 0.10],
};

// ═══════════════════════════════════════════════════════════════════════════════
// TRUST CLASSES
// ═══════════════════════════════════════════════════════════════════════════════

export type TrustClass =
  | 'T1_NATIVE'
  | 'T2_SPECIALIST'
  | 'T3_BREADTH_AGGREGATOR'
  | 'T4_DISCOVERY_SURFACE'
  | 'T5_ATTENTION_SURFACE'
  | 'T6_MODEL_OUTPUT';

export const TRUST_CLASS_AUTHORITY_WEIGHT: Record<TrustClass, number> = {
  T1_NATIVE: 1.00,
  T2_SPECIALIST: 0.95,
  T3_BREADTH_AGGREGATOR: 0.85,
  T4_DISCOVERY_SURFACE: 0.60,
  T5_ATTENTION_SURFACE: 0.50,
  T6_MODEL_OUTPUT: 0.00,
};

export const PROVIDER_TRUST_CLASS: Record<string, TrustClass> = {
  alchemy: 'T1_NATIVE',
  quicknode: 'T1_NATIVE',
  coinglass: 'T2_SPECIALIST',
  defillama: 'T2_SPECIALIST',
  goplus: 'T2_SPECIALIST',
  geckoterminal: 'T2_SPECIALIST',
  cryptopanic: 'T2_SPECIALIST',
  lunarcrush: 'T2_SPECIALIST',
  coingecko: 'T3_BREADTH_AGGREGATOR',
  coinmarketcap: 'T3_BREADTH_AGGREGATOR',
  birdeye: 'T3_BREADTH_AGGREGATOR',
  etherscan: 'T3_BREADTH_AGGREGATOR',
  solscan: 'T3_BREADTH_AGGREGATOR',
  arkham: 'T2_SPECIALIST',
  nansen: 'T2_SPECIALIST',
  dexscreener: 'T4_DISCOVERY_SURFACE',
  twitter_api: 'T5_ATTENTION_SURFACE',
  twitter_api_io: 'T5_ATTENTION_SURFACE',
  openai: 'T6_MODEL_OUTPUT',
  gemini: 'T6_MODEL_OUTPUT',
  xai: 'T6_MODEL_OUTPUT',
};

// ═══════════════════════════════════════════════════════════════════════════════
// PENALTY FAMILIES
// ═══════════════════════════════════════════════════════════════════════════════

export type PenaltyFamily =
  | 'P1_connectivity'
  | 'P2_freshness'
  | 'P3_semantic'
  | 'P4_trust'
  | 'P5_recovery';

export interface HealthPenalty {
  family: PenaltyFamily;
  amount: number;
  reason: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CLASS WEIGHT GROUPS
// ═══════════════════════════════════════════════════════════════════════════════

export type ClassWeightGroup = 'realtime_execution' | 'interpretation_heavy' | 'reasoning';

export interface HealthWeights {
  availability: number;
  freshness: number;
  payloadValidity: number;
  historicalReliability: number;
  trustClass: number;
}

export const CLASS_WEIGHT_PROFILES: Record<ClassWeightGroup, HealthWeights> = {
  realtime_execution: {
    availability: 0.25, freshness: 0.30, payloadValidity: 0.20,
    historicalReliability: 0.15, trustClass: 0.10,
  },
  interpretation_heavy: {
    availability: 0.15, freshness: 0.20, payloadValidity: 0.30,
    historicalReliability: 0.25, trustClass: 0.10,
  },
  reasoning: {
    availability: 0.10, freshness: 0.05, payloadValidity: 0.35,
    historicalReliability: 0.50, trustClass: 0.00,
  },
};

export const CLASS_TO_WEIGHT_GROUP: Record<string, ClassWeightGroup> = {
  market_surface: 'realtime_execution',
  dex_emergence: 'realtime_execution',
  derivatives_pressure: 'realtime_execution',
  onchain_behavior: 'realtime_execution',
  protocol_substance: 'interpretation_heavy',
  structural_safety: 'interpretation_heavy',
  narrative_attention: 'interpretation_heavy',
  entity_context: 'interpretation_heavy',
  reasoning_expression: 'reasoning',
};

// ═══════════════════════════════════════════════════════════════════════════════
// FIELD HEALTH
// ═══════════════════════════════════════════════════════════════════════════════

export interface FieldHealthRecord {
  fieldId: string;
  truthClass: TruthClass;
  providerId: string;

  availabilityScore: number;
  freshnessScore: number;
  payloadValidityScore: number;
  historicalReliabilityScore: number;
  trustClassScore: number;

  rawHealth: number;
  penalties: HealthPenalty[];
  effectiveHealth: number;
  state: HealthState;

  version: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CLASS HEALTH (EPISTEMIC VIABILITY)
// ═══════════════════════════════════════════════════════════════════════════════

export interface ClassHealthRecord {
  truthClass: TruthClass;
  sourceClass: SourceClass;

  ownerHealthy: boolean;
  ownerState: HealthState | null;
  confirmerAvailable: boolean;
  legalSubstituteAvailable: boolean;
  activeContradictions: number;

  criticalFieldsHealthy: number;
  criticalFieldsTotal: number;
  noFallbackTriggered: boolean;

  rawClassHealth: number;
  effectiveClassHealth: number;
  state: HealthState;

  fieldRecords: FieldHealthRecord[];
  implications: ClassHealthImplication[];

  version: string;
}

export interface ClassHealthImplication {
  type: 'confidence_penalty' | 'substitution_blocked' | 'claim_suppressed' | 'disclosure_required';
  description: string;
  severity: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HEALTH FINGERPRINT
// ═══════════════════════════════════════════════════════════════════════════════

export interface HealthFingerprint {
  timestamp: string;
  providers: { providerId: string; state: HealthState; score: number }[];
  fields: { fieldId: string; state: HealthState; score: number }[];
  classes: { truthClass: TruthClass; state: HealthState; score: number; ownerHealthy: boolean }[];
  systemState: HealthState;
  systemScore: number;
  suppressedFields: string[];
  unsafeClasses: string[];
  version: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HEALTH EVENT
// ═══════════════════════════════════════════════════════════════════════════════

export interface HealthEvent {
  timestamp: string;
  level: 'provider' | 'field' | 'class';
  entityId: string;
  previousState: HealthState;
  newState: HealthState;
  trigger: string;
  penalties: HealthPenalty[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// EPISTEMIC INTEGRITY — L1.4.1
// ═══════════════════════════════════════════════════════════════════════════════

export type IntegrityState =
  | 'I0_INTACT'
  | 'I1_MINOR_DRIFT'
  | 'I2_DEGRADED_PARITY'
  | 'I3_MATERIAL_MISMATCH'
  | 'I4_BROKEN'
  | 'I5_UNKNOWN';

export const INTEGRITY_STATE_LABELS: Record<IntegrityState, string> = {
  I0_INTACT: 'Intact — field identity, units, methodology, scope all verified',
  I1_MINOR_DRIFT: 'Minor drift — small parameter change, still same truth type',
  I2_DEGRADED_PARITY: 'Degraded parity — some dimensions drifted, usable with disclosure',
  I3_MATERIAL_MISMATCH: 'Material mismatch — methodology or scope changed, substitution-grade break',
  I4_BROKEN: 'Broken — field is no longer the same truth type, must suppress',
  I5_UNKNOWN: 'Unknown — cannot verify integrity, treat as unsafe',
};

export interface IntegrityDimension {
  dimension: string;
  expected: string;
  observed: string;
  intact: boolean;
  severity: number;
}

export interface FieldIntegrityRecord {
  fieldId: string;
  providerId: string;
  state: IntegrityState;
  dimensions: IntegrityDimension[];
  brokenDimensions: string[];
  integrityScore: number;
  version: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CLAIM PERMISSION — L1.4.1
// ═══════════════════════════════════════════════════════════════════════════════

export type ClaimPermission =
  | 'ALLOW_PRIMARY'
  | 'ALLOW_PRIMARY_WITH_DISCLOSURE'
  | 'ALLOW_PRIMARY_WITH_HAIRCUT'
  | 'ALLOW_SUBSTITUTE_FULL'
  | 'ALLOW_SUBSTITUTE_DEGRADED'
  | 'PARTIAL_VIEW_ONLY'
  | 'PRESERVE_CONTRADICTION'
  | 'SUPPRESS_CLAIM'
  | 'BLOCK_OUTPUT'
  | 'ESCALATE_INCIDENT';

export const CLAIM_PERMISSION_LABELS: Record<ClaimPermission, string> = {
  ALLOW_PRIMARY: 'Full authority — primary source healthy and intact',
  ALLOW_PRIMARY_WITH_DISCLOSURE: 'Primary usable but degradation must be disclosed',
  ALLOW_PRIMARY_WITH_HAIRCUT: 'Primary usable but confidence must be reduced',
  ALLOW_SUBSTITUTE_FULL: 'Legal substitute at equivalent semantic level',
  ALLOW_SUBSTITUTE_DEGRADED: 'Legal substitute at lower semantic level',
  PARTIAL_VIEW_ONLY: 'Some dimensions visible, cannot support full claim',
  PRESERVE_CONTRADICTION: 'Multiple sources disagree materially — preserve, do not resolve',
  SUPPRESS_CLAIM: 'Claim cannot be made — authority, integrity, or health insufficient',
  BLOCK_OUTPUT: 'Field output must not be rendered at all',
  ESCALATE_INCIDENT: 'Anomalous state requiring operator attention',
};

export const CLAIM_PERMISSION_SPEAKABLE: Record<ClaimPermission, boolean> = {
  ALLOW_PRIMARY: true,
  ALLOW_PRIMARY_WITH_DISCLOSURE: true,
  ALLOW_PRIMARY_WITH_HAIRCUT: true,
  ALLOW_SUBSTITUTE_FULL: true,
  ALLOW_SUBSTITUTE_DEGRADED: true,
  PARTIAL_VIEW_ONLY: true,
  PRESERVE_CONTRADICTION: true,
  SUPPRESS_CLAIM: false,
  BLOCK_OUTPUT: false,
  ESCALATE_INCIDENT: false,
};

export interface HealthDecisionRecord {
  fieldId: string;
  providerId: string;
  truthClass: TruthClass;

  healthState: HealthState;
  integrityState: IntegrityState;
  permissionState: ClaimPermission;
  recoveryState: RecoveryState;

  disclosureRequired: boolean;
  confidencePenalty: number;
  reasonCodes: string[];
  speakable: boolean;

  version: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// FIELD CRITICALITY — L1.4.1
// ═══════════════════════════════════════════════════════════════════════════════

export type FieldCriticality =
  | 'MISSION_CRITICAL'
  | 'THESIS_CRITICAL'
  | 'CONTEXTUAL'
  | 'ENRICHMENT_ONLY';

export const CRITICALITY_SUPPRESSION_WEIGHT: Record<FieldCriticality, number> = {
  MISSION_CRITICAL: 1.0,
  THESIS_CRITICAL: 0.7,
  CONTEXTUAL: 0.3,
  ENRICHMENT_ONLY: 0.1,
};

export interface FieldCriticalityEntry {
  fieldId: string;
  criticality: FieldCriticality;
  blastRadius: string[];
  suppressionAggressiveness: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// RECOVERY STATE — L1.4.1
// ═══════════════════════════════════════════════════════════════════════════════

export type RecoveryState =
  | 'STABLE'
  | 'RECOVERING_UNVERIFIED'
  | 'RECOVERING_PROBATION'
  | 'RECOVERED_LIMITED'
  | 'FULLY_RESTORED';

export const RECOVERY_STATE_LABELS: Record<RecoveryState, string> = {
  STABLE: 'Stable — no recent incident, full authority',
  RECOVERING_UNVERIFIED: 'Recovering — source returned but not yet verified',
  RECOVERING_PROBATION: 'Probation — source must prove N consecutive clean windows',
  RECOVERED_LIMITED: 'Limited recovery — some fields re-qualified, others still locked',
  FULLY_RESTORED: 'Fully restored — all fields re-qualified, recovery complete',
};

export const RECOVERY_TRUST_HAIRCUT: Record<RecoveryState, number> = {
  STABLE: 0,
  RECOVERING_UNVERIFIED: 0.40,
  RECOVERING_PROBATION: 0.25,
  RECOVERED_LIMITED: 0.10,
  FULLY_RESTORED: 0,
};

export interface RecoveryRecord {
  providerId: string;
  state: RecoveryState;
  incidentTimestamp: string | null;
  recoveryTimestamp: string | null;
  cleanWindowCount: number;
  requiredCleanWindows: number;
  trustHaircut: number;
  requalifiedFields: string[];
  lockedFields: string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// DIVERGENCE STATE — L1.4.2
// ═══════════════════════════════════════════════════════════════════════════════

export type DivergenceState =
  | 'COHERENT'
  | 'TOLERABLE'
  | 'MATERIAL'
  | 'CONTRADICTORY';

export const DIVERGENCE_CONFIDENCE_PENALTY: Record<DivergenceState, number> = {
  COHERENT: 0,
  TOLERABLE: 0.05,
  MATERIAL: 0.20,
  CONTRADICTORY: 0.40,
};

export interface DivergenceRecord {
  fieldId: string;
  sourceA: string;
  sourceB: string;
  state: DivergenceState;
  delta: number;
  toleranceBand: number;
  description: string;
}
