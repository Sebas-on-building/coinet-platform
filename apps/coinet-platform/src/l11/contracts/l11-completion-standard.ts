/**
 * L11.9 — Completion Standard (§11.9.3)
 *
 * Hard completion checklist: nine clauses that must all be true for
 * Layer 11 to qualify as ratified. The completion standard does not
 * reach into L11.1–L11.8 internals — it expresses the *contract* that
 * the master certification orchestrator validates.
 */

import { L11SublayerId } from './l11-layer-inventory';

export const L11_COMPLETION_STANDARD_POLICY_VERSION = 'l11.9.completion.v1';

export enum L11CompletionClause {
  C1_SCORE_CONSTITUTION_EXISTS = 'C1_SCORE_CONSTITUTION_EXISTS',
  C2_SCORE_DOCTRINE_EXISTS = 'C2_SCORE_DOCTRINE_EXISTS',
  C3_FORMULA_LAW_EXISTS = 'C3_FORMULA_LAW_EXISTS',
  C4_ATTRIBUTION_EXISTS = 'C4_ATTRIBUTION_EXISTS',
  C5_MISSING_REGIME_GOVERNANCE_EXISTS = 'C5_MISSING_REGIME_GOVERNANCE_EXISTS',
  C6_CALIBRATION_HOOKS_EXIST = 'C6_CALIBRATION_HOOKS_EXIST',
  C7_DRIFT_GOVERNANCE_EXISTS = 'C7_DRIFT_GOVERNANCE_EXISTS',
  C8_PERSISTENCE_AND_REPLAY_EXIST = 'C8_PERSISTENCE_AND_REPLAY_EXIST',
  C9_MASTER_CERTIFICATION_EXISTS = 'C9_MASTER_CERTIFICATION_EXISTS',
}

export const ALL_L11_COMPLETION_CLAUSES:
  readonly L11CompletionClause[] = Object.values(L11CompletionClause);

/** Map each completion clause to the sublayer that proves it. */
export const L11_COMPLETION_CLAUSE_TO_SUBLAYER:
  Readonly<Record<L11CompletionClause, L11SublayerId>> = {
  [L11CompletionClause.C1_SCORE_CONSTITUTION_EXISTS]:
    L11SublayerId.L11_1_CONSTITUTION,
  [L11CompletionClause.C2_SCORE_DOCTRINE_EXISTS]:
    L11SublayerId.L11_2_SCORE_DOCTRINE,
  [L11CompletionClause.C3_FORMULA_LAW_EXISTS]:
    L11SublayerId.L11_3_FORMULA_LAW,
  [L11CompletionClause.C4_ATTRIBUTION_EXISTS]:
    L11SublayerId.L11_4_ATTRIBUTION,
  [L11CompletionClause.C5_MISSING_REGIME_GOVERNANCE_EXISTS]:
    L11SublayerId.L11_5_MISSING_REGIME,
  [L11CompletionClause.C6_CALIBRATION_HOOKS_EXIST]:
    L11SublayerId.L11_6_CALIBRATION,
  [L11CompletionClause.C7_DRIFT_GOVERNANCE_EXISTS]:
    L11SublayerId.L11_7_DRIFT,
  [L11CompletionClause.C8_PERSISTENCE_AND_REPLAY_EXIST]:
    L11SublayerId.L11_8_PERSISTENCE,
  [L11CompletionClause.C9_MASTER_CERTIFICATION_EXISTS]:
    L11SublayerId.L11_9_RATIFICATION,
};

export interface L11CompletionClauseStatus {
  readonly clause: L11CompletionClause;
  readonly sublayer: L11SublayerId;
  readonly satisfied: boolean;
  readonly evidence: string;
}

export interface L11CompletionStandardReport {
  readonly clause_results: readonly L11CompletionClauseStatus[];
  readonly all_satisfied: boolean;
  readonly unsatisfied_clauses: readonly L11CompletionClause[];
  readonly policy_version: string;
}

/** Pure aggregator: given clause statuses, produce the report. */
export function buildL11CompletionStandardReport(
  clauseResults: readonly L11CompletionClauseStatus[],
): L11CompletionStandardReport {
  const unsatisfied = clauseResults
    .filter(c => !c.satisfied)
    .map(c => c.clause);
  return {
    clause_results: clauseResults,
    all_satisfied: unsatisfied.length === 0 &&
      clauseResults.length === ALL_L11_COMPLETION_CLAUSES.length,
    unsatisfied_clauses: unsatisfied,
    policy_version: L11_COMPLETION_STANDARD_POLICY_VERSION,
  };
}

export function makeL11CompletionClauseStatus(
  clause: L11CompletionClause,
  satisfied: boolean,
  evidence: string,
): L11CompletionClauseStatus {
  return {
    clause,
    sublayer: L11_COMPLETION_CLAUSE_TO_SUBLAYER[clause],
    satisfied,
    evidence,
  };
}
