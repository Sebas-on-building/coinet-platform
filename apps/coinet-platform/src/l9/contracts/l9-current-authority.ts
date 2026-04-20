/**
 * L9.8 — Current Authority Law
 *
 * §9.8.5 — Current sequence truth must be authoritative in Postgres.
 * Redis may accelerate reads; it may never become shadow authority
 * (§9.8.5.1 / §9.8.5.5 / INV-9.8-B).
 */

import { L5AuthorityStore } from '../../l5/authority/authority-store';
import {
  L9DurableSurfaceId,
  L9MaterializationMode,
} from './l9-persistence-surface';

/**
 * §9.8.5.2 — Canonical current-authority aspects. Each aspect maps to
 * one current registry; validator code checks that registry is
 * Postgres-backed (INV-9.8-B).
 */
export enum L9CurrentAuthorityAspect {
  SEQUENCE_STATE = 'SEQUENCE_STATE',
  PHASE_STATE = 'PHASE_STATE',
  DECAY_STATE = 'DECAY_STATE',
  CONFIDENCE_STATE = 'CONFIDENCE_STATE',
  RESTRICTION_STATE = 'RESTRICTION_STATE',
  CAUSAL_RESTRAINT_STATE = 'CAUSAL_RESTRAINT_STATE',
}

export const ALL_L9_CURRENT_AUTHORITY_ASPECTS:
  readonly L9CurrentAuthorityAspect[] =
    Object.values(L9CurrentAuthorityAspect);

/**
 * §9.8.5.2 — Canonical binding from current aspect → durable surface.
 * Consumed by the current-authority validator (§9.8.5.6).
 */
export const L9_CURRENT_AUTHORITY_SURFACE_BY_ASPECT:
  Readonly<Record<L9CurrentAuthorityAspect, L9DurableSurfaceId>> = {
  [L9CurrentAuthorityAspect.SEQUENCE_STATE]:
    L9DurableSurfaceId.CURRENT_SEQUENCE_REGISTRY,
  [L9CurrentAuthorityAspect.PHASE_STATE]:
    L9DurableSurfaceId.CURRENT_PHASE_REGISTRY,
  [L9CurrentAuthorityAspect.DECAY_STATE]:
    L9DurableSurfaceId.CURRENT_DECAY_REGISTRY,
  [L9CurrentAuthorityAspect.CONFIDENCE_STATE]:
    L9DurableSurfaceId.CURRENT_SEQUENCE_CONFIDENCE_REGISTRY,
  [L9CurrentAuthorityAspect.RESTRICTION_STATE]:
    L9DurableSurfaceId.CURRENT_SEQUENCE_RESTRICTION_REGISTRY,
  [L9CurrentAuthorityAspect.CAUSAL_RESTRAINT_STATE]:
    L9DurableSurfaceId.CURRENT_CAUSAL_RESTRAINT_REGISTRY,
};

/**
 * §9.8.5.3 — Current authority must be Postgres.
 */
export const L9_CURRENT_AUTHORITY_REQUIRED_STORE: L5AuthorityStore =
  L5AuthorityStore.POSTGRES;

/**
 * §9.8.5.4 — Supersession record. Emitted every time a current row is
 * replaced (§9.8.5.6 forbids silent overwrite).
 */
export interface L9CurrentAuthoritySupersession {
  readonly durable_surface_id: L9DurableSurfaceId;
  readonly aspect: L9CurrentAuthorityAspect;
  readonly sequence_subject_id: string;
  readonly scope_type: string;
  readonly scope_id: string;
  readonly prior_envelope_id: string;
  readonly prior_replay_hash: string | null;
  readonly prior_as_of: string;
  readonly next_envelope_id: string;
  readonly next_as_of: string;
  readonly next_materialization_mode: L9MaterializationMode;
  readonly supersession_reason: string;
  readonly lineage_refs: readonly string[];
}

/**
 * §9.8.5.5 — Redis-acceleration declaration for a current-authority
 * surface. Redis is purely a serving accelerator; it is never
 * authoritative. Validators check that `authoritative === false` for
 * every Redis binding.
 */
export interface L9RedisAccelerationBinding {
  readonly durable_surface_id: L9DurableSurfaceId;
  readonly cache_namespace: string;
  readonly authoritative: false;
  readonly invalidation_on_supersede: true;
  readonly invalidation_on_repair: true;
  readonly invalidation_on_replay: true;
  readonly ttl_seconds: number | null;
}

/**
 * §9.8.5.6 — Legal materialization modes for writes into a current-
 * authority surface. Historical-only modes are rejected.
 */
export const L9_CURRENT_AUTHORITY_LEGAL_MODES:
  readonly L9MaterializationMode[] = [
    L9MaterializationMode.LIVE_CURRENT,
    L9MaterializationMode.REPAIR_REBUILD,
    L9MaterializationMode.LATE_DATA_REMATERIALIZATION,
  ];

/**
 * §9.8.5.6 — Helper: does `mode` legally write to current authority?
 */
export function l9CurrentAuthorityAcceptsMode(
  mode: L9MaterializationMode,
): boolean {
  return L9_CURRENT_AUTHORITY_LEGAL_MODES.includes(mode);
}
