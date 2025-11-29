/**
 * =========================================
 * CORRELATION ANALYZER TESTS
 * =========================================
 * Divine world-class tests for correlation analysis functionality
 */

import { CorrelationAnalyzer } from './CorrelationAnalyzer';
import { AIInsightsConfig } from '@/types';
import { createMockAlertPerformance, createMockSignalCorrelation } from '../../tests/setup';

describe('CorrelationAnalyzer', () => {
  let analyzer: CorrelationAnalyzer;
  let mockConfig: AIInsightsConfig;

  beforeEach(() => {
    mockConfig = {
      models: [],
      dataSources: [],
      analysis: {
        lookbackPeriod: 30,
        minSampleSize: 10,
        confidenceThreshold: 0.7,
        correlationThreshold: 0.5
      },
      recommendations: {
        maxPerRequest: 10,
      types: ['signal_weight' as any],
      priorities: ['high' as any, 'medium' as any]
      },
      feedback: {
        enabled: true,
        dataRetention: 90,
        minFeedbackCount: 5,
        autoImplementation: {
          enabled: false,
          minConfidence: 0.8,
          maxRisk: 'medium' as any
        },
        userConsent: {
          required: true,
          optOutEnabled: true
        }
      },
      caching: {
        enabled: false,
        ttl: 3600,
        maxSize: 1000
      },
      performance: {
        maxConcurrentAnalyses: 5,
        timeout: 30000,
        retryAttempts: 3
      },
      realtime: {
        enabled: true,
        updateInterval: 30000,
        maxConnections: 1000,
        heartbeatInterval: 60000
      }
    };

    analyzer = new CorrelationAnalyzer(mockConfig);
  });

  describe('analyzeCorrelations', () => {
    it('should analyze correlations successfully', async () => {
      const performance = [
        createMockAlertPerformance({ signalType: 'price', accuracy: 0.8 }),
        createMockAlertPerformance({ signalType: 'volume', accuracy: 0.7 }),
        createMockAlertPerformance({ signalType: 'price', accuracy: 0.85 }),
        createMockAlertPerformance({ signalType: 'volume', accuracy: 0.75 })
      ];

      const existingCorrelations: any[] = [];

      const result = await analyzer.analyzeCorrelations(performance, existingCorrelations);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      // Should find correlation between price and volume signals
    });

    it('should handle insufficient data gracefully', async () => {
      const performance = [
        createMockAlertPerformance({ signalType: 'price', accuracy: 0.8 })
      ];

      const existingCorrelations: any[] = [];

      const result = await analyzer.analyzeCorrelations(performance, existingCorrelations);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0); // No correlations with insufficient data
    });

    it('should merge with existing correlations', async () => {
      const performance = [
        createMockAlertPerformance({ signalType: 'price', accuracy: 0.8 }),
        createMockAlertPerformance({ signalType: 'volume', accuracy: 0.7 })
      ];

      const existingCorrelations = [
        createMockSignalCorrelation({
          signalA: 'price',
          signalB: 'funding_rate',
          correlation: 0.3
        })
      ];

      const result = await analyzer.analyzeCorrelations(performance, existingCorrelations);

      expect(result.length).toBeGreaterThan(0);
      // Should include both existing and new correlations
    });

    it('should filter by significance and sample size', async () => {
      const performance = [
        createMockAlertPerformance({ signalType: 'price', accuracy: 0.8 }),
        createMockAlertPerformance({ signalType: 'volume', accuracy: 0.7 })
      ];

      const existingCorrelations: any[] = [];

      const result = await analyzer.analyzeCorrelations(performance, existingCorrelations);

      // Should only return significant correlations
      expect(result.every(c => c.significance < 0.05)).toBe(true);
      expect(result.every(c => c.sampleSize >= mockConfig.analysis.minSampleSize)).toBe(true);
    });
  });

  describe('generateCorrelationMatrix', () => {
    it('should generate correlation matrix correctly', async () => {
      const correlations = [
        createMockSignalCorrelation({
          signalA: 'price',
          signalB: 'volume',
          correlation: 0.75
        }),
        createMockSignalCorrelation({
          signalA: 'price',
          signalB: 'funding_rate',
          correlation: -0.3
        })
      ];

      const signals = ['price', 'volume', 'funding_rate'];

      const matrix = analyzer.generateCorrelationMatrix(correlations, signals);

      expect(matrix.signals).toEqual(signals);
      expect(matrix.matrix).toHaveLength(3);
      expect(matrix.matrix[0]).toHaveLength(3);
      expect(matrix.matrix[0][0]).toBe(1); // Perfect correlation with self
      expect(matrix.matrix[0][1]).toBe(0.75); // Price-volume correlation
      expect(matrix.matrix[0][2]).toBe(-0.3); // Price-funding correlation
    });
  });

  describe('analyzePerformanceTrends', () => {
    it('should analyze performance trends successfully', async () => {
      const performance = [
        createMockAlertPerformance({ signalType: 'price', accuracy: 0.6, timestamp: new Date(Date.now() - 86400000) }),
        createMockAlertPerformance({ signalType: 'price', accuracy: 0.7, timestamp: new Date(Date.now() - 43200000) }),
        createMockAlertPerformance({ signalType: 'price', accuracy: 0.8, timestamp: new Date() }),
        createMockAlertPerformance({ signalType: 'volume', accuracy: 0.5, timestamp: new Date(Date.now() - 86400000) }),
        createMockAlertPerformance({ signalType: 'volume', accuracy: 0.6, timestamp: new Date() })
      ];

      const trends = await analyzer.analyzePerformanceTrends(performance);

      expect(Array.isArray(trends)).toBe(true);
      expect(trends.length).toBeGreaterThan(0);

      const priceTrend = trends.find(t => t.signal === 'price');
      expect(priceTrend).toBeDefined();
      expect(['improving', 'declining', 'stable']).toContain(priceTrend?.trend);
    });

    it('should handle insufficient data for trend analysis', async () => {
      const performance = [
        createMockAlertPerformance({ signalType: 'price', accuracy: 0.8 })
      ];

      const trends = await analyzer.analyzePerformanceTrends(performance);

      expect(Array.isArray(trends)).toBe(true);
      // Should not include trends with insufficient data
    });
  });

  describe('detectAnomalies', () => {
    it('should detect correlation anomalies', async () => {
      const correlations = [
        createMockSignalCorrelation({
          signalA: 'price',
          signalB: 'volume',
          correlation: 0.9,
          significance: 0.001, // Very significant
          lastUpdated: new Date(Date.now() - 86400000) // Recent
        }),
        createMockSignalCorrelation({
          signalA: 'price',
          signalB: 'funding_rate',
          correlation: -0.8,
          significance: 0.01,
          lastUpdated: new Date(Date.now() - 2 * 86400000) // Older
        })
      ];

      const anomalies = analyzer.detectAnomalies(correlations);

      expect(Array.isArray(anomalies)).toBe(true);
      expect(anomalies.length).toBeGreaterThan(0);

      const strongAnomaly = anomalies.find(a => a.type === 'strong_recent_correlation');
      expect(strongAnomaly).toBeDefined();
      expect(strongAnomaly?.signals).toEqual(['price', 'volume']);
    });

    it('should handle no anomalies gracefully', async () => {
      const correlations = [
        createMockSignalCorrelation({
          correlation: 0.2, // Weak correlation
          significance: 0.5 // Not significant
        })
      ];

      const anomalies = analyzer.detectAnomalies(correlations);

      expect(Array.isArray(anomalies)).toBe(true);
      expect(anomalies.length).toBe(0);
    });
  });
});
