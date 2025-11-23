import React from 'react';
import { Card } from '../atoms/Card';

interface Props {
  volatility: number;
  correlation: number;
}

export const PortfolioRiskMetrics: React.FC<Props> = ({ volatility, correlation }) => (
  <Card elevation="md">
    <h3>Risk Metrics</h3>
    <div style={{ display: 'flex', gap: 32, marginTop: 16 }}>
      <div>
        <div style={{ fontWeight: 600 }}>Volatility</div>
        <div>{volatility.toFixed(2)}%</div>
      </div>
      <div>
        <div style={{ fontWeight: 600 }}>Correlation</div>
        <div>{correlation.toFixed(2)}</div>
      </div>
    </div>
  </Card>
); 