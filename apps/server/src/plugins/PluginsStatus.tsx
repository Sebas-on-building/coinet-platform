import React from 'react';
import { Card, Badge } from 'shared-ui';

export const PluginsStatus = ({ status }) => (
  <Card>
    <Badge color={status === 'active' ? 'green' : 'red'}>
      {status.toUpperCase()}
    </Badge>
    <span>Plugins Status</span>
  </Card>
);
