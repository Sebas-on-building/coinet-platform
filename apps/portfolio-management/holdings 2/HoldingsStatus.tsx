import React from 'react';
import { Card, Badge } from 'shared-ui';

export const HoldingsStatus = ({ status }: { status: string }) => (
  <Card>
    <Badge color={status === 'active' ? 'green' : 'red'}>
      {status.toUpperCase()}
    </Badge>
    <span>Portfolio Holdings</span>
  </Card>
); 