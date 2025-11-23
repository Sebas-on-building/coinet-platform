import React from 'react';
import { Card, Badge } from 'shared-ui';

export const MoleculesStatus = ({ status }) => (
  <Card>
    <Badge color={status === 'active' ? 'green' : 'red'}>
      {status.toUpperCase()}
    </Badge>
    <span>Molecules Status</span>
  </Card>
);
