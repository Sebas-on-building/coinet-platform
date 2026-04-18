/**
 * L8.8 — Persistence Policy Validator
 *
 * §8.8.2 / §8.8.5 / §8.8.9.4 — Blanket validator that runs on every
 * persistence envelope before it leaves Layer 8. Catches:
 *   - unregistered surfaces
 *   - authority-store mismatches
 *   - mutation-discipline violations
 *   - direct-store bypass (envelope built outside the L5 path)
 *   - L5 bypass (envelope missing manifest linkage)
 *   - replay-as-live / repair-as-live / late-as-live confusions
 *   - Redis-as-authority / ClickHouse-as-current-authority attempts
 *
 * More specific checks (current-authority, evidence, downstream
 * consumption) live in their own validators and are composed by the
 * audit layer and the L8.8 invariants.
 */

import {
  L8AuthorityStore,
  L8DurableSurfaceId,
  L8MaterializationMode,
  L8PersistenceClass,
  L8PersistenceEnvelope,
  L8MutationDiscipline,
} from '../contracts/l8-persistence-surface';
import {
  L8DurableSurfaceRegistry,
  getDefaultL8DurableSurfaceRegistry,
} from '../registry/durable-surface.registry';
import {
  L8_PERSISTENCE_CLASS_TO_SURFACE,
  L8_CURRENT_PERSISTENCE_CLASSES,
  L8_HISTORICAL_PERSISTENCE_CLASSES,
} from './l8-materialization-policy';
import {
  L8PersistenceViolation,
  L8PersistenceViolationCode,
  buildL8PersistenceViolation,
} from './l8-persistence-violation-codes';

export interface L8PersistenceValidationContext {
  /** Caller that attempted the persistence (e.g. 'l8.runtime.materializer'). */
  readonly source: string;
  /** If the caller bypassed L5 (test / attack), set true. */
  readonly bypasses_l5?: boolean;
  /** If the caller targeted a physical store directly. */
  readonly direct_store_target?: L8AuthorityStore | null;
  /** If the caller tried to treat Redis as authority. */
  readonly redis_as_authority?: boolean;
  /** Whether the row being written is a delete-in-place attempt. */
  readonly destructive_overwrite?: boolean;
}

export interface L8PersistenceValidationResult {
  readonly ok: boolean;
  readonly violations: readonly L8PersistenceViolation[];
}

export class L8PersistencePolicyValidator {
  constructor(
    private readonly registry: L8DurableSurfaceRegistry =
      getDefaultL8DurableSurfaceRegistry(),
  ) {}

