import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getPortfolio } from '../api';
import PortfolioTable from '../components/PortfolioTable';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import ErrorMessage from '../components/ui/ErrorMessage';
import PortfolioTableSkeleton from '../components/ui/PortfolioTableSkeleton';
import PortfolioHoldings from '../components/portfolio/PortfolioHoldings';
import PortfolioPerformance from '../components/portfolio/PortfolioPerformance';
import PortfolioRisk from '../components/portfolio/PortfolioRisk';
import PortfolioAllocation from '../components/portfolio/PortfolioAllocation';
import PortfolioHistory from '../components/portfolio/PortfolioHistory';
import { Card } from '@/components/ui/Card/Card';

const userId = 'demo-user'; // Replace with real user ID from auth

const PortfolioHeader = () => <Card>Portfolio Header (Summary, Actions)</Card>;
const PortfolioTable = () => <Card>Portfolio Table</Card>;
const PortfolioAnalytics = () => <Card>Analytics</Card>;
const PortfolioActions = () => <Card>Actions (Deposit, Withdraw, etc.)</Card>;

const PortfolioPage = () => {
  const {
    data: portfolioData,
    error,
    isLoading,
    refetch,
    isFetching,
  } = useQuery(['portfolio', userId], () => getPortfolio(userId));

  if (isLoading || isFetching) {
    return (
      <>
        <PortfolioTableSkeleton />
        <PortfolioHoldings.Skeleton />
        <PortfolioPerformance.Skeleton />
        <PortfolioRisk.Skeleton />
        <PortfolioAllocation.Skeleton />
        <PortfolioHistory.Skeleton />
      </>
    );
  }
  if (error) {
    return <ErrorMessage message={error.message || 'Failed to load portfolio.'} onRetry={refetch} details={error.stack} />;
  }
  const assets = portfolioData?.data || [];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--spacing-lg)', padding: 'var(--spacing-lg)' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
        <PortfolioHeader />
        <PortfolioTable assets={assets} />
        <PortfolioAnalytics />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
        <PortfolioActions />
      </div>
    </div>
  );
};

export default PortfolioPage; 