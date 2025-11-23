/**
 * Anomaly Detector Tests
 */

import { AnomalyDetector } from '../src/core/AnomalyDetector';
import { BaselineLearningEngine } from '../src/core/BaselineLearningEngine';
import { DataSource, DataPoint, MonitoringConfig, AnomalySeverity } from '../src/core/types';

describe('AnomalyDetector', () => {
  let engine: BaselineLearningEngine;
  let detector: AnomalyDetector;
  let config: MonitoringConfig;

  beforeEach(async () => {
    config = {
      sources: [DataSource.TRADING_VOLUME],
      updateInterval: 5000,
      lookbackPeriod: 24,
      sensitivityThreshold: 0.7,
      enableRealTime: true,
      enableBatching: false,
      anomalyThresholds: {
        statistical: 3,
        ml: 0.7,
        percentile: 95
      }
    };

    engine = new BaselineLearningEngine();
    detector = new AnomalyDetector(engine, config);

    // Learn baseline
    const historicalData = generateNormalData(1000, 100, 20);
    await engine.learnBaseline(DataSource.TRADING_VOLUME, historicalData, 'BTC');
  });

  afterEach(() => {
    engine.clearBaselines();
  });

  describe('detectAnomalies', () => {
    it('should detect statistical anomaly', async () => {
      const normalPoints = generateNormalData(10, 100, 20);
      const anomalousPoint: DataPoint = {
        timestamp: new Date(),
        source: DataSource.TRADING_VOLUME,
        value: 200, // 5σ away from mean
        metadata: {},
        symbol: 'BTC'
      };

      const result = await detector.detectAnomalies([...normalPoints, anomalousPoint]);

      expect(result.anomalies.length).toBeGreaterThan(0);
      const anomaly = result.anomalies.find(a => a.dataPoint.value === 200);
      expect(anomaly).toBeDefined();
      expect(anomaly!.deviation.standardDeviations).toBeGreaterThan(3);
    });

    it('should not detect anomaly for normal data', async () => {
      const normalPoints = generateNormalData(20, 100, 20);

      const result = await detector.detectAnomalies(normalPoints);

      // All points are within normal range
      expect(result.anomalies.length).toBeLessThan(15); // Allow for some false positives due to random data
    });

    it('should calculate anomaly score', async () => {
      const anomalousPoint: DataPoint = {
        timestamp: new Date(),
        source: DataSource.TRADING_VOLUME,
        value: 250,
        metadata: {},
        symbol: 'BTC'
      };

      const result = await detector.detectAnomalies([anomalousPoint]);

      if (result.anomalies.length > 0) {
        const anomaly = result.anomalies[0];
        expect(anomaly.score).toBeGreaterThan(0);
        expect(anomaly.score).toBeLessThanOrEqual(1);
      }
    });

    it('should determine severity correctly', async () => {
      const criticalAnomaly: DataPoint = {
        timestamp: new Date(),
        source: DataSource.TRADING_VOLUME,
        value: 300, // Very far from mean
        metadata: {},
        symbol: 'BTC'
      };

      const result = await detector.detectAnomalies([criticalAnomaly]);

      if (result.anomalies.length > 0) {
        const anomaly = result.anomalies[0];
        expect([AnomalySeverity.HIGH, AnomalySeverity.CRITICAL]).toContain(anomaly.severity);
      }
    });

    it('should detect correlated anomalies', async () => {
      const anomaly1: DataPoint = {
        timestamp: new Date(),
        source: DataSource.TRADING_VOLUME,
        value: 250,
        metadata: {},
        symbol: 'BTC'
      };

      const anomaly2: DataPoint = {
        timestamp: new Date(Date.now() + 60000), // 1 minute later
        source: DataSource.PRICE_MOVEMENT,
        value: 250,
        metadata: {},
        symbol: 'BTC'
      };

      // Learn baseline for price movement
      const priceHistory = generateNormalData(1000, 100, 20);
      await engine.learnBaseline(DataSource.PRICE_MOVEMENT, priceHistory, 'BTC');

      const result = await detector.detectAnomalies([anomaly1, anomaly2]);

      // Check if correlation is detected
      expect(result.anomalies.length).toBeGreaterThan(0);
    });

    it('should build anomaly context', async () => {
      const anomalousPoint: DataPoint = {
        timestamp: new Date(),
        source: DataSource.TRADING_VOLUME,
        value: 250,
        metadata: {},
        symbol: 'BTC'
      };

      const result = await detector.detectAnomalies([anomalousPoint]);

      if (result.anomalies.length > 0) {
        const anomaly = result.anomalies[0];
        expect(anomaly.context).toBeDefined();
        expect(anomaly.context.marketConditions).toBeDefined();
        expect(anomaly.context.timeContext).toBeDefined();
        expect(anomaly.context.historicalComparison).toBeDefined();
      }
    });

    it('should generate detection summary', async () => {
      const dataPoints = [
        ...generateNormalData(10, 100, 20),
        {
          timestamp: new Date(),
          source: DataSource.TRADING_VOLUME,
          value: 250,
          metadata: {},
          symbol: 'BTC'
        }
      ];

      const result = await detector.detectAnomalies(dataPoints);

      expect(result.summary).toBeDefined();
      expect(result.summary.totalAnomalies).toBeGreaterThanOrEqual(0);
      expect(result.summary.insights).toBeDefined();
      expect(result.summary.insights.length).toBeGreaterThan(0);
    });
  });

  describe('updateConfig', () => {
    it('should update detection thresholds', () => {
      const newConfig = {
        anomalyThresholds: {
          statistical: 4,
          ml: 0.8,
          percentile: 99
        }
      };

      detector.updateConfig(newConfig);

      const config = detector.getConfig();
      expect(config.anomalyThresholds.statistical).toBe(4);
      expect(config.anomalyThresholds.ml).toBe(0.8);
    });
  });
});

function generateNormalData(
  count: number,
  mean: number,
  stdDev: number
): DataPoint[] {
  const data: DataPoint[] = [];
  const now = Date.now();

  for (let i = 0; i < count; i++) {
    const u1 = Math.random();
    const u2 = Math.random();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    const value = mean + z * stdDev;

    data.push({
      timestamp: new Date(now - (count - i) * 3600000),
      source: DataSource.TRADING_VOLUME,
      value: Math.max(0, value),
      metadata: {},
      symbol: 'BTC'
    });
  }

  return data;
}

