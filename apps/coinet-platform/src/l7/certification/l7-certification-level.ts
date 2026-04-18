/**
 * L7.8 — Certification Levels
 *
 * §7.8.4.3 — Three certification levels derived from the green set of
 * bands defined in `l7-certification-band.ts`:
 *
 *   CONSTITUTIONAL_GREEN : Bands A–C green
 *   RUNTIME_GREEN        : Bands A–G green
 *   PRODUCTION_GREEN     : Bands A–J green and no critical SLO breach
 *
 * These mappings are frozen so rollout/gate logic can trust them as
 * literal authority (§7.8.5.2 INV-7.8-F).
 */

import {
  L7CertificationBand,
} from './l7-certification-band';

export enum L7CertificationLevel {
  FAILED = 'FAILED',
  CONSTITUTIONAL_GREEN = 'CONSTITUTIONAL_GREEN',
  RUNTIME_GREEN = 'RUNTIME_GREEN',
  PRODUCTION_GREEN = 'PRODUCTION_GREEN',
}

export const ALL_L7_CERTIFICATION_LEVELS: readonly L7CertificationLevel[] =
  Object.values(L7CertificationLevel);

export const L7_CONSTITUTIONAL_BANDS: readonly L7CertificationBand[] = Object.freeze([
  L7CertificationBand.A_CONTRACT_AND_LEGALITY,
  L7CertificationBand.B_CONTRADICTION_DETECTION,
  L7CertificationBand.C_VALIDATION_CLASSIFICATION,
]);

export const L7_RUNTIME_BANDS: readonly L7CertificationBand[] = Object.freeze([
  ...L7_CONSTITUTIONAL_BANDS,
  L7CertificationBand.D_CONFIDENCE_AND_RESTRICTION,
  L7CertificationBand.E_PERSISTENCE_AND_LINEAGE,
  L7CertificationBand.F_REPLAY_REPAIR_AND_ADVERSARIAL,
  L7CertificationBand.G_LOAD_AND_CONCURRENCY,
]);

export const L7_PRODUCTION_BANDS: readonly L7CertificationBand[] = Object.freeze([
  ...L7_RUNTIME_BANDS,
  L7CertificationBand.H_ROLLOUT_AND_ROLLBACK,
  L7CertificationBand.I_OPERATIONAL_OBSERVABILITY,
  L7CertificationBand.J_CROSS_LAYER_DEPENDENCY_INTEGRITY,
]);

/**
 * §7.8.4.3 — Derive the highest level achieved given the set of passing
 * bands. Deterministic, pure, and never silently upgrades: missing even
 * one required band downgrades to FAILED.
 */
export function deriveL7CertificationLevel(
  passing: ReadonlySet<L7CertificationBand>,
): L7CertificationLevel {
  const hasAll = (bands: readonly L7CertificationBand[]): boolean =>
    bands.every(b => passing.has(b));

  if (hasAll(L7_PRODUCTION_BANDS)) return L7CertificationLevel.PRODUCTION_GREEN;
  if (hasAll(L7_RUNTIME_BANDS)) return L7CertificationLevel.RUNTIME_GREEN;
  if (hasAll(L7_CONSTITUTIONAL_BANDS)) return L7CertificationLevel.CONSTITUTIONAL_GREEN;
  return L7CertificationLevel.FAILED;
}

export function isBandConstitutionalL7(b: L7CertificationBand): boolean {
  return L7_CONSTITUTIONAL_BANDS.includes(b);
}

export function isBandRuntimeL7(b: L7CertificationBand): boolean {
  return L7_RUNTIME_BANDS.includes(b);
}

export function isBandProductionL7(b: L7CertificationBand): boolean {
  return L7_PRODUCTION_BANDS.includes(b);
}

/**
 * §7.8.4.3, §7.8.5.2 INV-7.8-F — A level downgrade predicate used by
 * rollout/gate logic. Returns true if `current` strictly dominates
 * `target`, i.e. the achieved level is not enough for the required
 * rollout phase.
 */
export function levelIsAtLeast(
  achieved: L7CertificationLevel,
  required: L7CertificationLevel,
): boolean {
  const order: readonly L7CertificationLevel[] = [
    L7CertificationLevel.FAILED,
    L7CertificationLevel.CONSTITUTIONAL_GREEN,
    L7CertificationLevel.RUNTIME_GREEN,
    L7CertificationLevel.PRODUCTION_GREEN,
  ];
  return order.indexOf(achieved) >= order.indexOf(required);
}
