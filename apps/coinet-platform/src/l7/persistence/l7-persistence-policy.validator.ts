/**
 * L7.7 — Persistence Policy Validator
 *
 * §7.7.4.7 — Blanket validator that runs on every persistence envelope
 * before it leaves Layer 7. Its job is to catch:
 *   - unregistered surfaces
 *   - authority-store mismatches
 *   - mutation-discipline violations (e.g. mutating an IMMUTABLE_APPEND row)
 *   - direct-store bypass (envelope built outside L5 path)
 *   - L5 bypass (envelope missing manifest linkage)
 *   - replay-as-live / live-as-replay mode confusions
 *
 * More specific checks (current-authority, historical-append, evidence)
 * live in their own validators and are composed by the audit layer.
 */

import {
  L7AuthorityStore,
  L7DurableSurfaceId,
  L7MaterializationMode,
  L7MutationDiscipline,
  L7PersistenceClass,
  L7PersistenceEnvelope,
} from '../contracts/l7-persistence-surface';
import {
  L7DurableSurfaceRegistry,
  getDefaultDurableSurfaceRegistry,
} from '../registry/durable-surface.registry';
import { L7_PERSISTENCE_CLASS_TO_SURFACE } from './l7-materialization-policy';
import {
  L7PersistenceViolation,
  L7PersistenceViolationCode,
  buildL7PersistenceViolation,
} from './l7-persistence-violation-codes';

export interface L7PersistenceValidationContext {
  /** Caller that attempted the persistence (e.g. 'l7.runtime.materializer'). */
  readonly source: string;
  /** If the caller bypassed L5 (test/attack), set true. */
  readonly bypasses_l5?: boolean;
  /** If the caller targeted a physical store directly. */
  readonly direct_store_target?: L7AuthorityStore | null;
  /** If the caller tried to treat Redis as authority. */
  readonly redis_as_authority?: boolean;
  /** Whether the row being written is a delete-in-place attempt. */
  readonly destructive_overwrite?: boolean;
}

export interface L7PersistenceValidationResult {
  readonly ok: boolean;
  readonly violations: readonly L7PersistenceViolation[];
}

export class L7PersistencePolicyValidator {
  constructor(
    private readonly registry: L7DurableSurfaceRegistry = getDefaultDurableSurfaceRegistry(),
  ) {}

