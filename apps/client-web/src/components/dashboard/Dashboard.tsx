import React from 'react';
import { WidgetMarketOverview } from './widgets/WidgetMarketOverview';
import { WidgetAnalytics } from './widgets/WidgetAnalytics';
import { WidgetPortfolio } from './widgets/WidgetPortfolio';
import { WidgetPluginMarketplace } from './widgets/WidgetPluginMarketplace';
import { WidgetMarketCorrelation } from './widgets/WidgetMarketCorrelation';
import { WidgetAdhocQuery } from './widgets/WidgetAdhocQuery';
import { WidgetMarketChart } from './widgets/WidgetMarketChart';
import { WidgetAnomalyChart } from './widgets/WidgetAnomalyChart';
import { WidgetForecastChart } from './widgets/WidgetForecastChart';
import { WidgetPluginAnalytics } from './widgets/WidgetPluginAnalytics';
import { WidgetCollabSidebar } from './widgets/WidgetCollabSidebar';
import { WidgetExport } from './widgets/WidgetExport';

export const Dashboard = () => (
  <div style={{
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
    gap: 32,
    padding: 32,
    background: 'linear-gradient(120deg, #F9F9F9 0%, #E5E5EA 100%)',
    minHeight: '100vh'
  }}>
    <WidgetMarketOverview />
    <WidgetAnalytics />
    <WidgetPortfolio />
    <WidgetPluginMarketplace />
    <WidgetMarketCorrelation />
    <WidgetAdhocQuery />
    <WidgetMarketChart />
    <WidgetAnomalyChart />
    <WidgetForecastChart />
    <WidgetPluginAnalytics />
    <WidgetCollabSidebar />
    <WidgetExport />
  </div>
); 