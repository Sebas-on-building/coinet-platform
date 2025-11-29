export type NotificationChannel = 'email' | 'slack' | 'sms' | 'webhook';
export type NotificationSeverity = 'info' | 'warning' | 'critical';
export type NotificationEvent = { id: string; type: 'DecisionExecuted' | 'RiskAlert' | 'AnomalyEvent'; severity: NotificationSeverity; at: number; payload: Record<string, unknown> };
export type EscalationRule = { when: NotificationSeverity; then: NotificationChannel[] };
export type Acknowledgement = { by: string; at: number; comment?: string };
