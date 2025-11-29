// Atomic CQRS command types for Notification Context

export interface CreateAlert {
  type: 'CreateAlert';
  userId: string;
  rule: any;
}

export interface TriggerAlert {
  type: 'TriggerAlert';
  alertId: string;
  triggerDetails: any;
}

export interface SendNotification {
  type: 'SendNotification';
  userId: string;
  channel: string;
  content: any;
}

export interface UpdateSubscription {
  type: 'UpdateSubscription';
  userId: string;
  subscriptionType: string;
  newValue: any;
} 