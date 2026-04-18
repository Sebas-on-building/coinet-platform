/**
 * L5.7 Assurance — Security Surface Law
 *
 * §5.7.9 — Write-surface, read-surface, store-specific, encryption law.
 */

export type ServiceRole =
  | 'INGRESS_WRITER'
  | 'PROJECTION_WORKER'
  | 'REPAIR_WORKER'
  | 'REPLAY_OPERATOR'
  | 'REPORT_READER'
  | 'ANALYTICAL_READER'
  | 'ADMIN_OPERATOR'
  | 'AUDIT_READER'
  | 'PUBLIC_READER';

export const ALL_SERVICE_ROLES: readonly ServiceRole[] = [
  'INGRESS_WRITER', 'PROJECTION_WORKER', 'REPAIR_WORKER', 'REPLAY_OPERATOR',
  'REPORT_READER', 'ANALYTICAL_READER', 'ADMIN_OPERATOR', 'AUDIT_READER', 'PUBLIC_READER',
];

export type SensitiveArtifactClass =
  | 'REPORT_RENDER'
  | 'MODEL_IO'
  | 'REPLAY_BUNDLE'
  | 'FORENSIC_ARTIFACT'
  | 'QUARANTINE_EVIDENCE'
  | 'AUDIT_EVENT'
  | 'USER_SENSITIVE_ARCHIVE';

export const ALL_SENSITIVE_ARTIFACT_CLASSES: readonly SensitiveArtifactClass[] = [
  'REPORT_RENDER', 'MODEL_IO', 'REPLAY_BUNDLE', 'FORENSIC_ARTIFACT',
  'QUARANTINE_EVIDENCE', 'AUDIT_EVENT', 'USER_SENSITIVE_ARCHIVE',
];

export interface StoreSecurityPolicy {
  readonly store: string;
  readonly requires_role_separation: boolean;
  readonly requires_least_privilege: boolean;
  readonly allows_public_access: boolean;
  readonly requires_auth: boolean;
  readonly requires_private_network: boolean;
  readonly requires_encryption_at_rest: boolean;
  readonly requires_encryption_in_transit: boolean;
}

export const STORE_SECURITY_POLICIES: readonly StoreSecurityPolicy[] = [
  { store: 'POSTGRES', requires_role_separation: true, requires_least_privilege: true, allows_public_access: false, requires_auth: true, requires_private_network: true, requires_encryption_at_rest: true, requires_encryption_in_transit: true },
  { store: 'CLICKHOUSE', requires_role_separation: true, requires_least_privilege: true, allows_public_access: false, requires_auth: true, requires_private_network: true, requires_encryption_at_rest: true, requires_encryption_in_transit: true },
  { store: 'REDIS', requires_role_separation: false, requires_least_privilege: true, allows_public_access: false, requires_auth: true, requires_private_network: true, requires_encryption_at_rest: true, requires_encryption_in_transit: true },
  { store: 'OBJECT_STORAGE', requires_role_separation: true, requires_least_privilege: true, allows_public_access: false, requires_auth: true, requires_private_network: false, requires_encryption_at_rest: true, requires_encryption_in_transit: true },
];

export const WRITE_SURFACE_LAW = {
  directPublicWriteAllowed: false,
  browserDirectWriteAllowed: false,
  publicArtifactUploadAllowed: false,
  trustedInternalServiceRequired: true,
} as const;

export const ROLES_ALLOWED_TO_WRITE: readonly ServiceRole[] = ['INGRESS_WRITER', 'PROJECTION_WORKER', 'REPAIR_WORKER', 'ADMIN_OPERATOR'];
export const ROLES_ALLOWED_TO_REPLAY: readonly ServiceRole[] = ['REPLAY_OPERATOR', 'ADMIN_OPERATOR', 'AUDIT_READER'];
export const ROLES_ALLOWED_TO_READ_SENSITIVE: readonly ServiceRole[] = ['ADMIN_OPERATOR', 'AUDIT_READER', 'REPLAY_OPERATOR'];

export function canWrite(role: ServiceRole): boolean {
  return (ROLES_ALLOWED_TO_WRITE as readonly ServiceRole[]).includes(role);
}

export function canReplay(role: ServiceRole): boolean {
  return (ROLES_ALLOWED_TO_REPLAY as readonly ServiceRole[]).includes(role);
}

export function canReadSensitive(role: ServiceRole): boolean {
  return (ROLES_ALLOWED_TO_READ_SENSITIVE as readonly ServiceRole[]).includes(role);
}

export function isPublicAccessAllowed(): boolean {
  return WRITE_SURFACE_LAW.directPublicWriteAllowed;
}
