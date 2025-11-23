import React, { useState } from 'react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
// Assume ChartWithOverlays is a design-system chart component
import { ChartWithOverlays } from '../../components/charts/ChartWithOverlays';
import type { Overlay } from '../../components/charts/ChartOverlay';

export default {
  title: 'Dashboard/AnalyticsOverlay',
  parameters: {
    docs: {
      description: {
        component: 'A dashboard story showing advanced analytics overlays, event markers, and AI signals on a chart, inspired by TradingView, Apple, and Solana.',
      },
    },
  },
};

export const AnalyticsOverlay = () => {
  const [showAI, setShowAI] = useState(true);
  const [showEvents, setShowEvents] = useState(true);
  const [showAnnotations, setShowAnnotations] = useState(true);

  // Mock data
  const chartData = Array.from({ length: 30 }, (_, i) => ({ x: i, y: Math.sin(i / 5) * 10 + 50 }));
  const overlays: Overlay[] = [
    ...(showAI ? [{ type: 'ai' as const, x: 0.33, y: 0.75, label: 'AI Buy', color: '#00ffa3' }] : []),
    ...(showEvents ? [{ type: 'news' as const, x: 0.5, y: 0.68, label: 'Earnings', color: '#ffb300' }] : []),
    ...(showAnnotations ? [{ type: 'annotation' as const, x: 0.66, y: 0.62, label: 'Note', color: '#0057ff' }] : []),
  ];

  return (
    <div style={{ padding: 32, background: 'linear-gradient(120deg, #f8fafc 0%, #e0e7ff 100%)', minHeight: '100vh' }}>
      <Card>
        <h3>Analytics Overlays</h3>
        <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
          <Button size="sm" onClick={() => setShowAI(v => !v)} variant={showAI ? 'primary' : 'secondary'}>AI Signals</Button>
          <Button size="sm" onClick={() => setShowEvents(v => !v)} variant={showEvents ? 'primary' : 'secondary'}>Events</Button>
          <Button size="sm" onClick={() => setShowAnnotations(v => !v)} variant={showAnnotations ? 'primary' : 'secondary'}>Annotations</Button>
        </div>
        <ChartWithOverlays data={chartData} overlays={overlays} width={800} height={320} />
      </Card>
    </div>
  );
};
