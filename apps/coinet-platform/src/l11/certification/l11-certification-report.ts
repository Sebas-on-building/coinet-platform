/**
 * L11.9 — Certification Report Helpers
 *
 * Helpers for assembling sublayer / band / invariant outcome
 * collections used by the master certification orchestrator. These
 * helpers do not run any certification themselves — they only shape
 * the result objects deterministically.
 */

import {
  L11CertificationBandResult,
  L11InvariantResult,
  L11RegressionResult,
  L11SublayerCertificationSummary,
} from '../contracts/l11-ratification-artifact';
import { L11SublayerId } from '../contracts/l11-layer-inventory';
import {
  L11CertificationBand,
  L11_CERTIFICATION_BAND_REGISTRY,
} from './l11-certification-band';

export function makeL11SublayerSummary(input: {
  sublayer: L11SublayerId;
  suite_id: string;
  assertions_passed: number;
  assertions_failed: number;
  invariants_held: number;
  invariants_failed: number;
  evidence?: string;
}): L11SublayerCertificationSummary {
  return {
    sublayer: input.sublayer,
    suite_id: input.suite_id,
    assertions_passed: input.assertions_passed,
    assertions_failed: input.assertions_failed,
    invariants_held: input.invariants_held,
    invariants_failed: input.invariants_failed,
    evidence: input.evidence ?? `${input.suite_id}: ` +
      `${input.assertions_passed} pass, ${input.assertions_failed} fail`,
  };
}

export function makeL11BandResult(input: {
  band: L11CertificationBand;
  passed: boolean;
  reason: string;
}): L11CertificationBandResult {
  const def = L11_CERTIFICATION_BAND_REGISTRY[input.band];
  return {
    band_id: input.band,
    title: def.title,
    passed: input.passed,
    reason: input.reason,
    source_sublayers: def.source_sublayers,
  };
}

export function makeL11InvariantResult(
  invariant_id: string,
  held: boolean,
  evidence: string,
): L11InvariantResult {
  return { invariant_id, held, evidence };
}

export function makeL11RegressionResult(
  suite_id: string,
  passed: number,
  failed: number,
): L11RegressionResult {
  return {
    suite_id,
    assertions_passed: passed,
    assertions_failed: failed,
  };
}

export function isL11SublayerSummaryGreen(
  s: L11SublayerCertificationSummary,
): boolean {
  return s.assertions_failed === 0 && s.invariants_failed === 0;
}

export function buildL11SublayerGreenMap(
  results: readonly L11SublayerCertificationSummary[],
): Readonly<Partial<Record<L11SublayerId, boolean>>> {
  const map: Partial<Record<L11SublayerId, boolean>> = {};
  for (const r of results) {
    map[r.sublayer] = isL11SublayerSummaryGreen(r);
  }
  return map;
}

export function buildL11BandGreenMap(
  results: readonly L11CertificationBandResult[],
): Readonly<Partial<Record<L11CertificationBand, boolean>>> {
  const map: Partial<Record<L11CertificationBand, boolean>> = {};
  for (const r of results) {
    map[r.band_id as L11CertificationBand] = r.passed;
  }
  return map;
}
