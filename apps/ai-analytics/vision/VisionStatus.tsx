import React from 'react';
import { Card, Badge } from 'shared-ui';

export const VisionStatus = ({ status }) => (
  <Card>
    <Badge color={status === 'active' ? 'green' : 'red'}>
      {status.toUpperCase()}
    </Badge>
    <span>Vision Status</span>
  </Card>
);
