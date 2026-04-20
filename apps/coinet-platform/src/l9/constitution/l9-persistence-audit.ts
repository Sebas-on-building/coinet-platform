/**
 * L9.8 — Persistence Audit
 *
 * §9.8.12 — Aggregates `L9PersistenceViolation` records produced by
 * every L9.8 validator (persistence-policy, current-authority,
 * historical, evidence, read-surface, downstream-consumption) into a
 * single deterministic audit report.
 */

import {
  ALL_L9_PERSISTENCE_VIOLATION_TIERS,
  L9PersistenceViolation,
  L9PersistenceViolationCode,
  L9PersistenceViolationTier,
} from '../persistence/l9-persistence-violation-codes';

export enum L9PersistenceAuditSeverity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL',
}

/**
 * §9.8.12 — CRITICAL: codes that structurally break persistence law:
 * unrouted writes, current authority not on Postgres, destructive
 * overwrites, orphan evidence, raw-storage bypasses, rebuild-from-
 * lower-layers, replay read as live current.
 */
const CRITICAL_CODES: ReadonlySet<L9PersistenceViolationCode> = new Set([
  L9PersistenceViolationCode.PERSIST_NOT_ROUTED_THROUGH_L5,
  L9PersistenceViolationCode.PERSIST_DIRECT_STORE_WRITE,
  L9PersistenceViolationCode.PERSIST_MUTATION_DISCIPLINE_VIOLATED,

  L9PersistenceViolationCode.CURRENT_AUTHORITY_WRONG_STORE,
  L9PersistenceViolationCode.CURRENT_AUTHORITY_REDIS_SHADOW,
  L9PersistenceViolationCode.CURRENT_AUTHORITY_SILENT_OVERWRITE,
  L9PersistenceViolationCode.CURRENT_AUTHORITY_REPAIR_NOT_MARKED,
  L9PersistenceViolationCode.CURRENT_AUTHORITY_REPLAY_AS_LIVE,

  L9PersistenceViolationCode.HIST_DESTRUCTIVE_OVERWRITE,
  L9PersistenceViolationCode.HIST_MUTATES_CURRENT,
  L9PersistenceViolationCode.HIST_REPLAY_IDENTITY_MISSING,
  L9PersistenceViolationCode.HIST_CORRECTION_SEMANTICS_MISSING,

  L9PersistenceViolationCode.EVID_ORPHAN_BUNDLE,
  L9PersistenceViolationCode.EVID_PATH_NOT_DETERMINISTIC,
  L9PersistenceViolationCode.EVID_SUBJECT_LINKAGE_MISSING,
  L9PersistenceViolationCode.EVID_MANIFEST_LINK_MISSING,

  L9PersistenceViolationCode.READ_RAW_STORAGE_BYPASS,
  L9PersistenceViolationCode.READ_CURRENT_FROM_HISTORICAL_ONLY_SURFACE,

  L9PersistenceViolationCode.DOWNSTREAM_REBUILD_FROM_LOWER_LAYERS,
  L9PersistenceViolationCode.DOWNSTREAM_ADAPTER_OUTSIDE_GOVERNED_FLOW,
  L9PersistenceViolationCode.DOWNSTREAM_IGNORES_RESTRICTION,

  L9PersistenceViolationCode.REPLAY_READ_AS_LIVE_CURRENT,
  L9PersistenceViolationCode.REPAIR_WITHOUT_PARENT_LINEAGE,
  L9PersistenceViolationCode.REPAIR_WITHOUT_REASON,
  L9PersistenceViolationCode.REPAIR_INVENTED_EVIDENCE,
  L9PersistenceViolationCode.REPLAY_USES_RAW_STORAGE_BYPASS,
  L9PersistenceViolationCode.REPAIR_MODE_MASQUERADE,

  L9PersistenceViolationCode.MAT_REPAIR_PRETENDS_LIVE,
  L9PersistenceViolationCode.MAT_APPEND_PRETENDS_CURRENT,
]);

/**
 * §9.8.12 — WARNING: soft-coverage gaps that should be tracked but
 * do not structurally break persistence law.
 */
const WARNING_CODES: ReadonlySet<L9PersistenceViolationCode> = new Set([
  L9PersistenceViolationCode.READ_WINDOW_INVALID,
  L9PersistenceViolationCode.READ_GUARD_FLAG_MISSING,
]);

export function classifyL9PersistenceAuditSeverity(
  code: L9PersistenceViolationCode,
): L9PersistenceAuditSeverity {
  if (CRITICAL_CODES.has(code)) return L9PersistenceAuditSeverity.CRITICAL;
  if (WARNING_CODES.has(code)) return L9PersistenceAuditSeverity.WARNING;
  return L9PersistenceAuditSeverity.ERROR;
}

export interface L9PersistenceAuditReport {
  readonly total: number;
  readonly by_code: Readonly<Record<string, number>>;
  readonly by_tier: Readonly<Record<L9PersistenceViolationTier, number>>;
  readonly highest_severity: L9PersistenceAuditSeverity;
  readonly violations: readonly L9PersistenceViolation[];
}

export function buildL9PersistenceAudit(
  violations: readonly L9PersistenceViolation[],
): L9PersistenceAuditReport {
  const byCode: Record<string, number> = {};
  const byTier: Record<L9PersistenceViolationTier, number> =
    Object.fromEntries(
      ALL_L9_PERSISTENCE_VIOLATION_TIERS.map((t) => [t, 0]),
    ) as Record<L9PersistenceViolationTier, number>;

  const severityOrder: Record<L9PersistenceAuditSeverity, number> = {
    INFO: 0, WARNING: 1, ERROR: 2, CRITICAL: 3,
  };
  let worst = L9PersistenceAuditSeverity.INFO;

  for (const v of violations) {
    byCode[v.code] = (byCode[v.code] ?? 0) + 1;
    byTier[v.tier] = (byTier[v.tier] ?? 0) + 1;
    const sev = classifyL9PersistenceAuditSeverity(v.code);
    if (severityOrder[sev] > severityOrder[worst]) worst = sev;
  }

  return {
    total: violations.length,
    by_code: byCode,
    by_tier: byTier,
    highest_severity: worst,
    violations: [...violations],
  };
}

export function hasL9PersistenceBlockingViolations(
  report: L9PersistenceAuditReport,
): boolean {
  return (
    report.highest_severity === L9PersistenceAuditSeverity.CRITICAL ||
    report.highest_severity === L9PersistenceAuditSeverity.ERROR
  );
}
