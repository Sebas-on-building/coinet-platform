import React from 'react';
import { Card } from '@/components/ui/Card/Card';

const OverviewCard = () => <Card>Overview: Portfolio Value, P&L, etc.</Card>;
const LatestNews = () => <Card>Latest News</Card>;
const MiniChart = () => <Card>Mini Chart</Card>;
const PortfolioTable = () => <Card>Portfolio Table</Card>;
const AlertsList = () => <Card>Alerts List</Card>;

const DashboardPage = () => (
  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--spacing-lg)', padding: 'var(--spacing-lg)' }}>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
      <OverviewCard />
      <MiniChart />
      <PortfolioTable />
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
      <LatestNews />
      <AlertsList />
    </div>
  </div>
);
export default DashboardPage; 