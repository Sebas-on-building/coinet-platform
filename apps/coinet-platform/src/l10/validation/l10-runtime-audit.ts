/**
 * L10.4 — Runtime Audit
 *
 * §10.4.18 — Aggregates runtime violations from the DAG builder,
 * engines, materializer, and replay/repair adapters into a single
 * auditable report. Keeps the full violation record (code, source,
 * subject_id, candidate_id, detail, context) and classifies severity
 * so callers can decide whether a run is emission-blocking.
 */

import {
  L10RuntimeViolation,
  L10RuntimeViolationCode,
} from './l10-runtime-violation-codes';

export enum L10RuntimeViolationSeverity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL',
}

export interface L10RuntimeAuditReport {
  readonly total: number;
  readonly by_code: Readonly<Record<string, number>>;
  readonly by_source: Readonly<Record<string, number>>;
  readonly by_subject: Readonly<Record<string, number>>;
  readonly by_candidate: Readonly<Record<string, number>>;
  readonly highest_severity: L10RuntimeViolationSeverity;
  readonly violations: readonly L10RuntimeViolation[];
}

/**
 * §10.4.18.2 — Critical codes that block the run: illegal DAG
 * topology, determinism breaks, replay/repair masquerades,
 * materialization bypass, single-story collapses, and evidence pack
 * lineage gaps.
 */
const CRITICAL_CODES: ReadonlySet<L10RuntimeViolationCode> = new Set([
  L10RuntimeViolationCode.DAG_CYCLE_DETECTED,
  L10RuntimeViolationCode.DAG_UNRESOLVED_DEPENDENCY,
  L10RuntimeViolationCode.DAG_NODE_STAGE_MISMATCH,
  L10RuntimeViolationCode.DAG_ILLEGAL_EDGE_TRANSITION,
  L10RuntimeViolationCode.DAG_ILLEGAL_EDGE_CLASS,
  L10RuntimeViolationCode.DAG_DUPLICATE_NODE_ID,
  L10RuntimeViolationCode.DAG_NON_DETERMINISTIC_ORDER,
  L10RuntimeViolationCode.DAG_INPUT_TO_RANKING_JUMP,
  L10RuntimeViolationCode.DAG_SUBJECT_TO_SPREAD_JUMP,
  L10RuntimeViolationCode.DAG_SUPPORT_TO_MATERIALIZATION_JUMP,
  L10RuntimeViolationCode.DAG_CONFIDENCE_TO_CANDIDATE_BACKEDGE,
  L10RuntimeViolationCode.DAG_RANKING_TO_SUBJECT_BACKEDGE,
  L10RuntimeViolationCode.DAG_MISSING_TERMINAL_NODE,
  L10RuntimeViolationCode.RUN_DETERMINISM_BROKEN,
  L10RuntimeViolationCode.REPLAY_HASH_DIVERGED,
  L10RuntimeViolationCode.REPLAY_INVENTED_CANDIDATE,
  L10RuntimeViolationCode.REPLAY_ERASED_ALTERNATIVE,
  L10RuntimeViolationCode.REPLAY_SPREAD_SUPPRESSED,
  L10RuntimeViolationCode.REPLAY_RESTRICTION_DRIFT,
  L10RuntimeViolationCode.REPLAY_RANKING_DRIFT,
  L10RuntimeViolationCode.REPLAY_LINEAGE_BROKEN,
  L10RuntimeViolationCode.REPLAY_PRETENDS_LIVE,
  L10RuntimeViolationCode.REPAIR_LIVE_MASQUERADE,
  L10RuntimeViolationCode.REPAIR_LINEAGE_BROKEN,
  L10RuntimeViolationCode.REPAIR_UNMARKED,
  L10RuntimeViolationCode.REPAIR_REASON_MISSING,
  L10RuntimeViolationCode.REPAIR_SEMANTIC_DRIFT_UNJUSTIFIED,
  L10RuntimeViolationCode.CANDIDATE_SINGLE_STORY_COLLAPSE,
  L10RuntimeViolationCode.CANDIDATE_PRE_SELECTED_PRIMARY,
  L10RuntimeViolationCode.RANKING_SINGLE_STORY_COLLAPSE,
  L10RuntimeViolationCode.RANKING_DOUBLE_ASSIGNMENT,
  L10RuntimeViolationCode.RANKING_PRIMARY_SAME_AS_SECONDARY,
  L10RuntimeViolationCode.RANKING_IGNORES_BLOCKING_CONTRADICTION,
  L10RuntimeViolationCode.RANKING_IGNORES_RESTRICTION,
  L10RuntimeViolationCode.MATERIALIZATION_DIRECT_STORE_WRITE,
  L10RuntimeViolationCode.MATERIALIZATION_BYPASSES_L5,
  L10RuntimeViolationCode.MATERIALIZATION_CONTRACT_INVALID,
  L10RuntimeViolationCode.MATERIALIZATION_SEMANTIC_REPAIR,
  L10RuntimeViolationCode.MATERIALIZATION_CLEANED_NARROWED_COMPETITION,
  L10RuntimeViolationCode.EVIDENCE_PACK_NON_DETERMINISTIC,
  L10RuntimeViolationCode.EVIDENCE_PACK_MISSING_LINEAGE,
  L10RuntimeViolationCode.ASSEMBLY_JUDGMENT_LEAK,
  L10RuntimeViolationCode.CANDIDATE_NAME_LEAK,
]);

