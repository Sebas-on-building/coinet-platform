/**
 * L1.3 — Redundancy & Substitution Matrix for BTC Quantum Loop
 *
 * Core doctrine: Do not chase completeness. Chase truth.
 *
 * Coinet must prefer missing truth over fabricated continuity.
 * A fallback is only valid if it preserves the meaning claim of the field
 * within declared confidence loss.
 */

export const L13_QR_VERSION = '1.0.0' as const;

export type SubstitutionClass =
  | 'A'   // Near-equivalent: recent cached primary
  | 'B'   // Equivalent secondary: verified secondary matching schema
  | 'C'   // Bounded modeled: carry-forward with widened uncertainty
  | 'D'   // Semantic distortion: FORBIDDEN — changes field meaning
  | 'E';  // No-fallback: field must become unresolved

export type FallbackStatus =
  | 'primary'
  | 'secondary'
  | 'cached_primary'
  | 'cached_secondary'
  | 'modeled'
  | 'unresolved'
  | 'blocked';

export type ResolutionDegradation =
  | 'healthy'
  | 'partial'
  | 'stale'
  | 'conflicting'
  | 'degraded'
  | 'unresolved';

export interface SourceResolutionRecord {
  fieldName: string;
  meaningClaim: string;
  primaryCandidate?: string;
  secondaryCandidate?: string;
  selectedSource?: string;
  substitutionClass: SubstitutionClass;
  fallbackStatus: FallbackStatus;
  confidencePenalty: number;
  degradationState: ResolutionDegradation;
  reason: string;
  observedAt?: string;
  verifiedAt?: string;
  schemaVersion?: string;
}

export interface FieldRedundancyRule {
  fieldName: string;
  meaningClaim: string;
  primarySource: string;
  secondarySource: string;
  acceptableSubstitutions: AcceptableSubstitution[];
  unacceptableSubstitutions: string[];
  noFallbackConditions: string[];
  maxCacheAgeMs: number;
  maxStaleCacheAgeMs: number;
  driftTolerancePct: number;
  confidencePenalties: Record<SubstitutionClass, number>;
  downstreamClaimRestrictions: string[];
}

export interface AcceptableSubstitution {
  description: string;
  class: SubstitutionClass;
  conditions: string[];
}

export interface FieldSourceCandidate {
  sourceId: string;
  data: unknown;
  observedAt: string;
  freshness: 'live' | 'recent_cache' | 'stale_cache' | 'expired';
  healthScore: number;
  schemaVersion: string;
}

export interface SubstitutionResult {
  resolution: SourceResolutionRecord;
  data: unknown;
  usable: boolean;
  claimRestrictions: string[];
}

export interface RedundancyDiagnostics {
  timestamp: string;
  resolutions: SourceResolutionRecord[];
  totalFields: number;
  healthy: number;
  substituted: number;
  unresolved: number;
  blocked: number;
  totalConfidencePenalty: number;
  forbiddenAttempts: number;
  claimRestrictions: string[];
  version: string;
}
