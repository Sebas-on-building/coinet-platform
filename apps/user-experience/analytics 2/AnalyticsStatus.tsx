import React from 'react';
import { Card, Badge } from 'shared-ui';

export const AnalyticsStatus = ({ status }) => (
  <Card>
    <Badge color={status === 'active' ? 'green' : 'red'}>
      {status.toUpperCase()}
    </Badge>
    <span>Analytics Status</span>
  </Card>
);
