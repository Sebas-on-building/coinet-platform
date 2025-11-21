import React from 'react';
import { Card, Badge } from 'shared-ui';

export const OnboardingStatus = ({ status }) => (
  <Card>
    <Badge color={status === 'active' ? 'green' : 'red'}>
      {status.toUpperCase()}
    </Badge>
    <span>Onboarding Status</span>
  </Card>
);
