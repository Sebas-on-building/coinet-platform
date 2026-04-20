/**
 * L10.1 — Constitutional Audit Surface
 *
 * §10.1.10.4 — Emits durable audit records for every boundary
 * violation: illegal dependency requests, forbidden actions, illegal
 * capability claims, illegal output classes, judgment/scenario/
 * recommendation/score/conviction/final-explanation leakage, single-
 * story collapse, alternative suppression, close-spread concealment,
 * confirmation-gap concealment, invalidation concealment, explanation
 * laundering, causal laundering, primary-as-final-truth masquerade,
 * restriction bypass, regime/sequence posture violations, raw-data
 * hypothesis invention, storage bypass, missing lineage, and
 * late-layer consumption.
 */

import { L10ConstitutionalViolationCode } from '../contracts/l10-violation-codes';

export interface L10ConstitutionalAuditRecord {
  readonly timestamp: string;
  readonly violationCode: L10ConstitutionalViolationCode;
  readonly source: string;
  readonly detail: string;
  readonly context: Record<string, unknown>;
  readonly severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'INFO';
}

const auditLog: L10ConstitutionalAuditRecord[] = [];

export function resetL10ConstitutionalAuditLog(): void {
  auditLog.length = 0;
}

export function emitL10AuditRecord(
  record: Omit<L10ConstitutionalAuditRecord, 'timestamp'>,
): L10ConstitutionalAuditRecord {
  const full: L10ConstitutionalAuditRecord = {
    ...record,
    timestamp: new Date().toISOString(),
  };
  auditLog.push(full);
  return full;
}

export function getL10ConstitutionalAuditLog(): readonly L10ConstitutionalAuditRecord[] {
  return [...auditLog];
}

export function getL10CriticalViolations(): readonly L10ConstitutionalAuditRecord[] {
  return auditLog.filter(r => r.severity === 'CRITICAL');
}

export function getL10ViolationsByCode(
  code: L10ConstitutionalViolationCode,
): readonly L10ConstitutionalAuditRecord[] {
  return auditLog.filter(r => r.violationCode === code);
}

export function hasAnyL10Violations(): boolean {
  return auditLog.length > 0;
}

export function getL10ViolationCount(): number {
  return auditLog.length;
}

export function emitL10DependencyViolation(
  surfaceId: string,
  requestor: string,
  reason: string,
): void {
  emitL10AuditRecord({
    violationCode: L10ConstitutionalViolationCode.UNREGISTERED_DEPENDENCY,
    source: requestor,
    detail: reason,
    context: { surfaceId },
    severity: 'CRITICAL',
  });
}

export function emitL10OutputViolation(
  surfaceId: string,
  emitter: string,
  reason: string,
): void {
  emitL10AuditRecord({
    violationCode: L10ConstitutionalViolationCode.UNREGISTERED_OUTPUT,
    source: emitter,
    detail: reason,
    context: { surfaceId },
    severity: 'CRITICAL',
  });
}

export function emitL10NamingViolation(name: string, source: string): void {
  emitL10AuditRecord({
    violationCode: L10ConstitutionalViolationCode.FORBIDDEN_JUDGMENT_SEMANTICS,
    source,
    detail: `Forbidden judgment/scenario/recommendation/conviction/causal semantics in name: "${name}"`,
    context: { name },
    severity: 'HIGH',
  });
}

export function emitL10SingleStoryCollapseViolation(
  componentId: string,
  source: string,
): void {
  emitL10AuditRecord({
    violationCode: L10ConstitutionalViolationCode.SINGLE_STORY_COLLAPSE,
    source,
    detail: `Single-story collapse in "${componentId}"`,
    context: { componentId },
    severity: 'CRITICAL',
  });
}

export function emitL10AlternativeSuppressionViolation(
  componentId: string,
  source: string,
  detail: string,
): void {
  emitL10AuditRecord({
    violationCode: L10ConstitutionalViolationCode.ALTERNATIVE_SUPPRESSION,
    source,
    detail: `Alternative suppression in "${componentId}": ${detail}`,
    context: { componentId },
    severity: 'CRITICAL',
  });
}

