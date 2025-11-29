import React from 'react';
import { Card } from '@/components/ui/Card/Card';
import AnalyticsEvents from './AnalyticsEvents';

const Analytics = React.memo(() => (
  <Card style={{ minWidth: 180, flex: 1 }}>
    <h3 style={{ margin: 0, fontWeight: 600 }}>Analytics</h3>
    <div>View count, engagement, and real-time stats.</div>
    <AnalyticsEvents />
  </Card>
));

export default Analytics; 