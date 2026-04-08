/**
 * L3.5-B — Metric Namespace Validator & Enforcement Gate
 *
 * The single legal exit point from Layer 3 for metrics.
 * No metric may leave Layer 3 without a validation report
 * and a canonical contract match.
 *
 * Later layers consume canonical metrics through this gate,
 * never raw provider field names.
 */

import { v4 as uuidv4 } from 'uuid';
import {
  getMetricContract,
  type MetricContract,
  type MetricUseDomain,
} from './metric-contracts';
import type { CanonicalMetricObservation, MetricProvenance } from './metric-namespace';

export const L35_VALIDATOR_VERSION = '1.0.0' as const;

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION REPORT
// ═══════════════════════════════════════════════════════════════════════════════

export type MetricValidationStatus = 'PASS' | 'FAIL' | 'CONDITIONAL';

export interface MetricValidationViolation {
  code: string;
  message: string;
  severity: 'ERROR' | 'WARNING';
}

export interface MetricValidationReport {
  reportId: string;
  metricPath: string;
  contractVersion: string | null;
  status: MetricValidationStatus;
  violations: MetricValidationViolation[];
  checkedAt: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// NAMESPACE GATE DECISION
// ═══════════════════════════════════════════════════════════════════════════════

export interface MetricNamespaceGateDecision {
  allowed: boolean;
  mode: 'ALLOW' | 'CONDITIONAL' | 'DENY';
  metricPath: string;
  observationId: string;
  useDomain: MetricUseDomain;
  blockReasons: string[];
  contractVersion: string | null;
  validationReportId: string;
  auditStamp: {
    gatedAt: string;
    validatorVersion: string;
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// STORES
// ═══════════════════════════════════════════════════════════════════════════════

const _validationReports: MetricValidationReport[] = [];
const _gateDecisions: MetricNamespaceGateDecision[] = [];

export function getValidationReports(): readonly MetricValidationReport[] {
  return _validationReports;
}

export function getGateDecisions(): readonly MetricNamespaceGateDecision[] {
  return _gateDecisions;
}

export function resetValidatorState(): void {
  _validationReports.length = 0;
  _gateDecisions.length = 0;
}

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION CORE
// ═══════════════════════════════════════════════════════════════════════════════

export interface ValidateMappedMetricInput {
  metricPath: string;
  objectType: string;
  value: unknown;
  unit?: string;
  provenance: MetricProvenance;
  scope?: { domain?: string };
  basis?: Record<string, string | undefined>;
  window?: { kind?: string };
}

export function validateMappedMetric(input: ValidateMappedMetricInput): MetricValidationReport {
  const violations: MetricValidationViolation[] = [];
  const contract = getMetricContract(input.metricPath);

  if (!contract) {
    violations.push({ code: 'NO_CONTRACT', message: `No contract for path '${input.metricPath}'`, severity: 'ERROR' });
    return emitReport(input.metricPath, null, 'FAIL', violations);
  }

  if (contract.objectType !== input.objectType && contract.objectType !== '*') {
    violations.push({ code: 'WRONG_OBJECT_TYPE', message: `Expected ${contract.objectType}, got ${input.objectType}`, severity: 'ERROR' });
  }

  if (contract.valueType === 'DECIMAL' && typeof input.value !== 'number') {
    if (typeof input.value === 'string' && !isNaN(parseFloat(input.value as string))) {
      violations.push({ code: 'VALUE_TYPE_COERCED', message: 'String coerced to decimal', severity: 'WARNING' });
    } else {
      violations.push({ code: 'WRONG_VALUE_TYPE', message: `Expected decimal, got ${typeof input.value}`, severity: 'ERROR' });
    }
  }

  if (contract.valueType === 'INTEGER' && typeof input.value !== 'number') {
    violations.push({ code: 'WRONG_VALUE_TYPE', message: `Expected integer, got ${typeof input.value}`, severity: 'ERROR' });
  }

  if (input.unit && input.unit !== contract.unit) {
    violations.push({ code: 'UNIT_MISMATCH', message: `Expected ${contract.unit}, got ${input.unit}`, severity: 'ERROR' });
  }

  if (contract.providerProvenanceRequirements.requireProviderId && !input.provenance.providerId) {
    violations.push({ code: 'MISSING_PROVIDER_ID', message: 'Provider ID required', severity: 'ERROR' });
  }
  if (contract.providerProvenanceRequirements.requireRawFieldRef && !input.provenance.rawFieldName) {
    violations.push({ code: 'MISSING_RAW_FIELD_REF', message: 'Raw field reference required', severity: 'ERROR' });
  }
  if (contract.providerProvenanceRequirements.requireMappingVersion && !input.provenance.mapperVersion) {
    violations.push({ code: 'MISSING_MAPPER_VERSION', message: 'Mapper version required', severity: 'ERROR' });
  }
  if (contract.providerProvenanceRequirements.requireLineageRefs && input.provenance.lineageRefs.length === 0) {
    violations.push({ code: 'MISSING_LINEAGE_REFS', message: 'Lineage refs required', severity: 'ERROR' });
  }

  if (!input.scope?.domain) {
    violations.push({ code: 'MISSING_SCOPE', message: 'Scope domain required', severity: 'ERROR' });
  }

  if (!input.basis || Object.values(input.basis).every(v => !v)) {
    violations.push({ code: 'MISSING_BASIS', message: 'At least one basis field required', severity: 'ERROR' });
  }

  if (contract.window.kind !== 'INSTANT' && !input.window?.kind) {
    violations.push({ code: 'MISSING_WINDOW', message: 'Window required for non-instant metric', severity: 'ERROR' });
  }

  if (isProviderNameLeak(input.provenance.rawFieldName, input.metricPath)) {
    violations.push({ code: 'PROVIDER_NAME_LEAK', message: `Raw field name '${input.provenance.rawFieldName}' appears to leak into metric path`, severity: 'ERROR' });
  }

  const hasErrors = violations.some(v => v.severity === 'ERROR');
  const status: MetricValidationStatus = hasErrors ? 'FAIL' : violations.length > 0 ? 'CONDITIONAL' : 'PASS';
  return emitReport(input.metricPath, contract.contractVersion, status, violations);
}

function isProviderNameLeak(rawFieldName: string, metricPath: string): boolean {
  if (!rawFieldName || !metricPath) return false;
  const normalized = rawFieldName.toLowerCase().replace(/[^a-z0-9]/g, '');
  const pathNormalized = metricPath.toLowerCase().replace(/[^a-z0-9]/g, '');
  return normalized.length > 5 && pathNormalized === normalized;
}

export function validateCanonicalMetricObservation(
  obs: CanonicalMetricObservation,
): MetricValidationReport {
  const contract = getMetricContract(obs.metricPath);
  const violations: MetricValidationViolation[] = [];

  if (!contract) {
    violations.push({ code: 'NO_CONTRACT', message: `No contract for '${obs.metricPath}'`, severity: 'ERROR' });
    return emitReport(obs.metricPath, null, 'FAIL', violations);
  }

  if (obs.metricContractVersion !== contract.contractVersion) {
    violations.push({ code: 'CONTRACT_VERSION_MISMATCH', message: `Obs uses ${obs.metricContractVersion}, current is ${contract.contractVersion}`, severity: 'WARNING' });
  }

  if (obs.unit !== contract.unit) {
    violations.push({ code: 'UNIT_MISMATCH', message: `Obs unit ${obs.unit} != contract ${contract.unit}`, severity: 'ERROR' });
  }

  if (obs.freshnessState === 'UNUSABLE') {
    violations.push({ code: 'UNUSABLE_FRESHNESS', message: 'Observation freshness is UNUSABLE', severity: 'ERROR' });
  }

  if (obs.admissibilityState === 'BLOCKED') {
    violations.push({ code: 'BLOCKED_ADMISSIBILITY', message: 'Observation admissibility is BLOCKED', severity: 'ERROR' });
  }

  const hasErrors = violations.some(v => v.severity === 'ERROR');
  const status: MetricValidationStatus = hasErrors ? 'FAIL' : violations.length > 0 ? 'CONDITIONAL' : 'PASS';
  return emitReport(obs.metricPath, contract.contractVersion, status, violations);
}

// ═══════════════════════════════════════════════════════════════════════════════
// NAMESPACE GATE — single legal exit point
// ═══════════════════════════════════════════════════════════════════════════════

export function enforceMetricNamespaceGate(
  obs: CanonicalMetricObservation,
  requestedUse: MetricUseDomain,
): MetricNamespaceGateDecision {
  const validationReport = validateCanonicalMetricObservation(obs);
  const blockReasons: string[] = [];

  if (validationReport.status === 'FAIL') {
    blockReasons.push(...validationReport.violations.filter(v => v.severity === 'ERROR').map(v => v.code));
    return emitGateDecision(obs, requestedUse, 'DENY', blockReasons, validationReport);
  }

  if (obs.blockedUses.includes(requestedUse)) {
    blockReasons.push(`BLOCKED_USE:${requestedUse}`);
    return emitGateDecision(obs, requestedUse, 'DENY', blockReasons, validationReport);
  }

  if (!obs.allowedUses.includes(requestedUse)) {
    blockReasons.push(`NOT_IN_ALLOWED_USES:${requestedUse}`);
    return emitGateDecision(obs, requestedUse, 'DENY', blockReasons, validationReport);
  }

  if (obs.freshnessState === 'STALE') {
    const contract = getMetricContract(obs.metricPath);
    if (contract?.blockedUsesUnderUncertainty.includes(requestedUse)) {
      blockReasons.push(`STALE_BLOCKS:${requestedUse}`);
      return emitGateDecision(obs, requestedUse, 'DENY', blockReasons, validationReport);
    }
  }

  if (obs.admissibilityState === 'CONDITIONAL' || obs.scars.length > 0) {
    return emitGateDecision(obs, requestedUse, 'CONDITIONAL', [], validationReport);
  }

  return emitGateDecision(obs, requestedUse, 'ALLOW', [], validationReport);
}

export function isMetricAllowedForUse(
  obs: CanonicalMetricObservation,
  use: MetricUseDomain,
): boolean {
  const decision = enforceMetricNamespaceGate(obs, use);
  return decision.allowed;
}

// ═══════════════════════════════════════════════════════════════════════════════
// REPORT + DECISION EMITTERS
// ═══════════════════════════════════════════════════════════════════════════════

function emitReport(
  metricPath: string,
  contractVersion: string | null,
  status: MetricValidationStatus,
  violations: MetricValidationViolation[],
): MetricValidationReport {
  const report: MetricValidationReport = {
    reportId: `vrpt_${uuidv4()}`,
    metricPath,
    contractVersion,
    status,
    violations,
    checkedAt: new Date().toISOString(),
  };
  _validationReports.push(report);
  return report;
}

function emitGateDecision(
  obs: CanonicalMetricObservation,
  useDomain: MetricUseDomain,
  mode: MetricNamespaceGateDecision['mode'],
  blockReasons: string[],
  validationReport: MetricValidationReport,
): MetricNamespaceGateDecision {
  const decision: MetricNamespaceGateDecision = {
    allowed: mode === 'ALLOW' || mode === 'CONDITIONAL',
    mode,
    metricPath: obs.metricPath,
    observationId: obs.observationId,
    useDomain,
    blockReasons,
    contractVersion: obs.metricContractVersion,
    validationReportId: validationReport.reportId,
    auditStamp: {
      gatedAt: new Date().toISOString(),
      validatorVersion: L35_VALIDATOR_VERSION,
    },
  };
  _gateDecisions.push(decision);
  return decision;
}

export { emitReport as emitMetricValidationReport };
