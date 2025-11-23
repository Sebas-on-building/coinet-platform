import React from 'react';
import { Card, Badge } from 'shared-ui';

export const ApiStatus = ({ status }) => (
  <Card>
    <Badge color={status === 'active' ? 'green' : 'red'}>
      {status.toUpperCase()}
    </Badge>
    <span>Api Status</span>
  </Card>
);
