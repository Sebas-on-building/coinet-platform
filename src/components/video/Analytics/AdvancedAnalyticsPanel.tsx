import React, { useState } from 'react';
import { Card } from '@/components/ui/Card/Card';
import { Button } from '@/components/ui/Button/Button';

const METRICS = ['Views', 'Watch Time', 'Engagement', 'Shares', 'Bookmarks'];
const CHARTS = ['Line', 'Bar', 'Pie'];

const AdvancedAnalyticsPanel = React.memo(() => {
  const [metric, setMetric] = useState(METRICS[0]);
  const [chart, setChart] = useState(CHARTS[0]);
  // Simulate data
  const data = Array.from({ length: 10 }, (_, i) => ({ label: `Day ${i + 1}`, value: Math.floor(Math.random() * 1000) }));
  return (
    <Card style={{ padding: 'var(--spacing-lg)', minWidth: 340, minHeight: 220, display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
      <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
        <select value={metric} onChange={e => setMetric(e.target.value)} style={{ fontSize: 16, borderRadius: 6, padding: 4 }}>
          {METRICS.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <select value={chart} onChange={e => setChart(e.target.value)} style={{ fontSize: 16, borderRadius: 6, padding: 4 }}>
          {CHARTS.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <Button size="sm" variant="primary">Export</Button>
        <Button size="sm" variant="secondary">Share</Button>
      </div>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 120 }}>
        {/* Placeholder for chart, replace with real chart lib */}
        <svg width="220" height="100" style={{ background: 'var(--color-bg)', borderRadius: 8 }}>
          {chart === 'Line' && data.map((d, i) => i < data.length - 1 && (
            <line key={i} x1={i * 22} y1={100 - data[i].value / 10} x2={(i + 1) * 22} y2={100 - data[i + 1].value / 10} stroke="var(--color-primary)" strokeWidth={2} />
          ))}
          {chart === 'Bar' && data.map((d, i) => (
            <rect key={i} x={i * 22} y={100 - d.value / 10} width={16} height={d.value / 10} fill="var(--color-primary)" />
          ))}
          {chart === 'Pie' && <circle cx={110} cy={50} r={40} fill="var(--color-primary)" opacity={0.2} />}
        </svg>
      </div>
    </Card>
  );
});

export default AdvancedAnalyticsPanel; 