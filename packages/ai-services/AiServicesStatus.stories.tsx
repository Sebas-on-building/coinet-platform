import React from 'react';
import { AiServicesStatus } from './AiServicesStatus';

export default {
  title: 'AI Services/AI Services Status',
  component: AiServicesStatus,
};

export const Active = () => <AiServicesStatus status="active" />;
export const Inactive = () => <AiServicesStatus status="inactive" />;
