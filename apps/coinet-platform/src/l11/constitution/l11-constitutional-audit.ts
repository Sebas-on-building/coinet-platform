/**
 * L11.1 — Constitutional Audit Surface
 *
 * §11.1.16 — Emits durable audit records for every boundary violation:
 * illegal dependency requests, illegal output classes, illegal
 * capability claims, judgment/recommendation/scenario/trade-action
 * leakage, vibe scores, missing meaning claims, undeclared/mixed
 * direction, missing attribution, missing version, missing-data
 * laundering, contradiction laundering, hypothesis-posture/spread/
 * reliance ignored, lower-layer/L10 hypothesis rebuild, regime/
 * sequence override, L7 live revalidation, restriction bypass, regime/
 * sequence/hypothesis posture ignored, persistence bypass, missing
 * lineage, late-layer (L12+) consumption, calibration hook absent, and
 * score-as-action drift.
 */

import { L11ConstitutionalViolationCode } from '../contracts/l11-violation-codes';

export interface L11ConstitutionalAuditRecord {
  readonly audit_id: string;
  readonly timestamp: string;
  readonly violationCode: L11ConstitutionalViolationCode;
  readonly source: string;
  readonly detail: string;
  readonly context: Record<string, unknown>;
  readonly severity: 'CRITICAL' | 'ERROR' | 'WARNING' | 'INFO';
}

const auditLog: L11ConstitutionalAuditRecord[] = [];
let auditCounter = 0;

function nextAuditId(): string {
  auditCounter += 1;
  return `l11.audit.${auditCounter.toString().padStart(8, '0')}`;
}

export function resetL11ConstitutionalAuditLog(): void {
  auditLog.length = 0;
  auditCounter = 0;
}

export function emitL11AuditRecord(
  record: Omit<L11ConstitutionalAuditRecord, 'timestamp' | 'audit_id'>,
): L11ConstitutionalAuditRecord {
  const full: L11ConstitutionalAuditRecord = {
    ...record,
    audit_id: nextAuditId(),
    timestamp: new Date().toISOString(),
  };
  auditLog.push(full);
  return full;
}

export function getL11ConstitutionalAuditLog():
  readonly L11ConstitutionalAuditRecord[] {
  return [...auditLog];
}

export function getL11CriticalViolations():
  readonly L11ConstitutionalAuditRecord[] {
  return auditLog.filter(r => r.severity === 'CRITICAL');
}

export function getL11ViolationsByCode(
  code: L11ConstitutionalViolationCode,
): readonly L11ConstitutionalAuditRecord[] {
  return auditLog.filter(r => r.violationCode === code);
}

export function hasAnyL11Violations(): boolean {
  return auditLog.length > 0;
}

export function getL11ViolationCount(): number {
  return auditLog.length;
}

// ── Mission / boundary emitters ──

export function emitL11MissionViolation(
  source: string,
  detail: string,
): void {
  emitL11AuditRecord({
    violationCode: L11ConstitutionalViolationCode.FORBIDDEN_JUDGMENT_SEMANTICS,
    source,
    detail,
    context: {},
    severity: 'CRITICAL',
  });
}

export function emitL11DependencyViolation(
  surfaceId: string,
  requestor: string,
  reason: string,
): void {
  emitL11AuditRecord({
    violationCode: L11ConstitutionalViolationCode.UNREGISTERED_DEPENDENCY,
    source: requestor,
    detail: reason,
    context: { surfaceId },
    severity: 'CRITICAL',
  });
}

export function emitL11OutputViolation(
  surfaceId: string,
  emitter: string,
  reason: string,
): void {
  emitL11AuditRecord({
    violationCode: L11ConstitutionalViolationCode.UNREGISTERED_OUTPUT,
    source: emitter,
    detail: reason,
    context: { surfaceId },
    severity: 'CRITICAL',
  });
}

