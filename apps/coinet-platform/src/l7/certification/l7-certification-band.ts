/**
 * L7.8 — Certification Bands
 *
 * §7.8.4.1 — The ten required certification bands (A–J) that turn the
 * already-built Layer 7 (L7.1–L7.7) into a jointly certifiable truth-
 * testing layer. Bands A–G are the core doctrine bands; Bands H–J are
 * the production-extension bands added by §7.8.4.2.
 *
 * These identifiers are part of the L7.8 public surface and are used by
 * the band runner, report builder, observability report, and rollout
 * gate to decide whether Layer 7 is `CONSTITUTIONAL_GREEN`,
 * `RUNTIME_GREEN`, or `PRODUCTION_GREEN`.
 */

export enum L7CertificationBand {
  A_CONTRACT_AND_LEGALITY = 'A_CONTRACT_AND_LEGALITY',
  B_CONTRADICTION_DETECTION = 'B_CONTRADICTION_DETECTION',
  C_VALIDATION_CLASSIFICATION = 'C_VALIDATION_CLASSIFICATION',
  D_CONFIDENCE_AND_RESTRICTION = 'D_CONFIDENCE_AND_RESTRICTION',
  E_PERSISTENCE_AND_LINEAGE = 'E_PERSISTENCE_AND_LINEAGE',
  F_REPLAY_REPAIR_AND_ADVERSARIAL = 'F_REPLAY_REPAIR_AND_ADVERSARIAL',
  G_LOAD_AND_CONCURRENCY = 'G_LOAD_AND_CONCURRENCY',
  H_ROLLOUT_AND_ROLLBACK = 'H_ROLLOUT_AND_ROLLBACK',
  I_OPERATIONAL_OBSERVABILITY = 'I_OPERATIONAL_OBSERVABILITY',
  J_CROSS_LAYER_DEPENDENCY_INTEGRITY = 'J_CROSS_LAYER_DEPENDENCY_INTEGRITY',
}

export const ALL_L7_CERTIFICATION_BANDS: readonly L7CertificationBand[] =
  Object.values(L7CertificationBand);

/**
 * §7.8.4.1 — A short, human-readable descriptor for each band. Used by
 * observability reports and certification summaries.
 */
export const L7_CERTIFICATION_BAND_DESCRIPTION: Readonly<Record<
  L7CertificationBand,
  string
>> = Object.freeze({
  [L7CertificationBand.A_CONTRACT_AND_LEGALITY]:
    'valid subjects, outputs, and contradiction families accepted; invalid rejected',
  [L7CertificationBand.B_CONTRADICTION_DETECTION]:
    'contradiction templates fire; stale support ≠ true contradiction; missingness downgrades',
  [L7CertificationBand.C_VALIDATION_CLASSIFICATION]:
    'primary validation classes assigned legally; modifiers attach correctly',
  [L7CertificationBand.D_CONFIDENCE_AND_RESTRICTION]:
    'confidence factors deterministic; caps bound confidence; restriction profiles legal',
  [L7CertificationBand.E_PERSISTENCE_AND_LINEAGE]:
    'validations persist through L5 only; current/historical align; evidence discoverable',
  [L7CertificationBand.F_REPLAY_REPAIR_AND_ADVERSARIAL]:
    'replay reconstructs; repair does not invent; bypass/shadow/flattening attempts reject',
  [L7CertificationBand.G_LOAD_AND_CONCURRENCY]:
    'concurrent runs on same scope deterministic; backlog recovers without drift',
  [L7CertificationBand.H_ROLLOUT_AND_ROLLBACK]:
    'family rollout ordered; rollback preserves lineage; enable/disable safe',
  [L7CertificationBand.I_OPERATIONAL_OBSERVABILITY]:
    'critical metrics emit; zero-tolerance breaches surface; alerts and runbooks exist',
  [L7CertificationBand.J_CROSS_LAYER_DEPENDENCY_INTEGRITY]:
    'later-layer consumption law upheld; L6 bypass blocked; L5 authority intact',
});

export function describeBand(b: L7CertificationBand): string {
  return L7_CERTIFICATION_BAND_DESCRIPTION[b];
}

/**
 * §7.8.4.1 Band F subsumes the legacy "adversarial" assurance surface —
 * any attempt to treat the assurance layer as if it were separate from
 * truth-testing correctness would contradict §7.8.1.3 (non-duplication
 * law). This helper makes that subsumption explicit for audit records.
 */
export function isAdversarialBand(b: L7CertificationBand): boolean {
  return b === L7CertificationBand.F_REPLAY_REPAIR_AND_ADVERSARIAL;
}
