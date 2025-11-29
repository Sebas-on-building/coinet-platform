import React from 'react';
import { Card, Badge } from 'shared-ui';

export const AlertsStatus = ({ status }) => (
  <Card>
    <Badge color={status === 'active' ? 'green' : 'red'}>
      {status.toUpperCase()}
    </Badge>
    <span>Alerts Status</span>
  </Card>
);
