/**
 * L7.7 — Historical Surface Validator
 *
 * §7.7.3 — Historical L7 records must be:
 *   - append-safe
 *   - replay-safe
 *   - correction-aware
 *   - lineage-linked
 *   - mode-tagged
 *
 * This validator rejects any historical row that is missing replay
 * identity, lineage, policy version, evidence pointer (when required),
 * or correction linkage; and it blocks destructive overwrites and
 * historical writes that silently mutate current state.
 */

import {
  L7AuthorityStore,
  L7DurableSurfaceId,
  L7MaterializationMode,
  L7PersistenceEnvelope,
} from '../contracts/l7-persistence-surface';
import { L7HistoricalFactBase } from '../contracts/l7-current-authority';
import {
  L7DurableSurfaceRegistry,
  getDefaultDurableSurfaceRegistry,
} from '../registry/durable-surface.registry';
import {
  L7PersistenceViolation,
  L7PersistenceViolationCode,
  buildL7PersistenceViolation,
} from './l7-persistence-violation-codes';
import { L7_HISTORICAL_PERSISTENCE_CLASSES } from './l7-materialization-policy';

export interface L7HistoricalWriteContext {
  /** If true, the write tried to rewrite an existing fact row in-place. */
  readonly destructive_overwrite: boolean;
  /** If true, this write also silently mutated the current registry. */
  readonly mutated_current_state: boolean;
  /** If this is a correction row, the parent fact_id must match. */
  readonly expected_parent_fact_id?: string | null;
  /** True if policy requires evidence pointer refs for this row. */
  readonly evidence_required: boolean;
}

export class L7HistoricalSurfaceValidator {
  constructor(
    private readonly registry: L7DurableSurfaceRegistry = getDefaultDurableSurfaceRegistry(),
  ) {}

