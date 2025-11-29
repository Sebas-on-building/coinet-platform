import React, { useState } from 'react';
import { Button } from '../components/Button';
import { Card } from '../components/Card';

export default {
  title: 'Dashboard/WidgetMarketplace',
};

const availableWidgets = [
  { type: 'market', name: 'Market Overview' },
  { type: 'portfolio', name: 'Portfolio' },
  { type: 'news', name: 'News Feed' },
  { type: 'social', name: 'Social Sentiment' },
  { type: 'ai', name: 'AI Insights' },
  // Add more as needed
];

export const Marketplace = () => {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ padding: 32 }}>
      <Button onClick={() => setOpen(true)}>Open Widget Marketplace</Button>
      {open && (
        <Card style={{ position: 'absolute', top: 80, left: 80, zIndex: 100, width: 400 }}>
          <h3>Widget Marketplace</h3>
          <ul>
            {availableWidgets.map(w => (
              <li key={w.type} style={{ margin: '12px 0' }}>
                <Button size="sm">Install {w.name}</Button>
              </li>
            ))}
          </ul>
          <Button variant="danger" onClick={() => setOpen(false)}>Close</Button>
        </Card>
      )}
    </div>
  );
}; 