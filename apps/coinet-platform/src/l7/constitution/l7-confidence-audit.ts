/**
 * L7.6 — Confidence Audit Surface
 *
 * §7.6 — Emits durable audit records whenever an L7.6 reliance-layer
 * validator rejects an artifact: factor-model violation, score/band
 * violation, cap-chain violation, contradiction-penalty violation,
 * restriction-derivation violation, regime-compatibility violation,
 * historical-reliability violation, or replay/lineage violation.
 *
 * Disjoint from:
 *   - L7.1 constitutional audit
 *   - L7.2 object audit
 *   - L7.3 contract audit
 *   - L7.4 runtime audit
 *   - L7.5 semantic audit
 *
 * so the surface from which an audit record came is unambiguous.
 */

import { L7ConfidenceViolationCode } from '../validation/l7-confidence-violation-codes';

export interface L7ConfidenceAuditRecord {
  readonly timestamp: string;
  readonly violationCode: L7ConfidenceViolationCode;
  readonly source: string;
  readonly relianceSurface:
    | 'FACTOR_MODEL'
    | 'SCORE'
    | 'CAP_CHAIN'
    | 'PENALTY_CHAIN'
    | 'RESTRICTION'
    | 'REGIME_COMPATIBILITY'
    | 'HISTORICAL_RELIABILITY'
    | 'REPLAY'
    | 'POLICY_VERSIONING';
  readonly subjectId: string | null;
  readonly factorGroup: string | null;
  readonly capClass: string | null;
  readonly right: string | null;
  readonly detail: string;
  readonly context: Record<string, unknown>;
  readonly severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'INFO';
}

const auditLog: L7ConfidenceAuditRecord[] = [];

export function resetConfidenceAuditLog(): void {
  auditLog.length = 0;
}

export function emitConfidenceAuditRecord(
  record: Omit<L7ConfidenceAuditRecord, 'timestamp'>,
): L7ConfidenceAuditRecord {
  const full: L7ConfidenceAuditRecord = {
    ...record,
    timestamp: new Date().toISOString(),
  };
  auditLog.push(full);
  return full;
}

export function getConfidenceAuditLog(): readonly L7ConfidenceAuditRecord[] {
  return [...auditLog];
}

export function getConfidenceCriticalViolations(): readonly L7ConfidenceAuditRecord[] {
  return auditLog.filter(r => r.severity === 'CRITICAL');
}

export function getConfidenceViolationsByCode(
  code: L7ConfidenceViolationCode,
): readonly L7ConfidenceAuditRecord[] {
  return auditLog.filter(r => r.violationCode === code);
}

export function getConfidenceViolationsBySurface(
  surface: L7ConfidenceAuditRecord['relianceSurface'],
): readonly L7ConfidenceAuditRecord[] {
  return auditLog.filter(r => r.relianceSurface === surface);
}

export function hasAnyConfidenceViolations(): boolean {
  return auditLog.length > 0;
}

export function getConfidenceViolationCount(): number {
  return auditLog.length;
}

/**
 * Classifies a confidence violation code into its audit surface so
 * emitters do not have to hard-code the surface mapping.
 */
