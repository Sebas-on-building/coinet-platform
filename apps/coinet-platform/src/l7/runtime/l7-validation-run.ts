/**
 * L7.4 — Validation Run
 *
 * §7.4.1.6 — Every Layer 7 run must carry a full lineage anchor. This
 * file defines the `L7ValidationRun` record and the helpers that
 * validate / finalise it.
 */

import { L7ReplayIdentityMode } from '../contracts/validation-runtime-status';
import { L7RuntimeViolationCode } from '../validation/l7-runtime-violation-codes';

/**
 * §7.4.1.6 + §7.4.9.1 — `L7ValidationRunMode` covers the four legal
 * execution modes. Replay identity and persistence behaviour branch on
 * this value.
 */
export enum L7ValidationRunMode {
  LIVE = 'LIVE',
  REPLAY = 'REPLAY',
  REPAIR = 'REPAIR',
  LATE_DATA_REVALIDATION = 'LATE_DATA_REVALIDATION',
}

export const ALL_RUN_MODES: readonly L7ValidationRunMode[] =
  Object.values(L7ValidationRunMode);

/**
 * Map run modes to the replay-identity mode used when hashing outputs.
 */
export const RUN_MODE_TO_REPLAY_IDENTITY: Readonly<
  Record<L7ValidationRunMode, L7ReplayIdentityMode>
> = {
  [L7ValidationRunMode.LIVE]: L7ReplayIdentityMode.LIVE,
  [L7ValidationRunMode.REPLAY]: L7ReplayIdentityMode.REPLAY,
  [L7ValidationRunMode.REPAIR]: L7ReplayIdentityMode.REPAIR,
  [L7ValidationRunMode.LATE_DATA_REVALIDATION]: L7ReplayIdentityMode.LATE_DATA,
};

export interface L7ValidationRun {
  readonly validation_run_id: string;
  readonly dag_version: string;
  readonly engine_version_set: Readonly<Record<string, string>>;
  readonly subject_contract_version_set: Readonly<Record<string, string>>;
  readonly mode: L7ValidationRunMode;
  readonly trace_id: string;
  readonly parent_run_id: string | null;
  readonly scope_set: readonly { readonly scope_type: string; readonly scope_id: string }[];
  readonly input_snapshot_ref: string;
  readonly started_at: string;
  readonly completed_at: string | null;
}

export interface RunValidationIssue {
  readonly code: L7RuntimeViolationCode;
  readonly detail: string;
}
export interface RunValidationResult {
  readonly valid: boolean;
  readonly issues: readonly RunValidationIssue[];
}

/**
 * §7.4.1.6 — Pre-execution run validation. A run that fails this check
 * must never execute; the failure is auditable.
 */
export function validateValidationRun(r: L7ValidationRun): RunValidationResult {
  const issues: RunValidationIssue[] = [];
  if (!r.validation_run_id) {
    issues.push({ code: L7RuntimeViolationCode.RUN_LINEAGE_MISSING, detail: 'validation_run_id missing' });
  }
  if (!r.dag_version) {
    issues.push({ code: L7RuntimeViolationCode.RUN_LINEAGE_MISSING, detail: 'dag_version missing' });
  }
  if (!ALL_RUN_MODES.includes(r.mode)) {
    issues.push({ code: L7RuntimeViolationCode.RUN_MODE_MISSING, detail: `illegal mode: ${r.mode as string}` });
  }
  if (!r.trace_id) {
    issues.push({ code: L7RuntimeViolationCode.RUN_LINEAGE_MISSING, detail: 'trace_id missing' });
  }
  if (!r.input_snapshot_ref) {
    issues.push({ code: L7RuntimeViolationCode.RUN_LINEAGE_MISSING, detail: 'input_snapshot_ref missing' });
  }
  if (r.scope_set.length === 0) {
    issues.push({ code: L7RuntimeViolationCode.RUN_LINEAGE_MISSING, detail: 'scope_set empty' });
  }
  if (Object.keys(r.engine_version_set).length === 0) {
    issues.push({ code: L7RuntimeViolationCode.RUN_ENGINE_SET_INCOMPLETE, detail: 'engine_version_set empty' });
  }
  if (Object.keys(r.subject_contract_version_set).length === 0) {
    issues.push({
      code: L7RuntimeViolationCode.RUN_ENGINE_SET_INCOMPLETE,
      detail: 'subject_contract_version_set empty',
    });
  }
  if (r.mode === L7ValidationRunMode.REPLAY || r.mode === L7ValidationRunMode.REPAIR) {
    if (!r.parent_run_id) {
      issues.push({
        code: L7RuntimeViolationCode.RUN_LINEAGE_MISSING,
        detail: 'parent_run_id required for REPLAY/REPAIR modes',
      });
    }
  }
  if (!r.started_at) {
    issues.push({ code: L7RuntimeViolationCode.RUN_LINEAGE_MISSING, detail: 'started_at missing' });
  }
  return { valid: issues.length === 0, issues };
}

export function finaliseValidationRun(
  r: L7ValidationRun,
  completed_at: string,
): L7ValidationRun {
  return { ...r, completed_at };
}
