import React from 'react';
import { Card, Badge } from 'shared-ui';

export const ConnectorStatus = ({ status }: { status: string }) => (
  <Card>
    <Badge color={status === 'active' ? 'green' : 'red'}>
      {status.toUpperCase()}
    </Badge>
    <span>Exchange Connector</span>
  </Card>
); 