import React from 'react';
import { Card, Badge } from 'shared-ui';

export const PreferencesStatus = ({ status }) => (
  <Card>
    <Badge color={status === 'active' ? 'green' : 'red'}>
      {status.toUpperCase()}
    </Badge>
    <span>Preferences Status</span>
  </Card>
);
