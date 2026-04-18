/**
 * L8.3 — Contract Versioning and Compatibility
 *
 * §8.3.7.1 – §8.3.7.3 — Every L8.3 contract surface (subject, output,
 * confidence, transition, multiplier) must be versioned and a delta
 * between two versions must be classifiable.
 */

/**
 * §8.3.7.3 — Compatibility classes. Ordered from least to most disruptive.
 *
 * These mirror the L6.9/L7.9 naming so the whole platform speaks one
 * compatibility vocabulary.
 */
export enum L8ContractCompatibilityClass {
  ADDITIVE_SAFE = 'ADDITIVE_SAFE',
  BACKWARD_COMPATIBLE = 'BACKWARD_COMPATIBLE',
  MIGRATION_REQUIRED = 'MIGRATION_REQUIRED',
  BREAKING_SEMANTIC = 'BREAKING_SEMANTIC',
  PROHIBITED = 'PROHIBITED',
}

export const ALL_L8_CONTRACT_COMPATIBILITY_CLASSES:
  readonly L8ContractCompatibilityClass[] =
    Object.values(L8ContractCompatibilityClass);

export enum L8ContractSurface {
  SUBJECT = 'SUBJECT',
  OUTPUT = 'OUTPUT',
  CONFIDENCE = 'CONFIDENCE',
  TRANSITION = 'TRANSITION',
  MULTIPLIER = 'MULTIPLIER',
}

export const ALL_L8_CONTRACT_SURFACES: readonly L8ContractSurface[] =
  Object.values(L8ContractSurface);

export interface L8ContractVersion {
  readonly surface: L8ContractSurface;
  readonly version: string;
  readonly schema_version: string;
  readonly superseded_versions: readonly string[];
}

export interface L8ContractDelta {
  readonly surface: L8ContractSurface;
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
 * §8.3.7.1 — Deterministic semver compare. Returns -1, 0, +1. Rejects
 * non-semver strings by returning 0.
 */
export function compareL8ContractVersions(a: string, b: string): number {
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
 * §8.3.7.3 — `classifyL8ContractDelta`.
 *
 * Deterministic classification: `PROHIBITED` > `BREAKING_SEMANTIC` >
 * `MIGRATION_REQUIRED` > `BACKWARD_COMPATIBLE` > `ADDITIVE_SAFE`.
 */
export function classifyL8ContractDelta(
  delta: L8ContractDelta,
): L8ContractCompatibilityClass {
  if (delta.prohibited_change) return L8ContractCompatibilityClass.PROHIBITED;
  if (delta.semantically_changed_fields.length > 0)
    return L8ContractCompatibilityClass.BREAKING_SEMANTIC;
  if (delta.removed_fields.length > 0)
    return L8ContractCompatibilityClass.MIGRATION_REQUIRED;
  if (delta.changed_enum_vocabularies.length > 0)
    return L8ContractCompatibilityClass.MIGRATION_REQUIRED;
  if (delta.changed_default_policies.length > 0)
    return L8ContractCompatibilityClass.BACKWARD_COMPATIBLE;
  if (delta.added_fields.length > 0)
    return L8ContractCompatibilityClass.ADDITIVE_SAFE;
  return L8ContractCompatibilityClass.ADDITIVE_SAFE;
}

/**
 * Returns true if a proposed delta is legal to apply. `MIGRATION_REQUIRED`
 * is legal only under explicit migration discipline; `PROHIBITED` never.
 */
export function isLegalL8ContractUpgrade(
  delta: L8ContractDelta,
  opts: { allowBreaking?: boolean; allowMigrationRequired?: boolean } = {},
): boolean {
  const cls = classifyL8ContractDelta(delta);
  switch (cls) {
    case L8ContractCompatibilityClass.ADDITIVE_SAFE:
    case L8ContractCompatibilityClass.BACKWARD_COMPATIBLE:
      return true;
    case L8ContractCompatibilityClass.MIGRATION_REQUIRED:
      return opts.allowMigrationRequired === true;
    case L8ContractCompatibilityClass.BREAKING_SEMANTIC:
      return opts.allowBreaking === true;
    case L8ContractCompatibilityClass.PROHIBITED:
      return false;
  }
}

export interface L8ContractVersionRefs {
  readonly subject_contract_version: string;
  readonly output_contract_version: string;
  readonly confidence_contract_version: string;
  readonly transition_contract_version: string;
  readonly multiplier_contract_version: string;
  readonly schema_version: string;
  readonly policy_version: string;
}

export const L8_CURRENT_CONTRACT_VERSIONS: L8ContractVersionRefs = {
  subject_contract_version: '8.3.0',
  output_contract_version: '8.3.0',
  confidence_contract_version: '8.3.0',
  transition_contract_version: '8.3.0',
  multiplier_contract_version: '8.3.0',
  schema_version: '8.3.0',
  policy_version: 'l8.3-policy-v1',
};

/**
 * §8.3.7.2 — Deterministic FNV-1a used by every L8.3 contract object's
 * replay-hash builder. Replay identity is contract-embedded, not
 * derived elsewhere, so all contract surfaces share one stable hash.
 */
export function l8ContractFnv1aHex(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

export function buildL8ContractReplayHash(canonical: string): string {
  return `rhash_${l8ContractFnv1aHex(canonical)}`;
}
