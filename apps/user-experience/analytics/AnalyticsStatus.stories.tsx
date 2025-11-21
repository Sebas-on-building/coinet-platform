import React from 'react';
import { AnalyticsStatus } from './AnalyticsStatus';

export default {
  title: 'User-experience/Analytics/AnalyticsStatus',
  component: AnalyticsStatus,
};

export const Active = () => <AnalyticsStatus status="active" />;
export const Inactive = () => <AnalyticsStatus status="inactive" />;
