/**
 * L1.6 Source Degradation Semantics — Type System
 *
 * L1.2 decides who owns truth.
 * L1.3 decides what may legally substitute.
 * L1.4 decides what is still speakable.
 * L1.5 decides what happens when valid truths collide.
 * L1.6 translates every loss of truth into constrained product behavior.
 *
 * Core doctrine: A degradation event is not a warning.
 * It is a constitutional downgrade of Coinet's epistemic rights.
 * If degradation does not alter actual behavior, it is fake.
 */

import type { TruthClass } from '../registry';
import type { HealthState, IntegrityState, ClaimPermission, RecoveryState, FieldCriticality } from './health-types';
import type { ConflictOutcome, BlockerClass } from './conflict-types';

export const L16_PLATFORM_VERSION = '1.0.0' as const;

// ═══════════════════════════════════════════════════════════════════════════════
// DEGRADATION LEVELS
// ═══════════════════════════════════════════════════════════════════════════════

export type DegradationLevel =
  | 'D0_NORMAL'
  | 'D1_REDUCED_CONFIDENCE'
  | 'D2_PARTIAL_BLINDNESS'
  | 'D3_DOMAIN_DEGRADATION'
  | 'D4_EPISTEMIC_LOCK';

export const DEGRADATION_RANK: Record<DegradationLevel, number> = {
  D0_NORMAL: 0,
  D1_REDUCED_CONFIDENCE: 1,
  D2_PARTIAL_BLINDNESS: 2,
  D3_DOMAIN_DEGRADATION: 3,
  D4_EPISTEMIC_LOCK: 4,
};

export const DEGRADATION_LABELS: Record<DegradationLevel, string> = {
  D0_NORMAL: 'Normal',
  D1_REDUCED_CONFIDENCE: 'Reduced confidence',
  D2_PARTIAL_BLINDNESS: 'Partial visibility',
  D3_DOMAIN_DEGRADATION: 'Domain degraded',
  D4_EPISTEMIC_LOCK: 'Claim locked',
};

// ═══════════════════════════════════════════════════════════════════════════════
// TRUTH STATE DISTINCTION
// ═══════════════════════════════════════════════════════════════════════════════

export type TruthState =
  | 'FULL_TRUTH'
  | 'DEGRADED_TRUTH'
  | 'ABSENT_TRUTH'
  | 'PROHIBITED_TRUTH';

export const TRUTH_STATE_TO_LEVEL: Record<TruthState, DegradationLevel> = {
  FULL_TRUTH: 'D0_NORMAL',
  DEGRADED_TRUTH: 'D1_REDUCED_CONFIDENCE',
  ABSENT_TRUTH: 'D3_DOMAIN_DEGRADATION',
  PROHIBITED_TRUTH: 'D4_EPISTEMIC_LOCK',
};

// ═══════════════════════════════════════════════════════════════════════════════
// VISIBILITY LOSS
// ═══════════════════════════════════════════════════════════════════════════════

export type VisibilityLoss =
  | 'NONE'
  | 'FIELD_PARTIAL'
  | 'FIELD_TOTAL'
  | 'CLASS_PARTIAL'
  | 'CLASS_DIRECTIONAL_LOSS'
  | 'DOMAIN_UNSPEAKABLE';

// ═══════════════════════════════════════════════════════════════════════════════
// DOWNSTREAM COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

export type DownstreamComponent =
  | 'CONFIDENCE_BANDS'
  | 'SCENARIO_ENGINE'
  | 'CONTRADICTION_ENGINE'
  | 'JUDGMENT_LAYER'
  | 'CHAT_SYSTEM'
  | 'UI_BADGES'
  | 'SCORE_OUTPUT'
  | 'AUDIT_LOG'
  | 'ALERTS'
  | 'EXPLANATION_LAYER';

// ═══════════════════════════════════════════════════════════════════════════════
// DEGRADATION INPUT — what feeds into the evaluator from L1.2–L1.5
// ═══════════════════════════════════════════════════════════════════════════════

export interface DegradationInput {
  classId: TruthClass;
  fieldStates: FieldDegradationInput[];
  substitutionBlindCount: number;
  substitutionDegradedCount: number;
  noFallbackTriggered: boolean;
  conflictContradictionsPreserved: number;
  conflictBlockersActive: number;
  conflictUnresolved: number;
}

