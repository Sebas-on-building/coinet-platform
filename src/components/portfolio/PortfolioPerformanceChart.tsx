import React from 'react';
import { Card } from '../atoms/Card';

interface Props {
  data: { date: string; value: number }[];
  timeframe: string;
  onTimeframeChange: (tf: string) => void;
}

const timeframes = ['1d', '1w', '1m', '1y', 'all'];

const hasChartData = (d: { date: string; value: number }[]) =>
  Array.isArray(d) && d.length > 0;

export const PortfolioPerformanceChart: React.FC<Props> = ({
  data,
  timeframe,
  onTimeframeChange,
}) => {
  const showChart = hasChartData(data);

  return (
    <Card elevation="md">
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        <h3>Performance</h3>
        <div>
          {timeframes.map((tf) => (
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

      {showChart ? (
        <div
          style={{
            height: 240,
            display: 'flex',
            alignItems: 'flex-end',
            gap: 4,
            padding: '16px 0',
          }}
        >
          {data.map((point) => {
            const maxVal = Math.max(...data.map((p) => p.value), 1);
            const pct = Math.max(4, (point.value / maxVal) * 100);
            return (
              <div
                key={point.date}
                title={`${point.date}: $${point.value.toLocaleString()}`}
                style={{
                  flex: 1,
                  minWidth: 4,
                  background: 'linear-gradient(180deg, #00ffa3 0%, #0057ff 100%)',
                  borderRadius: 4,
                  height: `${pct}%`,
                }}
              />
            );
          })}
        </div>
      ) : (
        <div
          style={{
            height: 240,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--color-surface)',
            borderRadius: 16,
            border: '1px dashed var(--color-border)',
            color: 'var(--color-textSecondary)',
            fontSize: 14,
          }}
        >
          <span style={{ marginBottom: 8 }}>Coming soon</span>
          <span style={{ fontSize: 12 }}>
            Connect your portfolio to see performance over time
          </span>
        </div>
      )}
    </Card>
  );
}; 