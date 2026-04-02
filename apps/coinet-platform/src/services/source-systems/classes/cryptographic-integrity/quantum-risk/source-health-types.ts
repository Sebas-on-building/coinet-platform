/**
 * L1.4 — Source Health & Quality Scoring for BTC Quantum Loop
 *
 * Core doctrine: Do not score sources to feel precise.
 * Score sources to control what the system is allowed to believe.
 */

export const L14_QR_VERSION = '1.0.0' as const;

export type TrustClass =
  | 'verified_chain_data'
  | 'official_protocol_evidence'
  | 'trusted_external_analytics'
  | 'verified_cached_snapshot'
  | 'modeled_estimate'
  | 'heuristic_inference'
  | 'narrative_claim'
  | 'llm_generated';

export type HealthBand =
  | 'healthy'    // >= 0.85
  | 'usable'     // 0.70–0.85
  | 'weak'       // 0.50–0.70
  | 'degraded'   // 0.25–0.50
  | 'unusable';  // < 0.25

export type FreshnessBand =
  | 'optimal'
  | 'acceptable'
  | 'degraded'
  | 'unresolved';

export interface FreshnessPolicy {
  fieldName: string;
  optimalMs: number;
  acceptableMs: number;
  degradedMs: number;
  unresolvedMs: number;
}

export interface PayloadValidationResult {
  score: number;
  issues: string[];
  severity: 'none' | 'minor' | 'major' | 'critical';
}

export interface SourceHealthRecord {
  sourceId: string;
  fieldName: string;
  truthDomain: 'cryptographic_integrity';
  trustClass: TrustClass;
  availabilityScore: number;
  freshnessScore: number;
  payloadValidityScore: number;
  historicalReliabilityScore: number;
  compositeHealthScore: number;
  trustClassModifier: number;
  sourceUsabilityScore: number;
  healthBand: HealthBand;
  freshnessBand: FreshnessBand;
  observedAt?: string;
  verifiedAt?: string;
  freshnessPolicyVersion: string;
  payloadSchemaVersion?: string;
  reasonSummary: string[];
}

export interface ReliabilityMemoryEntry {
  sourceId: string;
  timestamp: number;
  success: boolean;
  schemaValid: boolean;
  conflicted: boolean;
  corrected: boolean;
}

export interface HistoricalReliabilitySnapshot {
  sourceId: string;
  windowSize: number;
  entries: number;
  successRate: number;
  schemaStability: number;
  lowConflictRate: number;
  freshnessConsistency: number;
  correctionCleanliness: number;
  compositeReliability: number;
}

export interface SourceHealthDiagnostics {
  timestamp: string;
  records: SourceHealthRecord[];
  totalFields: number;
  healthy: number;
  usable: number;
  weak: number;
  degraded: number;
  unusable: number;
  avgUsability: number;
  lowestUsability: { field: string; score: number } | null;
  claimRestrictions: string[];
  version: string;
}
