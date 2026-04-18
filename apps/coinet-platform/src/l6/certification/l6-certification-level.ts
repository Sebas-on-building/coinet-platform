/**
 * L6.8 — Certification Bands and Levels
 *
 * §6.8.4.2, §6.8.4.3 — Ten required certification bands.
 * §6.8.4.5 — Three certification levels.
 */

export enum L6CertificationBand {
  A_CONTRACTS_AND_LEGALITY = 'A_CONTRACTS_AND_LEGALITY',
  B_DETERMINISTIC_COMPUTE = 'B_DETERMINISTIC_COMPUTE',
  C_EVENT_LIFECYCLE = 'C_EVENT_LIFECYCLE',
  D_STORAGE_AND_LINEAGE = 'D_STORAGE_AND_LINEAGE',
  E_REPLAY_AND_REPAIR = 'E_REPLAY_AND_REPAIR',
  F_ADVERSARIAL_MISUSE = 'F_ADVERSARIAL_MISUSE',
  G_LOAD_AND_CONCURRENCY = 'G_LOAD_AND_CONCURRENCY',
  H_GOLDEN_CORPUS_STABILITY = 'H_GOLDEN_CORPUS_STABILITY',
  I_MIGRATION_AND_COMPATIBILITY = 'I_MIGRATION_AND_COMPATIBILITY',
  J_CROSS_FAMILY_CONTRADICTION_INTEGRITY = 'J_CROSS_FAMILY_CONTRADICTION_INTEGRITY',
}

export const ALL_CERTIFICATION_BANDS: readonly L6CertificationBand[] =
  Object.values(L6CertificationBand);

/**
 * §6.8.4.5 — Three certification levels:
 *   CONSTITUTIONAL_GREEN : bands A–D
 *   RUNTIME_GREEN        : bands A–G
 *   PRODUCTION_GREEN     : bands A–J, no critical migration/observability failures
 */
export enum L6CertificationLevel {
  FAILED = 'FAILED',
  CONSTITUTIONAL_GREEN = 'CONSTITUTIONAL_GREEN',
  RUNTIME_GREEN = 'RUNTIME_GREEN',
  PRODUCTION_GREEN = 'PRODUCTION_GREEN',
}

export const ALL_CERTIFICATION_LEVELS: readonly L6CertificationLevel[] =
  Object.values(L6CertificationLevel);

export const CONSTITUTIONAL_BANDS: readonly L6CertificationBand[] = [
  L6CertificationBand.A_CONTRACTS_AND_LEGALITY,
  L6CertificationBand.B_DETERMINISTIC_COMPUTE,
  L6CertificationBand.C_EVENT_LIFECYCLE,
  L6CertificationBand.D_STORAGE_AND_LINEAGE,
];

export const RUNTIME_BANDS: readonly L6CertificationBand[] = [
  ...CONSTITUTIONAL_BANDS,
  L6CertificationBand.E_REPLAY_AND_REPAIR,
  L6CertificationBand.F_ADVERSARIAL_MISUSE,
  L6CertificationBand.G_LOAD_AND_CONCURRENCY,
];

export const PRODUCTION_BANDS: readonly L6CertificationBand[] = [
  ...RUNTIME_BANDS,
  L6CertificationBand.H_GOLDEN_CORPUS_STABILITY,
  L6CertificationBand.I_MIGRATION_AND_COMPATIBILITY,
  L6CertificationBand.J_CROSS_FAMILY_CONTRADICTION_INTEGRITY,
];

/**
 * Derive the highest level achieved given the set of passing bands.
 */
export function deriveCertificationLevel(
  passing: ReadonlySet<L6CertificationBand>,
): L6CertificationLevel {
  const hasAll = (bands: readonly L6CertificationBand[]): boolean =>
    bands.every(b => passing.has(b));

  if (hasAll(PRODUCTION_BANDS)) return L6CertificationLevel.PRODUCTION_GREEN;
  if (hasAll(RUNTIME_BANDS)) return L6CertificationLevel.RUNTIME_GREEN;
  if (hasAll(CONSTITUTIONAL_BANDS)) return L6CertificationLevel.CONSTITUTIONAL_GREEN;
  return L6CertificationLevel.FAILED;
}

export function isBandConstitutional(b: L6CertificationBand): boolean {
  return CONSTITUTIONAL_BANDS.includes(b);
}

export function isBandRuntime(b: L6CertificationBand): boolean {
  return RUNTIME_BANDS.includes(b);
}