export function emitL10CloseSpreadConcealmentViolation(
  componentId: string,
  source: string,
): void {
  emitL10AuditRecord({
    violationCode: L10ConstitutionalViolationCode.CLOSE_SPREAD_CONCEALMENT,
    source,
    detail: `Close spread concealed in "${componentId}"`,
    context: { componentId },
    severity: 'CRITICAL',
  });
}

export function emitL10ConfirmationGapConcealmentViolation(
  componentId: string,
  source: string,
): void {
  emitL10AuditRecord({
    violationCode: L10ConstitutionalViolationCode.CONFIRMATION_GAP_CONCEALMENT,
    source,
    detail: `Confirmation gap concealed in "${componentId}"`,
    context: { componentId },
    severity: 'CRITICAL',
  });
}

export function emitL10InvalidationPostureConcealmentViolation(
  componentId: string,
  source: string,
): void {
  emitL10AuditRecord({
    violationCode: L10ConstitutionalViolationCode.INVALIDATION_POSTURE_CONCEALMENT,
    source,
    detail: `Invalidation posture concealed in "${componentId}"`,
    context: { componentId },
    severity: 'CRITICAL',
  });
}

export function emitL10ExplanationLaunderingViolation(
  componentId: string,
  source: string,
  detail: string,
): void {
  emitL10AuditRecord({
    violationCode: L10ConstitutionalViolationCode.EXPLANATION_LAUNDERING,
    source,
    detail: `Explanation laundering in "${componentId}": ${detail}`,
    context: { componentId },
    severity: 'CRITICAL',
  });
}

export function emitL10CausalLaunderingViolation(
  componentId: string,
  source: string,
  detail: string,
): void {
  emitL10AuditRecord({
    violationCode: L10ConstitutionalViolationCode.CAUSAL_LAUNDERING,
    source,
    detail: `Causal laundering in "${componentId}": ${detail}`,
    context: { componentId },
    severity: 'CRITICAL',
  });
}

export function emitL10PrimaryAsFinalTruthViolation(
  componentId: string,
  source: string,
  detail: string,
): void {
  emitL10AuditRecord({
    violationCode: L10ConstitutionalViolationCode.PRIMARY_AS_FINAL_TRUTH,
    source,
    detail: `Primary-as-final-truth masquerade in "${componentId}": ${detail}`,
    context: { componentId },
    severity: 'CRITICAL',
  });
}

export function emitL10ContradictionOverwriteViolation(
  componentId: string,
  source: string,
): void {
  emitL10AuditRecord({
    violationCode: L10ConstitutionalViolationCode.CONTRADICTION_POSTURE_OVERWRITE,
    source,
    detail: `Contradiction posture overwritten in "${componentId}"`,
    context: { componentId },
    severity: 'CRITICAL',
  });
}

export function emitL10RestrictionBypassViolation(
  componentId: string,
  source: string,
  detail: string,
): void {
  emitL10AuditRecord({
    violationCode: L10ConstitutionalViolationCode.RESTRICTION_BYPASS,
    source,
    detail: `Restriction bypass in "${componentId}": ${detail}`,
    context: { componentId },
    severity: 'CRITICAL',
  });
}

export function emitL10RegimePostureIgnoredViolation(
  componentId: string,
  source: string,
): void {
  emitL10AuditRecord({
    violationCode: L10ConstitutionalViolationCode.REGIME_POSTURE_IGNORED,
    source,
    detail: `Regime posture ignored in "${componentId}"`,
    context: { componentId },
    severity: 'CRITICAL',
  });
}

export function emitL10RegimeReclassificationViolation(
  componentId: string,
  source: string,
): void {
  emitL10AuditRecord({
    violationCode: L10ConstitutionalViolationCode.REGIME_RECLASSIFICATION,
    source,
    detail: `L8 regime truth reclassified locally in "${componentId}"`,
    context: { componentId },
    severity: 'CRITICAL',
  });
}

