// Atomic event types for Notification Context

export interface AlertCreated {
  type: 'AlertCreated';
  alertId: string;
  userId: string;
  rule: any;
  timestamp: string;
}

export interface AlertTriggered {
  type: 'AlertTriggered';
  alertId: string;
  userId: string;
  triggerDetails: any;
  timestamp: string;
}

export interface NotificationSent {
  type: 'NotificationSent';
  notificationId: string;
  userId: string;
  channel: string;
  content: any;
  timestamp: string;
}

export interface SubscriptionUpdated {
  type: 'SubscriptionUpdated';
  userId: string;
  subscriptionType: string;
  newValue: any;
  timestamp: string;
} 