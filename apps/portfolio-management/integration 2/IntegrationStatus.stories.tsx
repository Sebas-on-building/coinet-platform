import React from 'react';
import { IntegrationStatus } from './IntegrationStatus';

export default {
  title: 'Portfolio-management/Integration/IntegrationStatus',
  component: IntegrationStatus,
};

export const Active = () => <IntegrationStatus status="active" />;
export const Inactive = () => <IntegrationStatus status="inactive" />;