export function emitL11NamingViolation(name: string, source: string): void {
  emitL11AuditRecord({
    violationCode: L11ConstitutionalViolationCode.FORBIDDEN_JUDGMENT_SEMANTICS,
    source,
    detail: `Forbidden judgment/recommendation/scenario/trade-action/vibe-score semantics in name: "${name}"`,
    context: { name },
    severity: 'ERROR',
  });
}

// ── Meaning / direction / attribution / version emitters ──

export function emitL11MeaningClaimAbsentViolation(
  componentId: string,
  source: string,
): void {
  emitL11AuditRecord({
    violationCode: L11ConstitutionalViolationCode.MEANING_CLAIM_ABSENT,
    source,
    detail: `Meaning claim absent in "${componentId}"`,
    context: { componentId },
    severity: 'CRITICAL',
  });
}

export function emitL11DirectionUndeclaredViolation(
  componentId: string,
  source: string,
): void {
  emitL11AuditRecord({
    violationCode: L11ConstitutionalViolationCode.DIRECTION_UNDECLARED,
    source,
    detail: `Direction undeclared in "${componentId}"`,
    context: { componentId },
    severity: 'CRITICAL',
  });
}

export function emitL11DirectionMixedViolation(
  componentId: string,
  source: string,
): void {
  emitL11AuditRecord({
    violationCode: L11ConstitutionalViolationCode.DIRECTION_MIXED,
    source,
    detail: `Direction mixed (higher=better and higher=worse) in "${componentId}"`,
    context: { componentId },
    severity: 'CRITICAL',
  });
}

export function emitL11AttributionAbsentViolation(
  componentId: string,
  source: string,
): void {
  emitL11AuditRecord({
    violationCode: L11ConstitutionalViolationCode.ATTRIBUTION_ABSENT,
    source,
    detail: `Attribution absent in "${componentId}"`,
    context: { componentId },
    severity: 'CRITICAL',
  });
}

export function emitL11VersionAbsentViolation(
  componentId: string,
  source: string,
): void {
  emitL11AuditRecord({
    violationCode: L11ConstitutionalViolationCode.VERSION_ABSENT,
    source,
    detail: `Formula version absent in "${componentId}"`,
    context: { componentId },
    severity: 'CRITICAL',
  });
}

export function emitL11VibeScoreViolation(
  componentId: string,
  source: string,
): void {
  emitL11AuditRecord({
    violationCode: L11ConstitutionalViolationCode.FORBIDDEN_VIBE_SCORE,
    source,
    detail: `Vibe score creation in "${componentId}"`,
    context: { componentId },
    severity: 'CRITICAL',
  });
}

// ── Missing-data / contradiction laundering emitters ──

export function emitL11MissingDataLaunderingViolation(
  componentId: string,
  source: string,
  detail: string,
): void {
  emitL11AuditRecord({
    violationCode: L11ConstitutionalViolationCode.MISSING_DATA_LAUNDERING,
    source,
    detail: `Missing-data laundering in "${componentId}": ${detail}`,
    context: { componentId },
    severity: 'CRITICAL',
  });
}

export function emitL11ContradictionLaunderingViolation(
  componentId: string,
  source: string,
  detail: string,
): void {
  emitL11AuditRecord({
    violationCode: L11ConstitutionalViolationCode.CONTRADICTION_LAUNDERING,
    source,
    detail: `Contradiction laundering in "${componentId}": ${detail}`,
    context: { componentId },
    severity: 'CRITICAL',
  });
}

// ── Lower-layer / L10 rebuild emitters ──

export function emitL11LowerLayerRebuildViolation(
  source: string,
  detail: string,
  context: Record<string, unknown> = {},
): void {
  emitL11AuditRecord({
    violationCode: L11ConstitutionalViolationCode.LOWER_LAYER_REBUILD,
    source,
    detail,
    context,
    severity: 'CRITICAL',
  });
}

export function emitL11L10HypothesisRebuildViolation(
  source: string,
  detail: string,
  context: Record<string, unknown> = {},
): void {
  emitL11AuditRecord({
    violationCode: L11ConstitutionalViolationCode.L10_HYPOTHESIS_REBUILD,
    source,
    detail,
    context,
    severity: 'CRITICAL',
  });
}

