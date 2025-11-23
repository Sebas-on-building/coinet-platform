import React from 'react';
import { Card, Badge } from 'shared-ui';

export const ConnectorsStatus = ({ status }) => (
  <Card>
    <Badge color={status === 'active' ? 'green' : 'red'}>
      {status.toUpperCase()}
    </Badge>
    <span>Connectors Status</span>
  </Card>
);
