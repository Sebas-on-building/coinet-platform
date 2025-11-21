import React from 'react';
import { Card, Badge } from 'shared-ui';

export const EventsStatus = ({ status }) => (
  <Card>
    <Badge color={status === 'active' ? 'green' : 'red'}>
      {status.toUpperCase()}
    </Badge>
    <span>Events Status</span>
  </Card>
);
