import React from 'react';
import { AnalyticsStatus } from './AnalyticsStatus';

export default {
  title: 'Portfolio-management/Analytics/AnalyticsStatus',
  component: AnalyticsStatus,
};

export const Active = () => <AnalyticsStatus status="active" />;
export const Inactive = () => <AnalyticsStatus status="inactive" />;
