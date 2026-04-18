/**
 * L6.3 — Contract Versioning
 *
 * §6.3.2.4 / §6.3.8.2 — Every primitive contract must be versioned, diffable,
 * and backward-checkable. This module parses "vMAJOR(.MINOR)(.PATCH)" tags
 * and exposes deterministic comparison / compatibility classification.
 */

export interface SemanticVersion {
  readonly major: number;
  readonly minor: number;
  readonly patch: number;
  readonly prerelease: string | null;
}

const SEMVER_PATTERN = /^v(\d+)(?:\.(\d+))?(?:\.(\d+))?(?:-([a-z0-9._-]+))?$/i;

export function parseContractVersion(tag: string): SemanticVersion | null {
  if (!tag || typeof tag !== 'string') return null;
  const m = SEMVER_PATTERN.exec(tag);
  if (!m) return null;
  return {
    major: parseInt(m[1], 10),
    minor: m[2] ? parseInt(m[2], 10) : 0,
    patch: m[3] ? parseInt(m[3], 10) : 0,
    prerelease: m[4] ?? null,
  };
}

export function compareContractVersions(a: SemanticVersion, b: SemanticVersion): number {
  if (a.major !== b.major) return a.major - b.major;
  if (a.minor !== b.minor) return a.minor - b.minor;
  if (a.patch !== b.patch) return a.patch - b.patch;
  if (a.prerelease === b.prerelease) return 0;
  if (a.prerelease === null) return 1;
  if (b.prerelease === null) return -1;
  return a.prerelease < b.prerelease ? -1 : 1;
}

export enum L6ContractCompatibilityClass {
  COMPATIBLE = 'COMPATIBLE',
  MINOR_CHANGE = 'MINOR_CHANGE',
  BREAKING = 'BREAKING',
  INVALID_VERSION = 'INVALID_VERSION',
}

export interface ContractVersionDelta {
  readonly fromTag: string;
  readonly toTag: string;
  readonly from: SemanticVersion | null;
  readonly to: SemanticVersion | null;
  readonly classification: L6ContractCompatibilityClass;
  readonly reason: string;
}

export function classifyVersionDelta(fromTag: string, toTag: string): ContractVersionDelta {
  const from = parseContractVersion(fromTag);
  const to = parseContractVersion(toTag);
  if (!from || !to) {
    return {
      fromTag, toTag, from, to,
      classification: L6ContractCompatibilityClass.INVALID_VERSION,
      reason: 'One or both version tags are not valid L6 contract versions.',
    };
  }
  if (to.major > from.major) {
    return { fromTag, toTag, from, to,
      classification: L6ContractCompatibilityClass.BREAKING,
      reason: 'Major version increased; breaking change expected.' };
  }
  if (to.major < from.major) {
    return { fromTag, toTag, from, to,
      classification: L6ContractCompatibilityClass.BREAKING,
      reason: 'Major version decreased; backward-incompatible.' };
  }
  if (to.minor !== from.minor || to.patch !== from.patch) {
    return { fromTag, toTag, from, to,
      classification: L6ContractCompatibilityClass.MINOR_CHANGE,
      reason: 'Minor or patch version changed; additive or remedial change expected.' };
  }
  return { fromTag, toTag, from, to,
    classification: L6ContractCompatibilityClass.COMPATIBLE,
    reason: 'Versions are identical.' };
}

export function isSameMajor(a: string, b: string): boolean {
  const av = parseContractVersion(a);
  const bv = parseContractVersion(b);
  if (!av || !bv) return false;
  return av.major === bv.major;
}

export function resolveLatestVersion(tags: readonly string[]): string | null {
  const parsed = tags
    .map(t => ({ tag: t, ver: parseContractVersion(t) }))
    .filter(x => x.ver !== null) as { tag: string; ver: SemanticVersion }[];
  if (parsed.length === 0) return null;
  parsed.sort((a, b) => compareContractVersions(a.ver, b.ver));
  return parsed[parsed.length - 1].tag;
}