  validate(
    env: L8PersistenceEnvelope,
    ctx: L8PersistenceValidationContext,
  ): L8PersistenceValidationResult {
    const violations: L8PersistenceViolation[] = [];

    if (!this.registry.isRegistered(env.surface_id)) {
      violations.push(buildL8PersistenceViolation(
        L8PersistenceViolationCode.UNKNOWN_DURABLE_SURFACE,
        `surface ${env.surface_id} not in L8_DURABLE_SURFACE_REGISTRY`,
        { regime_subject_id: env.regime_subject_id,
          surface: env.surface_id },
      ));
      return { ok: false, violations };
    }

    const d = this.registry.get(env.surface_id)!;

    // §8.8.2.3 — authority mismatch
    if (d.authority_store !== env.authority_store) {
      violations.push(buildL8PersistenceViolation(
        L8PersistenceViolationCode.AUTHORITY_STORE_MISMATCH,
        `envelope claims authority ${env.authority_store} but surface ${env.surface_id} is ${d.authority_store}`,
        { regime_subject_id: env.regime_subject_id, surface: env.surface_id },
      ));
    }

    // §8.8.2.4 — mutation discipline mismatch
    if (d.mutation_discipline !== env.mutation_discipline) {
      violations.push(buildL8PersistenceViolation(
        L8PersistenceViolationCode.MUTATION_DISCIPLINE_VIOLATED,
        `envelope claims discipline ${env.mutation_discipline} but surface ${env.surface_id} is ${d.mutation_discipline}`,
        { regime_subject_id: env.regime_subject_id, surface: env.surface_id },
      ));
    }

    // §8.8.3 — class ↔ surface consistency
    const expected = L8_PERSISTENCE_CLASS_TO_SURFACE[env.persistence_class];
    if (expected !== env.surface_id) {
      violations.push(buildL8PersistenceViolation(
        L8PersistenceViolationCode.AUTHORITY_STORE_INVALID_FOR_SURFACE,
        `class ${env.persistence_class} must target ${expected}, got ${env.surface_id}`,
        { regime_subject_id: env.regime_subject_id, surface: env.surface_id },
      ));
    }

    // §8.8.3 — mode legality against descriptor
    if (!d.allowed_modes.includes(env.materialization_mode)) {
      violations.push(buildL8PersistenceViolation(
        L8PersistenceViolationCode.CURRENT_MATERIALIZATION_MODE_INVALID,
        `mode ${env.materialization_mode} illegal on surface ${env.surface_id}`,
        { regime_subject_id: env.regime_subject_id, surface: env.surface_id },
      ));
    }

    // §8.8.2.1 / §8.8.9.4 — L5 bypass
    if (ctx.bypasses_l5 ||
        !env.lineage_refs?.manifest_id ||
        !env.lineage_refs?.trace_id) {
      violations.push(buildL8PersistenceViolation(
        L8PersistenceViolationCode.L5_BYPASS_ATTEMPT,
        `envelope missing L5 lineage (manifest/trace) or caller bypassed L5`,
        { regime_subject_id: env.regime_subject_id, surface: env.surface_id },
      ));
    }

    // §8.8.2.3 — direct-store bypass
    if (ctx.direct_store_target) {
      violations.push(buildL8PersistenceViolation(
        L8PersistenceViolationCode.DIRECT_STORE_BYPASS,
        `caller targeted ${ctx.direct_store_target} directly; all writes must route through L5`,
        { regime_subject_id: env.regime_subject_id, surface: env.surface_id },
      ));
    }

    // §8.8.2.5 — Redis-as-authority
    if (ctx.redis_as_authority) {
      violations.push(buildL8PersistenceViolation(
        L8PersistenceViolationCode.REDIS_AS_AUTHORITY_ATTEMPT,
        `caller attempted Redis-as-authority write`,
        { regime_subject_id: env.regime_subject_id, surface: env.surface_id },
      ));
    }

    // §8.8.2.5 — ObjectStore / ClickHouse can't be current authority
    if (L8_CURRENT_PERSISTENCE_CLASSES.includes(env.persistence_class)) {
      if (env.authority_store === L8AuthorityStore.OBJECT_STORE) {
        violations.push(buildL8PersistenceViolation(
          L8PersistenceViolationCode.OBJECT_STORE_AS_CURRENT_AUTHORITY,
          `current-state class ${env.persistence_class} cannot use OBJECT_STORE`,
          { regime_subject_id: env.regime_subject_id, surface: env.surface_id },
        ));
      }
      if (env.authority_store === L8AuthorityStore.CLICKHOUSE) {
        violations.push(buildL8PersistenceViolation(
          L8PersistenceViolationCode.CLICKHOUSE_AS_CURRENT_AUTHORITY,
          `current-state class ${env.persistence_class} cannot use CLICKHOUSE`,
          { regime_subject_id: env.regime_subject_id, surface: env.surface_id },
        ));
      }
    }

    // §8.8.4.3 — IMMUTABLE_APPEND / POINTER_APPEND / TRANSITION_APPEND /
    // FAILURE_APPEND may NEVER be written destructively.
    if (ctx.destructive_overwrite &&
        isAppendOnlyDiscipline(d.mutation_discipline)) {
      violations.push(buildL8PersistenceViolation(
        L8PersistenceViolationCode.HISTORICAL_ROW_DESTRUCTIVE_OVERWRITE,
        `destructive overwrite attempted on ${env.surface_id} (${d.mutation_discipline})`,
        { regime_subject_id: env.regime_subject_id, surface: env.surface_id },
      ));
    }

    // §8.8.5.4 — replay / repair / late-data written to current surfaces
    if (L8_CURRENT_PERSISTENCE_CLASSES.includes(env.persistence_class)) {
      if (env.materialization_mode === L8MaterializationMode.REPLAY_HISTORICAL) {
        violations.push(buildL8PersistenceViolation(
          L8PersistenceViolationCode.REPLAY_WRITTEN_AS_LIVE,
          `replay write attempted on current surface ${env.surface_id}`,
          { regime_subject_id: env.regime_subject_id, surface: env.surface_id },
        ));
      }
      if (env.materialization_mode === L8MaterializationMode.REPAIR_REBUILD) {
        violations.push(buildL8PersistenceViolation(
          L8PersistenceViolationCode.REPAIR_WRITTEN_AS_LIVE,
          `repair write attempted on current surface ${env.surface_id}`,
          { regime_subject_id: env.regime_subject_id, surface: env.surface_id },
        ));
      }
      if (env.materialization_mode === L8MaterializationMode.LATE_DATA_REMATERIALIZATION) {
        violations.push(buildL8PersistenceViolation(
          L8PersistenceViolationCode.LATE_DATA_WRITTEN_AS_LIVE,
          `late-data rematerialization attempted on current surface ${env.surface_id}`,
          { regime_subject_id: env.regime_subject_id, surface: env.surface_id },
        ));
      }
    }

    // §8.8.4.6 — live writes to historical classes are illegal
    if (L8_HISTORICAL_PERSISTENCE_CLASSES.includes(env.persistence_class) &&
        env.materialization_mode === L8MaterializationMode.LIVE_CURRENT) {
      violations.push(buildL8PersistenceViolation(
        L8PersistenceViolationCode.LIVE_WRITTEN_AS_HISTORICAL,
        `historical class ${env.persistence_class} cannot be written in LIVE_CURRENT mode`,
        { regime_subject_id: env.regime_subject_id, surface: env.surface_id },
      ));
    }

    return { ok: violations.length === 0, violations };
  }
}

function isAppendOnlyDiscipline(d: L8MutationDiscipline): boolean {
  return d === L8MutationDiscipline.IMMUTABLE_APPEND ||
    d === L8MutationDiscipline.POINTER_APPEND ||
    d === L8MutationDiscipline.TRANSITION_APPEND ||
    d === L8MutationDiscipline.FAILURE_APPEND;
}
