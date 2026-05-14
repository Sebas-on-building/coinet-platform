/**
 * L12.7 — Certification Levels (§12.7.4)
 *
 * Pure derivation of the canonical L12 certification level from
 * sublayer / band / governance flags.
 */

export const L12_CERTIFICATION_LEVEL_POLICY_VERSION =
  'l12.7.cert-level.v1';

export enum L12CertificationLevel {
  NOT_CERTIFIED = 'NOT_CERTIFIED',
  CONTRACT_ONLY = 'CONTRACT_ONLY',
  RUNTIME_GREEN = 'RUNTIME_GREEN',
  PERSISTENCE_GREEN = 'PERSISTENCE_GREEN',
  PRODUCTION_GREEN = 'PRODUCTION_GREEN',
  FROZEN_LIVE = 'FROZEN_LIVE',
}

export const ALL_L12_CERTIFICATION_LEVELS:
  readonly L12CertificationLevel[] =
  Object.values(L12CertificationLevel);

export const L12_CERTIFICATION_LEVEL_RANK:
  Readonly<Record<L12CertificationLevel, number>> = {
  [L12CertificationLevel.NOT_CERTIFIED]: 0,
  [L12CertificationLevel.CONTRACT_ONLY]: 1,
  [L12CertificationLevel.RUNTIME_GREEN]: 2,
  [L12CertificationLevel.PERSISTENCE_GREEN]: 3,
  [L12CertificationLevel.PRODUCTION_GREEN]: 4,
  [L12CertificationLevel.FROZEN_LIVE]: 5,
};

import { L12SublayerId } from '../contracts/l12-final-definition';
import {
  L12CertificationBand,
  ALL_L12_CERTIFICATION_BANDS,
} from './l12-certification-band';

export interface L12CertificationLevelInput {
  readonly sublayer_green:
    Readonly<Partial<Record<L12SublayerId, boolean>>>;
  readonly band_green:
    Readonly<Partial<Record<L12CertificationBand, boolean>>>;
  readonly critical_breach_count: number;
  readonly l13_handoff_approved: boolean;
  readonly freeze_activated: boolean;
  readonly artifact_fingerprint_present: boolean;
  readonly rollout_recommended: boolean;
}

export interface L12CertificationLevelDecision {
  readonly level: L12CertificationLevel;
  readonly reason: string;
}

/**
 * §12.7.4 — staged level derivation. Order:
 *   any critical breach        → NOT_CERTIFIED
 *   L12.1..L12.3 green only    → CONTRACT_ONLY
 *   + L12.4..L12.5 green       → RUNTIME_GREEN
 *   + L12.6 green              → PERSISTENCE_GREEN
 *   + bands A..G green + L13 + rollout + fp → PRODUCTION_GREEN
 *   + freeze activated         → FROZEN_LIVE
 */
export function deriveL12CertificationLevel(
  input: L12CertificationLevelInput,
): L12CertificationLevelDecision {
  if (input.critical_breach_count > 0) {
    return { level: L12CertificationLevel.NOT_CERTIFIED,
      reason: `${input.critical_breach_count} critical breach(es) present` };
  }

  const isGreen = (s: L12SublayerId): boolean =>
    input.sublayer_green[s] === true;

  const contractGreen =
    isGreen(L12SublayerId.L12_1_CONSTITUTION) &&
    isGreen(L12SublayerId.L12_2_OBJECTS) &&
    isGreen(L12SublayerId.L12_3_CONTRACTS);
  if (!contractGreen) {
    return { level: L12CertificationLevel.NOT_CERTIFIED,
      reason: 'L12.1..L12.3 not all green' };
  }

  const runtimeGreen = isGreen(L12SublayerId.L12_4_RUNTIME) &&
    isGreen(L12SublayerId.L12_5_TEMPLATES);
  if (!runtimeGreen) {
    return { level: L12CertificationLevel.CONTRACT_ONLY,
      reason: 'L12.1..L12.3 green; L12.4 / L12.5 not green' };
  }

  if (!isGreen(L12SublayerId.L12_6_PERSISTENCE)) {
    return { level: L12CertificationLevel.RUNTIME_GREEN,
      reason: 'L12.1..L12.5 green but L12.6 persistence not green' };
  }

  // Persistence green: now look for full production green.
  const bandsGreen = ALL_L12_CERTIFICATION_BANDS.every(
    b => input.band_green[b] === true);
  if (!bandsGreen) {
    return { level: L12CertificationLevel.PERSISTENCE_GREEN,
      reason: 'L12.6 green but at least one certification band not green' };
  }
  if (!isGreen(L12SublayerId.L12_7_RATIFICATION)) {
    return { level: L12CertificationLevel.PERSISTENCE_GREEN,
      reason: 'L12.7 ratification sublayer not green' };
  }
  if (!input.l13_handoff_approved) {
    return { level: L12CertificationLevel.PERSISTENCE_GREEN,
      reason: 'L13 handoff not approved' };
  }
  if (!input.rollout_recommended) {
    return { level: L12CertificationLevel.PERSISTENCE_GREEN,
      reason: 'rollout not recommended' };
  }
  if (!input.artifact_fingerprint_present) {
    return { level: L12CertificationLevel.PERSISTENCE_GREEN,
      reason: 'ratification artifact fingerprint missing' };
  }

  if (input.freeze_activated) {
    return { level: L12CertificationLevel.FROZEN_LIVE,
      reason: 'production-green + freeze activated' };
  }
  return { level: L12CertificationLevel.PRODUCTION_GREEN,
    reason: 'all bands + sublayers green; L13 handoff approved; rollout recommended' };
}
