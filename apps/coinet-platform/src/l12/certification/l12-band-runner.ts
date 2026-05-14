/**
 * L12.7 — Certification Band Runner (§12.7.5, §12.7.7)
 *
 * Pure aggregator that, given per-sublayer green flags + governance
 * flags, decides whether each certification band passes. It does NOT
 * re-run the underlying suites; the master orchestrator feeds it the
 * already-computed sublayer summaries.
 */

import { L12SublayerId } from '../contracts/l12-final-definition';
import {
  L12CertificationBand,
  ALL_L12_CERTIFICATION_BANDS,
  L12_CERTIFICATION_BAND_REGISTRY,
} from './l12-certification-band';
import {
  L12CertificationBandResult,
  makeL12CertificationBandResult,
} from './l12-certification-report';

export interface L12BandRunnerInput {
  readonly sublayer_green:
    Readonly<Partial<Record<L12SublayerId, boolean>>>;

  /** L11 master regression must be green for Band E. */
  readonly l11_master_green: boolean;

  /** L10 master regression must remain green (cross-layer regression). */
  readonly l10_master_green: boolean;

  /** Adversarial misuse suite explicitly green-passed (Band G). */
  readonly adversarial_misuse_green: boolean;

  /** L12.7 ratification artifact / rollout / freeze gates green (Band H). */
  readonly artifact_rollout_freeze_green: boolean;
}

/**
 * Returns one `L12CertificationBandResult` per registered band.
 * A band passes iff *all* of its source sublayers are green AND any
 * band-specific governance flag also holds.
 */
export function runL12Bands(
  input: L12BandRunnerInput,
): readonly L12CertificationBandResult[] {
  const out: L12CertificationBandResult[] = [];

  for (const id of ALL_L12_CERTIFICATION_BANDS) {
    const def = L12_CERTIFICATION_BAND_REGISTRY[id];
    let passed = def.source_sublayers.every(
      s => input.sublayer_green[s] === true);
    let reason = passed
      ? `all source sublayers green: ${def.source_sublayers.join(', ')}`
      : `at least one source sublayer not green: ${def.source_sublayers
          .filter(s => input.sublayer_green[s] !== true).join(', ')}`;

    // Band E — L11 score-context consumption requires L11 master green.
    if (id === L12CertificationBand.BAND_E_L11_SCORE_CONTEXT) {
      const subGreen = passed;
      passed = passed && input.l11_master_green;
      if (!input.l11_master_green) {
        reason = 'L11 master regression not green';
      } else if (!subGreen) {
        // already set above
      }
    }

    // Band G — adversarial misuse: requires explicit green pass of the
    // adversarial misuse suite in addition to source sublayers.
    if (id === L12CertificationBand.BAND_G_ADVERSARIAL_MISUSE) {
      const subGreen = passed;
      passed = passed && input.adversarial_misuse_green &&
        input.l10_master_green;
      if (!input.adversarial_misuse_green) {
        reason = 'adversarial misuse suite not green';
      } else if (!input.l10_master_green) {
        reason = 'L10 master regression not green';
      } else if (!subGreen) {
        // already set above
      }
    }

    // Band H — artifact / rollout / freeze.
    if (id === L12CertificationBand.BAND_H_ARTIFACT_ROLLOUT_FREEZE) {
      const subGreen = passed;
      passed = passed && input.artifact_rollout_freeze_green;
      if (!input.artifact_rollout_freeze_green) {
        reason = 'artifact / rollout / freeze gate not green';
      } else if (!subGreen) {
        // already set above
      }
    }

    out.push(makeL12CertificationBandResult({
      band: id, passed, reason,
    }));
  }
  return out;
}
