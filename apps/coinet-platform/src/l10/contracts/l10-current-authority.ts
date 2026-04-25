/**
 * L10.8 — Current Authority Law
 *
 * §10.8.5 — Current hypothesis truth, ranking, spread, reliance,
 * confirmation, invalidation, and shift-condition state must be
 * authoritative in Postgres. Redis may accelerate reads; it may never
 * become shadow authority (§10.8.5.1 / §10.8.5.5 / INV-10.8-B).
 */

import { L5AuthorityStore } from '../../l5/authority/authority-store';
import {
  L10DurableSurfaceId,
  L10MaterializationMode,
} from './l10-persistence-surface';

/**
 * §10.8.5.2 — Canonical current-authority aspects. Each aspect maps to
 * exactly one current registry; the validator checks that registry is
 * Postgres-backed (INV-10.8-B) and accepts only current-authority
 * modes (§10.8.5.6).
 */
export enum L10CurrentAuthorityAspect {
  HYPOTHESIS_STATE = 'HYPOTHESIS_STATE',
  RANKING_STATE = 'RANKING_STATE',
  SPREAD_STATE = 'SPREAD_STATE',
  CONFIDENCE_STATE = 'CONFIDENCE_STATE',
  RESTRICTION_STATE = 'RESTRICTION_STATE',
  READINESS_STATE = 'READINESS_STATE',
  SHIFT_CONDITION_STATE = 'SHIFT_CONDITION_STATE',
  CONFIRMATION_STATE = 'CONFIRMATION_STATE',
  INVALIDATION_STATE = 'INVALIDATION_STATE',
}

export const ALL_L10_CURRENT_AUTHORITY_ASPECTS:
  readonly L10CurrentAuthorityAspect[] =
    Object.values(L10CurrentAuthorityAspect);

/**
 * §10.8.5.2 — Canonical binding from current aspect → durable surface.
 * Consumed by the current-authority validator (§10.8.5.6).
 */
export const L10_CURRENT_AUTHORITY_SURFACE_BY_ASPECT:
  Readonly<Record<L10CurrentAuthorityAspect, L10DurableSurfaceId>> = {
  [L10CurrentAuthorityAspect.HYPOTHESIS_STATE]:
    L10DurableSurfaceId.CURRENT_HYPOTHESIS_REGISTRY,
  [L10CurrentAuthorityAspect.RANKING_STATE]:
    L10DurableSurfaceId.CURRENT_HYPOTHESIS_RANKING_REGISTRY,
  [L10CurrentAuthorityAspect.SPREAD_STATE]:
    L10DurableSurfaceId.CURRENT_HYPOTHESIS_SPREAD_REGISTRY,
  [L10CurrentAuthorityAspect.CONFIDENCE_STATE]:
    L10DurableSurfaceId.CURRENT_HYPOTHESIS_CONFIDENCE_REGISTRY,
  [L10CurrentAuthorityAspect.RESTRICTION_STATE]:
    L10DurableSurfaceId.CURRENT_HYPOTHESIS_RESTRICTION_REGISTRY,
  [L10CurrentAuthorityAspect.READINESS_STATE]:
    L10DurableSurfaceId.CURRENT_HYPOTHESIS_READINESS_REGISTRY,
  [L10CurrentAuthorityAspect.SHIFT_CONDITION_STATE]:
    L10DurableSurfaceId.CURRENT_SHIFT_CONDITION_REGISTRY,
  [L10CurrentAuthorityAspect.CONFIRMATION_STATE]:
    L10DurableSurfaceId.CURRENT_CONFIRMATION_REGISTRY,
  [L10CurrentAuthorityAspect.INVALIDATION_STATE]:
    L10DurableSurfaceId.CURRENT_INVALIDATION_REGISTRY,
};

/**
 * §10.8.5.3 — Current authority must be Postgres.
 */
export const L10_CURRENT_AUTHORITY_REQUIRED_STORE: L5AuthorityStore =
  L5AuthorityStore.POSTGRES;

/**
 * §10.8.5.4 — Supersession record. Emitted every time a current row is
 * replaced (§10.8.5.6 forbids silent overwrite).
 */
export interface L10CurrentAuthoritySupersession {
  readonly durable_surface_id: L10DurableSurfaceId;
  readonly aspect: L10CurrentAuthorityAspect;
  readonly hypothesis_subject_id: string;
  readonly scope_type: string;
  readonly scope_id: string;
  readonly prior_envelope_id: string;
  readonly prior_replay_hash: string | null;
  readonly prior_as_of: string;
  readonly next_envelope_id: string;
  readonly next_as_of: string;
  readonly next_materialization_mode: L10MaterializationMode;
  readonly supersession_reason: string;
  readonly lineage_refs: readonly string[];
}

/**
 * §10.8.5.5 — Redis-acceleration declaration for a current-authority
 * surface. Redis is purely a serving accelerator; it is never
 * authoritative. Validators check that `authoritative === false` for
 * every Redis binding.
 */
export interface L10RedisAccelerationBinding {
  readonly durable_surface_id: L10DurableSurfaceId;
  readonly cache_namespace: string;
  readonly authoritative: false;
  readonly invalidation_on_supersede: true;
  readonly invalidation_on_repair: true;
  readonly invalidation_on_replay: true;
  readonly ttl_seconds: number | null;
}

/**
 * §10.8.5.6 — Legal materialization modes for writes into a current-
 * authority surface. Historical-only modes (LIVE_HISTORICAL_APPEND,
 * REPLAY_HISTORICAL) are rejected.
 */
export const L10_CURRENT_AUTHORITY_LEGAL_MODES:
  readonly L10MaterializationMode[] = [
    L10MaterializationMode.LIVE_CURRENT,
    L10MaterializationMode.REPAIR_REBUILD,
    L10MaterializationMode.LATE_DATA_REMATERIALIZATION,
  ];

/**
 * §10.8.5.6 — Helper: does `mode` legally write to current authority?
 */
export function l10CurrentAuthorityAcceptsMode(
  mode: L10MaterializationMode,
): boolean {
  return L10_CURRENT_AUTHORITY_LEGAL_MODES.includes(mode);
}
