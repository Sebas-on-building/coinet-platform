import React from 'react';
import { HoldingsStatus } from './HoldingsStatus';

export default {
  title: 'Portfolio Management/Holdings/HoldingsStatus',
  component: HoldingsStatus,
};

export const Active = () => <HoldingsStatus status="active" />;
export const Inactive = () => <HoldingsStatus status="inactive" />; 