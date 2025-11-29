import React from 'react';
import { SubscriptionsStatus } from './SubscriptionsStatus';

export default {
  title: 'Notification/Subscriptions/SubscriptionsStatus',
  component: SubscriptionsStatus,
};

export const Active = () => <SubscriptionsStatus status="active" />;
export const Inactive = () => <SubscriptionsStatus status="inactive" />;
