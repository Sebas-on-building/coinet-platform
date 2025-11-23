import React from 'react';
import { Card } from '@/components/ui/Card/Card';

const ChartHeader = () => <Card>Chart Header (Symbol, Timeframe, Actions)</Card>;
const MainChart = () => <Card>Main Chart (TradingView, etc.)</Card>;
const ChartIndicators = () => <Card>Indicators</Card>;
const ChartTrades = () => <Card>Recent Trades</Card>;
const ChartSettings = () => <Card>Chart Settings</Card>;

const ChartPage = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)', padding: 'var(--spacing-lg)' }}>
    <ChartHeader />
    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--spacing-lg)' }}>
      <MainChart />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
        <ChartIndicators />
        <ChartTrades />
        <ChartSettings />
      </div>
    </div>
  </div>
);
export default ChartPage; 