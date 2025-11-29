import React from 'react';
import { BacktesterStatus } from './BacktesterStatus';

export default {
  title: 'Trading/Backtester/BacktesterStatus',
  component: BacktesterStatus,
};

export const Active = () => <BacktesterStatus status="active" />;
export const Inactive = () => <BacktesterStatus status="inactive" />;
