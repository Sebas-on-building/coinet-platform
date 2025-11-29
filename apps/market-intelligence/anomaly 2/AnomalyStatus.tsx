import React from 'react';
import { Card, Badge } from 'shared-ui';

export const AnomalyStatus = ({ status }) => (
  <Card>
    <Badge color={status === 'active' ? 'green' : 'red'}>
      {status.toUpperCase()}
    </Badge>
    <span>Anomaly Status</span>
  </Card>
);
