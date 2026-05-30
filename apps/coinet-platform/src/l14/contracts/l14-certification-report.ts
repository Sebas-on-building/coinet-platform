/**
 * L14.10 — Certification Level, Report, and Snapshot Contracts
 *
 * §14.10.24 / §14.10.25 / §14.10.26 / §14.10.27 / §14.10.45
 */

import {
  L14CertificationBand,
  L14ExternalRegressionRequirement,
  L14FinalInvariantId,
} from './l14-completion-standard';
import { L14SublayerId } from './l14-final-definition';

export enum L14CertificationLevel {
  NOT_CERTIFIED = 'NOT_CERTIFIED',
  SUBLAYER_GREEN = 'SUBLAYER_GREEN',
  PRODUCTION_GREEN = 'PRODUCTION_GREEN',
  ROLLOUT_READY = 'ROLLOUT_READY',
  FROZEN_LIVE = 'FROZEN_LIVE',
  ARCHITECTURE_COMPLETE = 'ARCHITECTURE_COMPLETE',
}

export interface L14SublayerCertificationSnapshot {
  readonly sublayer_id: L14SublayerId;
  readonly passed_assertions: number;
  readonly failed_assertions: number;
  readonly sublayer_green: boolean;
  readonly certification_script_ref: string;
  readonly fingerprint_ref?: string;
  readonly lineage_refs: readonly string[];
}

export interface L14BandCertificationSnapshot {
  readonly band: L14CertificationBand;
  readonly passed_assertions: number;
  readonly failed_assertions: number;
  readonly green: boolean;
  readonly blocking: boolean;
  readonly linked_sublayers: readonly L14SublayerId[];
  readonly lineage_refs: readonly string[];
}

export interface L14FinalInvariantResult {
  readonly invariant_id: L14FinalInvariantId;
  readonly holds: boolean;
  readonly blocking: boolean;
  readonly violation_codes: readonly string[];
  readonly subject_refs: readonly string[];
  readonly lineage_refs: readonly string[];
}

export interface L14ExternalRegressionSnapshot {
  readonly requirement: L14ExternalRegressionRequirement;
  readonly satisfied: boolean;
  readonly fingerprint_ref?: string;
  readonly note?: string;
}

export interface L14CertificationReport {
  readonly certification_report_id: string;
  readonly certification_level: L14CertificationLevel;
  readonly sublayer_results: readonly L14SublayerCertificationSnapshot[];
  readonly band_results: readonly L14BandCertificationSnapshot[];
  readonly invariant_results: readonly L14FinalInvariantResult[];
  readonly external_regression_results: readonly L14ExternalRegressionSnapshot[];
  readonly critical_breach_count: number;
  readonly error_count: number;
  readonly warning_count: number;
  readonly rollout_recommended: boolean;
  readonly freeze_activation_recommended: boolean;
  readonly architecture_completion_recommended: boolean;
  readonly final_combined_fingerprint: string;
  readonly lineage_refs: readonly string[];
  readonly replay_hash: string;
  readonly policy_version: string;
}
