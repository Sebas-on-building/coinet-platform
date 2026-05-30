/**
 * L14.1 — Constitutional Types
 *
 * §14.1.0 — Foundational enums for severity, sublayer identity,
 * and audit subject classes that every later L14 sublayer obeys.
 */

export enum L14SublayerId {
  L14_1_CONSTITUTION = 'L14.1_CONSTITUTION',
}

export const ALL_L14_SUBLAYER_IDS: readonly L14SublayerId[] =
  Object.values(L14SublayerId);

export enum L14ConstitutionalAuditSeverity {
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL',
}

export const ALL_L14_CONSTITUTIONAL_AUDIT_SEVERITIES:
  readonly L14ConstitutionalAuditSeverity[] =
  Object.values(L14ConstitutionalAuditSeverity);

export enum L14ConstitutionalAuditSubjectClass {
  MISSION = 'MISSION',
  BOUNDARY = 'BOUNDARY',
  CAPABILITY_POLICY = 'CAPABILITY_POLICY',
  FORBIDDEN_ACTION = 'FORBIDDEN_ACTION',
  DEPENDENCY_SURFACE = 'DEPENDENCY_SURFACE',
  OUTPUT_SURFACE = 'OUTPUT_SURFACE',
  COMPONENT_BOUNDARY = 'COMPONENT_BOUNDARY',
  INVARIANT = 'INVARIANT',
}

export const ALL_L14_CONSTITUTIONAL_AUDIT_SUBJECT_CLASSES:
  readonly L14ConstitutionalAuditSubjectClass[] =
  Object.values(L14ConstitutionalAuditSubjectClass);
