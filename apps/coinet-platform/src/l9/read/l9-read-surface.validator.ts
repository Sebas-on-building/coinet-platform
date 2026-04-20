/**
 * L9.8 — Read Surface Validator
 *
 * §9.8.7 / INV-9.8-E — Validates a read request against its
 * read-surface descriptor. Rejects unregistered surfaces, illegal
 * modes, illegal consumers, missing guard flags, and raw-storage
 * spoofing.
 */

import {
  L9ReadGuardFlag,
  L9ReadMode,
  L9ReadRequest,
  L9ReadSurface,
} from '../contracts/l9-read-surface';
import { L9ReadSurfaceRegistry } from '../registry/l9-read-surface.registry';
import {
  L9PersistenceViolation,
  L9PersistenceViolationCode,
  L9PersistenceViolationTier,
  l9PersistenceViolationTier,
} from '../persistence/l9-persistence-violation-codes';

export interface L9ReadSurfaceValidationResult {
  readonly ok: boolean;
  readonly violations: readonly L9PersistenceViolation[];
  readonly surface: L9ReadSurface | null;
}

export function validateL9ReadRequest(
  request: L9ReadRequest,
  registry: L9ReadSurfaceRegistry = L9ReadSurfaceRegistry.default(),
): L9ReadSurfaceValidationResult {
  const violations: L9PersistenceViolation[] = [];

  const surface = registry.get(request.read_surface_id);
  if (!surface) {
    violations.push(v(
      L9PersistenceViolationCode.READ_SURFACE_UNREGISTERED,
      `Read surface ${request.read_surface_id} is not registered.`,
    ));
    return { ok: false, violations, surface: null };
  }

  if (!surface.allowed_read_modes.includes(request.read_mode)) {
    violations.push(v(
      L9PersistenceViolationCode.READ_MODE_ILLEGAL_FOR_SURFACE,
      `Mode ${request.read_mode} illegal for ${surface.read_surface_id}.`,
    ));
  }

  if (!surface.allowed_consumer_classes.includes(request.consumer_class)) {
    violations.push(v(
      L9PersistenceViolationCode.READ_CONSUMER_NOT_ALLOWED,
      `Consumer ${request.consumer_class} not allowed to read ` +
        `${surface.read_surface_id}.`,
    ));
  }

  for (const flag of surface.required_guard_flags) {
    if (!request.guard_flags.includes(flag)) {
      violations.push(v(
        L9PersistenceViolationCode.READ_GUARD_FLAG_MISSING,
        `Read request to ${surface.read_surface_id} missing guard ` +
          `flag ${flag}.`,
      ));
    }
  }

  if ((request.raw_storage_path_attempted as boolean) !== false) {
    violations.push(v(
      L9PersistenceViolationCode.READ_RAW_STORAGE_BYPASS,
      `Raw-storage bypass attempted on ${surface.read_surface_id}.`,
    ));
  }

  // §9.8.7.6 — replay/repair mode only on surfaces that allow it.
  if (request.read_mode === L9ReadMode.REPLAY_HISTORICAL && !surface.replay_view_allowed) {
    violations.push(v(
      L9PersistenceViolationCode.READ_REPLAY_MODE_ON_NON_REPLAY_SURFACE,
      `REPLAY_HISTORICAL not allowed on ${surface.read_surface_id}.`,
    ));
  }
  if (request.read_mode === L9ReadMode.REPAIR_VIEW && !surface.repair_view_allowed) {
    violations.push(v(
      L9PersistenceViolationCode.READ_REPAIR_MODE_ON_NON_REPAIR_SURFACE,
      `REPAIR_VIEW not allowed on ${surface.read_surface_id}.`,
    ));
  }

  // §9.8.7.6 — current requested from historical-only surface.
  if (
    request.read_mode === L9ReadMode.LIVE_CURRENT &&
    !surface.allowed_read_modes.includes(L9ReadMode.LIVE_CURRENT)
  ) {
    violations.push(v(
      L9PersistenceViolationCode.READ_CURRENT_FROM_HISTORICAL_ONLY_SURFACE,
      `LIVE_CURRENT requested from historical-only surface ` +
        `${surface.read_surface_id}.`,
    ));
  }

  // §9.8.7.6 — scope identity must be present.
  if (!request.scope_type || !request.scope_id) {
    violations.push(v(
      L9PersistenceViolationCode.READ_SCOPE_IDENTITY_MISSING,
      `Read request to ${surface.read_surface_id} missing scope identity.`,
    ));
  }

  // §9.8.7.3 — window sanity.
  if (request.window_start && request.window_end &&
      request.window_start > request.window_end) {
    violations.push(v(
      L9PersistenceViolationCode.READ_WINDOW_INVALID,
      `Read window invalid: ${request.window_start} > ` +
        `${request.window_end}.`,
    ));
  }

  // §9.8.7.3 — at least one guard flag must be present; the enum
  // trivially catches most, but when a surface declared no required
  // flags we still require the caller to acknowledge no-rebuild.
  if (surface.required_guard_flags.length === 0 &&
      !request.guard_flags.includes(L9ReadGuardFlag.ACKNOWLEDGES_NO_REBUILD)) {
    violations.push(v(
      L9PersistenceViolationCode.READ_GUARD_FLAG_MISSING,
      `Read to ${surface.read_surface_id} missing ` +
        `ACKNOWLEDGES_NO_REBUILD.`,
    ));
  }

  return { ok: violations.length === 0, violations, surface };
}

function v(
  code: L9PersistenceViolationCode,
  detail: string,
): L9PersistenceViolation {
  return {
    code,
    tier: l9PersistenceViolationTier(code) as L9PersistenceViolationTier,
    detail,
  };
}
