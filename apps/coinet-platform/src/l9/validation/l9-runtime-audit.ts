/**
 * L9.4 — Runtime Audit
 *
 * §9.4.18 — Aggregates runtime violations produced by the DAG builder,
 * engines, materializer, and replay/repair adapters into a single
 * audit report. Runtime audit keeps every violation's code, source,
 * subject id, and detail intact.
 */

import {
  L9RuntimeViolation,
  L9RuntimeViolationCode,
} from './l9-runtime-violation-codes';

export interface L9RuntimeAuditReport {
  readonly total: number;
  readonly by_code: Readonly<Record<string, number>>;
  readonly by_source: Readonly<Record<string, number>>;
  readonly by_subject: Readonly<Record<string, number>>;
  readonly highest_severity: L9RuntimeViolationSeverity;
  readonly violations: readonly L9RuntimeViolation[];
}

export enum L9RuntimeViolationSeverity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL',
}

/**
 * §9.4.18.2 — Severity map. Critical families block the run:
 *   - DAG illegality / cycles
 *   - determinism breaks
 *   - replay hash divergence
 *   - repair lineage/masquerade
 *   - classification ambiguity laundering
 *   - materialization bypass
 */
const CRITICAL_CODES: ReadonlySet<L9RuntimeViolationCode> = new Set([
  L9RuntimeViolationCode.DAG_CYCLE_DETECTED,
  L9RuntimeViolationCode.DAG_UNRESOLVED_DEPENDENCY,
  L9RuntimeViolationCode.DAG_NODE_STAGE_MISMATCH,
  L9RuntimeViolationCode.DAG_ILLEGAL_EDGE_TRANSITION,
  L9RuntimeViolationCode.DAG_DUPLICATE_NODE_ID,
  L9RuntimeViolationCode.DAG_NON_DETERMINISTIC_ORDER,
  L9RuntimeViolationCode.RUN_DETERMINISM_BROKEN,
  L9RuntimeViolationCode.REPLAY_HASH_DIVERGED,
  L9RuntimeViolationCode.REPLAY_STATE_DRIFT,
  L9RuntimeViolationCode.REPLAY_FAMILY_DRIFT,
  L9RuntimeViolationCode.REPLAY_ERASED_AMBIGUITY,
  L9RuntimeViolationCode.REPAIR_LIVE_MASQUERADE,
  L9RuntimeViolationCode.REPAIR_LINEAGE_BROKEN,
  L9RuntimeViolationCode.REPAIR_UNMARKED,
  L9RuntimeViolationCode.CLASSIFY_AMBIGUITY_LAUNDERED,
  L9RuntimeViolationCode.CLASSIFY_FAKE_CLEAN_SINGLE,
  L9RuntimeViolationCode.CLASSIFY_CHAIN_DAMAGED_CLEAN,
  L9RuntimeViolationCode.CLASSIFY_DOUBLE_ASSIGNMENT,
  L9RuntimeViolationCode.CLASSIFY_ILLEGAL_COEXISTENCE,
  L9RuntimeViolationCode.MATERIALIZATION_DIRECT_STORE_WRITE,
  L9RuntimeViolationCode.MATERIALIZATION_BYPASSES_L5,
]);

const WARNING_CODES: ReadonlySet<L9RuntimeViolationCode> = new Set([
  L9RuntimeViolationCode.INPUT_STALE_MASQUERADING_CURRENT,
  L9RuntimeViolationCode.ORDERED_SIGNAL_AMBIGUITY_ERASED,
  L9RuntimeViolationCode.CONFIDENCE_IGNORES_AMBIGUITY,
  L9RuntimeViolationCode.CONFIDENCE_IGNORES_DECAY,
  L9RuntimeViolationCode.DECAY_MISSING_REASON,
]);

export function classifyL9ViolationSeverity(
  code: L9RuntimeViolationCode,
): L9RuntimeViolationSeverity {
  if (CRITICAL_CODES.has(code)) return L9RuntimeViolationSeverity.CRITICAL;
  if (WARNING_CODES.has(code)) return L9RuntimeViolationSeverity.WARNING;
  return L9RuntimeViolationSeverity.ERROR;
}

export function buildL9RuntimeAudit(
  violations: readonly L9RuntimeViolation[],
): L9RuntimeAuditReport {
  const byCode: Record<string, number> = {};
  const bySource: Record<string, number> = {};
  const bySubject: Record<string, number> = {};
  let worst = L9RuntimeViolationSeverity.INFO;
  const severityOrder: Record<L9RuntimeViolationSeverity, number> = {
    INFO: 0, WARNING: 1, ERROR: 2, CRITICAL: 3,
  };
  for (const v of violations) {
    byCode[v.code] = (byCode[v.code] ?? 0) + 1;
    bySource[v.source] = (bySource[v.source] ?? 0) + 1;
    const sid = v.sequence_subject_id ?? '__no_subject__';
    bySubject[sid] = (bySubject[sid] ?? 0) + 1;
    const sev = classifyL9ViolationSeverity(v.code);
    if (severityOrder[sev] > severityOrder[worst]) worst = sev;
  }
  return {
    total: violations.length,
    by_code: byCode,
    by_source: bySource,
    by_subject: bySubject,
    highest_severity: worst,
    violations: [...violations],
  };
}

export function hasL9BlockingViolations(
  report: L9RuntimeAuditReport,
): boolean {
  return report.highest_severity === L9RuntimeViolationSeverity.CRITICAL ||
         report.highest_severity === L9RuntimeViolationSeverity.ERROR;
}
