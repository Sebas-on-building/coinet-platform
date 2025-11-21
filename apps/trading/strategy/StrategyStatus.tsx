import React from 'react';
import { Card, Badge } from 'shared-ui';

export const StrategyStatus = ({ status }) => (
  <Card>
    <Badge color={status === 'active' ? 'green' : 'red'}>
      {status.toUpperCase()}
    </Badge>
    <span>Strategy Status</span>
  </Card>
);
