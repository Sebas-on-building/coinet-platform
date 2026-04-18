/**
 * L6.7 — Current-State Authority Validator
 *
 * §6.7.4.8 — Blocks:
 *   - shadow authority writes (anywhere other than Postgres-backed registries)
 *   - illegal supersession (prior row exists but no legal reason/tag)
 *   - replay outputs pretending to be live current state
 *   - repair outputs overwriting current state without proper tag and policy
 *   - silent overwrite of current state by late data (§6.7.4.6)
 *   - Redis current-cache writes that are not reconstructable (§6.7.4.7)
 */

import {
  L6MaterializationMode,
  L6PersistenceViolationCode,
} from '../contracts/l6-persistence-surface';
import {
  L6CurrentAuthorityClass,
  L6CurrentStateWriteIntent,
  L6SupersessionReason,
  LEGAL_SUPERSESSION_BY_MODE,
  isShadowAuthority,
  requiresExplicitSupersession,
} from '../contracts/l6-current-authority';

export interface L6CurrentAuthorityViolation {
  readonly code: L6PersistenceViolationCode;
  readonly field: string;
  readonly detail: string;
}

export interface L6CurrentAuthorityValidationResult {
  readonly ok: boolean;
  readonly violations: readonly L6CurrentAuthorityViolation[];
}

export interface L6RedisCacheWriteIntent {
  readonly key: string;
  readonly reconstructable_from_postgres: boolean;
  readonly reconstructable_from_object_store: boolean;
  readonly tagged_cache_only: boolean;
  readonly claimed_authoritative: boolean;
}

