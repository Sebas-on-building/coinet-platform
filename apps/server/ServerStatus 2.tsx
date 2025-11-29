import React from 'react';
import { Card, Badge } from 'shared-ui';

export const ServerStatus = ({ status }) => (
  <Card>
    <Badge color={status === 'active' ? 'green' : 'red'}>
      {status.toUpperCase()}
    </Badge>
    <span>Server Status</span>
  </Card>
);
