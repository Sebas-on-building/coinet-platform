/**
 * L12.6 — Materialization policy validator (§12.6.6).
 *
 * Validates a (surface, mode, run_mode, current_authority_allowed,
 * historical_append_allowed) tuple against the materialization policy table.
 */

import {
  L12DurableSurfaceId,
  L12MaterializationMode,
  l12ModeMayWriteCurrent,
  l12RunModeMayWriteCurrent,
  isL12CurrentAuthoritySurface,
  isL12HistoricalAppendSurface,
} from '../contracts/l12-persistence-surface';
import { L12ScenarioRunMode } from '../runtime/scenario-compute-run';
import {
  L12PersistenceValidationResult,
  L12PersistenceViolationCode,
  L12PersistenceViolationIssue,
  l12PersistenceIssueOf,
} from './l12-persistence-violation-codes';
import { l12IsModeAllowedForSurface } from './l12-materialization-policy';

export interface L12MaterializationPolicyInput {
  readonly durable_surface_id: L12DurableSurfaceId;
  readonly materialization_mode: L12MaterializationMode;
  readonly source_run_mode: L12ScenarioRunMode;
  readonly current_authority_allowed: boolean;
  readonly historical_append_allowed: boolean;
  readonly subject_ref?: string;
}

export function validateL12MaterializationPolicy(
  input: L12MaterializationPolicyInput,
): L12PersistenceValidationResult {
  const issues: L12PersistenceViolationIssue[] = [];

  if (!l12IsModeAllowedForSurface(input.durable_surface_id, input.materialization_mode)) {
    issues.push(
      l12PersistenceIssueOf(
        L12PersistenceViolationCode.L12P_MATERIALIZATION_MODE_NOT_ALLOWED_FOR_SURFACE,
        `mode ${input.materialization_mode} is not allowed for surface ${input.durable_surface_id}`,
        input.subject_ref,
      ),
    );
  }

  // current authority writes
  if (input.current_authority_allowed) {
    if (!isL12CurrentAuthoritySurface(input.durable_surface_id)) {
      issues.push(
        l12PersistenceIssueOf(
          L12PersistenceViolationCode.L12P_SURFACE_AUTHORITY_MISMATCH,
          `current authority requested for non-current surface ${input.durable_surface_id}`,
          input.subject_ref,
        ),
      );
    }
    if (!l12ModeMayWriteCurrent(input.materialization_mode)) {
      const code =
        input.materialization_mode === L12MaterializationMode.REPLAY_HISTORICAL
          ? L12PersistenceViolationCode.L12P_REPLAY_WRITES_CURRENT
          : input.materialization_mode === L12MaterializationMode.SHADOW_EVALUATION
            ? L12PersistenceViolationCode.L12P_CURRENT_AUTHORITY_WRITTEN_BY_SHADOW
            : input.materialization_mode === L12MaterializationMode.BACKFILL_HISTORICAL
              ? L12PersistenceViolationCode.L12P_BACKFILL_WRITES_CURRENT
              : L12PersistenceViolationCode.L12P_CURRENT_AUTHORITY_WRITTEN_BY_REPLAY;
      issues.push(
        l12PersistenceIssueOf(
          code,
          `mode ${input.materialization_mode} cannot write current authority`,
          input.subject_ref,
        ),
      );
    }
    if (!l12RunModeMayWriteCurrent(input.source_run_mode)) {
      issues.push(
        l12PersistenceIssueOf(
          L12PersistenceViolationCode.L12P_CURRENT_WRITE_FROM_NON_LIVE_RUN,
          `run mode ${input.source_run_mode} cannot produce current writes`,
          input.subject_ref,
        ),
      );
    }
  }

  // historical append
  if (input.historical_append_allowed) {
    if (!isL12HistoricalAppendSurface(input.durable_surface_id)) {
      issues.push(
        l12PersistenceIssueOf(
          L12PersistenceViolationCode.L12P_SURFACE_AUTHORITY_MISMATCH,
          `historical append requested for non-historical surface ${input.durable_surface_id}`,
          input.subject_ref,
        ),
      );
    }
  }

  return { ok: issues.length === 0, issues };
}
