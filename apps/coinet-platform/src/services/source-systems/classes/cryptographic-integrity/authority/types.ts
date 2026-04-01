/**
 * L1.2 Cryptographic Integrity Authority System — Types
 */

import type { EvidenceMode } from '../types';

export type CryptoTruthDomain =
  | 'protocol_structure'
  | 'onchain_exposure'
  | 'pqc_readiness'
  | 'vulnerability_modeling'
  | 'dormant_supply'
  | 'governance_upgrade';

export type AuthorityLevel = 'primary' | 'secondary' | 'supporting' | 'speculative';

export type TrustClass =
  | 'verified'
  | 'audited'
  | 'official'
  | 'third_party'
  | 'heuristic'
  | 'modeled'
  | 'unknown';

export type SourceType =
  | 'deployed_reality'
  | 'onchain_observation'
  | 'code_repository'
  | 'specification'
  | 'proposal'
  | 'statement'
  | 'research'
  | 'inference'
  | 'security_report'
  | 'indexing_system'
  | 'governance_action';

export type ConflictType = 'none' | 'structural' | 'temporal' | 'interpretive';

export interface SourceAuthorityObject {
  source_id: string;
  source_type: SourceType;
  truth_domain: CryptoTruthDomain;
  authority_level: AuthorityLevel;
  trust_class: TrustClass;
  freshness: number;
  coverage: number;
  reliability_score: number;
  last_updated: string;
  conflict_history: Array<{ timestamp: string; conflict_type: ConflictType; field_id: string }>;
}

export interface FieldAttribution {
  source_origin: string[];
  authority_level: AuthorityLevel;
  trust_class: TrustClass;
  evidence_mode: EvidenceMode;
  confidence: number;
}

export interface AuthorityClaim {
  field_id: string;
  source_id: string;
  value: unknown;
  observed_at?: string;
  evidence_mode?: EvidenceMode;
  confidence_hint?: number;
}

export interface ConfidenceComposition {
  authority_component: number;
  agreement_component: number;
  freshness_component: number;
  coverage_component: number;
  trust_component: number;
  final_confidence: number;
}

export type ConsensusState = 'single_source' | 'consensus' | 'disagreement' | 'no_sources';

export interface FieldAuthorityResolution {
  field_id: string;
  truth_domain: CryptoTruthDomain;
  selected_source: string | null;
  selected_authority_level: AuthorityLevel | null;
  selected_trust_class: TrustClass | null;
  used_fallback: boolean;
  fallback_reason: string | null;
  degradation_flag: boolean;
  conflict_type: ConflictType;
  consensus_state: ConsensusState;
  prohibit_strong_inference: boolean;
  override_applied: string | null;
  conflicts: Array<{
    source_id: string;
    authority_level: AuthorityLevel;
    value_preview: string;
    reason: string;
  }>;
  candidate_sources: string[];
  confidence: ConfidenceComposition;
  attribution: FieldAttribution | null;
  rationale: string[];
}

export interface CIAuthorityMetrics {
  authority_distribution_by_domain: Record<CryptoTruthDomain, Record<AuthorityLevel, number>>;
  fallback_rate: number;
  conflict_rate: number;
  agreement_ratio: number;
  stale_primary_rate: number;
  unresolved_field_rate: number;
  authority_drift_over_time: number;
}

export interface CIAuthorityAlert {
  severity: 'info' | 'warning' | 'critical';
  category: string;
  message: string;
}

export interface CIAuthorityDiagnosticsReport {
  version: string;
  timestamp: string;
  entity_id: string;
  resolutions: FieldAuthorityResolution[];
  metrics: CIAuthorityMetrics;
  alerts: CIAuthorityAlert[];
  logs: Array<{
    timestamp: string;
    field_id: string;
    event: 'source_selected' | 'conflict_detected' | 'fallback_used' | 'authority_override' | 'degradation_triggered';
    details: string;
  }>;
}

export const CI_AUTHORITY_VERSION = '1.0.0' as const;
