import React from 'react';
import { Routes, Route, Navigate, useParams } from 'react-router-dom';
import { PortfolioHeader } from '../components/portfolio/PortfolioHeader';
import { PortfolioList } from '../components/portfolio/PortfolioList';
import { PortfolioPanel } from '../components/portfolio/PortfolioPanel';
import { useAuth } from '../components/auth/AuthProvider';

/** Placeholder for features not yet implemented — clear "Coming soon" UX */
function ComingSoonPanel({ title, description }: { title: string; description?: string }) {
  return (
    <div className="p-8 rounded-2xl bg-muted/50 border border-border text-center max-w-md mx-auto">
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground">
        {description ?? 'This feature is in development. Check back soon.'}
      </p>
    </div>
  );
}

function PortfolioOverview() {
  const { user } = useAuth();
  if (!user?.id) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Sign in to view your portfolios.
      </div>
    );
  }
  return (
    <div className="space-y-6">
      <PortfolioList userId={user.id} />
    </div>
  );
}

function PortfolioDetailView() {
  const { portfolioId } = useParams<{ portfolioId: string }>();
  if (!portfolioId) return <Navigate to="/portfolio" replace />;
  return <PortfolioPanel portfolioId={portfolioId} />;
}

export const PortfolioPage = () => (
  <div className="container py-6 space-y-6">
    <PortfolioHeader />
    <Routes>
      <Route path="/" element={<PortfolioOverview />} />
      <Route
        path="holdings/*"
        element={
          <ComingSoonPanel
            title="Holdings"
            description="View and manage your portfolio holdings. Connect your portfolio to get started."
          />
        }
      />
      <Route
        path="performance/*"
        element={
          <ComingSoonPanel
            title="Performance"
            description="Track portfolio performance over time with charts and metrics."
          />
        }
      />
      <Route
        path="risk/*"
        element={
          <ComingSoonPanel
            title="Risk Analysis"
            description="Portfolio risk analytics and volatility metrics."
          />
        }
      />
      <Route
        path="allocation/*"
        element={
          <ComingSoonPanel
            title="Allocation"
            description="Asset allocation breakdown and rebalancing suggestions."
          />
        }
      />
      <Route
        path="history/*"
        element={
          <ComingSoonPanel
            title="History"
            description="Transaction history and portfolio timeline."
          />
        }
      />
      <Route path="/:portfolioId" element={<PortfolioDetailView />} />
      <Route path="*" element={<Navigate to="/portfolio" replace />} />
    </Routes>
  </div>
);
