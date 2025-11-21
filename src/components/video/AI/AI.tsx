import React from 'react';
import { Card } from '@/components/ui/Card/Card';

const AI = React.memo(() => (
  <Card style={{ minWidth: 180, flex: 1 }}>
    <h3 style={{ margin: 0, fontWeight: 600 }}>AI Insights</h3>
    <div>Summaries, highlights, and smart search powered by AI.</div>
  </Card>
));

export default AI; 