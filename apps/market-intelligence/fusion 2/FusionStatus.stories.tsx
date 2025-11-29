import React from 'react';
import { FusionStatus } from './FusionStatus';

export default {
  title: 'Market-intelligence/Fusion/FusionStatus',
  component: FusionStatus,
};

export const Active = () => <FusionStatus status="active" />;
export const Inactive = () => <FusionStatus status="inactive" />;
