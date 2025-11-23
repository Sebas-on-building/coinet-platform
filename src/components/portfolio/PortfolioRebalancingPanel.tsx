import React from 'react';
import { Card } from '../atoms/Card';
import { Button } from '../atoms/Button';

interface Suggestion {
  symbol: string;
  percent: number;
}

interface Props {
  suggestions: Suggestion[];
  onExecute: (allocations: Suggestion[]) => void;
}

export const PortfolioRebalancingPanel: React.FC<Props> = ({ suggestions, onExecute }) => (
  <Card elevation="md">
    <h3>Rebalancing Suggestions</h3>
    <ul style={{ margin: '16px 0' }}>
      {suggestions.map(s => (
        <li key={s.symbol} style={{ marginBottom: 8 }}>
          <span style={{ fontWeight: 600 }}>{s.symbol}</span>: {s.percent}%
        </li>
      ))}
    </ul>
    <Button onClick={() => onExecute(suggestions)} disabled={!suggestions.length}>
      Execute Rebalance
    </Button>
  </Card>
); 