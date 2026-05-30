/**
 * L13.12 — Master Certification Runner
 *
 * §13.12.8 / §13.12.9 — Aggregates per-sublayer assertion counts
 * (from L13.1–L13.11 cert scripts), computes band results,
 * runs the final invariants, and emits an `L13CertificationReport`.
 *
 * The cert script wires real assertion counts; this module is the
 * pure pipeline that builds the report from those counts.
 */

import {
  L13_BAND_BY_SUBLAYER,
  L13CertificationLevel,
  type L13CertificationBand,
  type L13FinalInvariantId,
  type L13SublayerId,
} from '../contracts/l13-final-definition';
import type {
  L13CertificationBandResult,
  L13CertificationReport,
  L13FinalInvariantResult,
  L13SublayerCertificationResult,
} from '../contracts/l13-certification-report';
import { fnv1a } from '../context/_fnv1a';

const POLICY_V = 'l13.final.v1';

export interface L13SublayerAssertionTally {
  readonly sublayer_id: L13SublayerId;
  readonly assertion_count: number;
  readonly passed: number;
  readonly failed: number;
}

export interface L13MasterCertificationInput {
  readonly tallies: readonly L13SublayerAssertionTally[];
  readonly final_invariants: readonly L13FinalInvariantResult[];
  readonly critical_violation_count: number;
  readonly rollout_blocking_regression_count: number;
  readonly lineage_refs?: readonly string[];
}

function fingerprintTally(t: L13SublayerAssertionTally): string {
  return fnv1a(
    [
      t.sublayer_id,
      String(t.assertion_count),
      String(t.passed),
      String(t.failed),
    ].join('|'),
  );
}

export function runL13MasterCertification(
  input: L13MasterCertificationInput,
): L13CertificationReport {
  const lineage = input.lineage_refs ?? ['l13.final.lineage'];
  const sublayer_results: L13SublayerCertificationResult[] = input.tallies.map(
    t => ({
      sublayer_id: t.sublayer_id,
      assertion_count: t.assertion_count,
      passed: t.passed,
      failed: t.failed,
      green: t.failed === 0 && t.passed > 0,
      fingerprint: fingerprintTally(t),
    }),
  );
  const band_results: L13CertificationBandResult[] = sublayer_results.map(
    s => ({
      band: L13_BAND_BY_SUBLAYER[s.sublayer_id] as L13CertificationBand,
      sublayer_id: s.sublayer_id,
      green: s.green,
      assertion_count: s.assertion_count,
      failed: s.failed,
      fingerprint: s.fingerprint,
    }),
  );

  const all_sublayers_green = sublayer_results.every(s => s.green);
  const all_bands_green = band_results.every(b => b.green);
  const all_final_invariants_green = input.final_invariants.every(
    i => i.holds,
  );

  const rollout_recommended =
    all_sublayers_green &&
    all_bands_green &&
    all_final_invariants_green &&
    input.critical_violation_count === 0 &&
    input.rollout_blocking_regression_count === 0;

  const freeze_recommended = rollout_recommended;
  const l14_handoff_recommended = rollout_recommended;

  let level: L13CertificationLevel;
  if (!all_sublayers_green) {
    level = sublayer_results.some(s => s.green)
      ? L13CertificationLevel.SUBLAYERS_PARTIAL
      : L13CertificationLevel.INCOMPLETE;
  } else if (!all_bands_green || !all_final_invariants_green) {
    level = L13CertificationLevel.SUBLAYERS_GREEN;
  } else if (rollout_recommended) {
    level = L13CertificationLevel.FROZEN_LIVE;
  } else {
    level = L13CertificationLevel.PRODUCTION_GREEN;
  }

  const combined_fingerprint = fnv1a(
    [
      ...sublayer_results.map(s => s.fingerprint),
      ...input.final_invariants.map(i => `${i.invariant_id}:${String(i.holds)}`),
      String(input.critical_violation_count),
      String(input.rollout_blocking_regression_count),
      level,
      POLICY_V,
    ].join('|'),
  );

  const replayHash = fnv1a(
    [
      combined_fingerprint,
      String(all_sublayers_green),
      String(all_bands_green),
      String(all_final_invariants_green),
      String(rollout_recommended),
      POLICY_V,
    ].join('|'),
  );

  return {
    certification_report_id: `l13.cert.report.${replayHash}`,
    certification_level: level,
    band_results,
    sublayer_results,
    final_invariant_results: input.final_invariants,
    all_sublayers_green,
    all_bands_green,
    all_final_invariants_green,
    critical_violation_count: input.critical_violation_count,
    rollout_blocking_regression_count: input.rollout_blocking_regression_count,
    rollout_recommended,
    freeze_recommended,
    l14_handoff_recommended,
    combined_fingerprint,
    policy_version: POLICY_V,
    lineage_refs: lineage,
    replay_hash: replayHash,
  };
}
