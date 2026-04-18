/**
 * L7.7 — Read Surface Validator
 *
 * §7.7.6.9 — Enforces consumer legality, mode legality, scope presence,
 * and explicit bans on raw-storage reads, Redis-as-authoritative reads,
 * current-from-historical guesswork, and ad hoc re-validation from L6
 * primitives.
 */

import {
  L7ReadMode,
  L7ReadRequest,
  L7ReadSurfaceId,
  L7ConsumerClass,
} from '../contracts/l7-read-surface';
import {
  L7ReadSurfaceRegistry,
  getDefaultReadSurfaceRegistry,
} from '../registry/read-surface.registry';
import {
  L7PersistenceViolation,
  L7PersistenceViolationCode,
  buildL7PersistenceViolation,
} from '../persistence/l7-persistence-violation-codes';

export interface L7ReadValidationResult {
  readonly ok: boolean;
  readonly violations: readonly L7PersistenceViolation[];
}

export class L7ReadSurfaceValidator {
  constructor(
    private readonly registry: L7ReadSurfaceRegistry = getDefaultReadSurfaceRegistry(),
  ) {}

  validate(req: L7ReadRequest): L7ReadValidationResult {
    const violations: L7PersistenceViolation[] = [];

    if (!this.registry.isRegistered(req.surface_id)) {
      violations.push(v(
        L7PersistenceViolationCode.READ_SURFACE_NOT_REGISTERED,
        req,
        `read surface ${req.surface_id} not registered`,
      ));
      return { ok: false, violations };
    }

    const descriptor = this.registry.get(req.surface_id)!;

    if (!descriptor.allowed_modes.includes(req.mode)) {
      violations.push(v(
        L7PersistenceViolationCode.READ_MODE_INVALID_FOR_SURFACE,
        req,
        `mode ${req.mode} illegal for surface ${req.surface_id}`,
      ));
    }

    if (!descriptor.allowed_consumers.includes(req.consumer_class)) {
      violations.push(v(
        L7PersistenceViolationCode.CONSUMER_CLASS_NOT_ALLOWED,
        req,
        `consumer class ${req.consumer_class} not allowed on ${req.surface_id}`,
      ));
    }

    if (descriptor.requires_scope) {
      if (!req.subject_id || !req.scope_type || !req.scope_id) {
        violations.push(v(
          L7PersistenceViolationCode.READ_MODE_INVALID_FOR_SURFACE,
          req,
          `surface ${req.surface_id} requires subject_id + scope_type + scope_id`,
        ));
      }
    }

    // Raw storage reads are categorically forbidden outside the
    // archive-payload read surfaces.
    if (req.claims_raw_storage_access) {
      violations.push(v(
        L7PersistenceViolationCode.RAW_STORAGE_READ_ATTEMPT,
        req,
        `consumer claimed raw-storage access via ${req.surface_id}`,
      ));
    }
    if (req.claims_redis_authoritative_read) {
      violations.push(v(
        L7PersistenceViolationCode.REDIS_READ_AS_AUTHORITATIVE,
        req,
        `consumer attempted Redis-as-authoritative read via ${req.surface_id}`,
      ));
    }

    // Ad hoc revalidation-from-L6 is only legal for replay/repair adapters.
    if (req.claims_revalidation_from_l6) {
      const allowedAdapters = [
        L7ConsumerClass.REPLAY_ADAPTER,
        L7ConsumerClass.REPAIR_ADAPTER,
        L7ConsumerClass.INTERNAL_L7,
      ];
      if (!allowedAdapters.includes(req.consumer_class)) {
        violations.push(v(
          L7PersistenceViolationCode.AD_HOC_REVALIDATION_FROM_L6,
          req,
          `consumer ${req.consumer_class} attempted ad hoc L6 revalidation on surface ${req.surface_id}`,
        ));
      }
      if (
        req.mode !== L7ReadMode.REPLAY_RECONSTRUCTION &&
        req.mode !== L7ReadMode.REPAIR_INSPECTION
      ) {
        violations.push(v(
          L7PersistenceViolationCode.AD_HOC_REVALIDATION_FROM_L6,
          req,
          `L6 revalidation only legal under REPLAY_RECONSTRUCTION / REPAIR_INSPECTION`,
        ));
      }
    }

    // Current-from-historical guesses.
    if (
      req.mode === L7ReadMode.CURRENT_LIVE &&
      this.backingIsHistoricalOnly(req.surface_id)
    ) {
      violations.push(v(
        L7PersistenceViolationCode.CURRENT_FROM_HISTORICAL_GUESS,
        req,
        `surface ${req.surface_id} is historical; CURRENT_LIVE not allowed`,
      ));
    }
    // Historical-from-current guesses.
    if (
      req.mode === L7ReadMode.HISTORICAL_WINDOW &&
      this.backingIsCurrentOnly(req.surface_id)
    ) {
      violations.push(v(
        L7PersistenceViolationCode.HISTORICAL_FROM_CURRENT_GUESS,
        req,
        `surface ${req.surface_id} is current; HISTORICAL_WINDOW not allowed`,
      ));
    }

    // Evidence read must come with a pointer (= subject_id carries the ref).
    if (descriptor.resolves_archive_payload) {
      if (!req.subject_id) {
        violations.push(v(
          L7PersistenceViolationCode.EVIDENCE_READ_WITHOUT_POINTER,
          req,
          `evidence read on ${req.surface_id} needs subject_id (pointer ref)`,
        ));
      }
    }

    return { ok: violations.length === 0, violations };
  }

  private backingIsHistoricalOnly(id: L7ReadSurfaceId): boolean {
    const d = this.registry.get(id)!;
    return d.backing_durable_surfaces.every(s => String(s).includes('ts_'));
  }

  private backingIsCurrentOnly(id: L7ReadSurfaceId): boolean {
    const d = this.registry.get(id)!;
    return d.backing_durable_surfaces.every(s => String(s).includes('current_'));
  }
}

function v(
  code: L7PersistenceViolationCode,
  req: L7ReadRequest,
  detail: string,
): L7PersistenceViolation {
  return buildL7PersistenceViolation(code, detail, {
    subject_id: req.subject_id,
    surface: req.surface_id,
    context: {
      mode: req.mode,
      consumer_class: req.consumer_class,
      consumer_service: req.consumer_service,
      trace_id: req.trace_id,
    },
  });
}
