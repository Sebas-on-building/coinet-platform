import React from 'react';
import { Card, Badge } from 'shared-ui';

export const ChannelsStatus = ({ status }) => (
  <Card>
    <Badge color={status === 'active' ? 'green' : 'red'}>
      {status.toUpperCase()}
    </Badge>
    <span>Channels Status</span>
  </Card>
);
