/**
 * L11.8 — Materialization Policy (§11.8.5)
 *
 * Pure helpers that decide whether a given materialization mode is
 * legal for a given durable surface and persistence class. Used by
 * the persistence-envelope validator and audit pass.
 */

import {
  L11DurableSurfaceId,
  L11MaterializationMode,
  L11PersistenceClass,
  L11StorageAuthorityClass,
  isL11PersistenceClassMatchingSurface,
} from '../contracts/l11-persistence-surface';
import {
  getL11DurableSurfaceDescriptor,
} from '../registry/l11-durable-surface.registry';

export interface L11MaterializationPolicyDecision {
  readonly admitted: boolean;
  readonly reason: string;
}

export function evaluateL11MaterializationPolicy(args: {
  surface_id: L11DurableSurfaceId;
  mode: L11MaterializationMode;
  persistence_class: L11PersistenceClass;
}): L11MaterializationPolicyDecision {
  const desc = getL11DurableSurfaceDescriptor(args.surface_id);
  if (!desc) {
    return { admitted: false, reason: `surface ${args.surface_id} unregistered` };
  }
  if (!isL11PersistenceClassMatchingSurface(args.persistence_class, args.surface_id)) {
    return {
      admitted: false,
      reason: `persistence_class ${args.persistence_class} not allowed for surface ${args.surface_id}`,
    };
  }
  if (!desc.materialization_modes_allowed.includes(args.mode)) {
    return {
      admitted: false,
      reason: `materialization mode ${args.mode} not allowed for surface ${args.surface_id}`,
    };
  }
  return { admitted: true, reason: 'ok' };
}

export function isL11SurfaceCurrentAuthority(
  surface_id: L11DurableSurfaceId,
): boolean {
  const desc = getL11DurableSurfaceDescriptor(surface_id);
  return !!desc && desc.current_authority;
}

export function isL11SurfaceAppendOnly(
  surface_id: L11DurableSurfaceId,
): boolean {
  const desc = getL11DurableSurfaceDescriptor(surface_id);
  return !!desc && desc.append_only;
}

export function isL11SurfacePostgresAuthority(
  surface_id: L11DurableSurfaceId,
): boolean {
  const desc = getL11DurableSurfaceDescriptor(surface_id);
  return !!desc &&
    desc.authority_class === L11StorageAuthorityClass.POSTGRES_CURRENT_AUTHORITY &&
    desc.current_authority;
}

/**
 * §11.8.5.3 — illegal mode behaviour. Pure boolean helpers used by
 * validators to flag specific cross-mode misuse.
 */
export function isL11ReplayWritingCurrent(args: {
  surface_id: L11DurableSurfaceId;
  mode: L11MaterializationMode;
}): boolean {
  return (
    args.mode === L11MaterializationMode.REPLAY_HISTORICAL &&
    isL11SurfaceCurrentAuthority(args.surface_id)
  );
}

export function isL11FailureWrittenAsScoreState(args: {
  surface_id: L11DurableSurfaceId;
  persistence_class: L11PersistenceClass;
}): boolean {
  if (args.persistence_class !== L11PersistenceClass.SCORE_FAILURE) return false;
  return args.surface_id !== L11DurableSurfaceId.SCORE_FAILURES;
}
