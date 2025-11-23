import React from 'react';
import { TradingStatus } from './TradingStatus';

export default {
  title: 'Trading/Trading/TradingStatus',
  component: TradingStatus,
};

export const Active = () => <TradingStatus status="active" />;
export const Inactive = () => <TradingStatus status="inactive" />;
