import React from 'react';
import { Card, Badge } from 'shared-ui';

export const StreamingStatus = ({ status }) => (
  <Card>
    <Badge color={status === 'active' ? 'green' : 'red'}>
      {status.toUpperCase()}
    </Badge>
    <span>Streaming Status</span>
  </Card>
);
