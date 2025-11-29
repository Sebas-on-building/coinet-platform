import React from 'react';
import { Card } from '@/components/ui/Card/Card';
import Comments from './Comments';

const Collaboration = React.memo(() => (
  <Card style={{ minWidth: 180, flex: 1 }}>
    <h3 style={{ margin: 0, fontWeight: 600 }}>Collaboration</h3>
    <div>Live comments, shared notes, and co-watching.</div>
    <Comments />
  </Card>
));

export default Collaboration; 