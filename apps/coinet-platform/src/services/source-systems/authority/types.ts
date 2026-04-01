/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     L1.2 SOURCE AUTHORITY HIERARCHY — TYPE SYSTEM                             ║
 * ║                                                                               ║
 * ║   Authority is not global by provider.                                       ║
 * ║   It is domain-scoped, claim-scoped, endpoint-scoped, and condition-scoped.  ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import type { TruthClass, SourceClass } from '../registry';

export type TruthAtomId = string;
export type SourceId = string;

export type AuthorityRole = 'PRIMARY' | 'SECONDARY' | 'CHALLENGER';
export type AuthorityStrength = 'ABSOLUTE' | 'HIGH' | 'MEDIUM' | 'WEAK';

export type AuthorityStatus =
  | 'HEALTHY'
  | 'PARTIAL'
  | 'DEGRADED'
  | 'STALE'
  | 'BLIND'
  | 'CONTESTED';

export type ResolutionOutcome =
  | 'PRIMARY_CONFIRMED'
  | 'PRIMARY_WITH_SECONDARY_SUPPORT'
  | 'PRIMARY_CONTESTED'
  | 'SECONDARY_SUBSTITUTED'
  | 'AUTHORITY_PARTIAL'
  | 'AUTHORITY_BLIND'
  | 'UNRESOLVED_CONFLICT';

export type ClaimAuthorityLevel = 'WEAK' | 'MEDIUM' | 'STRONG' | 'DECISIVE';

export interface AuthorityCondition {
  freshnessMaxMs?: number;
  supportedChains?: string[];
  assetClasses?: string[];
  tokenAgeBands?: ('fresh_launch' | 'early_stage' | 'established' | 'mature')[];
  endpointFamilies?: string[];
  requiredHealthScoreMin?: number;
  notes?: string[];
}

export interface TruthAtomDef {
  id: TruthAtomId;
  truthClass: TruthClass;
  name: string;
  description: string;
  metricType: 'numeric' | 'categorical' | 'boolean' | 'composite';
  refreshSensitivity: 'realtime' | 'fast' | 'scheduled' | 'slow';
}

export interface TruthAtomAuthorityRule {
  truthAtomId: TruthAtomId;
  sourceId: SourceId;
  role: AuthorityRole;
  strength: AuthorityStrength;
  conditions: AuthorityCondition;
  maySubstituteFor?: SourceId[];
  mayChallenge?: SourceId[];
  challengeType?: 'metric' | 'interpretation';
  overrideRequires?: SourceId[];
  notes: string[];
  version: string;
}

export interface ChallengerRule {
  challengerId: SourceId;
  challengerClass: TruthClass;
  targetAtomId: TruthAtomId;
  targetPrimaryId: SourceId;
  challengeType: 'metric' | 'interpretation';
  weakenStrength: number;
  description: string;
  triggerCondition: string;
}

export interface ClaimAuthorityRequirement {
  claimType: string;
  level: ClaimAuthorityLevel;
  requiredPrimaryHealthy: boolean;
  minimumDomainCount: number;
  requiredTruthClasses: TruthClass[];
  forbiddenBlindClasses?: TruthClass[];
  challengerMustBeClear: boolean;
  description: string;
}

export interface ResolvedAuthority {
  truthAtomId: TruthAtomId;
  outcome: ResolutionOutcome;
  activePrimary: SourceId | null;
  activeSecondary: SourceId | null;
  activeChallengers: SourceId[];
  contestedBy: SourceId[];
  strength: AuthorityStrength;
  status: AuthorityStatus;
  confidenceMultiplier: number;
  rationale: string[];
}

export interface AuthorityFingerprint {
  timestamp: string;
  entries: AuthorityFingerprintEntry[];
  contestedAtoms: string[];
  blindDomains: string[];
  substitutions: AuthoritySubstitutionEvent[];
  overallAuthorityScore: number;
  version: string;
}

export interface AuthorityFingerprintEntry {
  truthClass: TruthClass;
  status: AuthorityStatus;
  primarySource: SourceId | null;
  wasSubstituted: boolean;
  wasChallenged: boolean;
  strength: AuthorityStrength;
}

export interface AuthoritySubstitutionEvent {
  truthAtomId: TruthAtomId;
  originalPrimary: SourceId;
  substitutedWith: SourceId;
  reason: string;
}

export interface ProviderCapability {
  sourceId: SourceId;
  endpointFamily: string;
  truthAtoms: TruthAtomId[];
  authorityStrength: AuthorityStrength;
  supportedChains: string[];
  freshnessMs: number;
  notes: string[];
}

export const L12_AUTHORITY_VERSION = '1.0.0' as const;
