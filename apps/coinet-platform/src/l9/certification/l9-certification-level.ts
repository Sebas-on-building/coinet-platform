/**
 * L9.9 — Certification Levels
 *
 * §9.9.6 — Three levels derived from the green set of L9 certification
 * bands (A–G):
 *
 *   CONSTITUTIONAL_GREEN : Bands A–C green (definition/freeze/extension)
 *   RUNTIME_GREEN        : Bands A–E green (adds downstream + artifact)
 *   PRODUCTION_GREEN     : Bands A–G green (adds ratification + master)
 */

import { L9CertificationBand } from './l9-certification-band';

export enum L9CertificationLevel {
  FAILED = 'FAILED',
  CONSTITUTIONAL_GREEN = 'CONSTITUTIONAL_GREEN',
  RUNTIME_GREEN = 'RUNTIME_GREEN',
  PRODUCTION_GREEN = 'PRODUCTION_GREEN',
}

export const ALL_L9_CERTIFICATION_LEVELS: readonly L9CertificationLevel[] =
  Object.values(L9CertificationLevel);

export const L9_CONSTITUTIONAL_BANDS: readonly L9CertificationBand[] =
  Object.freeze([
    L9CertificationBand.A_FINAL_DEFINITION_AND_COMPLETION,
    L9CertificationBand.B_FREEZE_AND_PROTECTED_SURFACE,
    L9CertificationBand.C_EXTENSION_AND_MIGRATION,
  ]);

export const L9_RUNTIME_BANDS: readonly L9CertificationBand[] =
  Object.freeze([
    ...L9_CONSTITUTIONAL_BANDS,
    L9CertificationBand.D_DOWNSTREAM_DEPENDENCY,
    L9CertificationBand.E_CERTIFICATION_ARTIFACT_AND_LINEAGE,
  ]);

export const L9_PRODUCTION_BANDS: readonly L9CertificationBand[] =
  Object.freeze([
    ...L9_RUNTIME_BANDS,
    L9CertificationBand.F_RATIFICATION_AND_DONE_GATE,
    L9CertificationBand.G_FULL_MASTER_REGRESSION,
  ]);

export function deriveL9CertificationLevel(
  passing: ReadonlySet<L9CertificationBand>,
): L9CertificationLevel {
  const hasAll = (bands: readonly L9CertificationBand[]): boolean =>
    bands.every(b => passing.has(b));
  if (hasAll(L9_PRODUCTION_BANDS))
    return L9CertificationLevel.PRODUCTION_GREEN;
  if (hasAll(L9_RUNTIME_BANDS))
    return L9CertificationLevel.RUNTIME_GREEN;
  if (hasAll(L9_CONSTITUTIONAL_BANDS))
    return L9CertificationLevel.CONSTITUTIONAL_GREEN;
  return L9CertificationLevel.FAILED;
}

export function l9LevelIsAtLeast(
  achieved: L9CertificationLevel,
  required: L9CertificationLevel,
): boolean {
  const order: readonly L9CertificationLevel[] = [
    L9CertificationLevel.FAILED,
    L9CertificationLevel.CONSTITUTIONAL_GREEN,
    L9CertificationLevel.RUNTIME_GREEN,
    L9CertificationLevel.PRODUCTION_GREEN,
  ];
  return order.indexOf(achieved) >= order.indexOf(required);
}
