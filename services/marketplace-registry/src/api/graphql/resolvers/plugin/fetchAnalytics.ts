import { AnalyticsService } from '../../../services/plugin/AnalyticsService';

interface Context {
  auth: any;
  analytics: any;
}

export const fetchAnalytics = async (
  _: any,
  { pluginId }: { pluginId: string },
  context: Context
) => {
  context.auth.require('analytics:read');
  context.analytics.track('analytics_fetch', { pluginId });
  // Sub-feature: custom events, retention, AB tests, etc.
  return AnalyticsService.getAnalytics(pluginId);
}; 