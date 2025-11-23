import React from 'react';
import { Card, Badge } from 'shared-ui';

export const NotificationStatus = ({ status }) => (
  <Card>
    <Badge color={status === 'active' ? 'green' : 'red'}>
      {status.toUpperCase()}
    </Badge>
    <span>Notification Status</span>
  </Card>
);
