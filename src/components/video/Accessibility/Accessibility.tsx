import React from 'react';
import { Card } from '@/components/ui/Card/Card';

const Accessibility = React.memo(() => (
  <Card style={{ minWidth: 180, flex: 1 }}>
    <h3 style={{ margin: 0, fontWeight: 600 }}>Accessibility</h3>
    <div>Subtitles, transcripts, and screen reader support.</div>
  </Card>
));

export default Accessibility; 