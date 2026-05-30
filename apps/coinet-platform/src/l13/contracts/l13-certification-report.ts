/**
 * L13.12 — Certification Report Contract
 *
 * §13.12.7 — Output of the master certification runner.
 */

import type {
  L13CertificationBand,
  L13CertificationLevel,
  L13FinalInvariantId,
  L13SublayerId,
} from './l13-final-definition';

export interface L13SublayerCertificationResult {
  readonly sublayer_id: L13SublayerId;
  readonly assertion_count: number;
  readonly passed: number;
  readonly failed: number;
  readonly green: boolean;
  readonly fingerprint: string;
}

export interface L13CertificationBandResult {
  readonly band: L13CertificationBand;
  readonly sublayer_id: L13SublayerId;
  readonly green: boolean;
  readonly assertion_count: number;
  readonly failed: number;
  readonly fingerprint: string;
}

export interface L13FinalInvariantResult {
  readonly invariant_id: L13FinalInvariantId;
  readonly holds: boolean;
  readonly evidence: string;
}

export interface L13CertificationReport {
  readonly certification_report_id: string;
  readonly certification_level: L13CertificationLevel;
  readonly band_results: readonly L13CertificationBandResult[];
  readonly sublayer_results: readonly L13SublayerCertificationResult[];
  readonly final_invariant_results: readonly L13FinalInvariantResult[];
  readonly all_sublayers_green: boolean;
  readonly all_bands_green: boolean;
  readonly all_final_invariants_green: boolean;
  readonly critical_violation_count: number;
  readonly rollout_blocking_regression_count: number;
  readonly rollout_recommended: boolean;
  readonly freeze_recommended: boolean;
  readonly l14_handoff_recommended: boolean;
  readonly combined_fingerprint: string;
  readonly policy_version: string;
  readonly lineage_refs: readonly string[];
  readonly replay_hash: string;
}
