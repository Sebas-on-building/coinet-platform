import React from 'react';
import { Card } from '@/components/ui/Card/Card';

const Resources = React.memo(() => (
  <Card style={{ minWidth: 180, flex: 1 }}>
    <h3 style={{ margin: 0, fontWeight: 600 }}>Resources</h3>
    <div>Related docs, links, and downloads.</div>
  </Card>
));

export default Resources; 