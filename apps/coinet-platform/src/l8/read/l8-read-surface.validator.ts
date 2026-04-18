/**
 * L8.8 — Read Surface Validator
 *
 * §8.8.7 / §8.8.8 — Validates every `L8ReadRequest` against the
 * governed read-surface registry. Catches:
 *   - unknown / unregistered read surfaces
 *   - illegal read modes for a given surface
 *   - consumer classes that aren't allowed on a surface
 *   - callers claiming raw-storage / redis-authority access
 *   - missing required scope / subject for scope-bound reads
 *   - current-from-historical or historical-from-current guessing
 */

import {
  L8ReadRequest,
  L8ReadSurfaceDescriptor,
} from '../contracts/l8-read-surface';
import {
  L8ReadSurfaceRegistry,
  getDefaultL8ReadSurfaceRegistry,
} from '../registry/read-surface.registry';
import {
  L8PersistenceViolation,
  L8PersistenceViolationCode,
  buildL8PersistenceViolation,
} from '../persistence/l8-persistence-violation-codes';

export interface L8ReadValidationResult {
  readonly ok: boolean;
  readonly violations: readonly L8PersistenceViolation[];
  readonly descriptor: L8ReadSurfaceDescriptor | null;
}

export class L8ReadSurfaceValidator {
  constructor(
    private readonly registry: L8ReadSurfaceRegistry =
      getDefaultL8ReadSurfaceRegistry(),
  ) {}

  validate(req: L8ReadRequest): L8ReadValidationResult {
    const violations: L8PersistenceViolation[] = [];

    if (!this.registry.isRegistered(req.surface_id)) {
      violations.push(buildL8PersistenceViolation(
        L8PersistenceViolationCode.UNKNOWN_READ_SURFACE,
        `unknown read surface ${req.surface_id}`,
        { regime_subject_id: req.regime_subject_id,
          surface: String(req.surface_id) },
      ));
      return { ok: false, violations, descriptor: null };
    }

    const d = this.registry.get(req.surface_id)!;

    // §8.8.7.6 — mode legality
    if (!d.allowed_modes.includes(req.mode)) {
      violations.push(buildL8PersistenceViolation(
        L8PersistenceViolationCode.READ_MODE_INVALID_FOR_SURFACE,
        `mode ${req.mode} not legal on read surface ${req.surface_id}`,
        { regime_subject_id: req.regime_subject_id,
          surface: req.surface_id },
      ));
    }

    // §8.8.8.5 — consumer class legality
    if (!d.allowed_consumers.includes(req.consumer_class)) {
      violations.push(buildL8PersistenceViolation(
        L8PersistenceViolationCode.CONSUMER_CLASS_NOT_ALLOWED,
        `consumer ${req.consumer_class} not allowed on ${req.surface_id}`,
        { regime_subject_id: req.regime_subject_id,
          surface: req.surface_id },
      ));
    }

    // §8.8.7.7 — raw storage / redis declared? reject
    if (req.claims_raw_storage_access) {
      violations.push(buildL8PersistenceViolation(
        L8PersistenceViolationCode.RAW_STORAGE_READ_ATTEMPT,
        `caller claims raw storage access on ${req.surface_id}`,
        { regime_subject_id: req.regime_subject_id,
          surface: req.surface_id },
      ));
    }
    if (req.claims_redis_authoritative_read) {
      violations.push(buildL8PersistenceViolation(
        L8PersistenceViolationCode.REDIS_READ_AS_AUTHORITATIVE,
        `caller claims Redis-authoritative read on ${req.surface_id}`,
        { regime_subject_id: req.regime_subject_id,
          surface: req.surface_id },
      ));
    }

    // §8.8.8.7 — live-rebuild from lower layers is banned at read level
    if (req.claims_live_rebuild_from_l6_l7) {
      violations.push(buildL8PersistenceViolation(
        L8PersistenceViolationCode.DOWNSTREAM_REBUILDS_REGIME_LIVE,
        `caller ${req.consumer_service} claims live regime rebuild from L6/L7`,
        { regime_subject_id: req.regime_subject_id,
          surface: req.surface_id },
      ));
    }

    // §8.8.7.3 — scope requirement
    if (d.requires_scope && (!req.scope_type || !req.scope_id)) {
      violations.push(buildL8PersistenceViolation(
        L8PersistenceViolationCode.READ_SCOPE_REQUIRED_BUT_MISSING,
        `surface ${req.surface_id} requires scope; got scope_type=${req.scope_type} scope_id=${req.scope_id}`,
        { regime_subject_id: req.regime_subject_id,
          surface: req.surface_id },
      ));
    }
    if (d.requires_subject && !req.regime_subject_id) {
      violations.push(buildL8PersistenceViolation(
        L8PersistenceViolationCode.READ_SUBJECT_REQUIRED_BUT_MISSING,
        `surface ${req.surface_id} requires regime_subject_id`,
        { regime_subject_id: req.regime_subject_id,
          surface: req.surface_id },
      ));
    }

    // §8.8.7.7 — current-from-historical / historical-from-current
    // guessing. If the descriptor only serves current surfaces and
    // the caller asked for HISTORICAL_WINDOW, reject. And vice versa.
    const isCurrentSurface = d.allowed_modes.includes('LIVE_CURRENT' as
      unknown as L8ReadRequest['mode']);
    const isHistoricalSurface = d.allowed_modes.includes('LIVE_HISTORICAL' as
      unknown as L8ReadRequest['mode']) ||
      d.allowed_modes.includes('REPLAY_HISTORICAL' as unknown as L8ReadRequest['mode']);

    if (isCurrentSurface && !isHistoricalSurface &&
        (req.mode === 'LIVE_HISTORICAL' || req.mode === 'REPLAY_HISTORICAL')) {
      violations.push(buildL8PersistenceViolation(
        L8PersistenceViolationCode.HISTORICAL_FROM_CURRENT_GUESS,
        `caller asked historical window against a current-only surface ${req.surface_id}`,
        { regime_subject_id: req.regime_subject_id,
          surface: req.surface_id },
      ));
    }
    if (isHistoricalSurface && !isCurrentSurface &&
        req.mode === 'LIVE_CURRENT') {
      violations.push(buildL8PersistenceViolation(
        L8PersistenceViolationCode.CURRENT_FROM_HISTORICAL_GUESS,
        `caller asked current read against a historical-only surface ${req.surface_id}`,
        { regime_subject_id: req.regime_subject_id,
          surface: req.surface_id },
      ));
    }

    // §8.8.7.1 — evidence surfaces must only be read under EVIDENCE_VIEW
    if (d.resolves_archive_payload && req.mode !== 'EVIDENCE_VIEW') {
      violations.push(buildL8PersistenceViolation(
        L8PersistenceViolationCode.EVIDENCE_READ_WITHOUT_POINTER,
        `evidence-resolving surface ${req.surface_id} must use EVIDENCE_VIEW mode, got ${req.mode}`,
        { regime_subject_id: req.regime_subject_id,
          surface: req.surface_id },
      ));
    }

    return { ok: violations.length === 0, violations, descriptor: d };
  }
}
