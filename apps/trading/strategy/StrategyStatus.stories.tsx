import React from 'react';
import { StrategyStatus } from './StrategyStatus';

export default {
  title: 'Trading/Strategy/StrategyStatus',
  component: StrategyStatus,
};

export const Active = () => <StrategyStatus status="active" />;
export const Inactive = () => <StrategyStatus status="inactive" />;
