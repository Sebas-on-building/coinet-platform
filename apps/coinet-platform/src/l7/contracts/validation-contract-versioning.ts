/**
 * L7.3 — Contract Versioning and Compatibility
 *
 * §7.3.7.1 – §7.3.7.3 — Every L7 contract surface (subject, output,
 * contradiction bundle, confidence assessment, restriction profile) must
 * be versioned and a delta between two versions must be classifiable.
 */

export enum L7ContractSurface {
  SUBJECT = 'SUBJECT',
  OUTPUT = 'OUTPUT',
  CONTRADICTION_BUNDLE = 'CONTRADICTION_BUNDLE',
  CONFIDENCE_ASSESSMENT = 'CONFIDENCE_ASSESSMENT',
  RESTRICTION_PROFILE = 'RESTRICTION_PROFILE',
}
export const ALL_CONTRACT_SURFACES: readonly L7ContractSurface[] = Object.values(L7ContractSurface);

/**
 * §7.3.7.3 — Compatibility classes. Ordered from least to most disruptive.
 */
export enum L7ContractCompatibilityClass {
  ADDITIVE_SAFE = 'ADDITIVE_SAFE',
  BACKWARD_COMPATIBLE_STRUCTURAL = 'BACKWARD_COMPATIBLE_STRUCTURAL',
  MIGRATION_REQUIRED = 'MIGRATION_REQUIRED',
  BREAKING_SEMANTIC = 'BREAKING_SEMANTIC',
  PROHIBITED = 'PROHIBITED',
}
export const ALL_CONTRACT_COMPATIBILITY_CLASSES: readonly L7ContractCompatibilityClass[] =
  Object.values(L7ContractCompatibilityClass);

export interface L7ContractVersion {
  readonly surface: L7ContractSurface;
  readonly version: string;
  readonly schema_version: string;
  readonly superseded_versions: readonly string[];
}

export interface L7ContractDelta {
  readonly surface: L7ContractSurface;
  readonly from: string;
  readonly to: string;
  readonly added_fields: readonly string[];
  readonly removed_fields: readonly string[];
  readonly semantically_changed_fields: readonly string[];
  readonly changed_enum_vocabularies: readonly string[];
  readonly changed_default_policies: readonly string[];
  readonly prohibited_change: boolean;
}

/**
 * §7.3.7.7 — `compareValidationContractVersions`. Returns -1, 0, +1 for
 * semver-ordered comparisons. Rejects non-semver strings by returning 0.
 */
export function compareValidationContractVersions(a: string, b: string): number {
  const pa = parseSemver(a);
  const pb = parseSemver(b);
  if (!pa || !pb) return 0;
  if (pa.major !== pb.major) return pa.major < pb.major ? -1 : 1;
  if (pa.minor !== pb.minor) return pa.minor < pb.minor ? -1 : 1;
  if (pa.patch !== pb.patch) return pa.patch < pb.patch ? -1 : 1;
  return 0;
}

function parseSemver(v: string): { major: number; minor: number; patch: number } | null {
  const m = /^(\d+)\.(\d+)\.(\d+)(?:-[\w.]+)?$/.exec(v);
  if (!m) return null;
  return { major: Number(m[1]), minor: Number(m[2]), patch: Number(m[3]) };
}

/**
 * §7.3.7.7 — `classifyValidationContractDelta`.
 *
 * Deterministic classification: `PROHIBITED` > `BREAKING_SEMANTIC` >
 * `MIGRATION_REQUIRED` > `BACKWARD_COMPATIBLE_STRUCTURAL` > `ADDITIVE_SAFE`.
 */
export function classifyValidationContractDelta(
  delta: L7ContractDelta,
): L7ContractCompatibilityClass {
  if (delta.prohibited_change) return L7ContractCompatibilityClass.PROHIBITED;
  if (delta.semantically_changed_fields.length > 0) return L7ContractCompatibilityClass.BREAKING_SEMANTIC;
  if (delta.removed_fields.length > 0) return L7ContractCompatibilityClass.MIGRATION_REQUIRED;
  if (delta.changed_enum_vocabularies.length > 0) return L7ContractCompatibilityClass.MIGRATION_REQUIRED;
  if (delta.changed_default_policies.length > 0) return L7ContractCompatibilityClass.BACKWARD_COMPATIBLE_STRUCTURAL;
  if (delta.added_fields.length > 0) return L7ContractCompatibilityClass.ADDITIVE_SAFE;
  return L7ContractCompatibilityClass.ADDITIVE_SAFE;
}

/**
 * Returns true if a proposed delta is legal to apply (`MIGRATION_REQUIRED`
 * is legal so long as the migration discipline is followed; `PROHIBITED`
 * is never legal).
 */
export function isLegalContractUpgrade(
  delta: L7ContractDelta,
  opts: { allowBreaking?: boolean; allowMigrationRequired?: boolean } = {},
): boolean {
  const cls = classifyValidationContractDelta(delta);
  switch (cls) {
    case L7ContractCompatibilityClass.ADDITIVE_SAFE:
    case L7ContractCompatibilityClass.BACKWARD_COMPATIBLE_STRUCTURAL:
      return true;
    case L7ContractCompatibilityClass.MIGRATION_REQUIRED:
      return opts.allowMigrationRequired === true;
    case L7ContractCompatibilityClass.BREAKING_SEMANTIC:
      return opts.allowBreaking === true;
    case L7ContractCompatibilityClass.PROHIBITED:
      return false;
  }
}

/**
 * Every L7.3 contract bundle carries these version refs so materialization
 * can check compatibility against registered contracts.
 */
export interface L7ContractVersionRefs {
  readonly subject_contract_version: string;
  readonly output_contract_version: string;
  readonly contradiction_bundle_contract_version: string;
  readonly confidence_contract_version: string;
  readonly restriction_contract_version: string;
  readonly schema_version: string;
}

export const L7_CURRENT_CONTRACT_VERSIONS: L7ContractVersionRefs = {
  subject_contract_version: '7.3.0',
  output_contract_version: '7.3.0',
  contradiction_bundle_contract_version: '7.3.0',
  confidence_contract_version: '7.3.0',
  restriction_contract_version: '7.3.0',
  schema_version: '7.3.0',
};
