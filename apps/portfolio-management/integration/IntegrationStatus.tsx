import React from 'react';
import { Card, Badge } from 'shared-ui';

export const IntegrationStatus = ({ status }) => (
  <Card>
    <Badge color={status === 'active' ? 'green' : 'red'}>
      {status.toUpperCase()}
    </Badge>
    <span>Integration Status</span>
  </Card>
);
