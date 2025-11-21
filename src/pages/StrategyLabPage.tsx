import React from 'react';
import { Card } from '@/components/ui/Card/Card';

const StrategyHeader = () => <Card>Strategy Lab Header</Card>;
const StrategyList = () => <Card>Strategy List</Card>;
const StrategyEditor = () => <Card>Strategy Editor</Card>;
const BacktestResults = () => <Card>Backtest Results</Card>;

const StrategyLabPage = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)', padding: 'var(--spacing-lg)' }}>
    <StrategyHeader />
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 'var(--spacing-lg)' }}>
      <StrategyList />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
        <StrategyEditor />
        <BacktestResults />
      </div>
    </div>
  </div>
);
export default StrategyLabPage; 