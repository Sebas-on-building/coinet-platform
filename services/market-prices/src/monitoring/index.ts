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

// DeFi Metrics
export {
  DefiMetrics,
  getDefiMetrics,
  resetDefiMetrics,
} from './defi-metrics';

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

export default {
  PrometheusMetrics,
  DefiMetrics,
  AlertManager,
};

