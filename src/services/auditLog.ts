type AuditEvent = {
  event: string;
  email?: string;
  ip?: string | string[];
  userAgent?: string;
  reason?: string;
};

export async function logAuditEvent(event: AuditEvent) {
  // TODO: Replace with real audit log (DB, external service, etc.)
  // eslint-disable-next-line no-console
  console.log('[AUDIT]', new Date().toISOString(), event);
} 