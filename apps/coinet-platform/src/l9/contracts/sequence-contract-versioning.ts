/**
 * L9.3 — Contract Versioning and Compatibility
 *
 * §9.3.7.1 – §9.3.7.5 — Every L9.3 contract surface (subject, output,
 * lead-lag, chain, phase, decay, post-event, restriction) must be
 * versioned and a delta between two versions must be classifiable.
 *
 * Breaking changes that silently reinterpret sequence meaning,
 * coexistence law, or replay identity are the most dangerous possible
 * change shapes at L9 because they can turn an old green assessment
 * into a new red one without anyone noticing. The vocabulary below is
 * aligned with L6.9 / L7.9 / L8.3 so the whole platform speaks one
 * compatibility language.
 */

/**
 * §9.3.7.3 — Compatibility classes. Ordered from least to most disruptive.
 */
export enum L9ContractCompatibilityClass {
  ADDITIVE_SAFE = 'ADDITIVE_SAFE',
  BACKWARD_COMPATIBLE = 'BACKWARD_COMPATIBLE',
  MIGRATION_REQUIRED = 'MIGRATION_REQUIRED',
  BREAKING_SEMANTIC = 'BREAKING_SEMANTIC',
  PROHIBITED = 'PROHIBITED',
}

export const ALL_L9_CONTRACT_COMPATIBILITY_CLASSES:
  readonly L9ContractCompatibilityClass[] =
    Object.values(L9ContractCompatibilityClass);

/**
 * §9.3.7.1 — Contract surfaces. One per first-class L9.3 object family.
 */
export enum L9ContractSurface {
  SUBJECT = 'SUBJECT',
  OUTPUT = 'OUTPUT',
  LEAD_LAG = 'LEAD_LAG',
  CHAIN = 'CHAIN',
  PHASE = 'PHASE',
  DECAY = 'DECAY',
  POST_EVENT = 'POST_EVENT',
  RESTRICTION = 'RESTRICTION',
}

export const ALL_L9_CONTRACT_SURFACES: readonly L9ContractSurface[] =
  Object.values(L9ContractSurface);

export interface L9ContractVersion {
  readonly surface: L9ContractSurface;
  readonly version: string;
  readonly schema_version: string;
  readonly superseded_versions: readonly string[];
}

export interface L9ContractDelta {
  readonly surface: L9ContractSurface;
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
 * §9.3.7.1 — Deterministic semver compare. Returns -1, 0, +1. Rejects
 * non-semver strings by returning 0 (so non-monotonic validators treat
 * them as a version that did not advance).
 */
export function compareL9ContractVersions(a: string, b: string): number {
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
 * §9.3.7.3 — `classifyL9ContractDelta`.
 *
 * Priority: PROHIBITED > BREAKING_SEMANTIC > MIGRATION_REQUIRED >
 *           BACKWARD_COMPATIBLE > ADDITIVE_SAFE.
 *
 * §9.3.7.4 — semantic changes to sequence family, primary state,
 * coexistence law, phase class meaning, decay class meaning, or
 * restriction-profile meaning are BREAKING_SEMANTIC when expressed as
 * `semantically_changed_fields`. Changing enum vocabularies (e.g. new
 * state meaning) is MIGRATION_REQUIRED.
 */
export function classifyL9ContractDelta(
  delta: L9ContractDelta,
): L9ContractCompatibilityClass {
  if (delta.prohibited_change) return L9ContractCompatibilityClass.PROHIBITED;
  if (delta.semantically_changed_fields.length > 0)
    return L9ContractCompatibilityClass.BREAKING_SEMANTIC;
  if (delta.removed_fields.length > 0)
    return L9ContractCompatibilityClass.MIGRATION_REQUIRED;
  if (delta.changed_enum_vocabularies.length > 0)
    return L9ContractCompatibilityClass.MIGRATION_REQUIRED;
  if (delta.changed_default_policies.length > 0)
    return L9ContractCompatibilityClass.BACKWARD_COMPATIBLE;
  if (delta.added_fields.length > 0)
    return L9ContractCompatibilityClass.ADDITIVE_SAFE;
  return L9ContractCompatibilityClass.ADDITIVE_SAFE;
}

/**
 * Returns true if a proposed delta is legal. MIGRATION_REQUIRED is
 * legal only under explicit migration discipline; PROHIBITED never.
 */
export function isLegalL9ContractUpgrade(
  delta: L9ContractDelta,
  opts: {
    allowBreaking?: boolean;
    allowMigrationRequired?: boolean;
  } = {},
): boolean {
  const cls = classifyL9ContractDelta(delta);
  switch (cls) {
    case L9ContractCompatibilityClass.ADDITIVE_SAFE:
    case L9ContractCompatibilityClass.BACKWARD_COMPATIBLE:
      return true;
    case L9ContractCompatibilityClass.MIGRATION_REQUIRED:
      return opts.allowMigrationRequired === true;
    case L9ContractCompatibilityClass.BREAKING_SEMANTIC:
      return opts.allowBreaking === true;
    case L9ContractCompatibilityClass.PROHIBITED:
      return false;
  }
}

export interface L9ContractVersionRefs {
  readonly subject_contract_version: string;
  readonly output_contract_version: string;
  readonly lead_lag_contract_version: string;
  readonly chain_contract_version: string;
  readonly phase_contract_version: string;
  readonly decay_contract_version: string;
  readonly post_event_contract_version: string;
  readonly restriction_contract_version: string;
  readonly schema_version: string;
  readonly policy_version: string;
}

export const L9_CURRENT_CONTRACT_VERSIONS: L9ContractVersionRefs = {
  subject_contract_version: '9.3.0',
  output_contract_version: '9.3.0',
  lead_lag_contract_version: '9.3.0',
  chain_contract_version: '9.3.0',
  phase_contract_version: '9.3.0',
  decay_contract_version: '9.3.0',
  post_event_contract_version: '9.3.0',
  restriction_contract_version: '9.3.0',
  schema_version: '9.3.0',
  policy_version: 'l9.3-policy-v1',
};

/**
 * §9.3.7.2 — Deterministic FNV-1a used by every L9.3 contract object's
 * replay-hash builder. Kept disjoint from the L9.2 FNV so hashes built
 * through the contract layer are namespaced.
 */
export function l9ContractFnv1aHex(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

export function buildL9ContractReplayHash(canonical: string): string {
  return `srhash_${l9ContractFnv1aHex(canonical)}`;
}
