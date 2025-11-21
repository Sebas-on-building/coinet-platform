import React from 'react';
import { ExecutionStatus } from './ExecutionStatus';

export default {
  title: 'Trading/Execution/ExecutionStatus',
  component: ExecutionStatus,
};

export const Active = () => <ExecutionStatus status="active" />;
export const Inactive = () => <ExecutionStatus status="inactive" />;
