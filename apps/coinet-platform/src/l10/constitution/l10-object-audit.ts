/**
 * L10.2 — Object-Tier Audit Log
 *
 * §10.2.20.5 — Deterministic audit log for L10.2 object-tier violations.
 * Disjoint from the L10.1 constitutional audit, so each tier remains
 * unambiguous about which layer rejected an artifact.
 */

import {
  L10ObjectValidationReport,
  L10ObjectViolationCode,
} from '../validation/hypothesis-object-violation-codes';

export enum L10ObjectAuditSeverity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export interface L10ObjectAuditRecord {
  readonly id: string;
  readonly timestamp: string;
  readonly objectKind: string;
  readonly objectId: string;
  readonly code: L10ObjectViolationCode;
  readonly severity: L10ObjectAuditSeverity;
  readonly message: string;
  readonly details?: Record<string, unknown>;
}

const log: L10ObjectAuditRecord[] = [];

/**
 * §10.2.20.5 — Deterministic severity mapping. Semantic-leak codes are
 * CRITICAL; structural "missing" codes are HIGH; out-of-range numeric
 * codes are WARNING; everything else is INFO.
 */
export function severityFor(code: L10ObjectViolationCode): L10ObjectAuditSeverity {
  const s = code.toString();
  if (
    s.includes('JUDGMENT_LEAK') ||
    s.includes('RECOMMENDATION_LEAK') ||
    s.includes('SCENARIO_FINALITY_LEAK') ||
    s.includes('FAKE_CERTAINTY_LEAK') ||
    s.includes('CAUSAL_PROOF_LEAK') ||
    s.includes('FREEFORM_NARRATIVE') ||
    s.includes('NAME_LEAKS_SEMANTICS') ||
    s.includes('CARRIES_FINALITY') ||
    s.includes('SINGLE_STORY_COLLAPSE')
  ) {
    return L10ObjectAuditSeverity.CRITICAL;
  }
  if (s.includes('MISSING')) return L10ObjectAuditSeverity.HIGH;
  if (s.includes('_OOR') || s.includes('OUT_OF_RANGE') || s.includes('INCONSISTENT')) {
    return L10ObjectAuditSeverity.WARNING;
  }
  return L10ObjectAuditSeverity.INFO;
}

export function emitL10ObjectAudit(
  objectKind: string,
  objectId: string,
  report: L10ObjectValidationReport,
): readonly L10ObjectAuditRecord[] {
  const emitted: L10ObjectAuditRecord[] = [];
  for (const issue of report.issues) {
    const rec: L10ObjectAuditRecord = {
      id: `audit_l10o_${log.length + 1}`,
      timestamp: new Date(0).toISOString(),
      objectKind,
      objectId,
      code: issue.code,
      severity: severityFor(issue.code),
      message: issue.message,
      details: issue.details,
    };
    log.push(rec);
    emitted.push(rec);
  }
  return emitted;
}

export function getL10ObjectAuditLog(): readonly L10ObjectAuditRecord[] {
  return log.slice();
}

export function clearL10ObjectAuditLog(): void {
  log.length = 0;
}

export function filterL10ObjectAuditBySeverity(
  s: L10ObjectAuditSeverity,
): readonly L10ObjectAuditRecord[] {
  return log.filter(r => r.severity === s);
}

export function filterL10ObjectAuditByCode(
  c: L10ObjectViolationCode,
): readonly L10ObjectAuditRecord[] {
  return log.filter(r => r.code === c);
}
