/**
 * L9.1 — Constitutional Audit Surface
 *
 * §9.1.7.4 / §9.1.10 — Emits durable audit records for every boundary
 * violation: illegal dependency requests, forbidden actions, illegal
 * capability claims, illegal output classes, recommendation/scenario/
 * judgment/score/hypothesis leakage, restriction bypass attempts,
 * ambiguity laundering, causal laundering, temporal theatrics,
 * stale-sequence masquerade, raw-data sequence invention,
 * evidence-only-as-decisive usage, and late-layer consumption.
 */

import { L9ConstitutionalViolationCode } from '../contracts/l9-violation-codes';

export interface L9ConstitutionalAuditRecord {
  readonly timestamp: string;
  readonly violationCode: L9ConstitutionalViolationCode;
  readonly source: string;
  readonly detail: string;
  readonly context: Record<string, unknown>;
  readonly severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'INFO';
}

const auditLog: L9ConstitutionalAuditRecord[] = [];

export function resetL9ConstitutionalAuditLog(): void {
  auditLog.length = 0;
}

export function emitL9AuditRecord(
  record: Omit<L9ConstitutionalAuditRecord, 'timestamp'>,
): L9ConstitutionalAuditRecord {
  const full: L9ConstitutionalAuditRecord = {
    ...record,
    timestamp: new Date().toISOString(),
  };
  auditLog.push(full);
  return full;
}

export function getL9ConstitutionalAuditLog(): readonly L9ConstitutionalAuditRecord[] {
  return [...auditLog];
}

export function getL9CriticalViolations(): readonly L9ConstitutionalAuditRecord[] {
  return auditLog.filter(r => r.severity === 'CRITICAL');
}

export function getL9ViolationsByCode(
  code: L9ConstitutionalViolationCode,
): readonly L9ConstitutionalAuditRecord[] {
  return auditLog.filter(r => r.violationCode === code);
}

export function hasAnyL9Violations(): boolean {
  return auditLog.length > 0;
}

export function getL9ViolationCount(): number {
  return auditLog.length;
}

export function emitL9DependencyViolation(
  surfaceId: string,
  requestor: string,
  reason: string,
): void {
  emitL9AuditRecord({
    violationCode: L9ConstitutionalViolationCode.UNREGISTERED_DEPENDENCY,
    source: requestor,
    detail: reason,
    context: { surfaceId },
    severity: 'CRITICAL',
  });
}

export function emitL9OutputViolation(
  surfaceId: string,
  emitter: string,
  reason: string,
): void {
  emitL9AuditRecord({
    violationCode: L9ConstitutionalViolationCode.UNREGISTERED_OUTPUT,
    source: emitter,
    detail: reason,
    context: { surfaceId },
    severity: 'CRITICAL',
  });
}

export function emitL9NamingViolation(name: string, source: string): void {
  emitL9AuditRecord({
    violationCode: L9ConstitutionalViolationCode.FORBIDDEN_JUDGMENT_SEMANTICS,
    source,
    detail: `Forbidden judgment/scenario/recommendation/action-bias semantics in name: "${name}"`,
    context: { name },
    severity: 'HIGH',
  });
}

export function emitL9ActionBiasViolation(name: string, source: string): void {
  emitL9AuditRecord({
    violationCode: L9ConstitutionalViolationCode.FORBIDDEN_ACTION_BIAS,
    source,
    detail: `Action-biased sequence label: "${name}"`,
    context: { name },
    severity: 'HIGH',
  });
}

export function emitL9AmbiguityLaunderingViolation(
  componentId: string,
  source: string,
  strategy: string,
): void {
  emitL9AuditRecord({
    violationCode: L9ConstitutionalViolationCode.AMBIGUITY_LAUNDERING,
    source,
    detail: `Ordering ambiguity laundering via "${strategy}"`,
    context: { componentId, strategy },
    severity: 'CRITICAL',
  });
}

export function emitL9CausalLaunderingViolation(
  componentId: string,
  source: string,
  detail: string,
): void {
  emitL9AuditRecord({
    violationCode: L9ConstitutionalViolationCode.CAUSAL_LAUNDERING,
    source,
    detail: `Causal laundering in "${componentId}": ${detail}`,
    context: { componentId },
    severity: 'CRITICAL',
  });
}

