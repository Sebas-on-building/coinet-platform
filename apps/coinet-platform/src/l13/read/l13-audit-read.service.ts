/**
 * L13.10 — Audit Read Service
 *
 * §13.10.29 / §13.10.30 — Governed read surface for the L13.10
 * persistence-feedback audit log.
 */

import type { L13PersistenceFeedbackAuditRecord } from '../constitution/l13-persistence-feedback-audit';
import {
  getL13PersistenceFeedbackAuditLog,
  getL13PersistenceFeedbackCriticalViolations,
} from '../constitution/l13-persistence-feedback-audit';

export function readL13PersistenceFeedbackAuditLog():
  readonly L13PersistenceFeedbackAuditRecord[] {
  return getL13PersistenceFeedbackAuditLog();
}

export function readL13PersistenceFeedbackCriticalAudits():
  readonly L13PersistenceFeedbackAuditRecord[] {
  return getL13PersistenceFeedbackCriticalViolations();
}
