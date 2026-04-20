/**
 * L9.9 — Certification Bands
 *
 * §9.9.6 / §9.9.4.1 INV-9.9-A,B — The seven certification bands (A–G)
 * that turn L9.1–L9.8 into a jointly certifiable sequence layer and
 * close it under L9.9's ratification rules.
 *
 *   A — Final definition and completion law
 *   B — Freeze and protected-surface law
 *   C — Extension and migration law
 *   D — Downstream dependency / handoff law
 *   E — Certification artifact and lineage
 *   F — Ratification and done gate
 *   G — Full master regression
 */

export enum L9CertificationBand {
  A_FINAL_DEFINITION_AND_COMPLETION = 'A_FINAL_DEFINITION_AND_COMPLETION',
  B_FREEZE_AND_PROTECTED_SURFACE = 'B_FREEZE_AND_PROTECTED_SURFACE',
  C_EXTENSION_AND_MIGRATION = 'C_EXTENSION_AND_MIGRATION',
  D_DOWNSTREAM_DEPENDENCY = 'D_DOWNSTREAM_DEPENDENCY',
  E_CERTIFICATION_ARTIFACT_AND_LINEAGE =
    'E_CERTIFICATION_ARTIFACT_AND_LINEAGE',
  F_RATIFICATION_AND_DONE_GATE = 'F_RATIFICATION_AND_DONE_GATE',
  G_FULL_MASTER_REGRESSION = 'G_FULL_MASTER_REGRESSION',
}

export const ALL_L9_CERTIFICATION_BANDS: readonly L9CertificationBand[] =
  Object.values(L9CertificationBand);

export const L9_CERTIFICATION_BAND_DESCRIPTION: Readonly<Record<
  L9CertificationBand,
  string
>> = Object.freeze({
  [L9CertificationBand.A_FINAL_DEFINITION_AND_COMPLETION]:
    'L9 canonical/minimal/expanded/negative definition stable; ' +
    'completion validator green across all four dimensions; ' +
    'execution sequence respected',
  [L9CertificationBand.B_FREEZE_AND_PROTECTED_SURFACE]:
    'frozen, evolvable, and hard-protected surfaces declared; ' +
    'freeze activator refuses freeze without ratification',
  [L9CertificationBand.C_EXTENSION_AND_MIGRATION]:
    'extension classifier recognizes additive/backward-compatible/' +
    'migration-required/breaking/prohibited classes and enforces ' +
    'recertification law (judgment/scoring/causal-certainty = ' +
    'PROHIBITED)',
  [L9CertificationBand.D_DOWNSTREAM_DEPENDENCY]:
    'stable handoff surfaces allowed under normal consumption; ' +
    'governed-only kinds gated; forbidden kinds denied; internal ' +
    'surfaces unreachable',
  [L9CertificationBand.E_CERTIFICATION_ARTIFACT_AND_LINEAGE]:
    'ratification artifact canonical, fingerprinted, and log-' +
    'registered; sub-layer cert refs round-trip deterministically',
  [L9CertificationBand.F_RATIFICATION_AND_DONE_GATE]:
    'ratification builder blocks missing sublayers, failed certs, ' +
    'incomplete completion, missing handoff surfaces, and produces ' +
    'a L9_PRODUCTION_READY artifact when inputs are green',
  [L9CertificationBand.G_FULL_MASTER_REGRESSION]:
    'L9.1–L9.8 invariants all green under master regression; no ' +
    'forbidden downstream access accepted; structural execution ' +
    'sequence untouched',
});

export function describeL9Band(b: L9CertificationBand): string {
  return L9_CERTIFICATION_BAND_DESCRIPTION[b];
}
