/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     L1.3 REDUNDANCY & SUBSTITUTION MATRIX — TYPE SYSTEM                       ║
 * ║                                                                               ║
 * ║   Substitution is not about keeping the UI alive.                            ║
 * ║   It is about preserving as much truth as possible without lying about       ║
 * ║   what has been lost.                                                        ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import type { TruthClass } from '../registry';

export type SubstitutionMode =
  | 'SAME_AUTHORITY'
  | 'LOWER_AUTHORITY_SAME_TRUTH'
  | 'ADJACENT_TRUTH_CONTINUITY'
  | 'TEMPORAL_FALLBACK'
  | 'NO_FALLBACK';

export type SubstitutionStatus =
  | 'PRIMARY_HEALTHY'
  | 'SECONDARY_SUBSTITUTED'
  | 'TEMPORAL_FALLBACK_ACTIVE'
  | 'ADJACENT_CONTINUITY_ONLY'
  | 'BLIND'
  | 'LOCKED_OUT';

export type ClaimRightsPenalty = 'none' | 'low' | 'medium' | 'high' | 'critical';
export type BlindSpotSeverity = 'low' | 'medium' | 'high' | 'critical';
export type EscalationLevel = 'degraded' | 'partial_blind' | 'judgment_unsafe';

export interface AcceptableSubstitution {
  sourceId: string;
  mode: SubstitutionMode;
  maxFreshnessMs?: number;
  authorityPenalty: number;
  confidencePenalty: number;
  claimRightsPenalty: ClaimRightsPenalty;
  notes: string[];
}

export interface UnacceptableSubstitution {
  sourceIdOrClass: string;
  reason: string;
}

export interface TemporalFallbackPolicy {
  allowed: boolean;
  maxAgeMs: number;
  allowedClaimStrength: 'weak' | 'medium';
  notes: string[];
}

export interface TruthAtomRedundancyRule {
  truthAtomId: string;
  truthClass: TruthClass;
  primarySourceId: string;
  secondarySourceIds: string[];
  acceptableSubstitutions: AcceptableSubstitution[];
  unacceptableSubstitutions: UnacceptableSubstitution[];
  temporalFallback: TemporalFallbackPolicy;
  noFallbackClaimFamilies: string[];
  blindSpotSeverity: BlindSpotSeverity;
  failMode: 'fail_soft' | 'fail_stop';
  version: string;
}

export interface SubstitutionPenalty {
  authorityPenalty: number;
  freshnessPenalty: number;
  scopePenalty: number;
  confidencePenalty: number;
  claimRightsPenalty: ClaimRightsPenalty;
  totalConfidenceReduction: number;
}

export interface ClaimLockout {
  claimFamily: string;
  lockedStrengths: ('medium' | 'strong' | 'decisive')[];
  reason: string;
  triggerAtoms: string[];
}

export interface ResolvedSubstitution {
  truthAtomId: string;
  status: SubstitutionStatus;
  activeSourceId: string | null;
  mode: SubstitutionMode;
  penalty: SubstitutionPenalty;
  lockedOutClaims: string[];
  rationale: string[];
  staleSinceMs?: number;
}

export interface SubstitutionEvent {
  timestamp: string;
  truthAtomId: string;
  fromSource: string;
  toSource: string | null;
  mode: SubstitutionMode;
  reason: string;
}

export interface BlindSpotEscalation {
  level: EscalationLevel;
  blindAtoms: string[];
  blindClasses: TruthClass[];
  affectedClaimFamilies: string[];
  compoundSeverity: number;
  message: string;
}

export interface SubstitutionFingerprint {
  timestamp: string;
  entries: SubstitutionFingerprintEntry[];
  totalSubstitutions: number;
  totalBlind: number;
  lockedOutClaims: string[];
  escalation: BlindSpotEscalation | null;
  overallIntegrity: number;
  version: string;
}

export interface SubstitutionFingerprintEntry {
  truthAtomId: string;
  truthClass: TruthClass;
  status: SubstitutionStatus;
  mode: SubstitutionMode;
  activeSource: string | null;
  confidencePenalty: number;
}

export const L13_REDUNDANCY_VERSION = '1.0.0' as const;
