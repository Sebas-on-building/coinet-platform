/**
 * L11.9 — Certification Band Runner
 *
 * Pure aggregator that, given per-sublayer green flags, decides
 * whether each certification band passes. It does NOT re-run the
 * underlying suites; the master orchestrator feeds it the
 * already-computed sublayer summaries and band-specific evidence.
 */

import { L11SublayerId } from '../contracts/l11-layer-inventory';
import {
  L11CertificationBand,
  L11_CERTIFICATION_BAND_REGISTRY,
  ALL_L11_CERTIFICATION_BANDS,
} from './l11-certification-band';
import {
  L11CertificationBandResult,
} from '../contracts/l11-ratification-artifact';
import { makeL11BandResult } from './l11-certification-report';

export interface L11BandRunnerInput {
  readonly sublayer_green: Readonly<Partial<Record<L11SublayerId, boolean>>>;

  readonly l10_master_green: boolean;
  readonly rollout_governance_green: boolean;
  readonly artifact_fingerprint_present: boolean;
}

/**
 * Returns one `L11CertificationBandResult` per registered band. A
 * band passes iff *all* of its source sublayers are green; bands H
 * and I additionally require the corresponding governance flags.
 */
export function runL11Bands(
  input: L11BandRunnerInput,
): readonly L11CertificationBandResult[] {
  const out: L11CertificationBandResult[] = [];

  for (const id of ALL_L11_CERTIFICATION_BANDS) {
    const def = L11_CERTIFICATION_BAND_REGISTRY[id];
    let passed = def.source_sublayers.every(
      s => input.sublayer_green[s] === true);
    let reason = passed
      ? `all source sublayers green: ${def.source_sublayers.join(', ')}`
      : `at least one source sublayer not green: ${def.source_sublayers
          .filter(s => input.sublayer_green[s] !== true).join(', ')}`;

    if (id === L11CertificationBand.H_CROSS_LAYER_REGRESSION) {
      const l11Green = passed;
      passed = passed && input.l10_master_green;
      if (!input.l10_master_green) {
        reason = 'L10 master regression not green';
      } else if (!l11Green) {
        // already set above
      }
    }

    if (id === L11CertificationBand.I_ROLLOUT_AND_ROLLBACK_GOVERNANCE) {
      const subGreen = passed;
      passed = passed && input.rollout_governance_green;
      if (!input.rollout_governance_green) {
        reason = 'rollout governance not green';
      } else if (!subGreen) {
        // already set
      }
    }

    if (id === L11CertificationBand.J_MASTER_ARTIFACT) {
      const subGreen = passed;
      passed = passed && input.artifact_fingerprint_present;
      if (!input.artifact_fingerprint_present) {
        reason = 'artifact fingerprint missing';
      } else if (!subGreen) {
        // already set
      }
    }

    out.push(makeL11BandResult({ band: id, passed, reason }));
  }
  return out;
}