const WARNING_CODES: ReadonlySet<L10RuntimeViolationCode> = new Set([
  L10RuntimeViolationCode.SUPPORT_STALE_AS_CLEAN,
  L10RuntimeViolationCode.SUPPORT_DEGRADED_AS_CLEAN,
  L10RuntimeViolationCode.CONFIRMATION_GAP_HIDDEN,
  L10RuntimeViolationCode.CONTRADICTION_ACTIVE_AS_DECAYED,
  L10RuntimeViolationCode.CONTRADICTION_BLOCKING_AS_NARROWING,
  L10RuntimeViolationCode.CONTRADICTION_DIRECT_AS_INDIRECT,
]);

export function classifyL10ViolationSeverity(
  code: L10RuntimeViolationCode,
): L10RuntimeViolationSeverity {
  if (CRITICAL_CODES.has(code)) return L10RuntimeViolationSeverity.CRITICAL;
  if (WARNING_CODES.has(code)) return L10RuntimeViolationSeverity.WARNING;
  return L10RuntimeViolationSeverity.ERROR;
}

export function buildL10RuntimeAudit(
  violations: readonly L10RuntimeViolation[],
): L10RuntimeAuditReport {
  const byCode: Record<string, number> = {};
  const bySource: Record<string, number> = {};
  const bySubject: Record<string, number> = {};
  const byCandidate: Record<string, number> = {};
  let worst = L10RuntimeViolationSeverity.INFO;
  const severityOrder: Record<L10RuntimeViolationSeverity, number> = {
    INFO: 0, WARNING: 1, ERROR: 2, CRITICAL: 3,
  };
  for (const v of violations) {
    byCode[v.code] = (byCode[v.code] ?? 0) + 1;
    bySource[v.source] = (bySource[v.source] ?? 0) + 1;
    const sid = v.hypothesis_subject_id ?? '__no_subject__';
    bySubject[sid] = (bySubject[sid] ?? 0) + 1;
    const cid = v.hypothesis_candidate_id ?? '__no_candidate__';
    byCandidate[cid] = (byCandidate[cid] ?? 0) + 1;
    const sev = classifyL10ViolationSeverity(v.code);
    if (severityOrder[sev] > severityOrder[worst]) worst = sev;
  }
  return {
    total: violations.length,
    by_code: byCode,
    by_source: bySource,
    by_subject: bySubject,
    by_candidate: byCandidate,
    highest_severity: worst,
    violations: [...violations],
  };
}

export function hasL10BlockingViolations(
  report: L10RuntimeAuditReport,
): boolean {
  return report.highest_severity === L10RuntimeViolationSeverity.CRITICAL ||
         report.highest_severity === L10RuntimeViolationSeverity.ERROR;
}
