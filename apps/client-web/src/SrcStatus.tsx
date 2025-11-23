import React from 'react';
import { Card, Badge } from 'shared-ui';

export const SrcStatus = ({ status }) => (
  <Card>
    <Badge color={status === 'active' ? 'green' : 'red'}>
      {status.toUpperCase()}
    </Badge>
    <span>Src Status</span>
  </Card>
);
