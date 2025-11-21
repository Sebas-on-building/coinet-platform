import React from 'react';
import tokens from 'src/design-system/tokens';
import { PluginReviewModerationPanel } from './PluginReviewModerationPanel';
import { PluginAnalyticsChart } from './PluginAnalyticsChart';
import { PluginAnalyticsBar } from './PluginAnalyticsBar';
import { PluginAnalyticsPie } from './PluginAnalyticsPie';
import { PluginAnalyticsCohort } from './PluginAnalyticsCohort';
import { PluginAnalyticsRetention } from './PluginAnalyticsRetention';
import { PluginSecurityAuditHistory } from './PluginSecurityAuditHistory';

export interface AdminDashboardProps {
  pluginId: string;
  theme?: 'light' | 'dark';
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ pluginId, theme = 'light' }) => (
  <div style={{ width: '100%', padding: tokens.spacing.lg, background: tokens.colors.background[theme], minHeight: 600 }}>
    <h2 style={{ color: tokens.colors.text[theme], fontWeight: 800, fontSize: 28, marginBottom: tokens.spacing.lg }}>Admin Dashboard</h2>
    <section style={{ marginBottom: tokens.spacing.lg }}>
      <h3 style={{ color: tokens.colors.text[theme], fontWeight: 700, marginBottom: tokens.spacing.sm }}>Review Moderation</h3>
      <PluginReviewModerationPanel pluginId={pluginId} theme={theme} />
    </section>
    <section style={{ marginBottom: tokens.spacing.lg }}>
      <h3 style={{ color: tokens.colors.text[theme], fontWeight: 700, marginBottom: tokens.spacing.sm }}>Analytics: Installs Over Time</h3>
      <PluginAnalyticsChart pluginId={pluginId} theme={theme} />
    </section>
    <section style={{ marginBottom: tokens.spacing.lg }}>
      <h3 style={{ color: tokens.colors.text[theme], fontWeight: 700, marginBottom: tokens.spacing.sm }}>Analytics: Installs by Country</h3>
      <PluginAnalyticsBar pluginId={pluginId} theme={theme} />
    </section>
    <section style={{ marginBottom: tokens.spacing.lg }}>
      <h3 style={{ color: tokens.colors.text[theme], fontWeight: 700, marginBottom: tokens.spacing.sm }}>Analytics: Installs by Device</h3>
      <PluginAnalyticsPie pluginId={pluginId} theme={theme} />
    </section>
    <section style={{ marginBottom: tokens.spacing.lg }}>
      <h3 style={{ color: tokens.colors.text[theme], fontWeight: 700, marginBottom: tokens.spacing.sm }}>Analytics: Cohort Retention</h3>
      <PluginAnalyticsCohort pluginId={pluginId} theme={theme} />
    </section>
    <section style={{ marginBottom: tokens.spacing.lg }}>
      <h3 style={{ color: tokens.colors.text[theme], fontWeight: 700, marginBottom: tokens.spacing.sm }}>Analytics: Retention Curve</h3>
      <PluginAnalyticsRetention pluginId={pluginId} theme={theme} />
    </section>
    <section>
      <h3 style={{ color: tokens.colors.text[theme], fontWeight: 700, marginBottom: tokens.spacing.sm }}>Security Audit History</h3>
      <PluginSecurityAuditHistory pluginId={pluginId} theme={theme} />
    </section>
  </div>
); 