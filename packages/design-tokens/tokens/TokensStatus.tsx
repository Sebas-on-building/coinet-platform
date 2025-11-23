import React from 'react';
import { Card, Badge } from 'shared-ui';

export const TokensStatus = ({ status }) => (
  <Card>
    <Badge color={status === 'active' ? 'green' : 'red'}>
      {status.toUpperCase()}
    </Badge>
    <span>Tokens Status</span>
  </Card>
);
