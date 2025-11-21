import React, { useState } from 'react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';

export default {
  title: 'Dashboard/MultiLayerDashboard',
  parameters: {
    docs: {
      description: {
        component: 'A dashboard with multiple resizable, draggable widgets (market, news, portfolio, AI, etc.), inspired by TradingView and Apple.',
      },
    },
  },
};

const initialWidgets = [
  { id: 1, title: 'Market Overview', x: 40, y: 40, w: 320, h: 180 },
  { id: 2, title: 'News Feed', x: 400, y: 40, w: 320, h: 180 },
  { id: 3, title: 'Portfolio', x: 40, y: 260, w: 320, h: 180 },
  { id: 4, title: 'AI Insights', x: 400, y: 260, w: 320, h: 180 },
];

export const MultiLayerDashboard = () => {
  const [widgets, setWidgets] = useState(initialWidgets);

  // Simple drag logic (for demo only)
  const onDrag = (id: number, dx: number, dy: number) => {
    setWidgets(ws => ws.map(w => w.id === id ? { ...w, x: w.x + dx, y: w.y + dy } : w));
  };

  return (
    <div style={{ padding: 32, background: 'linear-gradient(120deg, #f8fafc 0%, #e0e7ff 100%)', minHeight: '100vh', position: 'relative' }}>
      {widgets.map(w => (
        <Card key={w.id} style={{ position: 'absolute', left: w.x, top: w.y, width: w.w, height: w.h, cursor: 'move', zIndex: w.id }}
          onMouseDown={e => {
            const startX = e.clientX, startY = e.clientY;
            const move = (ev: MouseEvent) => {
              onDrag(w.id, ev.clientX - startX, ev.clientY - startY);
              document.removeEventListener('mousemove', move);
            };
            document.addEventListener('mousemove', move);
            document.addEventListener('mouseup', () => document.removeEventListener('mousemove', move), { once: true });
          }}
        >
          <h4>{w.title}</h4>
        </Card>
      ))}
    </div>
  );
};
