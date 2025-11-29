import React from 'react';
import { ServerStatus } from './ServerStatus';

export default {
  title: 'Server/Server/ServerStatus',
  component: ServerStatus,
};

export const Active = () => <ServerStatus status="active" />;
export const Inactive = () => <ServerStatus status="inactive" />;
