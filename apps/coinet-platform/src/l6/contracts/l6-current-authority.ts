/**
 * L6.7 — Current-State Authority Contracts
 *
 * §6.7.4 — Current feature state and current event state must be authoritative
 * in Postgres registries. Redis may accelerate reads but may never become
 * shadow authority. This contract surface encodes the classes and supersession
 * law (§6.7.4.5, §6.7.4.6, §6.7.4.7).
 */

import {
  L6MaterializationMode,
  isRematerializationMode,
} from './l6-persistence-surface';

/**
 * §6.7.4.1, §6.7.4.7 — Which store is permitted to hold a given class of
 * current truth. Only POSTGRES_AUTHORITY is authoritative; REDIS_ACCELERATED
 * is permitted as a derivative cache that must be reconstructable from
 * Postgres authority plus object-store pointers.
 */
export enum L6CurrentAuthorityClass {
  POSTGRES_AUTHORITY = 'POSTGRES_AUTHORITY',
  REDIS_ACCELERATED = 'REDIS_ACCELERATED',
}

export const ALL_CURRENT_AUTHORITY_CLASSES: readonly L6CurrentAuthorityClass[] =
  Object.values(L6CurrentAuthorityClass);

export function isShadowAuthority(c: L6CurrentAuthorityClass | string): boolean {
  return c !== L6CurrentAuthorityClass.POSTGRES_AUTHORITY &&
    c !== L6CurrentAuthorityClass.REDIS_ACCELERATED;
}

/**
 * §6.7.4.5 — Legal reasons a current-state row may supersede a prior row.
 */
export enum L6SupersessionReason {
  LIVE_ADVANCE = 'LIVE_ADVANCE',
  REPLAY_TAGGED_REBUILD = 'REPLAY_TAGGED_REBUILD',
  REPAIR_TAGGED_REBUILD = 'REPAIR_TAGGED_REBUILD',
  LATE_DATA_GOVERNED_REMATERIALIZATION = 'LATE_DATA_GOVERNED_REMATERIALIZATION',
}

export const ALL_SUPERSESSION_REASONS: readonly L6SupersessionReason[] =
  Object.values(L6SupersessionReason);

/**
 * §6.7.4.5 — Mapping from materialization mode to the only supersession
 * reason that mode may legally produce.
 */
export const LEGAL_SUPERSESSION_BY_MODE: Readonly<
  Record<L6MaterializationMode, L6SupersessionReason>
> = Object.freeze({
  [L6MaterializationMode.LIVE_MATERIALIZATION]: L6SupersessionReason.LIVE_ADVANCE,
  [L6MaterializationMode.REPLAY_MATERIALIZATION]: L6SupersessionReason.REPLAY_TAGGED_REBUILD,
  [L6MaterializationMode.REPAIR_MATERIALIZATION]: L6SupersessionReason.REPAIR_TAGGED_REBUILD,
  [L6MaterializationMode.LATE_DATA_GOVERNED_REMATERIALIZATION]:
    L6SupersessionReason.LATE_DATA_GOVERNED_REMATERIALIZATION,
});

export interface L6CurrentStateSupersession {
  readonly prior_row_id: string | null;
  readonly superseded_at: string;
  readonly reason: L6SupersessionReason;
  readonly materialization_mode: L6MaterializationMode;
  readonly prior_replay_hash: string | null;
  readonly new_replay_hash: string;
}

export interface L6CurrentStateWriteIntent {
  readonly primitive_id: string;
  readonly primitive_version: string;
  readonly scope_type: string;
  readonly scope_id: string;
  readonly authority_class: L6CurrentAuthorityClass;
  readonly materialization_mode: L6MaterializationMode;
  readonly contract_version: string;
  readonly definition_rollout_active: boolean;
  readonly contract_validated: boolean;
  readonly temporal_legality_passed: boolean;
  readonly manifest_id: string | null;
  readonly prior_as_of: string | null;
  readonly new_as_of: string;
  readonly prior_replay_hash: string | null;
  readonly new_replay_hash: string;
  readonly supersession: L6CurrentStateSupersession | null;
}

/**
 * §6.7.4.6 — A current-state row may be silently replaced only if the mode is
 * LIVE_MATERIALIZATION (legal live advance). Any rematerialization mode
 * requires explicit supersession tagging; replay outputs may not pretend to
 * be live current state.
 */
export function requiresExplicitSupersession(m: L6MaterializationMode): boolean {
  return isRematerializationMode(m) || m === L6MaterializationMode.REPLAY_MATERIALIZATION;
}
