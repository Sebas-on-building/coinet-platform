/**
 * =========================================
 * ANOMALY DETECTION TYPES
 * =========================================
 * Type definitions for the anomaly detection system
 */

import type { SignalType } from '../types';

export interface AnomalyConfig {
  // Supported signal types for anomaly detection
  signalTypes: SignalType[];

  // Time windows for rolling statistics (in seconds)
  windowSizes: number[];

  // Outlier threshold for cleaning data before statistics
  outlierThreshold: number;

  // Maximum age of time buckets to keep in memory (in seconds)
  maxBucketAge: number;

  // Signal-specific configurations
  signalConfigs: Record<SignalType, SignalAnomalyConfig>;
}

export interface SignalAnomalyConfig {
  // Z-score threshold for anomaly detection
  zScoreThreshold: number;

  // Multi-level severity thresholds
  lowThreshold: number;
  mediumThreshold: number;
  highThreshold: number;
  criticalThreshold: number;

  // Sustained anomaly detection
  sustainedPeriod: number; // seconds
  minSustainedCount: number; // minimum detections for sustained anomaly

  // Alert configuration
  immediateAlert: boolean; // whether to alert on single detection
  alertChannels: string[]; // notification channels
  cooldownPeriod: number; // minimum time between alerts (seconds)

  // Domain-specific filters
  domainFilters: {
    // Time-based filters
    businessHoursOnly?: boolean;
    excludeWeekends?: boolean;

    // Value-based filters
    minValue?: number;
    maxValue?: number;

    // Volatility filters
    maxVolatility?: number;
    minVolatility?: number;
  };
}

export interface RollingStatistics {
  type: SignalType;
  windows: Map<number, RollingWindow>;
  lastUpdate: Date;
  dataPoints: number;
}

export interface RollingWindow {
  windowSize: number;
  values: Array<{ value: number; timestamp: Date }>;
  mean: number;
  stdDev: number;
  outliers: Array<{ value: number; timestamp: Date }>;
  lastUpdate: Date;
}

export interface TimeBucket {
  bucketKey: number;
  signals: any[]; // NormalizedSignal array
  startTime: Date;
  endTime: Date;
}

export interface AnomalyEvent {
  id: string;
  signalId: string;
  signalType: SignalType;
  timestamp: Date;
  zScore: number;
  threshold: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  isSustained: boolean;
  sustainedCount: number;
  sustainedPeriod: number;

  context: {
    signalSnapshot: {
      type: SignalType;
      timestamp: Date;
      normalizedValues: Record<string, number>;
      confidence: number;
    };
    statistics: {
      mean: number;
      stdDev: number;
      dataPoints: number;
    } | null;
    thresholds: SignalAnomalyConfig;
    explanation: string;
  };
}

export interface AnomalyMetrics {
  totalAnomalies: number;
  anomaliesByType: Record<SignalType, number>;
  anomaliesBySeverity: Record<string, number>;
  averageZScore: number;
  sustainedAnomalyRate: number;
  falsePositiveRate: number;
  detectionLatency: number; // milliseconds
}

export interface AnomalyFilter {
  signalTypes?: SignalType[];
  severityLevels?: Array<'low' | 'medium' | 'high' | 'critical'>;
  sustainedOnly?: boolean;
  timeRange?: {
    start: Date;
    end: Date;
  };
  minZScore?: number;
  maxZScore?: number;
}

export interface AnomalyReport {
  id: string;
  timestamp: Date;
  period: {
    start: Date;
    end: Date;
  };
  summary: {
    totalAnomalies: number;
    uniqueSignals: number;
    severityBreakdown: Record<string, number>;
    typeBreakdown: Record<SignalType, number>;
  };
  topAnomalies: AnomalyEvent[];
  trends: {
    anomalyRate: number; // anomalies per hour
    severityTrend: Array<{ timestamp: Date; count: number; severity: string }>;
    typeTrends: Record<SignalType, Array<{ timestamp: Date; count: number }>>;
  };
  recommendations: string[];
}
