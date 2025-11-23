import React from 'react';
import { ConnectorStatus } from './ConnectorStatus';

export default {
  title: 'Market Intelligence/Connectors/ConnectorStatus',
  component: ConnectorStatus,
};

export const Active = () => <ConnectorStatus status="active" />;
export const Inactive = () => <ConnectorStatus status="inactive" />; 