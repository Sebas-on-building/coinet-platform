/**
 * =========================================
 * DEFI PROTOCOL METRICS SERVICE
 * =========================================
 * Main entry point for the DeFi protocol metrics monitoring system
 */

// Core service
export { DeFiProtocolMetrics } from './DeFiProtocolMetrics';

// Protocol collectors
export { TVLMetricsCollector } from './protocols/tvl/TVLMetricsCollector';
export { YieldMetricsCollector } from './protocols/yields/YieldMetricsCollector';

// Anomaly detection
export { AnomalyDetector } from './anomaly-detection/AnomalyDetector';

// Signal generation
export { SignalGenerator } from './signals/SignalGenerator';

// Monitoring and utilities
export { Logger } from './utils/Logger';

// Types
export * from './types';
