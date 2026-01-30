// Alert engine types

export interface AlertEngineConfig {
  redisUrl?: string;
  databaseUrl?: string;
  notificationChannels?: NotificationChannel[];
}

export interface NotificationChannel {
  type: 'email' | 'sms' | 'push' | 'webhook';
  config: Record<string, unknown>;
}

export interface Alert {
  id: string;
  userId: string;
  type: string;
  condition: AlertCondition;
  channels: string[];
  status: 'active' | 'paused' | 'triggered' | 'expired';
  createdAt: string;
  updatedAt?: string;
  lastTriggeredAt?: string;
}

export interface AlertCondition {
  metric: string;
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte' | 'change_pct';
  value: number;
  symbol?: string;
}
