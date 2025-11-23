import React from 'react';
import { Card, Badge } from 'shared-ui';

export const AtomsStatus = ({ status }) => (
  <Card>
    <Badge color={status === 'active' ? 'green' : 'red'}>
      {status.toUpperCase()}
    </Badge>
    <span>Atoms Status</span>
  </Card>
);
