import React from 'react';
import { Card, Badge } from 'shared-ui';

export const FusionStatus = ({ status }) => (
  <Card>
    <Badge color={status === 'active' ? 'green' : 'red'}>
      {status.toUpperCase()}
    </Badge>
    <span>Fusion Status</span>
  </Card>
);
