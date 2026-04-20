/**
 * L10.3 — Contract-Tier Audit Log
 *
 * §10.3.10 — Deterministic audit log for L10.3 contract-tier
 * violations. Disjoint from the L10.1 constitutional audit and the
 * L10.2 object-tier audit so each tier remains unambiguous about
 * which layer rejected an artifact.
 */

import {
  L10ContractReport,
  L10HypothesisContractViolationCode,
} from '../validation/l10-contract-violation-codes';

export enum L10ContractAuditSeverity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export interface L10ContractAuditRecord {
  readonly id: string;
  readonly timestamp: string;
  readonly contractKind: string;
  readonly contractId: string;
  readonly code: L10HypothesisContractViolationCode;
  readonly severity: L10ContractAuditSeverity;
  readonly message: string;
  readonly details?: Record<string, unknown>;
}

const log: L10ContractAuditRecord[] = [];

/**
 * §10.3.10.1 — Deterministic severity mapping:
 *
 *   CRITICAL — semantic leaks, single-story collapse, decisive-while-
 *              competition-live, prohibited compatibility, cleanliness
 *              claimed while material posture is bad.
 *   HIGH     — structural "MISSING" codes and unregistered
 *              enums/values.
 *   WARNING  — out-of-range numeric and classification mismatches.
 *   INFO     — everything else.
 */
export function l10ContractSeverityFor(
  code: L10HypothesisContractViolationCode,
): L10ContractAuditSeverity {
  const s = code.toString();
  if (
    s.includes('JUDGMENT_LEAK') ||
    s.includes('RECOMMENDATION_LEAK') ||
    s.includes('SCENARIO_FINALITY_LEAK') ||
    s.includes('FAKE_CERTAINTY_LEAK') ||
    s.includes('CAUSAL_PROOF_LEAK') ||
    s.includes('NAME_LEAKS_SEMANTICS') ||
    s.includes('CARRIES_FINALITY') ||
    s.includes('SINGLE_STORY_COLLAPSE') ||
    s.includes('DECISIVE_WHILE_COMPETITION_LIVE') ||
    s.includes('COMPATIBILITY_PROHIBITED') ||
    s.includes('COMPATIBILITY_BREAKING') ||
    s.startsWith('L10C_CLEAN_WHILE_') ||
    s === 'L10C_OUTPUT_PRIMARY_AS_FINAL_TRUTH'
  ) {
    return L10ContractAuditSeverity.CRITICAL;
  }
  if (s.includes('MISSING') || s.includes('UNREGISTERED')
      || s.includes('REQUIRED')) {
    return L10ContractAuditSeverity.HIGH;
  }
  if (s.includes('_OOR') || s.includes('OUT_OF_RANGE')
      || s.includes('INCONSISTENT') || s.includes('CLASSIFICATION_MISMATCH')
      || s.includes('NON_MONOTONIC')) {
    return L10ContractAuditSeverity.WARNING;
  }
  return L10ContractAuditSeverity.INFO;
}

export function emitL10ContractAudit(
  contractKind: string,
  contractId: string,
  report: L10ContractReport,
): readonly L10ContractAuditRecord[] {
  const emitted: L10ContractAuditRecord[] = [];
  for (const issue of report.issues) {
    const rec: L10ContractAuditRecord = {
      id: `audit_l10c_${log.length + 1}`,
      timestamp: new Date(0).toISOString(),
      contractKind,
      contractId,
      code: issue.code,
      severity: l10ContractSeverityFor(issue.code),
      message: issue.message,
      details: issue.details,
    };
    log.push(rec);
    emitted.push(rec);
  }
  return emitted;
}

export function getL10ContractAuditLog(): readonly L10ContractAuditRecord[] {
  return log.slice();
}

export function clearL10ContractAuditLog(): void {
  log.length = 0;
}

export function filterL10ContractAuditBySeverity(
  s: L10ContractAuditSeverity,
): readonly L10ContractAuditRecord[] {
  return log.filter(r => r.severity === s);
}

export function filterL10ContractAuditByCode(
  c: L10HypothesisContractViolationCode,
): readonly L10ContractAuditRecord[] {
  return log.filter(r => r.code === c);
}
