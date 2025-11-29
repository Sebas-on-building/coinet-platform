/**
 * ============================================
 * MONITORING MODULE EXPORTS
 * ============================================
 * 
 * Enterprise-grade monitoring components:
 * - Prometheus metrics
 * - DeFi-specific metrics
 * - Alert management
 */

// Prometheus Metrics
export {
  PrometheusMetrics,
  getPrometheusMetrics,
  createMetricsHandler,
  type MetricType,
  type MetricDefinition,
  type MetricValue,
  type HistogramBucket,
} from './prometheus-metrics';

// Import for default export
import { PrometheusMetrics } from './prometheus-metrics';

// DeFi Metrics
export {
  DefiMetrics,
  getDefiMetrics,
  resetDefiMetrics,
} from './defi-metrics';

// Import for default export
import { DefiMetrics } from './defi-metrics';

// Alert Manager
export {
  AlertManager,
  getAlertManager,
  resetAlertManager,
  type Alert,
  type AlertRule,
  type AlertCondition,
  type NotificationChannel,
  type AlertConfig,
  type AlertSeverity,
  type AlertStatus,
} from './alert-manager';

// Import for default export
import { AlertManager } from './alert-manager';

// Notification Channels
export {
  buildNotificationChannels,
  buildSlackChannel,
  buildPagerDutyChannel,
  buildWebhookChannel,
  sendSlackNotification,
  sendPagerDutyNotification,
  sendWebhookNotification,
  formatSlackAlert,
  formatPagerDutyAlert,
  type SlackConfig,
  type PagerDutyConfig,
  type WebhookConfig,
} from './notification-channels';

// Unlock Metrics
export {
  UnlockMetrics,
  getUnlockMetrics,
  resetUnlockMetrics,
  type PredictionMetric,
  type VerificationMetric,
  type SourceMetric,
  type ConsensusMetric,
  type UnlockMetricConfig,
} from './unlock-metrics';

// Import for default export
import { UnlockMetrics } from './unlock-metrics';

export default {
  PrometheusMetrics,
  DefiMetrics,
  AlertManager,
  UnlockMetrics,
};

