/**
 * L10.9 — Certification Levels
 *
 * §10.9.10.2 — Four levels derived from the green set of L10
 * certification bands (A–G):
 *
 *   CONSTITUTIONAL_GREEN : Bands A–C green (definition/freeze/extension)
 *   RUNTIME_GREEN        : Bands A–E green (adds downstream + artifact)
 *   PRODUCTION_GREEN     : Bands A–G green (adds ratification + master)
 */

import { L10CertificationBand } from './l10-certification-band';

export enum L10CertificationLevel {
  NOT_CERTIFIED = 'NOT_CERTIFIED',
  CONSTITUTIONAL_GREEN = 'CONSTITUTIONAL_GREEN',
  RUNTIME_GREEN = 'RUNTIME_GREEN',
  PRODUCTION_GREEN = 'PRODUCTION_GREEN',
}

export const ALL_L10_CERTIFICATION_LEVELS:
  readonly L10CertificationLevel[] =
  Object.values(L10CertificationLevel);

export const L10_CONSTITUTIONAL_BANDS: readonly L10CertificationBand[] =
  Object.freeze([
    L10CertificationBand.A_FINAL_DEFINITION_AND_COMPLETION,
    L10CertificationBand.B_FREEZE_AND_PROTECTED_SURFACE,
    L10CertificationBand.C_EXTENSION_AND_MIGRATION,
  ]);

export const L10_RUNTIME_BANDS: readonly L10CertificationBand[] =
  Object.freeze([
    ...L10_CONSTITUTIONAL_BANDS,
    L10CertificationBand.D_DOWNSTREAM_DEPENDENCY,
    L10CertificationBand.E_CERTIFICATION_ARTIFACT_AND_LINEAGE,
  ]);

export const L10_PRODUCTION_BANDS: readonly L10CertificationBand[] =
  Object.freeze([
    ...L10_RUNTIME_BANDS,
    L10CertificationBand.F_RATIFICATION_AND_DONE_GATE,
    L10CertificationBand.G_FULL_MASTER_REGRESSION,
  ]);

export function deriveL10CertificationLevel(
  passing: ReadonlySet<L10CertificationBand>,
): L10CertificationLevel {
  const hasAll = (bands: readonly L10CertificationBand[]): boolean =>
    bands.every(b => passing.has(b));
  if (hasAll(L10_PRODUCTION_BANDS))
    return L10CertificationLevel.PRODUCTION_GREEN;
  if (hasAll(L10_RUNTIME_BANDS))
    return L10CertificationLevel.RUNTIME_GREEN;
  if (hasAll(L10_CONSTITUTIONAL_BANDS))
    return L10CertificationLevel.CONSTITUTIONAL_GREEN;
  return L10CertificationLevel.NOT_CERTIFIED;
}

export function l10LevelIsAtLeast(
  achieved: L10CertificationLevel,
  required: L10CertificationLevel,
): boolean {
  const order: readonly L10CertificationLevel[] = [
    L10CertificationLevel.NOT_CERTIFIED,
    L10CertificationLevel.CONSTITUTIONAL_GREEN,
    L10CertificationLevel.RUNTIME_GREEN,
    L10CertificationLevel.PRODUCTION_GREEN,
  ];
  return order.indexOf(achieved) >= order.indexOf(required);
}
