import React from 'react';
import { Card, Badge } from 'shared-ui';

export const RlStatus = ({ status }) => (
  <Card>
    <Badge color={status === 'active' ? 'green' : 'red'}>
      {status.toUpperCase()}
    </Badge>
    <span>Rl Status</span>
  </Card>
);
