import React from 'react';
import { RedisSuiteButton } from 'src/design-system/components/Button/RedisSuiteButton';
import { RedisClusterStatus } from './RedisClusterStatus';
import { MemoryUsageChart } from './MemoryUsageChart';
import { ServiceIsolationPanel } from './ServiceIsolationPanel';
import { PluginPanel } from './PluginPanel';
import { SecurityPanel } from './SecurityPanel';
import { AIInsightsPanel } from './AIInsightsPanel';
import { CacheManagerPanel } from './CacheManagerPanel';
import { PubSubManagerPanel } from './PubSubManagerPanel';
import { LiveCacheAnalyticsPanel } from './LiveCacheAnalyticsPanel';
import { TracingPanel } from './TracingPanel';
import { PluginMarketplacePanel } from './PluginMarketplacePanel';
import { CustomUserDashboardPanel } from './CustomUserDashboardPanel';
import { LivePluginExecutionPanel } from './LivePluginExecutionPanel';
import { RealTracingIntegrationPanel } from './RealTracingIntegrationPanel';
import { UserProfilePanel } from './UserProfilePanel';
import { AIRecommendationsPanel } from './AIRecommendationsPanel';
import { CollaborativeDashboardPanel } from './CollaborativeDashboardPanel';
import { PluginCodeMarketplacePanel } from './PluginCodeMarketplacePanel';
import { AIRemediationPanel } from './AIRemediationPanel';
import { OpsCoPilotPanel } from './OpsCoPilotPanel';

export const RedisDashboard = () => (
  <div style={{ minHeight: '100vh', background: '#1A1A1A', color: '#FFFFFF', display: 'flex', flexDirection: 'column' }}>
    <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 24, borderBottom: '1px solid #23272F' }}>
      <h1 style={{ fontSize: 32, fontWeight: 'bold' }}>Coinet Redis Cluster</h1>
      <RedisSuiteButton>+ Add Node</RedisSuiteButton>
    </header>
    <main style={{ flex: 1, display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 32, padding: 32 }}>
      <section>
        <RedisClusterStatus />
        <MemoryUsageChart />
        <PluginPanel />
        <AIInsightsPanel />
        <CacheManagerPanel />
        <PubSubManagerPanel />
        <LiveCacheAnalyticsPanel />
        <TracingPanel />
        <PluginMarketplacePanel />
        <CustomUserDashboardPanel />
        <LivePluginExecutionPanel />
        <RealTracingIntegrationPanel />
        <UserProfilePanel />
        <AIRecommendationsPanel />
        <CollaborativeDashboardPanel />
        <PluginCodeMarketplacePanel />
        <AIRemediationPanel />
        <OpsCoPilotPanel />
      </section>
      <aside>
        <ServiceIsolationPanel />
        <SecurityPanel />
      </aside>
    </main>
  </div>
); 