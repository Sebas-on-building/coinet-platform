/**
 * L7.5 — Semantic Audit Surface
 *
 * §7.5.9 — Emits durable audit records whenever an L7.5 semantic
 * validator rejects an artifact: primary-class misuse, modifier misuse,
 * contradiction-ontology violation, template violation, validation-family
 * violation, or rollout-law violation.
 *
 * Disjoint from:
 *   - L7.1 constitutional audit (boundary/dependency law)
 *   - L7.2 object audit         (object-shape law)
 *   - L7.3 contract audit       (contract legality / replay law)
 *   - L7.4 runtime audit        (deterministic execution law)
 *
 * so that an audit record's semantic tier is unambiguous from its code.
 */

import { L7SemanticViolationCode } from '../validation/l7-semantic-violation-codes';

export interface L7SemanticAuditRecord {
  readonly timestamp: string;
  readonly violationCode: L7SemanticViolationCode;
  readonly source: string;
  readonly semanticSurface:
    | 'PRIMARY_CLASS'
    | 'MODIFIER'
    | 'CONTRADICTION_FAMILY'
    | 'CONTRADICTION_TEMPLATE'
    | 'VALIDATION_FAMILY'
    | 'ROLLOUT';
  readonly familyId: string | null;
  readonly subjectClass: string | null;
  readonly contradictionFamily: string | null;
  readonly templateId: string | null;
  readonly modifier: string | null;
  readonly primaryClass: string | null;
  readonly detail: string;
  readonly context: Record<string, unknown>;
  readonly severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'INFO';
}

const auditLog: L7SemanticAuditRecord[] = [];

export function resetSemanticAuditLog(): void {
  auditLog.length = 0;
}

export function emitSemanticAuditRecord(
  record: Omit<L7SemanticAuditRecord, 'timestamp'>,
): L7SemanticAuditRecord {
  const full: L7SemanticAuditRecord = {
    ...record,
    timestamp: new Date().toISOString(),
  };
  auditLog.push(full);
  return full;
}

export function getSemanticAuditLog(): readonly L7SemanticAuditRecord[] {
  return [...auditLog];
}

export function getSemanticCriticalViolations(): readonly L7SemanticAuditRecord[] {
  return auditLog.filter(r => r.severity === 'CRITICAL');
}

export function getSemanticViolationsByCode(
  code: L7SemanticViolationCode,
): readonly L7SemanticAuditRecord[] {
  return auditLog.filter(r => r.violationCode === code);
}

export function getSemanticViolationsBySurface(
  surface: L7SemanticAuditRecord['semanticSurface'],
): readonly L7SemanticAuditRecord[] {
  return auditLog.filter(r => r.semanticSurface === surface);
}

export function hasAnySemanticViolations(): boolean {
  return auditLog.length > 0;
}

export function getSemanticViolationCount(): number {
  return auditLog.length;
}

/**
 * Classifies a semantic violation code into its audit surface. Used by
 * emitters that don't want to hard-code the surface.
 */
export function surfaceForViolation(
  code: L7SemanticViolationCode,
): L7SemanticAuditRecord['semanticSurface'] {
  if (code.startsWith('L7_5_UNKNOWN_PRIMARY_CLASS')) return 'PRIMARY_CLASS';
  if (
    code.startsWith('L7_5_UNKNOWN_MODIFIER') ||
    code.startsWith('L7_5_MODIFIER') ||
    code === L7SemanticViolationCode.CLASS_MISUSED_AS_MODIFIER
  ) {
    return 'MODIFIER';
  }
  if (
    code === L7SemanticViolationCode.UNKNOWN_CONTRADICTION_FAMILY ||
    code === L7SemanticViolationCode.CONTRADICTION_FAMILY_NOT_REGISTERED ||
    code === L7SemanticViolationCode.CONTRADICTION_FAMILY_SCOPE_MISMATCH ||
    code === L7SemanticViolationCode.CONTRADICTION_FAMILY_SUBJECT_CLASS_ILLEGAL ||
    code === L7SemanticViolationCode.CONTRADICTION_FAMILY_SUPPORT_DOMAIN_MISSING ||
    code === L7SemanticViolationCode.CONTRADICTION_FAMILY_CHALLENGE_DOMAIN_MISSING ||
    code === L7SemanticViolationCode.CONTRADICTION_FAMILY_TEMPORALLY_IRRELEVANT
  ) {
    return 'CONTRADICTION_FAMILY';
  }
  if (code.startsWith('L7_5_TEMPLATE')) return 'CONTRADICTION_TEMPLATE';
  if (code.startsWith('L7_5_FAMILY')) return 'VALIDATION_FAMILY';
  if (code.startsWith('L7_5_ROLLOUT')) return 'ROLLOUT';
  if (
    code === L7SemanticViolationCode.MULTIPLE_PRIMARY_CLASSES ||
    code === L7SemanticViolationCode.PRIMARY_CLASS_REDEFINED_BY_FAMILY ||
    code === L7SemanticViolationCode.PRECEDENCE_VIOLATED ||
    code === L7SemanticViolationCode.CLEAN_CONFIRMATION_MASQUERADE
  ) {
    return 'PRIMARY_CLASS';
  }
  return 'VALIDATION_FAMILY';
}

export function defaultSeverityForViolation(
  code: L7SemanticViolationCode,
): L7SemanticAuditRecord['severity'] {
  switch (code) {
    case L7SemanticViolationCode.CLEAN_CONFIRMATION_MASQUERADE:
    case L7SemanticViolationCode.TEMPLATE_FREEFORM_CONTRADICTION_EMITTED:
    case L7SemanticViolationCode.FAMILY_SEMANTIC_DRIFT:
    case L7SemanticViolationCode.ROLLOUT_DEPENDENCY_NOT_ENABLED:
      return 'CRITICAL';
    case L7SemanticViolationCode.PRIMARY_CLASS_REDEFINED_BY_FAMILY:
    case L7SemanticViolationCode.CLASS_MISUSED_AS_MODIFIER:
    case L7SemanticViolationCode.MODIFIER_ILLEGAL_FOR_PRIMARY_CLASS:
    case L7SemanticViolationCode.TEMPLATE_OUTSIDE_REGISTRY:
    case L7SemanticViolationCode.TEMPLATE_NOT_REGISTERED:
    case L7SemanticViolationCode.CONTRADICTION_FAMILY_NOT_REGISTERED:
    case L7SemanticViolationCode.ROLLOUT_OUT_OF_ORDER:
    case L7SemanticViolationCode.ROLLOUT_CERTIFICATION_MISSING:
      return 'HIGH';
    case L7SemanticViolationCode.UNKNOWN_PRIMARY_CLASS:
    case L7SemanticViolationCode.UNKNOWN_MODIFIER:
    case L7SemanticViolationCode.UNKNOWN_CONTRADICTION_FAMILY:
    case L7SemanticViolationCode.FAMILY_UNKNOWN:
      return 'HIGH';
    default:
      return 'MEDIUM';
  }
}
