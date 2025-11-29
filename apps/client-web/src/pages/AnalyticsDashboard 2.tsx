import { AnalyticsCanvas } from '../components/analytics/AnalyticsCanvas';
import { PluginMarketplace } from '../components/marketplace/PluginMarketplace';
import { AppleCanvaSolanaTheme } from '../design-system/themes/AppleCanvaSolanaTheme';

export default function AnalyticsDashboard() {
  return (
    <AppleCanvaSolanaTheme>
      <div className="flex h-screen">
        <PluginMarketplace />
        <AnalyticsCanvas />
      </div>
    </AppleCanvaSolanaTheme>
  );
} 