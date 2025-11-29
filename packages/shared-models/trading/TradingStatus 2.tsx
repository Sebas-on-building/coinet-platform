import React from 'react';
import { Card, Badge } from 'shared-ui';

export const TradingStatus = ({ status }) => (
  <Card>
    <Badge color={status === 'active' ? 'green' : 'red'}>
      {status.toUpperCase()}
    </Badge>
    <span>Trading Status</span>
  </Card>
);
