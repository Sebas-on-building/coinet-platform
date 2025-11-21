import React from 'react';
import { AlertsStatus } from './AlertsStatus';

export default {
  title: 'Notification/Alerts/AlertsStatus',
  component: AlertsStatus,
};

export const Active = () => <AlertsStatus status="active" />;
export const Inactive = () => <AlertsStatus status="inactive" />;
