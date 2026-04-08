/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     L1.1 SOURCE CLASS DOCTRINE — TYPE SYSTEM                                  ║
 * ║                                                                               ║
 * ║   No source enters the system as "data."                                     ║
 * ║   Every source enters as a bounded observer of one type of market reality.   ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import type { TruthClass, SourceClass } from '../registry';

export type ClaimStrength = 'weak' | 'medium' | 'strong';
export type FreshnessProfile = 'realtime' | 'fast' | 'scheduled' | 'slow';
export type DegradationImpact = 'low' | 'medium' | 'high' | 'critical';
export type ClassVisibility = 'healthy' | 'partial' | 'degraded' | 'stale_dominant' | 'blind';
export type TensionDirection = 'stronger' | 'weaker' | 'neutral';
export type CadenceRange = 'seconds' | 'seconds_to_minutes' | 'near_realtime' | 'minutes' | 'minutes_to_hours' | 'block_time_to_minutes' | 'event_driven' | 'on_demand' | 'slower_than_chain';

export interface ClassClaimRight {
  claim: string;
  maxStrengthAlone: ClaimStrength;
  requiredCompanions?: TruthClass[];
  notes?: string;
}

export interface ClassForbiddenClaim {
  claim: string;
  reason: string;
}

export interface FullSourceClassDoctrine {
  id: TruthClass;
  sourceClass: SourceClass;
  name: string;
  purpose: string;
  observes: string[];
  primaryEntities: string[];
  canonicalMetricFamilies: string[];
  allowedClaims: ClassClaimRight[];
  forbiddenClaims: ClassForbiddenClaim[];
  requiredCompanionsForStrongClaims: TruthClass[];
  typicalFreshnessProfile: FreshnessProfile;
  degradationImpact: DegradationImpact;
  downstreamConsumers: string[];
  cadence: CadenceRange;
  failureMode: string;
  productionRule: string;
  version: string;
}

export type InteractionType = 'supports' | 'contradicts' | 'independent' | 'escalates';

export interface ClassInteraction {
  from: TruthClass;
  to: TruthClass;
  type: InteractionType;
  description: string;
  tensionSignal?: string;
}

export interface ClassCoverageEntry {
  truthClass: TruthClass;
  visibility: ClassVisibility;
  providerCount: number;
  configuredCount: number;
  healthScore: number;
  staleness: number;
}

export interface CrossClassTension {
  label: string;
  classA: TruthClass;
  classB: TruthClass;
  direction: TensionDirection;
  magnitude: number;
  interpretation: string;
}

export interface ClaimEscalationRule {
  claimType: string;
  minimumStrength: ClaimStrength;
  requiredClasses: TruthClass[];
  minimumClassCount: number;
  description: string;
}

export interface TruthFingerprint {
  timestamp: string;
  entries: TruthFingerprintEntry[];
  blindSpots: string[];
  tensionSummary: string[];
  overallCoverage: number;
}

export interface TruthFingerprintEntry {
  truthClass: TruthClass;
  visibility: ClassVisibility;
  strength: number;
  authorityLevel: 'high' | 'medium' | 'low' | 'absent';
}

export const L11_DOCTRINE_VERSION = '1.0.0' as const;
