import React from 'react';
import { Card } from '@/components/ui/Card/Card';

const Plugins = React.memo(() => (
  <Card style={{ minWidth: 180, flex: 1 }}>
    <h3 style={{ margin: 0, fontWeight: 600 }}>Plugins</h3>
    <div>Extend video with custom plugins and integrations.</div>
  </Card>
));

export default Plugins; 