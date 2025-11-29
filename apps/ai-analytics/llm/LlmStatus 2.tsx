import React from 'react';
import { Card, Badge } from 'shared-ui';

export const LlmStatus = ({ status }) => (
  <Card>
    <Badge color={status === 'active' ? 'green' : 'red'}>
      {status.toUpperCase()}
    </Badge>
    <span>Llm Status</span>
  </Card>
);
