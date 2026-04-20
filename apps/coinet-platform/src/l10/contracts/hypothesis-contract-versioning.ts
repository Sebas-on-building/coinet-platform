/**
 * L10.3 — Contract Versioning and Compatibility
 *
 * §10.3.8 — Every L10.3 contract surface (subject, candidate, output,
 * ranking, spread, shift-condition, restriction) must be versioned and
 * a delta between two versions must be classifiable. Breaking changes
 * that silently reinterpret hypothesis meaning, competition semantics,
 * or replay identity are the most dangerous possible change shapes at
 * L10 because they can turn a competition-preserving output into a
 * silently single-story output. The vocabulary below is aligned with
 * L6.9 / L7.9 / L8.3 / L9.3 so the whole platform speaks one language.
 */

export enum L10ContractCompatibilityClass {
  ADDITIVE_SAFE = 'ADDITIVE_SAFE',
  BACKWARD_COMPATIBLE = 'BACKWARD_COMPATIBLE',
  MIGRATION_REQUIRED = 'MIGRATION_REQUIRED',
  BREAKING_SEMANTIC = 'BREAKING_SEMANTIC',
  PROHIBITED = 'PROHIBITED',
}

export const ALL_L10_CONTRACT_COMPATIBILITY_CLASSES:
  readonly L10ContractCompatibilityClass[] =
    Object.values(L10ContractCompatibilityClass);

/**
 * §10.3.8.1 — Contract surfaces. One per first-class L10.3 object
 * family. Aligned with L10.1's `L10OutputSurfaceClass` where applicable
 * so audit records and registries speak the same surface language.
 */
export enum L10ContractSurface {
  SUBJECT = 'SUBJECT',
  CANDIDATE = 'CANDIDATE',
  OUTPUT = 'OUTPUT',
  RANKING = 'RANKING',
  SPREAD = 'SPREAD',
  SHIFT_CONDITION = 'SHIFT_CONDITION',
  RESTRICTION = 'RESTRICTION',
}

export const ALL_L10_CONTRACT_SURFACES: readonly L10ContractSurface[] =
  Object.values(L10ContractSurface);

export interface L10ContractVersion {
  readonly surface: L10ContractSurface;
  readonly version: string;
  readonly schema_version: string;
  readonly superseded_versions: readonly string[];
}

export interface L10ContractDelta {
  readonly surface: L10ContractSurface;
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
 * §10.3.8.4 — Deterministic semver compare. Returns -1, 0, +1. Rejects
 * non-semver strings by returning 0 so non-monotonic validators treat
 * them as a version that did not advance.
 */
export function compareL10ContractVersions(a: string, b: string): number {
  const pa = parseSemver(a);
  const pb = parseSemver(b);
  if (!pa || !pb) return 0;
  if (pa.major !== pb.major) return pa.major < pb.major ? -1 : 1;
  if (pa.minor !== pb.minor) return pa.minor < pb.minor ? -1 : 1;
  if (pa.patch !== pb.patch) return pa.patch < pb.patch ? -1 : 1;
  return 0;
}

function parseSemver(v: string):
  { major: number; minor: number; patch: number } | null {
  const m = /^(\d+)\.(\d+)\.(\d+)(?:-[\w.]+)?$/.exec(v);
  if (!m) return null;
  return { major: Number(m[1]), minor: Number(m[2]), patch: Number(m[3]) };
}

/**
 * §10.3.8.3 — Priority: PROHIBITED > BREAKING_SEMANTIC >
 *              MIGRATION_REQUIRED > BACKWARD_COMPATIBLE > ADDITIVE_SAFE.
 *
 * §10.3.8.5 — Semantic changes to hypothesis family meaning, primary
 * candidate semantics, spread class meaning, restriction right meaning,
 * replay-hash material, or ranking semantics are BREAKING_SEMANTIC when
 * expressed as `semantically_changed_fields`. Changing enum
 * vocabularies (e.g. new confidence band) is MIGRATION_REQUIRED.
 */
export function classifyL10ContractDelta(
  delta: L10ContractDelta,
): L10ContractCompatibilityClass {
  if (delta.prohibited_change) return L10ContractCompatibilityClass.PROHIBITED;
  if (delta.semantically_changed_fields.length > 0)
    return L10ContractCompatibilityClass.BREAKING_SEMANTIC;
  if (delta.removed_fields.length > 0)
    return L10ContractCompatibilityClass.MIGRATION_REQUIRED;
  if (delta.changed_enum_vocabularies.length > 0)
    return L10ContractCompatibilityClass.MIGRATION_REQUIRED;
  if (delta.changed_default_policies.length > 0)
    return L10ContractCompatibilityClass.BACKWARD_COMPATIBLE;
  if (delta.added_fields.length > 0)
    return L10ContractCompatibilityClass.ADDITIVE_SAFE;
  return L10ContractCompatibilityClass.ADDITIVE_SAFE;
}

export function isLegalL10ContractUpgrade(
  delta: L10ContractDelta,
  opts: {
    allowBreaking?: boolean;
    allowMigrationRequired?: boolean;
  } = {},
): boolean {
  const cls = classifyL10ContractDelta(delta);
  switch (cls) {
    case L10ContractCompatibilityClass.ADDITIVE_SAFE:
    case L10ContractCompatibilityClass.BACKWARD_COMPATIBLE:
      return true;
    case L10ContractCompatibilityClass.MIGRATION_REQUIRED:
      return opts.allowMigrationRequired === true;
    case L10ContractCompatibilityClass.BREAKING_SEMANTIC:
      return opts.allowBreaking === true;
    case L10ContractCompatibilityClass.PROHIBITED:
      return false;
  }
}

export interface L10ContractVersionRefs {
  readonly subject_contract_version: string;
  readonly candidate_contract_version: string;
  readonly output_contract_version: string;
  readonly ranking_contract_version: string;
  readonly spread_contract_version: string;
  readonly shift_condition_contract_version: string;
  readonly restriction_contract_version: string;
  readonly schema_version: string;
  readonly policy_version: string;
}

export const L10_CURRENT_CONTRACT_VERSIONS: L10ContractVersionRefs = {
  subject_contract_version: '10.3.0',
  candidate_contract_version: '10.3.0',
  output_contract_version: '10.3.0',
  ranking_contract_version: '10.3.0',
  spread_contract_version: '10.3.0',
  shift_condition_contract_version: '10.3.0',
  restriction_contract_version: '10.3.0',
  schema_version: '10.3.0',
  policy_version: 'l10.3-policy-v1',
};

/**
 * §10.3.8.2 — Deterministic FNV-1a used by every L10.3 contract
 * replay-hash builder. Kept disjoint from L10.2's FNV (which is keyed
 * the same way but hashes different canonical material) by virtue of
 * the distinct canonicalization inputs. Namespaced via the `l10c_`
 * prefix on the returned hash.
 */
export function l10ContractFnv1aHex(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

export function buildL10ContractReplayHash(canonical: string): string {
  return `l10c_${l10ContractFnv1aHex(canonical)}`;
}
