/**
 * L8.9 — Certification Levels
 *
 * §8.9.6 — Three levels derived from the green set of L8 certification
 * bands (A–G):
 *
 *   CONSTITUTIONAL_GREEN : Bands A–C green (definition/freeze/extension)
 *   RUNTIME_GREEN        : Bands A–E green (adds downstream + artifact)
 *   PRODUCTION_GREEN     : Bands A–G green (adds ratification + master)
 */

import { L8CertificationBand } from './l8-certification-band';

export enum L8CertificationLevel {
  FAILED = 'FAILED',
  CONSTITUTIONAL_GREEN = 'CONSTITUTIONAL_GREEN',
  RUNTIME_GREEN = 'RUNTIME_GREEN',
  PRODUCTION_GREEN = 'PRODUCTION_GREEN',
}

export const ALL_L8_CERTIFICATION_LEVELS: readonly L8CertificationLevel[] =
  Object.values(L8CertificationLevel);

export const L8_CONSTITUTIONAL_BANDS: readonly L8CertificationBand[] =
  Object.freeze([
    L8CertificationBand.A_FINAL_DEFINITION_AND_COMPLETION,
    L8CertificationBand.B_FREEZE_AND_PROTECTED_SURFACE,
    L8CertificationBand.C_EXTENSION_AND_MIGRATION,
  ]);

export const L8_RUNTIME_BANDS: readonly L8CertificationBand[] =
  Object.freeze([
    ...L8_CONSTITUTIONAL_BANDS,
    L8CertificationBand.D_DOWNSTREAM_DEPENDENCY,
    L8CertificationBand.E_CERTIFICATION_ARTIFACT_AND_LINEAGE,
  ]);

export const L8_PRODUCTION_BANDS: readonly L8CertificationBand[] =
  Object.freeze([
    ...L8_RUNTIME_BANDS,
    L8CertificationBand.F_RATIFICATION_AND_DONE_GATE,
    L8CertificationBand.G_FULL_MASTER_REGRESSION,
  ]);

export function deriveL8CertificationLevel(
  passing: ReadonlySet<L8CertificationBand>,
): L8CertificationLevel {
  const hasAll = (bands: readonly L8CertificationBand[]): boolean =>
    bands.every(b => passing.has(b));
  if (hasAll(L8_PRODUCTION_BANDS))
    return L8CertificationLevel.PRODUCTION_GREEN;
  if (hasAll(L8_RUNTIME_BANDS))
    return L8CertificationLevel.RUNTIME_GREEN;
  if (hasAll(L8_CONSTITUTIONAL_BANDS))
    return L8CertificationLevel.CONSTITUTIONAL_GREEN;
  return L8CertificationLevel.FAILED;
}

export function l8LevelIsAtLeast(
  achieved: L8CertificationLevel,
  required: L8CertificationLevel,
): boolean {
  const order: readonly L8CertificationLevel[] = [
    L8CertificationLevel.FAILED,
    L8CertificationLevel.CONSTITUTIONAL_GREEN,
    L8CertificationLevel.RUNTIME_GREEN,
    L8CertificationLevel.PRODUCTION_GREEN,
  ];
  return order.indexOf(achieved) >= order.indexOf(required);
}
