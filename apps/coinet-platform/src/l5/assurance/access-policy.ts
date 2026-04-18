/**
 * L5.7 Assurance — Access Policy
 *
 * §5.7.9.2, §5.7.9.5, §5.7.9.7 — Governed access to sensitive surfaces,
 * security auditability.
 */

import type { ServiceRole, SensitiveArtifactClass } from './security-surface';
import { canWrite, canReplay, canReadSensitive } from './security-surface';

export type AccessAction = 'WRITE' | 'READ' | 'REPLAY' | 'INSPECT_FORENSICS' | 'ACCESS_MODEL_IO' | 'ACCESS_REPORT';

export interface AccessRequest {
  readonly actor_id: string;
  readonly service_role: ServiceRole;
  readonly action: AccessAction;
  readonly object_class: SensitiveArtifactClass | string;
  readonly object_id: string;
  readonly access_reason?: string;
  readonly timestamp: string;
}

export interface AccessDecision {
  readonly allowed: boolean;
  readonly reason: string;
  readonly audit_required: boolean;
}

export interface AccessAuditEntry {
  readonly actor_id: string;
  readonly service_role: ServiceRole;
  readonly object_class: string;
  readonly object_id: string;
  readonly action: AccessAction;
  readonly access_reason: string | null;
  readonly timestamp: string;
  readonly outcome: 'ALLOWED' | 'DENIED';
}

const auditLog: AccessAuditEntry[] = [];

export function resetAccessAuditLog(): void { auditLog.length = 0; }
export function getAccessAuditLog(): readonly AccessAuditEntry[] { return auditLog; }

export function evaluateAccess(req: AccessRequest): AccessDecision {
  let allowed = false;
  let reason = '';

  switch (req.action) {
    case 'WRITE':
      allowed = canWrite(req.service_role);
      reason = allowed ? 'Role has write permission' : 'Role lacks write permission';
      break;
    case 'REPLAY':
      allowed = canReplay(req.service_role);
      reason = allowed ? 'Role has replay permission' : 'Unauthorized replay attempt';
      break;
    case 'INSPECT_FORENSICS':
    case 'ACCESS_MODEL_IO':
    case 'ACCESS_REPORT':
      allowed = canReadSensitive(req.service_role);
      reason = allowed ? 'Role has sensitive read permission' : 'Unauthorized sensitive artifact access';
      break;
    case 'READ':
      allowed = true;
      reason = 'General read allowed';
      break;
  }

  const isSensitive = req.action !== 'READ';

  const entry: AccessAuditEntry = {
    actor_id: req.actor_id,
    service_role: req.service_role,
    object_class: req.object_class,
    object_id: req.object_id,
    action: req.action,
    access_reason: req.access_reason ?? null,
    timestamp: req.timestamp,
    outcome: allowed ? 'ALLOWED' : 'DENIED',
  };
  auditLog.push(entry);

  return { allowed, reason, audit_required: isSensitive };
}
