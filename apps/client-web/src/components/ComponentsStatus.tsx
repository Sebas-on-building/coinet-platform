import React from 'react';
import { Card, Badge } from 'shared-ui';

export const ComponentsStatus = ({ status }) => (
  <Card>
    <Badge color={status === 'active' ? 'green' : 'red'}>
      {status.toUpperCase()}
    </Badge>
    <span>Components Status</span>
  </Card>
);
