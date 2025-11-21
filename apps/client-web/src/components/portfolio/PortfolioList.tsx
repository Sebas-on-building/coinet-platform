import React from 'react';
import { usePortfolios } from './usePortfolios';

export function PortfolioList({ userId }: { userId: string }) {
  const { portfolios, isLoading, isError } = usePortfolios(userId);

  if (isLoading) return <div>Loading portfolios...</div>;
  if (isError) return <div>Error loading portfolios.</div>;
  if (!portfolios || portfolios.length === 0) return <div>No portfolios found.</div>;

  return (
    <div className="space-y-4">
      {portfolios.map((portfolio: any) => (
        <div key={portfolio.id} className="p-4 bg-white rounded shadow flex items-center justify-between">
          <div>
            <div className="font-bold text-lg">{portfolio.name}</div>
            <div className="text-gray-500 text-sm">ID: {portfolio.id}</div>
          </div>
          {/* Add actions for edit/delete here */}
        </div>
      ))}
    </div>
  );
} 