export class CurrentStateAuthorityValidator {
  validate(intent: L6CurrentStateWriteIntent): L6CurrentAuthorityValidationResult {
    const v: L6CurrentAuthorityViolation[] = [];

    // §6.7.4.1 — shadow authority ban
    if (isShadowAuthority(intent.authority_class as string)) {
      v.push({
        code: L6PersistenceViolationCode.SHADOW_AUTHORITY_WRITE,
        field: 'authority_class',
        detail: `authority class ${intent.authority_class} is not a recognized current authority`,
      });
    }
    if (intent.authority_class === L6CurrentAuthorityClass.REDIS_ACCELERATED) {
      v.push({
        code: L6PersistenceViolationCode.REDIS_SHADOW_AUTHORITY,
        field: 'authority_class',
        detail: 'Redis acceleration may not be used as current-state authority',
      });
    }

    // §6.7.4.3/§6.7.4.4 — pre-write legality gates
    if (!intent.definition_rollout_active) {
      v.push({
        code: L6PersistenceViolationCode.CURRENT_WRITE_WITHOUT_AUTHORITY_CLASS,
        field: 'definition_rollout_active',
        detail: 'definition is not in active rollout state',
      });
    }
    if (!intent.contract_validated) {
      v.push({
        code: L6PersistenceViolationCode.CURRENT_WRITE_WITHOUT_AUTHORITY_CLASS,
        field: 'contract_validated',
        detail: 'runtime output did not pass L6.3 contract validation',
      });
    }
    if (!intent.temporal_legality_passed) {
      v.push({
        code: L6PersistenceViolationCode.CURRENT_WRITE_WITHOUT_AUTHORITY_CLASS,
        field: 'temporal_legality_passed',
        detail: 'temporal legality (L6.5) did not pass',
      });
    }
    if (!intent.manifest_id) {
      v.push({
        code: L6PersistenceViolationCode.CURRENT_WRITE_WITHOUT_AUTHORITY_CLASS,
        field: 'manifest_id',
        detail: 'current-state write lacks manifest linkage',
      });
    }

    // §6.7.4.5 — supersession legality
    if (intent.prior_as_of && !intent.supersession) {
      if (requiresExplicitSupersession(intent.materialization_mode)) {
        v.push({
          code: L6PersistenceViolationCode.ILLEGAL_SUPERSESSION,
          field: 'supersession',
          detail: `prior current-state row exists; mode ${intent.materialization_mode} requires explicit supersession`,
        });
      }
    }
    if (intent.supersession) {
      const legal = LEGAL_SUPERSESSION_BY_MODE[intent.materialization_mode];
      if (intent.supersession.reason !== legal) {
        v.push({
          code: L6PersistenceViolationCode.ILLEGAL_SUPERSESSION,
          field: 'supersession.reason',
          detail: `mode ${intent.materialization_mode} requires reason ${legal}, got ${intent.supersession.reason}`,
        });
      }
      if (intent.materialization_mode === L6MaterializationMode.REPLAY_MATERIALIZATION &&
          intent.supersession.reason !== L6SupersessionReason.REPLAY_TAGGED_REBUILD) {
        v.push({
          code: L6PersistenceViolationCode.REPLAY_AS_LIVE_CURRENT,
          field: 'supersession.reason',
          detail: 'replay output is overwriting current state without replay tag',
        });
      }
      if (intent.materialization_mode === L6MaterializationMode.REPAIR_MATERIALIZATION &&
          intent.supersession.reason !== L6SupersessionReason.REPAIR_TAGGED_REBUILD) {
        v.push({
          code: L6PersistenceViolationCode.REPAIR_WITHOUT_TAG,
          field: 'supersession.reason',
          detail: 'repair output is overwriting current state without repair tag',
        });
      }
      // §6.7.4.5 — temporal order must be legal (new_as_of >= prior_as_of)
      if (intent.prior_as_of && intent.new_as_of < intent.prior_as_of) {
        v.push({
          code: L6PersistenceViolationCode.ILLEGAL_SUPERSESSION,
          field: 'new_as_of',
          detail: `supersession violates temporal order: new_as_of ${intent.new_as_of} < prior ${intent.prior_as_of}`,
        });
      }
      // lineage must be preserved
      if (!intent.supersession.prior_row_id && intent.prior_as_of) {
        v.push({
          code: L6PersistenceViolationCode.ILLEGAL_SUPERSESSION,
          field: 'supersession.prior_row_id',
          detail: 'supersession lineage missing: prior_row_id required when prior exists',
        });
      }
    }

    // §6.7.4.6 — late-data silent overwrite ban
    if (intent.prior_as_of && !intent.supersession &&
        intent.new_replay_hash !== intent.prior_replay_hash) {
      v.push({
        code: L6PersistenceViolationCode.SILENT_CURRENT_OVERWRITE,
        field: 'supersession',
        detail: 'current row would be silently replaced without supersession tag',
      });
    }

    return { ok: v.length === 0, violations: v };
  }

  /**
   * §6.7.4.7 — Validate a Redis cache write: never authoritative, always
   * reconstructable, must be tagged cache-only.
   */
  validateRedisCache(
    intent: L6RedisCacheWriteIntent,
  ): L6CurrentAuthorityValidationResult {
    const v: L6CurrentAuthorityViolation[] = [];
    if (intent.claimed_authoritative) {
      v.push({
        code: L6PersistenceViolationCode.REDIS_SHADOW_AUTHORITY,
        field: 'claimed_authoritative',
        detail: `redis key ${intent.key} claims authority`,
      });
    }
    if (!intent.tagged_cache_only) {
      v.push({
        code: L6PersistenceViolationCode.REDIS_SHADOW_AUTHORITY,
        field: 'tagged_cache_only',
        detail: `redis key ${intent.key} not tagged cache-only`,
      });
    }
    if (!intent.reconstructable_from_postgres && !intent.reconstructable_from_object_store) {
      v.push({
        code: L6PersistenceViolationCode.REDIS_SHADOW_AUTHORITY,
        field: 'reconstructable',
        detail: `redis key ${intent.key} is not reconstructable from Postgres authority or object-store pointers`,
      });
    }
    return { ok: v.length === 0, violations: v };
  }
}