  validate(
    env: L7PersistenceEnvelope,
    ctx: L7PersistenceValidationContext,
  ): L7PersistenceValidationResult {
    const violations: L7PersistenceViolation[] = [];

    if (!this.registry.isRegistered(env.surface_id)) {
      violations.push(
        buildL7PersistenceViolation(
          L7PersistenceViolationCode.UNKNOWN_DURABLE_SURFACE,
          `surface ${env.surface_id} not in DURABLE_SURFACE_REGISTRY`,
          { subject_id: env.subject_id, surface: env.surface_id },
        ),
      );
      return { ok: false, violations };
    }

    const descriptor = this.registry.get(env.surface_id)!;

    if (descriptor.authority_store !== env.authority_store) {
      violations.push(
        buildL7PersistenceViolation(
          L7PersistenceViolationCode.AUTHORITY_STORE_MISMATCH,
          `envelope claims authority ${env.authority_store} but surface ${env.surface_id} is ${descriptor.authority_store}`,
          { subject_id: env.subject_id, surface: env.surface_id },
        ),
      );
    }
    if (descriptor.mutation_discipline !== env.mutation_discipline) {
      violations.push(
        buildL7PersistenceViolation(
          L7PersistenceViolationCode.MUTATION_DISCIPLINE_VIOLATED,
          `envelope claims discipline ${env.mutation_discipline} but surface ${env.surface_id} is ${descriptor.mutation_discipline}`,
          { subject_id: env.subject_id, surface: env.surface_id },
        ),
      );
    }

    // Class ↔ surface consistency.
    const expectedSurface = L7_PERSISTENCE_CLASS_TO_SURFACE[env.persistence_class];
    if (expectedSurface !== env.surface_id) {
      violations.push(
        buildL7PersistenceViolation(
          L7PersistenceViolationCode.AUTHORITY_STORE_INVALID_FOR_SURFACE,
          `class ${env.persistence_class} must target ${expectedSurface}, got ${env.surface_id}`,
          { subject_id: env.subject_id, surface: env.surface_id },
        ),
      );
    }

    // Mode legality against descriptor.
    if (!descriptor.allowed_modes.includes(env.materialization_mode)) {
      violations.push(
        buildL7PersistenceViolation(
          L7PersistenceViolationCode.CURRENT_MATERIALIZATION_MODE_INVALID,
          `mode ${env.materialization_mode} illegal on surface ${env.surface_id}`,
          { subject_id: env.subject_id, surface: env.surface_id },
        ),
      );
    }

    // L5 bypass.
    if (ctx.bypasses_l5 === true) {
      violations.push(
        buildL7PersistenceViolation(
          L7PersistenceViolationCode.L5_BYPASS_ATTEMPT,
          `persistence source ${ctx.source} bypassed L5`,
          { subject_id: env.subject_id, surface: env.surface_id },
        ),
      );
    }

    // Direct-store bypass (e.g. attempting Postgres write from a store-agnostic helper).
    if (ctx.direct_store_target && ctx.direct_store_target !== descriptor.authority_store) {
      violations.push(
        buildL7PersistenceViolation(
          L7PersistenceViolationCode.DIRECT_STORE_BYPASS,
          `source tried to write ${env.surface_id} directly to ${ctx.direct_store_target}, authoritative store is ${descriptor.authority_store}`,
          { subject_id: env.subject_id, surface: env.surface_id },
        ),
      );
    }

    // Redis-as-authority smell.
    if (ctx.redis_as_authority === true) {
      violations.push(
        buildL7PersistenceViolation(
          L7PersistenceViolationCode.REDIS_AS_AUTHORITY_ATTEMPT,
          `source ${ctx.source} attempted Redis-as-authority write`,
          { subject_id: env.subject_id, surface: env.surface_id },
        ),
      );
    }

    // Manifest linkage is non-negotiable.
    if (!env.lineage_refs || !env.lineage_refs.manifest_id || !env.lineage_refs.trace_id) {
      violations.push(
        buildL7PersistenceViolation(
          L7PersistenceViolationCode.L5_BYPASS_ATTEMPT,
          'envelope missing manifest / trace lineage linkage',
          { subject_id: env.subject_id, surface: env.surface_id },
        ),
      );
    }

    // Mutation-discipline specific checks.
    if (
      descriptor.mutation_discipline === L7MutationDiscipline.IMMUTABLE_APPEND &&
      ctx.destructive_overwrite
    ) {
      violations.push(
        buildL7PersistenceViolation(
          L7PersistenceViolationCode.HISTORICAL_ROW_DESTRUCTIVE_OVERWRITE,
          `surface ${env.surface_id} is IMMUTABLE_APPEND — destructive overwrite illegal`,
          { subject_id: env.subject_id, surface: env.surface_id },
        ),
      );
    }

    return { ok: violations.length === 0, violations };
  }
}

// Convenience helpers used by invariants + tests.

export function assertSurfaceAuthorityIsLegal(
  surface: L7DurableSurfaceId,
  claimedAuthority: L7AuthorityStore,
  registry: L7DurableSurfaceRegistry = getDefaultDurableSurfaceRegistry(),
): boolean {
  const d = registry.get(surface);
  return d !== null && d.authority_store === claimedAuthority;
}

export function authorityForPersistenceClass(
  cls: L7PersistenceClass,
  registry: L7DurableSurfaceRegistry = getDefaultDurableSurfaceRegistry(),
): L7AuthorityStore {
  const surface = L7_PERSISTENCE_CLASS_TO_SURFACE[cls];
  return registry.authorityFor(surface);
}

export function expectedModeSetForClass(
  cls: L7PersistenceClass,
  registry: L7DurableSurfaceRegistry = getDefaultDurableSurfaceRegistry(),
): readonly L7MaterializationMode[] {
  const surface = L7_PERSISTENCE_CLASS_TO_SURFACE[cls];
  return registry.allowedModes(surface);
}