export interface FieldDegradationInput {
  fieldId: string;
  healthState: HealthState;
  integrityState: IntegrityState;
  permissionState: ClaimPermission;
  recoveryState: RecoveryState;
  criticality: FieldCriticality;
  isMissionCritical: boolean;
  isThesisCritical: boolean;
  conflictOutcome?: ConflictOutcome;
  blockerClass?: BlockerClass;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DEGRADATION ASSESSMENT — the core output
// ═══════════════════════════════════════════════════════════════════════════════

export interface DegradationAssessment {
  classId: TruthClass;
  level: DegradationLevel;
  visibilityLoss: VisibilityLoss;
  truthState: TruthState;
  confidencePenalty: number;
  directionalClaimsAllowed: boolean;
  blockedDownstream: DownstreamComponent[];
  permissionChanges: string[];
  userDisclosure: string;
  auditCode: string;
  reasonCodes: string[];
  affectedFields: string[];
  version: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DISCLOSURE TEMPLATES
// ═══════════════════════════════════════════════════════════════════════════════

export const DISCLOSURE_TEMPLATES: Record<string, Record<DegradationLevel, string>> = {
  market_surface: {
    D0_NORMAL: '',
    D1_REDUCED_CONFIDENCE: 'Market surface data slightly delayed. Price claims carry reduced precision.',
    D2_PARTIAL_BLINDNESS: 'Market surface partially degraded. Some market features unavailable.',
    D3_DOMAIN_DEGRADATION: 'Market surface unreliable for directional inference. Price-led confirmations suspended.',
    D4_EPISTEMIC_LOCK: 'Canonical spot price unspeakable. Directional output blocked.',
  },
  dex_emergence: {
    D0_NORMAL: '',
    D1_REDUCED_CONFIDENCE: 'DEX discovery slightly lagging. Emergence recall weakened.',
    D2_PARTIAL_BLINDNESS: 'DEX pool liquidity exactness unavailable. Structure incomplete.',
    D3_DOMAIN_DEGRADATION: 'DEX emergence class no longer safe for early-phase thesis.',
    D4_EPISTEMIC_LOCK: 'Exact pool truth cannot be claimed.',
  },
  derivatives_pressure: {
    D0_NORMAL: '',
    D1_REDUCED_CONFIDENCE: 'Derivatives visibility slightly degraded. Claims carry reduced certainty.',
    D2_PARTIAL_BLINDNESS: 'Derivatives partially degraded. Leverage picture incomplete.',
    D3_DOMAIN_DEGRADATION: 'Derivatives domain no longer safe for crowding or fragility claims.',
    D4_EPISTEMIC_LOCK: 'Canonical derivatives truth blocked.',
  },
  protocol_substance: {
    D0_NORMAL: '',
    D1_REDUCED_CONFIDENCE: 'Protocol substance data lagging. Fundamentals carry reduced cadence certainty.',
    D2_PARTIAL_BLINDNESS: 'Protocol substance partially degraded. Some metrics suppressed.',
    D3_DOMAIN_DEGRADATION: 'Protocol fundamentals no longer safe for thesis-strength claims.',
    D4_EPISTEMIC_LOCK: 'Protocol substance verdict blocked.',
  },
  onchain_behavior: {
    D0_NORMAL: '',
    D1_REDUCED_CONFIDENCE: 'On-chain visibility slightly delayed. Transfer truth carries minor lag.',
    D2_PARTIAL_BLINDNESS: 'On-chain visibility degraded. Wallet flow interpretation weakened.',
    D3_DOMAIN_DEGRADATION: 'On-chain domain no longer safe for accumulation or distribution thesis use.',
    D4_EPISTEMIC_LOCK: 'Raw on-chain fact unspeakable.',
  },
  structural_safety: {
    D0_NORMAL: '',
    D1_REDUCED_CONFIDENCE: 'Some safety checks stale. Broad structural visibility intact.',
    D2_PARTIAL_BLINDNESS: 'Structural safety view partial. Safety verdict weakened — caution required.',
    D3_DOMAIN_DEGRADATION: 'Safety domain incomplete. Cannot support positive safety claim.',
    D4_EPISTEMIC_LOCK: 'Structural safety verdict withheld entirely.',
  },
  narrative_attention: {
    D0_NORMAL: '',
    D1_REDUCED_CONFIDENCE: 'One narrative attention surface degraded. Narrative still usable with caveat.',
    D2_PARTIAL_BLINDNESS: 'Narrative attention degraded. Social present but event confirmation weak.',
    D3_DOMAIN_DEGRADATION: 'Narrative domain no longer safe for thesis confirmation.',
    D4_EPISTEMIC_LOCK: 'Narrative truth suppressed.',
  },
  entity_context: {
    D0_NORMAL: '',
    D1_REDUCED_CONFIDENCE: 'Mild label uncertainty. Entity attribution carries reduced confidence.',
    D2_PARTIAL_BLINDNESS: 'Entity attribution contested on contextual entities. Partial blindness.',
    D3_DOMAIN_DEGRADATION: 'Entity context no longer safe for thesis-bearing identity claims.',
    D4_EPISTEMIC_LOCK: 'Identity claim locked. Only "unknown" or "contested" allowed.',
  },
  reasoning_expression: {
    D0_NORMAL: '',
    D1_REDUCED_CONFIDENCE: 'Reasoning constrained. Disclosure expanded, tone tempered.',
    D2_PARTIAL_BLINDNESS: 'Explanation simplified. More abstention language required.',
    D3_DOMAIN_DEGRADATION: 'Model may describe degraded state but not synthesize confident thesis.',
    D4_EPISTEMIC_LOCK: 'Output blocked or abstention notice only.',
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// DOMAIN CLAIM RESTRICTIONS
// ═══════════════════════════════════════════════════════════════════════════════

export interface DomainClaimRestriction {
  classId: TruthClass;
  level: DegradationLevel;
  directionalClaimsAllowed: boolean;
  thesisUseAllowed: boolean;
  scenarioConfirmationAllowed: boolean;
  scoringAllowed: boolean;
  chatMentionAllowed: boolean;
  chatCaveatRequired: boolean;
}

export const CLAIM_RESTRICTIONS: Record<DegradationLevel, Omit<DomainClaimRestriction, 'classId' | 'level'>> = {
  D0_NORMAL: {
    directionalClaimsAllowed: true, thesisUseAllowed: true,
    scenarioConfirmationAllowed: true, scoringAllowed: true,
    chatMentionAllowed: true, chatCaveatRequired: false,
  },
  D1_REDUCED_CONFIDENCE: {
    directionalClaimsAllowed: true, thesisUseAllowed: true,
    scenarioConfirmationAllowed: true, scoringAllowed: true,
    chatMentionAllowed: true, chatCaveatRequired: true,
  },
  D2_PARTIAL_BLINDNESS: {
    directionalClaimsAllowed: true, thesisUseAllowed: true,
    scenarioConfirmationAllowed: true, scoringAllowed: false,
    chatMentionAllowed: true, chatCaveatRequired: true,
  },
  D3_DOMAIN_DEGRADATION: {
    directionalClaimsAllowed: false, thesisUseAllowed: false,
    scenarioConfirmationAllowed: false, scoringAllowed: false,
    chatMentionAllowed: true, chatCaveatRequired: true,
  },
  D4_EPISTEMIC_LOCK: {
    directionalClaimsAllowed: false, thesisUseAllowed: false,
    scenarioConfirmationAllowed: false, scoringAllowed: false,
    chatMentionAllowed: false, chatCaveatRequired: true,
  },
};

export function getClaimRestrictions(level: DegradationLevel): Omit<DomainClaimRestriction, 'classId' | 'level'> {
  return CLAIM_RESTRICTIONS[level];
}

// ═══════════════════════════════════════════════════════════════════════════════
// DOWNSTREAM BLOCK MAP — what components get blocked per level
// ═══════════════════════════════════════════════════════════════════════════════

export const DOWNSTREAM_BLOCKS: Record<DegradationLevel, DownstreamComponent[]> = {
  D0_NORMAL: [],
  D1_REDUCED_CONFIDENCE: ['CONFIDENCE_BANDS'],
  D2_PARTIAL_BLINDNESS: ['CONFIDENCE_BANDS', 'SCORE_OUTPUT'],
  D3_DOMAIN_DEGRADATION: ['CONFIDENCE_BANDS', 'SCENARIO_ENGINE', 'JUDGMENT_LAYER', 'SCORE_OUTPUT'],
  D4_EPISTEMIC_LOCK: ['CONFIDENCE_BANDS', 'SCENARIO_ENGINE', 'CONTRADICTION_ENGINE', 'JUDGMENT_LAYER', 'CHAT_SYSTEM', 'SCORE_OUTPUT', 'EXPLANATION_LAYER'],
};

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIDENCE PENALTY BANDS
// ═══════════════════════════════════════════════════════════════════════════════

export const CONFIDENCE_PENALTY_RANGE: Record<DegradationLevel, [number, number]> = {
  D0_NORMAL: [0, 0],
  D1_REDUCED_CONFIDENCE: [0.03, 0.12],
  D2_PARTIAL_BLINDNESS: [0.12, 0.25],
  D3_DOMAIN_DEGRADATION: [0.25, 0.50],
  D4_EPISTEMIC_LOCK: [0.50, 1.0],
};
