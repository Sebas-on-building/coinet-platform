/**
 * L8.9 — Certification Bands
 *
 * §8.9.6 / §8.9.9.1 INV-8.9-A,B — The seven certification bands (A–G)
 * that turn L8.1–L8.8 into a jointly certifiable regime layer and
 * close it under L8.9's ratification rules.
 *
 *   A — Final definition and completion law
 *   B — Freeze and protected-surface law
 *   C — Extension and migration law
 *   D — Downstream dependency law
 *   E — Certification artifact and lineage
 *   F — Ratification and done gate
 *   G — Full master regression
 */

export enum L8CertificationBand {
  A_FINAL_DEFINITION_AND_COMPLETION = 'A_FINAL_DEFINITION_AND_COMPLETION',
  B_FREEZE_AND_PROTECTED_SURFACE = 'B_FREEZE_AND_PROTECTED_SURFACE',
  C_EXTENSION_AND_MIGRATION = 'C_EXTENSION_AND_MIGRATION',
  D_DOWNSTREAM_DEPENDENCY = 'D_DOWNSTREAM_DEPENDENCY',
  E_CERTIFICATION_ARTIFACT_AND_LINEAGE =
    'E_CERTIFICATION_ARTIFACT_AND_LINEAGE',
  F_RATIFICATION_AND_DONE_GATE = 'F_RATIFICATION_AND_DONE_GATE',
  G_FULL_MASTER_REGRESSION = 'G_FULL_MASTER_REGRESSION',
}

export const ALL_L8_CERTIFICATION_BANDS: readonly L8CertificationBand[] =
  Object.values(L8CertificationBand);

export const L8_CERTIFICATION_BAND_DESCRIPTION: Readonly<Record<
  L8CertificationBand,
  string
>> = Object.freeze({
  [L8CertificationBand.A_FINAL_DEFINITION_AND_COMPLETION]:
    'L8 canonical/minimal/expanded definition stable; completion ' +
    'validator green across all four dimensions; execution sequence ' +
    'respected',
  [L8CertificationBand.B_FREEZE_AND_PROTECTED_SURFACE]:
    'frozen, evolvable, and hard-protected surfaces declared; freeze ' +
    'activator refuses freeze without ratification',
  [L8CertificationBand.C_EXTENSION_AND_MIGRATION]:
    'extension classifier recognizes additive/backward-compatible/' +
    'migration-required/breaking/prohibited classes and enforces ' +
    'recertification law',
  [L8CertificationBand.D_DOWNSTREAM_DEPENDENCY]:
    'stable handoff surfaces allowed under normal consumption; ' +
    'governed-only kinds gated; forbidden kinds denied; internal ' +
    'surfaces unreachable',
  [L8CertificationBand.E_CERTIFICATION_ARTIFACT_AND_LINEAGE]:
    'ratification artifact canonical, fingerprinted, and log-registered; ' +
    'sub-layer cert refs round-trip deterministically',
  [L8CertificationBand.F_RATIFICATION_AND_DONE_GATE]:
    'ratification builder blocks missing sublayers, failed certs, ' +
    'incomplete completion, missing handoff surfaces, and produces a ' +
    'PRODUCTION_READY artifact when inputs are green',
  [L8CertificationBand.G_FULL_MASTER_REGRESSION]:
    'L8.1–L8.8 invariants all green under master regression; no ' +
    'forbidden downstream access accepted; structural execution ' +
    'sequence untouched',
});

export function describeL8Band(b: L8CertificationBand): string {
  return L8_CERTIFICATION_BAND_DESCRIPTION[b];
}
