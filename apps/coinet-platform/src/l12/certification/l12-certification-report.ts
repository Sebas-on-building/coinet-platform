/**
 * L12.7 — Certification Report (§12.7.6)
 *
 * Aggregated report of band / sublayer / invariant outcomes that the
 * master certification orchestrator emits alongside the ratification
 * artifact. Pure structure + pure builder helpers — no I/O.
 */

import {
  L12SublayerId,
} from '../contracts/l12-final-definition';
import {
  L12CertificationBand,
  L12_CERTIFICATION_BAND_REGISTRY,
} from './l12-certification-band';
import { L12CertificationLevel } from './l12-certification-level';

export const L12_CERTIFICATION_REPORT_POLICY_VERSION =
  'l12.7.cert-report.v1';

export interface L12SublayerCertificationResult {
  readonly sublayer: L12SublayerId;
  readonly suite_id: string;
  readonly assertions_passed: number;
  readonly assertions_failed: number;
  readonly invariants_held: number;
  readonly invariants_failed: number;
  readonly evidence: string;
}

export interface L12CertificationBandResult {
  readonly band_id: L12CertificationBand;
  readonly title: string;
  readonly passed: boolean;
  readonly reason: string;
  readonly source_sublayers: readonly L12SublayerId[];
}

export interface L12InvariantCertificationResult {
  readonly invariant_id: string;
  readonly held: boolean;
  readonly evidence: string;
}

/** §12.7.6 — full certification report. */
export interface L12CertificationReport {
  readonly certification_report_id: string;

  readonly layer_id: 'L12_SCENARIO_ENGINE';

  readonly certification_level: L12CertificationLevel;

  readonly band_results: readonly L12CertificationBandResult[];
  readonly sublayer_results:
    readonly L12SublayerCertificationResult[];
  readonly invariant_results:
    readonly L12InvariantCertificationResult[];

  readonly total_assertions: number;
  readonly passed_assertions: number;
  readonly failed_assertions: number;

  readonly critical_breach_count: number;
  readonly error_count: number;
  readonly warning_count: number;

  readonly prediction_theater_breach_count: number;
  readonly recommendation_leak_count: number;
  readonly final_judgment_leak_count: number;
  readonly lower_layer_rebuild_breach_count: number;

  readonly rollout_recommended: boolean;
  readonly freeze_recommended: boolean;

  readonly artifact_fingerprint_ref?: string;

  readonly generated_at: string;
  readonly policy_version: string;
  readonly replay_hash: string;
}

/** Construct a sublayer certification result. */
export function makeL12SublayerCertificationResult(input: {
  sublayer: L12SublayerId;
  suite_id: string;
  assertions_passed: number;
  assertions_failed: number;
  invariants_held: number;
  invariants_failed: number;
  evidence?: string;
}): L12SublayerCertificationResult {
  return {
    sublayer: input.sublayer,
    suite_id: input.suite_id,
    assertions_passed: input.assertions_passed,
    assertions_failed: input.assertions_failed,
    invariants_held: input.invariants_held,
    invariants_failed: input.invariants_failed,
    evidence: input.evidence ??
      `${input.suite_id}: ${input.assertions_passed} pass, ` +
      `${input.assertions_failed} fail`,
  };
}

export function makeL12CertificationBandResult(input: {
  band: L12CertificationBand;
  passed: boolean;
  reason: string;
}): L12CertificationBandResult {
  const def = L12_CERTIFICATION_BAND_REGISTRY[input.band];
  return {
    band_id: input.band,
    title: def.title,
    passed: input.passed,
    reason: input.reason,
    source_sublayers: def.source_sublayers,
  };
}

export function makeL12InvariantCertificationResult(
  invariant_id: string,
  held: boolean,
  evidence: string,
): L12InvariantCertificationResult {
  return { invariant_id, held, evidence };
}

export function isL12SublayerResultGreen(
  s: L12SublayerCertificationResult,
): boolean {
  return s.assertions_failed === 0 && s.invariants_failed === 0
    && s.assertions_passed > 0;
}

export function buildL12SublayerGreenMap(
  results: readonly L12SublayerCertificationResult[],
): Readonly<Partial<Record<L12SublayerId, boolean>>> {
  const map: Partial<Record<L12SublayerId, boolean>> = {};
  for (const r of results) {
    map[r.sublayer] = isL12SublayerResultGreen(r);
  }
  return map;
}

export function buildL12BandGreenMap(
  results: readonly L12CertificationBandResult[],
): Readonly<Partial<Record<L12CertificationBand, boolean>>> {
  const map: Partial<Record<L12CertificationBand, boolean>> = {};
  for (const r of results) {
    map[r.band_id] = r.passed;
  }
  return map;
}
