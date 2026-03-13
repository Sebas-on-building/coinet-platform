import React from 'react';
import { Link } from 'react-router-dom';
import { usePortfolios } from './usePortfolios';

export function PortfolioList({ userId }: { userId: string }) {
  const { portfolios, isLoading, isError } = usePortfolios(userId);

  if (isLoading) return <div className="text-muted-foreground">Loading portfolios...</div>;
  if (isError) return <div className="text-destructive">Error loading portfolios.</div>;
  if (!portfolios || portfolios.length === 0) return <div className="text-muted-foreground">No portfolios found. Create one to get started.</div>;

  return (
    <div className="space-y-4">
      {portfolios.map((portfolio: any) => (
        <Link
          key={portfolio.id}
          to={`/portfolio/${portfolio.id}`}
          className="block p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="font-bold text-lg">{portfolio.name}</div>
              <div className="text-muted-foreground text-sm">ID: {portfolio.id}</div>
            </div>
            <span className="text-sm text-muted-foreground">View →</span>
          </div>
        </Link>
      ))}
    </div>
  );
} 