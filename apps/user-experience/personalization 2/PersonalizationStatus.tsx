import React from 'react';
import { Card, Badge } from 'shared-ui';

export const PersonalizationStatus = ({ status }) => (
  <Card>
    <Badge color={status === 'active' ? 'green' : 'red'}>
      {status.toUpperCase()}
    </Badge>
    <span>Personalization Status</span>
  </Card>
);
