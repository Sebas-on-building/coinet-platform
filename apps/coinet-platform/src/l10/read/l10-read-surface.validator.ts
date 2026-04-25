/**
 * L10.8 — Read Surface Validator
 *
 * §10.8.7 / INV-10.8-E — Validates a read request against its
 * read-surface descriptor. Rejects unregistered surfaces, illegal
 * modes, illegal consumers, missing guard flags, raw-storage
 * spoofing, and rebuild-from-lower-layers attempts.
 */

import {
  L10ReadGuardFlag,
  L10ReadMode,
  L10ReadRequest,
  L10ReadSurface,
  L10ReadSurfaceId,
} from '../contracts/l10-read-surface';
import { L10ReadSurfaceRegistry } from '../registry/l10-read-surface.registry';
import {
  L10PersistenceViolation,
  L10PersistenceViolationCode,
  L10PersistenceViolationTier,
  l10PersistenceViolationTier,
} from '../persistence/l10-persistence-violation-codes';

export interface L10ReadSurfaceValidationResult {
  readonly ok: boolean;
  readonly violations: readonly L10PersistenceViolation[];
  readonly surface: L10ReadSurface | null;
}

export function validateL10ReadRequest(
  request: L10ReadRequest,
  registry: L10ReadSurfaceRegistry = L10ReadSurfaceRegistry.default(),
): L10ReadSurfaceValidationResult {
  const violations: L10PersistenceViolation[] = [];

  const surface = registry.get(request.read_surface_id);
  if (!surface) {
    violations.push(v(
      L10PersistenceViolationCode.READ_SURFACE_UNREGISTERED,
      `Read surface ${request.read_surface_id} is not registered.`,
    ));
    return { ok: false, violations, surface: null };
  }

  if (!surface.allowed_read_modes.includes(request.read_mode)) {
    violations.push(v(
      L10PersistenceViolationCode.READ_MODE_ILLEGAL_FOR_SURFACE,
      `Mode ${request.read_mode} illegal for ${surface.read_surface_id}.`,
    ));
  }

  if (!surface.allowed_consumer_classes.includes(request.consumer_class)) {
    violations.push(v(
      L10PersistenceViolationCode.READ_CONSUMER_NOT_ALLOWED,
      `Consumer ${request.consumer_class} not allowed to read ` +
        `${surface.read_surface_id}.`,
    ));
  }

  for (const flag of surface.required_guard_flags) {
    if (!request.declared_guard_flags.includes(flag)) {
      violations.push(v(
        L10PersistenceViolationCode.READ_GUARD_FLAG_MISSING,
        `Read request to ${surface.read_surface_id} missing guard ` +
          `flag ${flag}.`,
      ));
    }
  }

  if ((request.bypasses_read_surface as boolean) !== false) {
    violations.push(v(
      L10PersistenceViolationCode.READ_RAW_STORAGE_BYPASS,
      `Raw-storage bypass attempted on ${surface.read_surface_id}.`,
    ));
  }

  if ((request.rebuilds_from_lower_layers as boolean) !== false) {
    violations.push(v(
      L10PersistenceViolationCode.DOWNSTREAM_REBUILD_FROM_LOWER_LAYERS,
      `Read request to ${surface.read_surface_id} declared ` +
        `rebuilds_from_lower_layers=true (INV-10.8-F).`,
    ));
  }

  // §10.8.7.6 — replay/repair mode only on surfaces that allow it.
  if (
    request.read_mode === L10ReadMode.REPLAY_HISTORICAL &&
    !surface.allows_replay_or_repair_views
  ) {
    violations.push(v(
      L10PersistenceViolationCode.READ_REPLAY_MODE_ON_NON_REPLAY_SURFACE,
      `REPLAY_HISTORICAL not allowed on ${surface.read_surface_id}.`,
    ));
  }
  if (
    request.read_mode === L10ReadMode.REPAIR_VIEW &&
    !surface.allows_replay_or_repair_views
  ) {
    violations.push(v(
      L10PersistenceViolationCode.READ_REPAIR_MODE_ON_NON_REPAIR_SURFACE,
      `REPAIR_VIEW not allowed on ${surface.read_surface_id}.`,
    ));
  }

  // §10.8.7.6 — current requested from historical-only surface.
  if (
    request.read_mode === L10ReadMode.LIVE_CURRENT &&
    !surface.allowed_read_modes.includes(L10ReadMode.LIVE_CURRENT)
  ) {
    violations.push(v(
      L10PersistenceViolationCode.READ_CURRENT_FROM_HISTORICAL_ONLY_SURFACE,
      `LIVE_CURRENT requested from historical-only surface ` +
        `${surface.read_surface_id}.`,
    ));
  }

  // §10.8.7.6 — identity checks depend on surface kind.
  const needsScope = l10ReadSurfaceRequiresScope(surface.read_surface_id);
  const needsEvidenceSubject =
    surface.read_surface_id ===
    L10ReadSurfaceId.HYPOTHESIS_EVIDENCE_BUNDLE_BY_SUBJECT;
  const needsRunId =
    surface.read_surface_id === L10ReadSurfaceId.HYPOTHESIS_LINEAGE_BY_RUN_ID;

  if (needsScope && (!request.scope_type || !request.scope_id)) {
    violations.push(v(
      L10PersistenceViolationCode.READ_SCOPE_IDENTITY_MISSING,
      `Read request to ${surface.read_surface_id} missing scope identity.`,
    ));
  }
  if (needsEvidenceSubject && !request.evidence_subject_id) {
    violations.push(v(
      L10PersistenceViolationCode.READ_SCOPE_IDENTITY_MISSING,
      `Evidence read to ${surface.read_surface_id} missing ` +
        `evidence_subject_id.`,
    ));
  }
  if (needsRunId && !request.compute_run_id) {
    violations.push(v(
      L10PersistenceViolationCode.READ_SCOPE_IDENTITY_MISSING,
      `Lineage read to ${surface.read_surface_id} missing compute_run_id.`,
    ));
  }

  // §10.8.7.3 — window sanity for historical windowed reads.
  if (
    request.window_start &&
    request.window_end &&
    request.window_start > request.window_end
  ) {
    violations.push(v(
      L10PersistenceViolationCode.READ_WINDOW_INVALID,
      `Read window invalid: ${request.window_start} > ` +
        `${request.window_end}.`,
    ));
  }

  // §10.8.7.3 — if surface didn't declare any required guards we still
  // require the caller to acknowledge the no-rebuild law.
  if (
    surface.required_guard_flags.length === 0 &&
    !request.declared_guard_flags.includes(
      L10ReadGuardFlag.REQUIRES_NO_REBUILD_FROM_LOWER_LAYERS,
    )
  ) {
    violations.push(v(
      L10PersistenceViolationCode.READ_GUARD_FLAG_MISSING,
      `Read to ${surface.read_surface_id} missing ` +
        `REQUIRES_NO_REBUILD_FROM_LOWER_LAYERS.`,
    ));
  }

  return { ok: violations.length === 0, violations, surface };
}

function l10ReadSurfaceRequiresScope(id: L10ReadSurfaceId): boolean {
  switch (id) {
    case L10ReadSurfaceId.HYPOTHESIS_EVIDENCE_BUNDLE_BY_SUBJECT:
    case L10ReadSurfaceId.HYPOTHESIS_LINEAGE_BY_RUN_ID:
      return false;
    default:
      return true;
  }
}

function v(
  code: L10PersistenceViolationCode,
  detail: string,
): L10PersistenceViolation {
  return {
    code,
    tier: l10PersistenceViolationTier(code) as L10PersistenceViolationTier,
    detail,
  };
}
