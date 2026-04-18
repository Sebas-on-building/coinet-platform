/**
 * L7.7 — Current State Authority Validator
 *
 * §7.7.2.5 + §7.7.2.6 — Current validation, contradiction, confidence,
 * and restriction state are authoritative *only* in Postgres current
 * registries. Every change must happen through:
 *   - a new authoritative current row,
 *   - an explicit supersession reason,
 *   - a reference to the prior current state,
 *   - and a linkage to the historical append record where required.
 *
 * This validator checks those four properties on every current-state
 * envelope/row pair.
 */

import {
  L7AuthorityStore,
  L7DurableSurfaceId,
  L7MaterializationMode,
  L7PersistenceClass,
  L7PersistenceEnvelope,
} from '../contracts/l7-persistence-surface';
import { L7CurrentStateIdentity } from '../contracts/l7-current-authority';
import {
  L7DurableSurfaceRegistry,
  getDefaultDurableSurfaceRegistry,
} from '../registry/durable-surface.registry';
import {
  L7PersistenceViolation,
  L7PersistenceViolationCode,
  buildL7PersistenceViolation,
} from './l7-persistence-violation-codes';
import { L7_CURRENT_PERSISTENCE_CLASSES } from './l7-materialization-policy';

export interface L7CurrentStateValidationContext {
  /** If true, the current-state write is overwriting an existing row. */
  readonly has_prior_state: boolean;
  /** The existing row's id; must match `row.superseded_prior_ref` when present. */
  readonly existing_prior_state_id: string | null;
  /** The historical fact id that was appended for this transition. */
  readonly historical_fact_id: string | null;
  /** Whether this class is required to produce a historical append row. */
  readonly historical_append_required: boolean;
  /** If true, the write was issued under REPLAY or REPAIR (illegal for current state). */
  readonly issued_under_replay_or_repair: boolean;
  /** If the write attempted to bypass the supersession law. */
  readonly claims_destructive_overwrite?: boolean;
  /** If the write attempted to use ClickHouse as current authority. */
  readonly claims_clickhouse_current?: boolean;
  /** If the write attempted to use object storage as current authority. */
  readonly claims_object_store_current?: boolean;
}

export class L7CurrentStateAuthorityValidator {
  constructor(
    private readonly registry: L7DurableSurfaceRegistry = getDefaultDurableSurfaceRegistry(),
  ) {}

