import React from 'react';
import { NotificationStatus } from './NotificationStatus';

export default {
  title: 'Notification/Notification/NotificationStatus',
  component: NotificationStatus,
};

export const Active = () => <NotificationStatus status="active" />;
export const Inactive = () => <NotificationStatus status="inactive" />;