export function emitL11RegimeOverrideViolation(
  componentId: string,
  source: string,
): void {
  emitL11AuditRecord({
    violationCode: L11ConstitutionalViolationCode.REGIME_RECLASSIFICATION,
    source,
    detail: `L8 regime overridden / reclassified locally in "${componentId}"`,
    context: { componentId },
    severity: 'CRITICAL',
  });
}

export function emitL11SequenceOverrideViolation(
  componentId: string,
  source: string,
): void {
  emitL11AuditRecord({
    violationCode: L11ConstitutionalViolationCode.SEQUENCE_REINTERPRETATION,
    source,
    detail: `L9 sequence overridden / reinterpreted locally in "${componentId}"`,
    context: { componentId },
    severity: 'CRITICAL',
  });
}

export function emitL11L7LiveRevalidationViolation(
  componentId: string,
  source: string,
): void {
  emitL11AuditRecord({
    violationCode: L11ConstitutionalViolationCode.L7_LIVE_REVALIDATION,
    source,
    detail: `L7 live revalidation attempted in "${componentId}"`,
    context: { componentId },
    severity: 'CRITICAL',
  });
}

// ── Posture-ignored emitters ──

export function emitL11RestrictionPostureIgnoredViolation(
  componentId: string,
  source: string,
): void {
  emitL11AuditRecord({
    violationCode: L11ConstitutionalViolationCode.RESTRICTION_POSTURE_IGNORED,
    source,
    detail: `Restriction posture ignored in "${componentId}"`,
    context: { componentId },
    severity: 'CRITICAL',
  });
}

export function emitL11RestrictionBypassViolation(
  componentId: string,
  source: string,
  detail: string,
): void {
  emitL11AuditRecord({
    violationCode: L11ConstitutionalViolationCode.RESTRICTION_BYPASS,
    source,
    detail: `Restriction bypass in "${componentId}": ${detail}`,
    context: { componentId },
    severity: 'CRITICAL',
  });
}

export function emitL11RegimePostureIgnoredViolation(
  componentId: string,
  source: string,
): void {
  emitL11AuditRecord({
    violationCode: L11ConstitutionalViolationCode.REGIME_POSTURE_IGNORED,
    source,
    detail: `Regime posture ignored in "${componentId}"`,
    context: { componentId },
    severity: 'CRITICAL',
  });
}

export function emitL11SequencePostureIgnoredViolation(
  componentId: string,
  source: string,
): void {
  emitL11AuditRecord({
    violationCode: L11ConstitutionalViolationCode.SEQUENCE_POSTURE_IGNORED,
    source,
    detail: `Sequence posture ignored in "${componentId}"`,
    context: { componentId },
    severity: 'CRITICAL',
  });
}

export function emitL11HypothesisPostureIgnoredViolation(
  componentId: string,
  source: string,
): void {
  emitL11AuditRecord({
    violationCode: L11ConstitutionalViolationCode.HYPOTHESIS_POSTURE_IGNORED,
    source,
    detail: `L10 hypothesis posture ignored in "${componentId}"`,
    context: { componentId },
    severity: 'CRITICAL',
  });
}

export function emitL11HypothesisSpreadIgnoredViolation(
  componentId: string,
  source: string,
): void {
  emitL11AuditRecord({
    violationCode: L11ConstitutionalViolationCode.HYPOTHESIS_SPREAD_IGNORED,
    source,
    detail: `L10 hypothesis spread ignored / hidden in "${componentId}"`,
    context: { componentId },
    severity: 'CRITICAL',
  });
}

export function emitL11HypothesisRelianceIgnoredViolation(
  componentId: string,
  source: string,
): void {
  emitL11AuditRecord({
    violationCode: L11ConstitutionalViolationCode.HYPOTHESIS_RELIANCE_IGNORED,
    source,
    detail: `L10 hypothesis reliance ignored in "${componentId}"`,
    context: { componentId },
    severity: 'CRITICAL',
  });
}