  validate(
    env: L7PersistenceEnvelope,
    row: L7CurrentStateIdentity,
    ctx: L7CurrentStateValidationContext,
  ): { readonly ok: boolean; readonly violations: readonly L7PersistenceViolation[] } {
    const violations: L7PersistenceViolation[] = [];

    if (!L7_CURRENT_PERSISTENCE_CLASSES.includes(env.persistence_class)) {
      violations.push(
        buildL7PersistenceViolation(
          L7PersistenceViolationCode.AUTHORITY_STORE_INVALID_FOR_SURFACE,
          `class ${env.persistence_class} is not a current-state class`,
          { subject_id: env.subject_id, surface: env.surface_id },
        ),
      );
      return { ok: false, violations };
    }

    // Postgres-only authority.
    if (env.authority_store !== L7AuthorityStore.POSTGRES) {
      violations.push(
        buildL7PersistenceViolation(
          L7PersistenceViolationCode.AUTHORITY_STORE_INVALID_FOR_SURFACE,
          `current-state class must be Postgres-authoritative, got ${env.authority_store}`,
          { subject_id: env.subject_id, surface: env.surface_id },
        ),
      );
    }

    if (ctx.claims_clickhouse_current) {
      violations.push(
        buildL7PersistenceViolation(
          L7PersistenceViolationCode.AUTHORITY_STORE_INVALID_FOR_SURFACE,
          `ClickHouse is not valid current-state authority (surface ${env.surface_id})`,
          { subject_id: env.subject_id, surface: env.surface_id },
        ),
      );
    }
    if (ctx.claims_object_store_current) {
      violations.push(
        buildL7PersistenceViolation(
          L7PersistenceViolationCode.OBJECT_STORE_AS_CURRENT_AUTHORITY,
          `object storage is not valid current-state authority (surface ${env.surface_id})`,
          { subject_id: env.subject_id, surface: env.surface_id },
        ),
      );
    }

    // Mode: current state is LIVE_CURRENT only.
    if (env.materialization_mode !== L7MaterializationMode.LIVE_CURRENT) {
      violations.push(
        buildL7PersistenceViolation(
          L7PersistenceViolationCode.CURRENT_MATERIALIZATION_MODE_INVALID,
          `current-state writes must be LIVE_CURRENT, got ${env.materialization_mode}`,
          { subject_id: env.subject_id, surface: env.surface_id },
        ),
      );
    }
    if (ctx.issued_under_replay_or_repair) {
      violations.push(
        buildL7PersistenceViolation(
          L7PersistenceViolationCode.REPLAY_WRITTEN_AS_LIVE,
          `current-state write issued under replay/repair (illegal)`,
          { subject_id: env.subject_id, surface: env.surface_id },
        ),
      );
    }

    // Supersession law.
    if (ctx.has_prior_state) {
      if (!row.superseded_prior_ref) {
        violations.push(
          buildL7PersistenceViolation(
            L7PersistenceViolationCode.CURRENT_STATE_OVERWRITE_WITHOUT_SUPERSESSION,
            `row overwrites existing state but carries no superseded_prior_ref`,
            { subject_id: env.subject_id, surface: env.surface_id },
          ),
        );
      } else if (
        ctx.existing_prior_state_id &&
        row.superseded_prior_ref !== ctx.existing_prior_state_id
      ) {
        violations.push(
          buildL7PersistenceViolation(
            L7PersistenceViolationCode.SUPERSEDED_PRIOR_REF_MISSING,
            `superseded_prior_ref ${row.superseded_prior_ref} does not match existing ${ctx.existing_prior_state_id}`,
            { subject_id: env.subject_id, surface: env.surface_id },
          ),
        );
      }
    }

    if (ctx.claims_destructive_overwrite) {
      violations.push(
        buildL7PersistenceViolation(
          L7PersistenceViolationCode.CURRENT_STATE_OVERWRITE_WITHOUT_SUPERSESSION,
          `source attempted destructive overwrite on current state`,
          { subject_id: env.subject_id, surface: env.surface_id },
        ),
      );
    }

    // Historical append linkage.
    if (ctx.historical_append_required && !ctx.historical_fact_id) {
      violations.push(
        buildL7PersistenceViolation(
          L7PersistenceViolationCode.HISTORICAL_MUTATES_CURRENT_SILENTLY,
          `current-state change not linked to a historical append record`,
          { subject_id: env.subject_id, surface: env.surface_id },
        ),
      );
    }

    // Identity + lineage completeness per descriptor.
    const d = this.registry.get(env.surface_id)!;
    for (const field of d.required_identity_fields) {
      if (!this.hasIdentity(field, row)) {
        violations.push(
          buildL7PersistenceViolation(
            L7PersistenceViolationCode.HISTORICAL_ROW_MISSING_REPLAY_IDENTITY,
            `current row missing identity field: ${field}`,
            { subject_id: env.subject_id, surface: env.surface_id, context: { field } },
          ),
        );
      }
    }

    return { ok: violations.length === 0, violations };
  }

  private hasIdentity(field: string, row: L7CurrentStateIdentity): boolean {
    switch (field) {
      case 'current_state_id':
        return !!row.current_state_id;
      case 'validation_subject_id':
        return !!row.validation_subject_id;
      case 'scope_type':
        return !!row.scope_type;
      case 'scope_id':
        return !!row.scope_id;
      case 'effective_as_of':
        return !!row.effective_as_of;
      case 'compute_run_id':
        return !!row.compute_run_id;
      default:
        return true;
    }
  }
}

// Convenience for tests + invariants.
export function identifyCurrentStateSurface(
  cls: L7PersistenceClass,
): L7DurableSurfaceId | null {
  switch (cls) {
    case L7PersistenceClass.CURRENT_VALIDATION:
      return L7DurableSurfaceId.CURRENT_VALIDATION_REGISTRY;
    case L7PersistenceClass.CURRENT_CONTRADICTION:
      return L7DurableSurfaceId.CURRENT_CONTRADICTION_REGISTRY;
    case L7PersistenceClass.CURRENT_CONFIDENCE:
      return L7DurableSurfaceId.CURRENT_CONFIDENCE_REGISTRY;
    case L7PersistenceClass.CURRENT_RESTRICTION:
      return L7DurableSurfaceId.CURRENT_RESTRICTION_REGISTRY;
    default:
      return null;
  }
}