export function surfaceForConfidenceViolation(
  code: L7ConfidenceViolationCode,
): L7ConfidenceAuditRecord['relianceSurface'] {
  switch (code) {
    case L7ConfidenceViolationCode.UNKNOWN_FACTOR_GROUP:
    case L7ConfidenceViolationCode.FACTOR_GROUP_NOT_REGISTERED:
    case L7ConfidenceViolationCode.FACTOR_COMPONENT_MISSING:
    case L7ConfidenceViolationCode.FACTOR_COMPONENT_OUT_OF_RANGE:
    case L7ConfidenceViolationCode.FACTOR_WEIGHT_NOT_DECLARED:
    case L7ConfidenceViolationCode.FACTOR_WEIGHT_OUT_OF_RANGE:
    case L7ConfidenceViolationCode.FACTOR_WEIGHTS_NOT_VERSIONED:
      return 'FACTOR_MODEL';
    case L7ConfidenceViolationCode.RAW_SCORE_OUT_OF_RANGE:
    case L7ConfidenceViolationCode.CAPPED_SCORE_OUT_OF_RANGE:
    case L7ConfidenceViolationCode.CAPPED_SCORE_EXCEEDS_RAW:
    case L7ConfidenceViolationCode.BAND_DOES_NOT_MATCH_SCORE:
    case L7ConfidenceViolationCode.UNKNOWN_BAND:
      return 'SCORE';
    case L7ConfidenceViolationCode.UNKNOWN_CAP_CLASS:
    case L7ConfidenceViolationCode.CAP_CLASS_NOT_REGISTERED:
    case L7ConfidenceViolationCode.CAP_CHAIN_NOT_TRUTH_RESTRICTIVE:
    case L7ConfidenceViolationCode.CAP_CHAIN_PRECEDENCE_VIOLATED:
    case L7ConfidenceViolationCode.CAP_REQUIRED_BUT_NOT_APPLIED:
    case L7ConfidenceViolationCode.CLEAN_CONFIDENCE_MASQUERADE:
      return 'CAP_CHAIN';
    case L7ConfidenceViolationCode.UNKNOWN_PENALTY_CLASS:
    case L7ConfidenceViolationCode.CONTRADICTION_PRESENT_NO_PENALTY:
    case L7ConfidenceViolationCode.PENALTY_INFLATED_BEYOND_BUNDLE:
    case L7ConfidenceViolationCode.PENALTY_AND_CAP_BLURRED:
      return 'PENALTY_CHAIN';
    case L7ConfidenceViolationCode.UNKNOWN_RIGHT:
    case L7ConfidenceViolationCode.RIGHT_NOT_REGISTERED:
    case L7ConfidenceViolationCode.RIGHTS_BROADER_THAN_STATE_JUSTIFIES:
    case L7ConfidenceViolationCode.RIGHTS_NARROWER_THAN_STATE_REQUIRES:
    case L7ConfidenceViolationCode.REQUIRED_DISCLOSURE_MISSING:
    case L7ConfidenceViolationCode.REQUIRED_CONFIRMATION_MISSING:
    case L7ConfidenceViolationCode.EVIDENCE_ONLY_INCONSISTENT:
    case L7ConfidenceViolationCode.RESTRICTION_REASONS_MISSING:
    case L7ConfidenceViolationCode.RESTRICTION_PROFILE_REF_MISSING:
      return 'RESTRICTION';
    case L7ConfidenceViolationCode.REGIME_FACTOR_OUT_OF_BOUNDS:
    case L7ConfidenceViolationCode.REGIME_FACTOR_IMPERSONATES_FINAL_REGIME:
    case L7ConfidenceViolationCode.REGIME_FACTOR_OVERRIDES_CONTRADICTION:
    case L7ConfidenceViolationCode.REGIME_FACTOR_OVERRIDES_STALE_OR_DEGRADED:
    case L7ConfidenceViolationCode.REGIME_FACTOR_USED_WITHOUT_DECLARATION:
      return 'REGIME_COMPATIBILITY';
    case L7ConfidenceViolationCode.HISTORICAL_RELIABILITY_OUT_OF_BOUNDS:
    case L7ConfidenceViolationCode.HISTORICAL_RELIABILITY_OVERRIDES_CONTRADICTION:
    case L7ConfidenceViolationCode.HISTORICAL_RELIABILITY_LINEAGE_MISSING:
      return 'HISTORICAL_RELIABILITY';
    case L7ConfidenceViolationCode.CONFIDENCE_REPLAY_HASH_MISSING:
    case L7ConfidenceViolationCode.CONFIDENCE_LINEAGE_INCOMPLETE:
    case L7ConfidenceViolationCode.RESTRICTION_REPLAY_HASH_MISSING:
      return 'REPLAY';
    case L7ConfidenceViolationCode.CONFIDENCE_POLICY_VERSION_MISSING:
    case L7ConfidenceViolationCode.CONFIDENCE_POLICY_VERSION_NOT_REGISTERED:
      return 'POLICY_VERSIONING';
    default:
      return 'FACTOR_MODEL';
  }
}

export function defaultSeverityForConfidenceViolation(
  code: L7ConfidenceViolationCode,
): L7ConfidenceAuditRecord['severity'] {
  switch (code) {
    case L7ConfidenceViolationCode.CLEAN_CONFIDENCE_MASQUERADE:
    case L7ConfidenceViolationCode.RIGHTS_BROADER_THAN_STATE_JUSTIFIES:
    case L7ConfidenceViolationCode.REGIME_FACTOR_IMPERSONATES_FINAL_REGIME:
    case L7ConfidenceViolationCode.REGIME_FACTOR_OVERRIDES_CONTRADICTION:
    case L7ConfidenceViolationCode.REGIME_FACTOR_OVERRIDES_STALE_OR_DEGRADED:
    case L7ConfidenceViolationCode.HISTORICAL_RELIABILITY_OVERRIDES_CONTRADICTION:
    case L7ConfidenceViolationCode.CAP_REQUIRED_BUT_NOT_APPLIED:
    case L7ConfidenceViolationCode.CAP_CHAIN_NOT_TRUTH_RESTRICTIVE:
    case L7ConfidenceViolationCode.CAP_CHAIN_PRECEDENCE_VIOLATED:
    case L7ConfidenceViolationCode.CONTRADICTION_PRESENT_NO_PENALTY:
      return 'CRITICAL';
    case L7ConfidenceViolationCode.RIGHTS_NARROWER_THAN_STATE_REQUIRES:
    case L7ConfidenceViolationCode.REQUIRED_DISCLOSURE_MISSING:
    case L7ConfidenceViolationCode.REQUIRED_CONFIRMATION_MISSING:
    case L7ConfidenceViolationCode.EVIDENCE_ONLY_INCONSISTENT:
    case L7ConfidenceViolationCode.CAPPED_SCORE_EXCEEDS_RAW:
    case L7ConfidenceViolationCode.CONFIDENCE_POLICY_VERSION_NOT_REGISTERED:
    case L7ConfidenceViolationCode.CONFIDENCE_REPLAY_HASH_MISSING:
    case L7ConfidenceViolationCode.CONFIDENCE_LINEAGE_INCOMPLETE:
    case L7ConfidenceViolationCode.RESTRICTION_REPLAY_HASH_MISSING:
      return 'HIGH';
    default:
      return 'MEDIUM';
  }
}