  validate(
    env: L7PersistenceEnvelope,
    row: L7HistoricalFactBase,
    ctx: L7HistoricalWriteContext,
  ): { readonly ok: boolean; readonly violations: readonly L7PersistenceViolation[] } {
    const violations: L7PersistenceViolation[] = [];

    if (!L7_HISTORICAL_PERSISTENCE_CLASSES.includes(env.persistence_class)) {
      violations.push(
        buildL7PersistenceViolation(
          L7PersistenceViolationCode.AUTHORITY_STORE_INVALID_FOR_SURFACE,
          `class ${env.persistence_class} is not a historical class`,
          { subject_id: env.subject_id, surface: env.surface_id },
        ),
      );
      return { ok: false, violations };
    }

    // Historical authority must be ClickHouse.
    if (env.authority_store !== L7AuthorityStore.CLICKHOUSE) {
      violations.push(
        buildL7PersistenceViolation(
          L7PersistenceViolationCode.AUTHORITY_STORE_MISMATCH,
          `historical class must be ClickHouse-authoritative, got ${env.authority_store}`,
          { subject_id: env.subject_id, surface: env.surface_id },
        ),
      );
    }

    // Mode: cannot be LIVE_CURRENT.
    if (env.materialization_mode === L7MaterializationMode.LIVE_CURRENT) {
      violations.push(
        buildL7PersistenceViolation(
          L7PersistenceViolationCode.HISTORICAL_ROW_MODE_MISSING,
          `historical row claims LIVE_CURRENT mode`,
          { subject_id: env.subject_id, surface: env.surface_id },
        ),
      );
    }

    // Destructive overwrite ban.
    if (ctx.destructive_overwrite) {
      violations.push(
        buildL7PersistenceViolation(
          L7PersistenceViolationCode.HISTORICAL_ROW_DESTRUCTIVE_OVERWRITE,
          `destructive overwrite attempted on ${env.surface_id}`,
          { subject_id: env.subject_id, surface: env.surface_id },
        ),
      );
    }
    // Historical ↛ Current silent mutation ban.
    if (ctx.mutated_current_state) {
      violations.push(
        buildL7PersistenceViolation(
          L7PersistenceViolationCode.HISTORICAL_MUTATES_CURRENT_SILENTLY,
          `historical write silently mutated current state (illegal per §7.7.3.6)`,
          { subject_id: env.subject_id, surface: env.surface_id },
        ),
      );
    }

    // Replay identity.
    if (!row.fact_id) {
      violations.push(violation(env, L7PersistenceViolationCode.HISTORICAL_ROW_MISSING_REPLAY_IDENTITY, 'fact_id missing'));
    }
    if (!row.validation_subject_id || !row.scope_type || !row.scope_id) {
      violations.push(violation(env, L7PersistenceViolationCode.HISTORICAL_ROW_MISSING_REPLAY_IDENTITY, 'subject/scope identity missing'));
    }
    if (!row.as_of || !row.effective_at) {
      violations.push(violation(env, L7PersistenceViolationCode.HISTORICAL_ROW_MISSING_REPLAY_IDENTITY, 'as_of / effective_at missing'));
    }
    if (!row.compute_run_id) {
      violations.push(violation(env, L7PersistenceViolationCode.HISTORICAL_ROW_MISSING_REPLAY_IDENTITY, 'compute_run_id missing'));
    }
    if (!row.replay_hash) {
      violations.push(violation(env, L7PersistenceViolationCode.HISTORICAL_ROW_MISSING_REPLAY_IDENTITY, 'replay_hash missing'));
    }
    if (!row.policy_version) {
      violations.push(violation(env, L7PersistenceViolationCode.HISTORICAL_ROW_POLICY_VERSION_MISSING, 'policy_version missing'));
    }
    if (!row.lineage_refs || !row.lineage_refs.trace_id || !row.lineage_refs.manifest_id) {
      violations.push(violation(env, L7PersistenceViolationCode.HISTORICAL_ROW_MISSING_LINEAGE, 'trace / manifest linkage missing'));
    }
    if (!row.materialization_mode) {
      violations.push(violation(env, L7PersistenceViolationCode.HISTORICAL_ROW_MODE_MISSING, 'materialization_mode missing'));
    }

    // Evidence pointer requirement.
    if (ctx.evidence_required && !row.evidence_pack_ref) {
      violations.push(violation(env, L7PersistenceViolationCode.HISTORICAL_ROW_EVIDENCE_REF_MISSING, 'evidence_pack_ref required but absent'));
    }

    // Correction linkage.
    if (row.correction_parent_ref && !row.correction_reason) {
      violations.push(violation(env, L7PersistenceViolationCode.CORRECTION_ROW_MISSING_REASON, 'correction row missing reason'));
    }
    if (!row.correction_parent_ref && row.correction_reason) {
      violations.push(violation(env, L7PersistenceViolationCode.CORRECTION_ROW_MISSING_PARENT, 'correction reason without parent'));
    }
    if (
      row.correction_parent_ref &&
      ctx.expected_parent_fact_id &&
      row.correction_parent_ref !== ctx.expected_parent_fact_id
    ) {
      violations.push(violation(env, L7PersistenceViolationCode.CORRECTION_ROW_MISSING_PARENT, 'correction parent ref mismatches expected parent'));
    }
    // Correction rows must still be appends.
    if (row.correction_parent_ref && env.mutation_discipline !== 'IMMUTABLE_APPEND') {
      violations.push(violation(env, L7PersistenceViolationCode.CORRECTION_ROW_NOT_APPENDED, 'correction row written to non-append surface'));
    }

    return { ok: violations.length === 0, violations };
  }
}

function violation(
  env: L7PersistenceEnvelope,
  code: L7PersistenceViolationCode,
  detail: string,
): L7PersistenceViolation {
  return buildL7PersistenceViolation(code, detail, {
    subject_id: env.subject_id,
    surface: env.surface_id,
  });
}

export function isL7HistoricalSurface(surface: L7DurableSurfaceId): boolean {
  return (
    surface === L7DurableSurfaceId.HISTORICAL_VALIDATION_FACTS ||
    surface === L7DurableSurfaceId.HISTORICAL_CONTRADICTION_FACTS ||
    surface === L7DurableSurfaceId.HISTORICAL_CONFIDENCE_FACTS ||
    surface === L7DurableSurfaceId.HISTORICAL_RESTRICTION_FACTS
  );
}
