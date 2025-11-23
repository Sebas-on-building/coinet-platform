import React from 'react';
import { Card } from '@/components/ui/Card/Card';

const Editor = React.memo(() => (
  <Card style={{ minWidth: 180, flex: 1 }}>
    <h3 style={{ margin: 0, fontWeight: 600 }}>Editor</h3>
    <div>Trim, annotate, and remix video content.</div>
  </Card>
));

export default Editor; 