export function emitL9TemporalTheatricsViolation(
  componentId: string,
  source: string,
  detail: string,
): void {
  emitL9AuditRecord({
    violationCode: L9ConstitutionalViolationCode.TEMPORAL_THEATRICS,
    source,
    detail: `Temporal theatrics in "${componentId}": ${detail}`,
    context: { componentId },
    severity: 'CRITICAL',
  });
}

export function emitL9ContradictionIgnoredViolation(
  componentId: string,
  source: string,
): void {
  emitL9AuditRecord({
    violationCode: L9ConstitutionalViolationCode.CONTRADICTION_POSTURE_IGNORED,
    source,
    detail: `Contradiction posture ignored in "${componentId}"`,
    context: { componentId },
    severity: 'CRITICAL',
  });
}

export function emitL9RestrictionBypassViolation(
  componentId: string,
  source: string,
  detail: string,
): void {
  emitL9AuditRecord({
    violationCode: L9ConstitutionalViolationCode.RESTRICTION_BYPASS,
    source,
    detail: `Restriction bypass in "${componentId}": ${detail}`,
    context: { componentId },
    severity: 'CRITICAL',
  });
}

export function emitL9RegimePostureIgnoredViolation(
  componentId: string,
  source: string,
): void {
  emitL9AuditRecord({
    violationCode: L9ConstitutionalViolationCode.REGIME_POSTURE_IGNORED,
    source,
    detail: `Regime posture ignored in "${componentId}"`,
    context: { componentId },
    severity: 'CRITICAL',
  });
}

export function emitL9RegimeReinterpretationViolation(
  componentId: string,
  source: string,
): void {
  emitL9AuditRecord({
    violationCode: L9ConstitutionalViolationCode.REGIME_REINTERPRETATION,
    source,
    detail: `L8 regime truth reinterpreted locally in "${componentId}"`,
    context: { componentId },
    severity: 'CRITICAL',
  });
}

export function emitL9StaleSequenceViolation(componentId: string, source: string): void {
  emitL9AuditRecord({
    violationCode: L9ConstitutionalViolationCode.STALE_SEQUENCE_MASQUERADE,
    source,
    detail: `Stale sequence masquerading as fresh in "${componentId}"`,
    context: { componentId },
    severity: 'HIGH',
  });
}

export function emitL9RawDataInventionViolation(
  componentId: string,
  source: string,
  detail: string,
): void {
  emitL9AuditRecord({
    violationCode: L9ConstitutionalViolationCode.RAW_DATA_SEQUENCE_INVENTION,
    source,
    detail: `Raw-data sequence invention in "${componentId}": ${detail}`,
    context: { componentId },
    severity: 'CRITICAL',
  });
}

export function emitL9StorageBypassViolation(source: string, detail: string): void {
  emitL9AuditRecord({
    violationCode: L9ConstitutionalViolationCode.STORAGE_BYPASS,
    source,
    detail,
    context: {},
    severity: 'CRITICAL',
  });
}

export function emitL9LowerLayerRedefinitionViolation(
  source: string,
  detail: string,
  context: Record<string, unknown> = {},
): void {
  emitL9AuditRecord({
    violationCode: L9ConstitutionalViolationCode.LOWER_LAYER_REDEFINITION,
    source,
    detail,
    context,
    severity: 'CRITICAL',
  });
}

export function emitL9ValidationRedefinitionViolation(
  source: string,
  detail: string,
  context: Record<string, unknown> = {},
): void {
  emitL9AuditRecord({
    violationCode: L9ConstitutionalViolationCode.VALIDATION_TRUTH_REDEFINITION,
    source,
    detail,
    context,
    severity: 'CRITICAL',
  });
}

export function emitL9EvidenceOnlyAsDecisiveViolation(
  componentId: string,
  source: string,
  detail: string,
): void {
  emitL9AuditRecord({
    violationCode: L9ConstitutionalViolationCode.EVIDENCE_ONLY_AS_DECISIVE,
    source,
    detail: `Evidence-only surface treated as decisive in "${componentId}": ${detail}`,
    context: { componentId },
    severity: 'HIGH',
  });
}

export function emitL9LateLayerConsumptionViolation(
  componentId: string,
  source: string,
  detail: string,
): void {
  emitL9AuditRecord({
    violationCode: L9ConstitutionalViolationCode.LATE_LAYER_CONSUMPTION,
    source,
    detail: `Later-layer consumption in "${componentId}": ${detail}`,
    context: { componentId },
    severity: 'CRITICAL',
  });
}