export function emitL10SequencePostureIgnoredViolation(
  componentId: string,
  source: string,
): void {
  emitL10AuditRecord({
    violationCode: L10ConstitutionalViolationCode.SEQUENCE_POSTURE_IGNORED,
    source,
    detail: `Sequence posture ignored in "${componentId}"`,
    context: { componentId },
    severity: 'CRITICAL',
  });
}

export function emitL10SequenceReinterpretationViolation(
  componentId: string,
  source: string,
): void {
  emitL10AuditRecord({
    violationCode: L10ConstitutionalViolationCode.SEQUENCE_REINTERPRETATION,
    source,
    detail: `L9 sequence truth reinterpreted locally in "${componentId}"`,
    context: { componentId },
    severity: 'CRITICAL',
  });
}

export function emitL10L7LiveRevalidationViolation(
  componentId: string,
  source: string,
): void {
  emitL10AuditRecord({
    violationCode: L10ConstitutionalViolationCode.L7_LIVE_REVALIDATION,
    source,
    detail: `L7 live revalidation attempted in "${componentId}"`,
    context: { componentId },
    severity: 'CRITICAL',
  });
}

export function emitL10RawDataInventionViolation(
  componentId: string,
  source: string,
  detail: string,
): void {
  emitL10AuditRecord({
    violationCode: L10ConstitutionalViolationCode.RAW_DATA_HYPOTHESIS_INVENTION,
    source,
    detail: `Raw-data hypothesis invention in "${componentId}": ${detail}`,
    context: { componentId },
    severity: 'CRITICAL',
  });
}

export function emitL10StorageBypassViolation(source: string, detail: string): void {
  emitL10AuditRecord({
    violationCode: L10ConstitutionalViolationCode.STORAGE_BYPASS,
    source,
    detail,
    context: {},
    severity: 'CRITICAL',
  });
}

export function emitL10MissingLineageViolation(
  surfaceId: string,
  source: string,
  missing: readonly string[],
): void {
  emitL10AuditRecord({
    violationCode: L10ConstitutionalViolationCode.MISSING_LINEAGE,
    source,
    detail: `Missing required lineage fields for "${surfaceId}": ${missing.join(', ')}`,
    context: { surfaceId, missing: [...missing] },
    severity: 'CRITICAL',
  });
}

export function emitL10LowerLayerRedefinitionViolation(
  source: string,
  detail: string,
  context: Record<string, unknown> = {},
): void {
  emitL10AuditRecord({
    violationCode: L10ConstitutionalViolationCode.LOWER_LAYER_REDEFINITION,
    source,
    detail,
    context,
    severity: 'CRITICAL',
  });
}

export function emitL10ValidationRedefinitionViolation(
  source: string,
  detail: string,
  context: Record<string, unknown> = {},
): void {
  emitL10AuditRecord({
    violationCode: L10ConstitutionalViolationCode.VALIDATION_TRUTH_REDEFINITION,
    source,
    detail,
    context,
    severity: 'CRITICAL',
  });
}

export function emitL10EvidenceAsymmetryConcealmentViolation(
  componentId: string,
  source: string,
): void {
  emitL10AuditRecord({
    violationCode: L10ConstitutionalViolationCode.EVIDENCE_ASYMMETRY_CONCEALMENT,
    source,
    detail: `Evidence asymmetry concealed in "${componentId}"`,
    context: { componentId },
    severity: 'CRITICAL',
  });
}

export function emitL10LateLayerConsumptionViolation(
  componentId: string,
  source: string,
  detail: string,
): void {
  emitL10AuditRecord({
    violationCode: L10ConstitutionalViolationCode.LATE_LAYER_CONSUMPTION,
    source,
    detail: `Later-layer consumption in "${componentId}": ${detail}`,
    context: { componentId },
    severity: 'CRITICAL',
  });
}
