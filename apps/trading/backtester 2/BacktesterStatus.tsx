import React from 'react';
import { Card, Badge } from 'shared-ui';

export const BacktesterStatus = ({ status }) => (
  <Card>
    <Badge color={status === 'active' ? 'green' : 'red'}>
      {status.toUpperCase()}
    </Badge>
    <span>Backtester Status</span>
  </Card>
);
