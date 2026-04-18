/**
 * L5.2 Authority Model — Authority Tiers
 *
 * §5.2.5 — Every persisted datum carries one authority tier.
 */

export enum L5AuthorityTier {
  /** The one legal truth home for this datum class. */
  PRIMARY_AUTHORITY = 'PRIMARY_AUTHORITY',

  /** Non-authoritative projection mandatory for platform function or replay completeness. */
  REQUIRED_PROJECTION = 'REQUIRED_PROJECTION',

  /** Non-authoritative projection for speed or convenience; absence does not break authority. */
  OPTIONAL_PROJECTION = 'OPTIONAL_PROJECTION',

  /** Legal home for immutable evidence objects. */
  IMMUTABLE_EVIDENCE_AUTHORITY = 'IMMUTABLE_EVIDENCE_AUTHORITY',

  /** Coordination truth for write progression. */
  MANIFEST_AUTHORITY = 'MANIFEST_AUTHORITY',
}

export const ALL_AUTHORITY_TIERS: readonly L5AuthorityTier[] = [
  L5AuthorityTier.PRIMARY_AUTHORITY,
  L5AuthorityTier.REQUIRED_PROJECTION,
  L5AuthorityTier.OPTIONAL_PROJECTION,
  L5AuthorityTier.IMMUTABLE_EVIDENCE_AUTHORITY,
  L5AuthorityTier.MANIFEST_AUTHORITY,
];

export function isAuthorityTier(tier: L5AuthorityTier): boolean {
  return tier === L5AuthorityTier.PRIMARY_AUTHORITY
    || tier === L5AuthorityTier.IMMUTABLE_EVIDENCE_AUTHORITY
    || tier === L5AuthorityTier.MANIFEST_AUTHORITY;
}

export function isProjectionTier(tier: L5AuthorityTier): boolean {
  return tier === L5AuthorityTier.REQUIRED_PROJECTION
    || tier === L5AuthorityTier.OPTIONAL_PROJECTION;
}
