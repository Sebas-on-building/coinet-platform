/**
 * L8.4 — Regime Compute Run
 *
 * §8.4.2.7 — Every Layer 8 run must carry a full lineage anchor. This
 * file defines the `L8RegimeRun` record and the helpers that validate
 * and finalise it.
 */

import { L8RuntimeViolationCode } from '../validation/l8-runtime-violation-codes';

/**
 * §8.4.8.2 — `L8RegimeRunMode`. Replay identity and persistence branch
 * on this value.
 */
export enum L8RegimeRunMode {
  LIVE = 'LIVE',
  REPLAY = 'REPLAY',
  REPAIR = 'REPAIR',
  HISTORICAL_RECONSTRUCTION = 'HISTORICAL_RECONSTRUCTION',
}

export const ALL_L8_RUN_MODES: readonly L8RegimeRunMode[] =
  Object.values(L8RegimeRunMode);

export interface L8RegimeRun {
  readonly regime_run_id: string;
  readonly regime_engine_version: string;
  readonly dag_version: string;
  readonly template_version_set: Readonly<Record<string, string>>;
  readonly engine_version_set: Readonly<Record<string, string>>;
  readonly subject_contract_version_set: Readonly<Record<string, string>>;
  readonly mode: L8RegimeRunMode;
  readonly trace_id: string;
  readonly parent_run_id: string | null;
  readonly repair_reason: string | null;
  readonly scope_set: readonly {
    readonly scope_type: string;
    readonly scope_id: string;
  }[];
  readonly input_snapshot_ref: string;
  readonly started_at: string;
  readonly completed_at: string | null;
}

export interface L8RunValidationIssue {
  readonly code: L8RuntimeViolationCode;
  readonly detail: string;
}
export interface L8RunValidationResult {
  readonly valid: boolean;
  readonly issues: readonly L8RunValidationIssue[];
}

/**
 * §8.4.2.7 — Pre-execution run validation. A run that fails this check
 * must never execute; the failure is auditable.
 */
export function validateL8RegimeRun(r: L8RegimeRun): L8RunValidationResult {
  const issues: L8RunValidationIssue[] = [];
  if (!r.regime_run_id) {
    issues.push({
      code: L8RuntimeViolationCode.RUN_LINEAGE_MISSING,
      detail: 'regime_run_id missing',
    });
  }
  if (!r.regime_engine_version) {
    issues.push({
      code: L8RuntimeViolationCode.RUN_LINEAGE_MISSING,
      detail: 'regime_engine_version missing',
    });
  }
  if (!r.dag_version) {
    issues.push({
      code: L8RuntimeViolationCode.RUN_LINEAGE_MISSING,
      detail: 'dag_version missing',
    });
  }
  if (!ALL_L8_RUN_MODES.includes(r.mode)) {
    issues.push({
      code: L8RuntimeViolationCode.RUN_MODE_MISSING,
      detail: `illegal mode: ${r.mode as string}`,
    });
  }
  if (!r.trace_id) {
    issues.push({
      code: L8RuntimeViolationCode.RUN_LINEAGE_MISSING,
      detail: 'trace_id missing',
    });
  }
  if (!r.input_snapshot_ref) {
    issues.push({
      code: L8RuntimeViolationCode.RUN_LINEAGE_MISSING,
      detail: 'input_snapshot_ref missing',
    });
  }
  if (!r.scope_set || r.scope_set.length === 0) {
    issues.push({
      code: L8RuntimeViolationCode.RUN_LINEAGE_MISSING,
      detail: 'scope_set empty',
    });
  }
  if (!r.engine_version_set || Object.keys(r.engine_version_set).length === 0) {
    issues.push({
      code: L8RuntimeViolationCode.RUN_ENGINE_SET_INCOMPLETE,
      detail: 'engine_version_set empty',
    });
  }
  if (!r.subject_contract_version_set ||
      Object.keys(r.subject_contract_version_set).length === 0) {
    issues.push({
      code: L8RuntimeViolationCode.RUN_ENGINE_SET_INCOMPLETE,
      detail: 'subject_contract_version_set empty',
    });
  }
  if (!r.template_version_set ||
      Object.keys(r.template_version_set).length === 0) {
    issues.push({
      code: L8RuntimeViolationCode.RUN_ENGINE_SET_INCOMPLETE,
      detail: 'template_version_set empty',
    });
  }
  if (r.mode === L8RegimeRunMode.REPLAY || r.mode === L8RegimeRunMode.REPAIR) {
    if (!r.parent_run_id) {
      issues.push({
        code: L8RuntimeViolationCode.RUN_PARENT_REQUIRED,
        detail: 'parent_run_id required for REPLAY/REPAIR modes',
      });
    }
  }
  if (r.mode === L8RegimeRunMode.REPAIR && !r.repair_reason) {
    issues.push({
      code: L8RuntimeViolationCode.REPAIR_REASON_MISSING,
      detail: 'repair_reason required for REPAIR mode',
    });
  }
  if (!r.started_at) {
    issues.push({
      code: L8RuntimeViolationCode.RUN_LINEAGE_MISSING,
      detail: 'started_at missing',
    });
  }
  return { valid: issues.length === 0, issues };
}

export function finaliseL8RegimeRun(
  r: L8RegimeRun,
  completed_at: string,
): L8RegimeRun {
  return { ...r, completed_at };
}
