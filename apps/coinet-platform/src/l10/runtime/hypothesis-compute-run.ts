/**
 * L10.4 — Hypothesis Compute Run
 *
 * §10.4.2.7 / §10.4.16 — Every Layer 10 run must carry a full lineage
 * anchor: engine versions, template versions, subject-contract
 * versions, mode, trace id, parent run id (for REPLAY/REPAIR), scope
 * set, and input snapshot ref. This file defines `L10HypothesisRun`
 * and the pre-execution validator.
 */

import { L10RuntimeViolationCode } from '../validation/l10-runtime-violation-codes';

/**
 * §10.4.15.3-4 — Run modes. Replay and repair branch here;
 * persistence adapters select materialization paths by this value.
 */
export enum L10HypothesisRunMode {
  LIVE = 'LIVE',
  REPLAY = 'REPLAY',
  REPAIR = 'REPAIR',
  HISTORICAL_RECONSTRUCTION = 'HISTORICAL_RECONSTRUCTION',
}

export const ALL_L10_HYPOTHESIS_RUN_MODES:
  readonly L10HypothesisRunMode[] =
    Object.values(L10HypothesisRunMode);

export interface L10HypothesisRun {
  readonly hypothesis_run_id: string;
  readonly hypothesis_engine_version: string;
  readonly dag_version: string;
  readonly template_version_set: Readonly<Record<string, string>>;
  readonly engine_version_set: Readonly<Record<string, string>>;
  readonly subject_contract_version_set: Readonly<Record<string, string>>;
  readonly candidate_contract_version_set: Readonly<Record<string, string>>;
  readonly mode: L10HypothesisRunMode;
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

export interface L10RunValidationIssue {
  readonly code: L10RuntimeViolationCode;
  readonly detail: string;
}
export interface L10RunValidationResult {
  readonly valid: boolean;
  readonly issues: readonly L10RunValidationIssue[];
}

/**
 * §10.4.2.7 — Pre-execution run validation. A run that fails this
 * check must never execute; the failure is auditable.
 */
export function validateL10HypothesisRun(
  r: L10HypothesisRun,
): L10RunValidationResult {
  const issues: L10RunValidationIssue[] = [];
  if (!r.hypothesis_run_id) {
    issues.push({
      code: L10RuntimeViolationCode.RUN_LINEAGE_MISSING,
      detail: 'hypothesis_run_id missing',
    });
  }
  if (!r.hypothesis_engine_version) {
    issues.push({
      code: L10RuntimeViolationCode.RUN_LINEAGE_MISSING,
      detail: 'hypothesis_engine_version missing',
    });
  }
  if (!r.dag_version) {
    issues.push({
      code: L10RuntimeViolationCode.RUN_LINEAGE_MISSING,
      detail: 'dag_version missing',
    });
  }
  if (!ALL_L10_HYPOTHESIS_RUN_MODES.includes(r.mode)) {
    issues.push({
      code: L10RuntimeViolationCode.RUN_MODE_MISSING,
      detail: `illegal mode: ${r.mode as string}`,
    });
  }
  if (!r.trace_id) {
    issues.push({
      code: L10RuntimeViolationCode.RUN_LINEAGE_MISSING,
      detail: 'trace_id missing',
    });
  }
  if (!r.input_snapshot_ref) {
    issues.push({
      code: L10RuntimeViolationCode.RUN_LINEAGE_MISSING,
      detail: 'input_snapshot_ref missing',
    });
  }
  if (!r.scope_set || r.scope_set.length === 0) {
    issues.push({
      code: L10RuntimeViolationCode.RUN_LINEAGE_MISSING,
      detail: 'scope_set empty',
    });
  }
  if (!r.engine_version_set ||
      Object.keys(r.engine_version_set).length === 0) {
    issues.push({
      code: L10RuntimeViolationCode.RUN_ENGINE_SET_INCOMPLETE,
      detail: 'engine_version_set empty',
    });
  }
  if (!r.subject_contract_version_set ||
      Object.keys(r.subject_contract_version_set).length === 0) {
    issues.push({
      code: L10RuntimeViolationCode.RUN_ENGINE_SET_INCOMPLETE,
      detail: 'subject_contract_version_set empty',
    });
  }
  if (!r.candidate_contract_version_set ||
      Object.keys(r.candidate_contract_version_set).length === 0) {
    issues.push({
      code: L10RuntimeViolationCode.RUN_ENGINE_SET_INCOMPLETE,
      detail: 'candidate_contract_version_set empty',
    });
  }
  if (!r.template_version_set ||
      Object.keys(r.template_version_set).length === 0) {
    issues.push({
      code: L10RuntimeViolationCode.RUN_TEMPLATE_SET_INCOMPLETE,
      detail: 'template_version_set empty',
    });
  }
  if (r.mode === L10HypothesisRunMode.REPLAY ||
      r.mode === L10HypothesisRunMode.REPAIR) {
    if (!r.parent_run_id) {
      issues.push({
        code: L10RuntimeViolationCode.RUN_PARENT_REQUIRED,
        detail: 'parent_run_id required for REPLAY/REPAIR modes',
      });
    }
  }
  if (r.mode === L10HypothesisRunMode.REPAIR && !r.repair_reason) {
    issues.push({
      code: L10RuntimeViolationCode.REPAIR_REASON_MISSING,
      detail: 'repair_reason required for REPAIR mode',
    });
  }
  if (!r.started_at) {
    issues.push({
      code: L10RuntimeViolationCode.RUN_LINEAGE_MISSING,
      detail: 'started_at missing',
    });
  }
  return { valid: issues.length === 0, issues };
}

export function finaliseL10HypothesisRun(
  r: L10HypothesisRun,
  completed_at: string,
): L10HypothesisRun {
  return { ...r, completed_at };
}
