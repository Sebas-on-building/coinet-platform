import type { NotificationEvent, NotificationSeverity } from './notification-types';

function generateId(): string {
  try {
    const anyCrypto = (globalThis as any)?.crypto;
    if (anyCrypto?.randomUUID) return anyCrypto.randomUUID();
  } catch {}
  return `${Date.now()}`;
}

export function buildDecisionExecutedEvent(payload: Record<string, unknown>, severity: NotificationSeverity = 'info'): NotificationEvent {
  return { id: generateId(), type: 'DecisionExecuted', severity, at: Date.now(), payload };
}
export function buildRiskAlertEvent(payload: Record<string, unknown>, severity: NotificationSeverity = 'warning'): NotificationEvent {
  return { id: generateId(), type: 'RiskAlert', severity, at: Date.now(), payload };
}
export function buildAnomalyEvent(payload: Record<string, unknown>, severity: NotificationSeverity = 'warning'): NotificationEvent {
  return { id: generateId(), type: 'AnomalyEvent', severity, at: Date.now(), payload };
}
