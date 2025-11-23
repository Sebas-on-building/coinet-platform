import React from 'react';
import { Card } from '../atoms/Card';

interface Props {
  data: { date: string; value: number }[];
  timeframe: string;
  onTimeframeChange: (tf: string) => void;
}

const timeframes = ['1d', '1w', '1m', '1y', 'all'];

export const PortfolioPerformanceChart: React.FC<Props> = ({ data, timeframe, onTimeframeChange }) => (
  <Card elevation="md">
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
      <h3>Performance</h3>
      <div>
        {timeframes.map(tf => (
          <button
            key={tf}
            style={{ marginRight: 8, fontWeight: tf === timeframe ? 700 : 400 }}
            onClick={() => onTimeframeChange(tf)}
          >
            {tf}
          </button>
        ))}
      </div>
    </div>
    {/* Chart stub */}
    <div style={{ height: 240, background: 'linear-gradient(90deg, #00ffa3 0%, #0057ff 100%)', borderRadius: 16, opacity: 0.12, marginBottom: 8 }} />
    <div style={{ textAlign: 'right', color: 'var(--color-textSecondary)' }}>
      (Chart coming soon)
    </div>
  </Card>
); 