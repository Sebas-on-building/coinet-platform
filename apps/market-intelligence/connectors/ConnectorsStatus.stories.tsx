import React from 'react';
import { ConnectorsStatus } from './ConnectorsStatus';

export default {
  title: 'Market-intelligence/Connectors/ConnectorsStatus',
  component: ConnectorsStatus,
};

export const Active = () => <ConnectorsStatus status="active" />;
export const Inactive = () => <ConnectorsStatus status="inactive" />;
