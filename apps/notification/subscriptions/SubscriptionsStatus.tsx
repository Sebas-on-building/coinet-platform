import React from 'react';
import { Card, Badge } from 'shared-ui';

export const SubscriptionsStatus = ({ status }) => (
  <Card>
    <Badge color={status === 'active' ? 'green' : 'red'}>
      {status.toUpperCase()}
    </Badge>
    <span>Subscriptions Status</span>
  </Card>
);
