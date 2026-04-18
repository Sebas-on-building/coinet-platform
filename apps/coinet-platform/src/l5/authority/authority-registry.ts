/**
 * L5.2 Authority Model — Authority Registry
 *
 * §5.2.3 — One datum has one authoritative home.
 *
 * Runtime registry that tracks declared authority homes per datum family
 * and prevents dual-authority violations.
 */

import { L5AuthorityStore } from './authority-store';
import { L5AuthorityError, L5AuthorityErrorCode } from './authority-errors';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface AuthorityRegistration {
  readonly datumFamily: string;
  readonly authorityStore: L5AuthorityStore;
  readonly registeredBy: string;
  readonly registeredAt: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// REGISTRY
// ═══════════════════════════════════════════════════════════════════════════════

const _authorityHomes = new Map<string, AuthorityRegistration>();

export function declareAuthorityHome(datumFamily: string, store: L5AuthorityStore, registeredBy: string): AuthorityRegistration {
  const existing = _authorityHomes.get(datumFamily);
  if (existing && existing.authorityStore !== store) {
    throw new L5AuthorityError(
      L5AuthorityErrorCode.DUAL_AUTHORITY,
      `Datum family '${datumFamily}' already has authority in '${existing.authorityStore}' (registered by '${existing.registeredBy}'). Cannot also assign to '${store}'.`,
      { datumFamily, existingStore: existing.authorityStore, requestedStore: store },
    );
  }

  if (existing && existing.authorityStore === store) {
    return existing;
  }

  const reg: AuthorityRegistration = {
    datumFamily,
    authorityStore: store,
    registeredBy,
    registeredAt: new Date().toISOString(),
  };
  _authorityHomes.set(datumFamily, reg);
  return reg;
}

export function getAuthorityHome(datumFamily: string): AuthorityRegistration | undefined {
  return _authorityHomes.get(datumFamily);
}

export function getAllAuthorityHomes(): readonly AuthorityRegistration[] {
  return [..._authorityHomes.values()];
}

export function hasAuthorityHome(datumFamily: string): boolean {
  return _authorityHomes.has(datumFamily);
}

/**
 * Check whether a specific store is the authority home for a datum family.
 */
export function isAuthorityHomeFor(datumFamily: string, store: L5AuthorityStore): boolean {
  const reg = _authorityHomes.get(datumFamily);
  return reg?.authorityStore === store;
}

export function resetAuthorityRegistry(): void {
  _authorityHomes.clear();
}
