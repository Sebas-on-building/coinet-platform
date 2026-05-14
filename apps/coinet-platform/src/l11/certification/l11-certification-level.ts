/**
 * L11.9 — Certification Level Derivation (§11.9.10.2 / §11.9.19.4)
 *
 * Pure derivation of the canonical L11 certification level from
 * sublayer / band / invariant pass-fail results. Order:
 *
 *   any critical breach        → NOT_CERTIFIED
 *   only L11.1 green           → CONSTITUTIONAL_GREEN
 *   L11.1..L11.7 green         → RUNTIME_GREEN
 *   + L11.8 green              → PERSISTENCE_GREEN
 *   + bands A–J + freeze + rollout + artifact green → PRODUCTION_GREEN
 */

import {
  L11CertificationLevel,
} from '../contracts/l11-ratification-artifact';
import { L11SublayerId } from '../contracts/l11-layer-inventory';
import {
  L11CertificationBand,
  ALL_L11_CERTIFICATION_BANDS,
} from './l11-certification-band';

export interface L11CertificationLevelInput {
  readonly sublayer_green: Readonly<Partial<Record<L11SublayerId, boolean>>>;
  readonly band_green: Readonly<Partial<Record<L11CertificationBand, boolean>>>;
  readonly critical_breach_count: number;
  readonly freeze_policy_active: boolean;
  readonly rollout_recommended: boolean;
  readonly artifact_fingerprint_present: boolean;
}

export interface L11CertificationLevelDecision {
  readonly level: L11CertificationLevel;
  readonly reason: string;
}

export function deriveL11CertificationLevel(
  input: L11CertificationLevelInput,
): L11CertificationLevelDecision {
  if (input.critical_breach_count > 0) {
    return { level: L11CertificationLevel.NOT_CERTIFIED,
      reason: `${input.critical_breach_count} critical breach(es) present` };
  }

  const isGreen = (s: L11SublayerId): boolean => input.sublayer_green[s] === true;

  // CONSTITUTIONAL — only L11.1 needs to be green.
  if (!isGreen(L11SublayerId.L11_1_CONSTITUTION)) {
    return { level: L11CertificationLevel.NOT_CERTIFIED,
      reason: 'L11.1 constitution not green' };
  }

  const runtimeGreen =
    isGreen(L11SublayerId.L11_2_SCORE_DOCTRINE) &&
    isGreen(L11SublayerId.L11_3_FORMULA_LAW) &&
    isGreen(L11SublayerId.L11_4_ATTRIBUTION) &&
    isGreen(L11SublayerId.L11_5_MISSING_REGIME) &&
    isGreen(L11SublayerId.L11_6_CALIBRATION) &&
    isGreen(L11SublayerId.L11_7_DRIFT);

  if (!runtimeGreen) {
    return { level: L11CertificationLevel.CONSTITUTIONAL_GREEN,
      reason: 'L11.1 green but one of L11.2..L11.7 not green' };
  }

  if (!isGreen(L11SublayerId.L11_8_PERSISTENCE)) {
    return { level: L11CertificationLevel.RUNTIME_GREEN,
      reason: 'L11.1..L11.7 green but L11.8 not green' };
  }

  // For PRODUCTION_GREEN we also require: every band green + freeze active
  // + rollout recommended + artifact fingerprint present + L11.9 sublayer green.
  const bandsGreen = ALL_L11_CERTIFICATION_BANDS.every(
    b => input.band_green[b] === true);

  if (!bandsGreen) {
    return { level: L11CertificationLevel.PERSISTENCE_GREEN,
      reason: 'L11.8 green but at least one certification band not green' };
  }
  if (!isGreen(L11SublayerId.L11_9_RATIFICATION)) {
    return { level: L11CertificationLevel.PERSISTENCE_GREEN,
      reason: 'L11.9 ratification not green' };
  }
  if (!input.freeze_policy_active) {
    return { level: L11CertificationLevel.PERSISTENCE_GREEN,
      reason: 'freeze policy not active' };
  }
  if (!input.rollout_recommended) {
    return { level: L11CertificationLevel.PERSISTENCE_GREEN,
      reason: 'rollout not recommended' };
  }
  if (!input.artifact_fingerprint_present) {
    return { level: L11CertificationLevel.PERSISTENCE_GREEN,
      reason: 'artifact fingerprint missing' };
  }

  return { level: L11CertificationLevel.PRODUCTION_GREEN,
    reason: 'all bands + freeze + rollout + artifact green' };
}
