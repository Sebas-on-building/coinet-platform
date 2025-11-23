import React from 'react';
import { Card, Badge } from 'shared-ui';

export const DocsStatus = ({ status }) => (
  <Card>
    <Badge color={status === 'active' ? 'green' : 'red'}>
      {status.toUpperCase()}
    </Badge>
    <span>Docs Status</span>
  </Card>
);
