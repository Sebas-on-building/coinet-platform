import React from 'react';
import { AnomalyStatus } from './AnomalyStatus';

export default {
  title: 'Market-intelligence/Anomaly/AnomalyStatus',
  component: AnomalyStatus,
};

export const Active = () => <AnomalyStatus status="active" />;
export const Inactive = () => <AnomalyStatus status="inactive" />;
