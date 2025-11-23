import React from 'react';
import { RlStatus } from './RlStatus';

export default {
  title: 'Ai-analytics/Rl/RlStatus',
  component: RlStatus,
};

export const Active = () => <RlStatus status="active" />;
export const Inactive = () => <RlStatus status="inactive" />;
