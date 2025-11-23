import React from 'react';
import { Card } from '@/components/ui/Card/Card';

interface AnalyticsEventDetailsProps {
  type: string;
  timestamp: string;
  details?: string;
}

const AnalyticsEventDetails = React.memo(({ type, timestamp, details }: AnalyticsEventDetailsProps) => (
  <Card style={{ padding: 'var(--spacing-md)', minWidth: 220 }}>
    <h4 style={{ margin: 0 }}>{type}</h4>
    <div style={{ color: 'var(--color-text-secondary)' }}>{timestamp}</div>
    {details && <p style={{ marginTop: 'var(--spacing-sm)' }}>{details}</p>}
  </Card>
));

export default AnalyticsEventDetails; 