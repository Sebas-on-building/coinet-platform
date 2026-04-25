/**
 * L10.8 — Persistence Audit
 *
 * §10.8.12 — Aggregates `L10PersistenceViolation` records produced by
 * every L10.8 validator (persistence-policy, current-authority,
 * historical, evidence, read-surface, downstream-consumption) into a
 * single deterministic audit report.
 */

import {
  ALL_L10_PERSISTENCE_VIOLATION_TIERS,
  L10PersistenceViolation,
  L10PersistenceViolationCode,
  L10PersistenceViolationTier,
} from '../persistence/l10-persistence-violation-codes';

export enum L10PersistenceAuditSeverity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL',
}

/**
 * §10.8.12 — CRITICAL: codes that structurally break persistence law.
 */
const CRITICAL_CODES: ReadonlySet<L10PersistenceViolationCode> = new Set([
  L10PersistenceViolationCode.PERSIST_NOT_ROUTED_THROUGH_L5,
  L10PersistenceViolationCode.PERSIST_DIRECT_STORE_WRITE,
  L10PersistenceViolationCode.PERSIST_MUTATION_DISCIPLINE_VIOLATED,

  L10PersistenceViolationCode.CURRENT_AUTHORITY_WRONG_STORE,
  L10PersistenceViolationCode.CURRENT_AUTHORITY_REDIS_SHADOW,
  L10PersistenceViolationCode.CURRENT_AUTHORITY_SILENT_OVERWRITE,
  L10PersistenceViolationCode.CURRENT_AUTHORITY_REPAIR_NOT_MARKED,
  L10PersistenceViolationCode.CURRENT_AUTHORITY_REPLAY_AS_LIVE,

  L10PersistenceViolationCode.HIST_DESTRUCTIVE_OVERWRITE,
  L10PersistenceViolationCode.HIST_MUTATES_CURRENT,
  L10PersistenceViolationCode.HIST_REPLAY_IDENTITY_MISSING,
  L10PersistenceViolationCode.HIST_CORRECTION_SEMANTICS_MISSING,

  L10PersistenceViolationCode.EVID_ORPHAN_BUNDLE,
  L10PersistenceViolationCode.EVID_PATH_NOT_DETERMINISTIC,
  L10PersistenceViolationCode.EVID_SUBJECT_LINKAGE_MISSING,
  L10PersistenceViolationCode.EVID_MANIFEST_LINK_MISSING,

  L10PersistenceViolationCode.READ_RAW_STORAGE_BYPASS,
  L10PersistenceViolationCode.READ_CURRENT_FROM_HISTORICAL_ONLY_SURFACE,

  L10PersistenceViolationCode.DOWNSTREAM_REBUILD_FROM_LOWER_LAYERS,
  L10PersistenceViolationCode.DOWNSTREAM_ADAPTER_OUTSIDE_GOVERNED_FLOW,
  L10PersistenceViolationCode.DOWNSTREAM_IGNORES_RESTRICTION,

  L10PersistenceViolationCode.REPLAY_READ_AS_LIVE_CURRENT,
  L10PersistenceViolationCode.REPAIR_WITHOUT_PARENT_LINEAGE,
  L10PersistenceViolationCode.REPAIR_WITHOUT_REASON,
  L10PersistenceViolationCode.REPAIR_INVENTED_EVIDENCE,
  L10PersistenceViolationCode.REPLAY_USES_RAW_STORAGE_BYPASS,
  L10PersistenceViolationCode.REPAIR_MODE_MASQUERADE,

  L10PersistenceViolationCode.MAT_REPAIR_PRETENDS_LIVE,
  L10PersistenceViolationCode.MAT_APPEND_PRETENDS_CURRENT,
]);

/**
 * §10.8.12 — WARNING: soft-coverage gaps that should be tracked but
 * do not structurally break persistence law.
 */
const WARNING_CODES: ReadonlySet<L10PersistenceViolationCode> = new Set([
  L10PersistenceViolationCode.READ_WINDOW_INVALID,
  L10PersistenceViolationCode.READ_GUARD_FLAG_MISSING,
]);

export function classifyL10PersistenceAuditSeverity(
  code: L10PersistenceViolationCode,
): L10PersistenceAuditSeverity {
  if (CRITICAL_CODES.has(code)) return L10PersistenceAuditSeverity.CRITICAL;
  if (WARNING_CODES.has(code)) return L10PersistenceAuditSeverity.WARNING;
  return L10PersistenceAuditSeverity.ERROR;
}

export interface L10PersistenceAuditReport {
  readonly total: number;
  readonly by_code: Readonly<Record<string, number>>;
  readonly by_tier: Readonly<Record<L10PersistenceViolationTier, number>>;
  readonly highest_severity: L10PersistenceAuditSeverity;
  readonly violations: readonly L10PersistenceViolation[];
}

export function buildL10PersistenceAudit(
  violations: readonly L10PersistenceViolation[],
): L10PersistenceAuditReport {
  const byCode: Record<string, number> = {};
  const byTier: Record<L10PersistenceViolationTier, number> =
    Object.fromEntries(
      ALL_L10_PERSISTENCE_VIOLATION_TIERS.map((t) => [t, 0]),
    ) as Record<L10PersistenceViolationTier, number>;

  const severityOrder: Record<L10PersistenceAuditSeverity, number> = {
    INFO: 0, WARNING: 1, ERROR: 2, CRITICAL: 3,
  };
  let worst = L10PersistenceAuditSeverity.INFO;

  for (const v of violations) {
    byCode[v.code] = (byCode[v.code] ?? 0) + 1;
    byTier[v.tier] = (byTier[v.tier] ?? 0) + 1;
    const sev = classifyL10PersistenceAuditSeverity(v.code);
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

export function hasL10PersistenceBlockingViolations(
  report: L10PersistenceAuditReport,
): boolean {
  return (
    report.highest_severity === L10PersistenceAuditSeverity.CRITICAL ||
    report.highest_severity === L10PersistenceAuditSeverity.ERROR
  );
}
