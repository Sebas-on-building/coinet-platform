import React from 'react';
import { Card, Badge } from 'shared-ui';

export const AiServicesStatus = ({ status }: { status: 'active' | 'inactive' }) => (
  <Card>
    <Badge color={status === 'active' ? 'green' : 'red'}>
      {status.toUpperCase()}
    </Badge>
    <span>AI Services Status</span>
  </Card>
);