// ── Persistence / lineage / late-layer emitters ──

export function emitL11StorageBypassViolation(
  source: string,
  detail: string,
): void {
  emitL11AuditRecord({
    violationCode: L11ConstitutionalViolationCode.STORAGE_BYPASS,
    source,
    detail,
    context: {},
    severity: 'CRITICAL',
  });
}

export function emitL11MissingLineageViolation(
  surfaceId: string,
  source: string,
  missing: readonly string[],
): void {
  emitL11AuditRecord({
    violationCode: L11ConstitutionalViolationCode.MISSING_LINEAGE,
    source,
    detail: `Missing required lineage fields for "${surfaceId}": ${missing.join(', ')}`,
    context: { surfaceId, missing: [...missing] },
    severity: 'CRITICAL',
  });
}

export function emitL11LateLayerConsumptionViolation(
  componentId: string,
  source: string,
  detail: string,
): void {
  emitL11AuditRecord({
    violationCode: L11ConstitutionalViolationCode.LATE_LAYER_CONSUMPTION,
    source,
    detail: `Later-layer consumption in "${componentId}": ${detail}`,
    context: { componentId },
    severity: 'CRITICAL',
  });
}

// ── Calibration / drift / score-as-action emitters ──

export function emitL11CalibrationHookAbsentViolation(
  componentId: string,
  source: string,
): void {
  emitL11AuditRecord({
    violationCode: L11ConstitutionalViolationCode.CALIBRATION_HOOK_ABSENT,
    source,
    detail: `Calibration hook absent in production-grade "${componentId}"`,
    context: { componentId },
    severity: 'CRITICAL',
  });
}

export function emitL11DriftHookAbsentViolation(
  componentId: string,
  source: string,
): void {
  emitL11AuditRecord({
    violationCode: L11ConstitutionalViolationCode.DRIFT_HOOK_ABSENT,
    source,
    detail: `Drift hook absent in "${componentId}"`,
    context: { componentId },
    severity: 'WARNING',
  });
}

export function emitL11ScoreAsActionViolation(
  componentId: string,
  source: string,
  detail: string,
): void {
  emitL11AuditRecord({
    violationCode: L11ConstitutionalViolationCode.SCORE_AS_ACTION,
    source,
    detail: `Score-as-action in "${componentId}": ${detail}`,
    context: { componentId },
    severity: 'CRITICAL',
  });
}

// ── Identity / metric / graph / primitive emitters ──

export function emitL11IdentityRedefinitionViolation(
  source: string,
  detail: string,
  context: Record<string, unknown> = {},
): void {
  emitL11AuditRecord({
    violationCode: L11ConstitutionalViolationCode.IDENTITY_REDEFINITION,
    source,
    detail,
    context,
    severity: 'CRITICAL',
  });
}

export function emitL11MetricRedefinitionViolation(
  source: string,
  detail: string,
  context: Record<string, unknown> = {},
): void {
  emitL11AuditRecord({
    violationCode: L11ConstitutionalViolationCode.METRIC_REDEFINITION,
    source,
    detail,
    context,
    severity: 'CRITICAL',
  });
}

export function emitL11GraphRedefinitionViolation(
  source: string,
  detail: string,
  context: Record<string, unknown> = {},
): void {
  emitL11AuditRecord({
    violationCode: L11ConstitutionalViolationCode.GRAPH_REDEFINITION,
    source,
    detail,
    context,
    severity: 'CRITICAL',
  });
}

export function emitL11PrimitiveRedefinitionViolation(
  source: string,
  detail: string,
  context: Record<string, unknown> = {},
): void {
  emitL11AuditRecord({
    violationCode: L11ConstitutionalViolationCode.PRIMITIVE_REDEFINITION,
    source,
    detail,
    context,
    severity: 'CRITICAL',
  });
}
