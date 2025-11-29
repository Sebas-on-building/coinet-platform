import React from 'react';
import { Card, Badge } from 'shared-ui';

export const OrganismsStatus = ({ status }) => (
  <Card>
    <Badge color={status === 'active' ? 'green' : 'red'}>
      {status.toUpperCase()}
    </Badge>
    <span>Organisms Status</span>
  </Card>
);
