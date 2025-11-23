import React from 'react';
import { Card, Badge } from 'shared-ui';

export const ExecutionStatus = ({ status }) => (
  <Card>
    <Badge color={status === 'active' ? 'green' : 'red'}>
      {status.toUpperCase()}
    </Badge>
    <span>Execution Status</span>
  </Card>
);
