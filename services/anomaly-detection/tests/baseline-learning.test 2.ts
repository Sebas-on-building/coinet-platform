/**
 * Baseline Learning Engine Tests
 */

import { BaselineLearningEngine } from '../src/core/BaselineLearningEngine';
import { DataSource, DataPoint } from '../src/core/types';

describe('BaselineLearningEngine', () => {
  let engine: BaselineLearningEngine;

  beforeEach(() => {
    engine = new BaselineLearningEngine();
  });

  afterEach(() => {
    engine.clearBaselines();
  });

  describe('learnBaseline', () => {
    it('should learn baseline from historical data', async () => {
      const historicalData: DataPoint[] = generateNormalData(1000, 100, 20);

      const baseline = await engine.learnBaseline(
        DataSource.TRADING_VOLUME,
        historicalData,
        'BTC'
      );

      expect(baseline.source).toBe(DataSource.TRADING_VOLUME);
      expect(baseline.symbol).toBe('BTC');
      expect(baseline.mean).toBeGreaterThan(95);
      expect(baseline.mean).toBeLessThan(105);
      expect(baseline.standardDeviation).toBeGreaterThan(0);
      expect(baseline.sampleSize).toBe(1000);
      expect(baseline.percentiles).toBeDefined();
      expect(baseline.percentiles.p50).toBeGreaterThan(95);
      expect(baseline.percentiles.p50).toBeLessThan(105);
    });

    it('should throw error with insufficient data', async () => {
      const insufficientData: DataPoint[] = generateNormalData(50, 100, 20);

      await expect(
        engine.learnBaseline(DataSource.TRADING_VOLUME, insufficientData)
      ).rejects.toThrow('Insufficient data');
    });

    it('should detect seasonal patterns', async () => {
      const dataWithPattern: DataPoint[] = generateSeasonalData(1000, 100, 20, 24);

      const baseline = await engine.learnBaseline(
        DataSource.TRADING_VOLUME,
        dataWithPattern,
        'ETH'
      );

      expect(baseline.seasonalPatterns).toBeDefined();
      expect(baseline.seasonalPatterns!.length).toBeGreaterThan(0);
    });

    it('should calculate confidence intervals', async () => {
      const historicalData: DataPoint[] = generateNormalData(500, 100, 15);

      const baseline = await engine.learnBaseline(
        DataSource.PRICE_MOVEMENT,
        historicalData
      );

      expect(baseline.confidenceInterval.lower).toBeLessThan(baseline.mean);
      expect(baseline.confidenceInterval.upper).toBeGreaterThan(baseline.mean);
      expect(baseline.confidenceInterval.upper - baseline.confidenceInterval.lower).toBeGreaterThan(0);
    });
  });

  describe('updateBaseline', () => {
    it('should update baseline with new data', async () => {
      const initialData: DataPoint[] = generateNormalData(1000, 100, 20);
      await engine.learnBaseline(DataSource.TRADING_VOLUME, initialData, 'BTC');

      const newData: DataPoint[] = generateNormalData(100, 120, 20);
      const update = await engine.updateBaseline(
        DataSource.TRADING_VOLUME,
        newData,
        'BTC'
      );

      expect(update.baselineUpdates).toBeGreaterThanOrEqual(0);
      expect(update.timestamp).toBeInstanceOf(Date);
    });

    it('should not update if change is insignificant', async () => {
      const initialData: DataPoint[] = generateNormalData(1000, 100, 20);
      await engine.learnBaseline(DataSource.TRADING_VOLUME, initialData, 'BTC');

      const newData: DataPoint[] = generateNormalData(5, 101, 20);
      const update = await engine.updateBaseline(
        DataSource.TRADING_VOLUME,
        newData,
        'BTC'
      );

      expect(update.baselineUpdates).toBe(0);
    });
  });

  describe('getBaseline', () => {
    it('should retrieve learned baseline', async () => {
      const historicalData: DataPoint[] = generateNormalData(1000, 100, 20);
      const learned = await engine.learnBaseline(
        DataSource.SENTIMENT,
        historicalData,
        'BTC'
      );

      const retrieved = engine.getBaseline(DataSource.SENTIMENT, 'BTC');

      expect(retrieved).toBeDefined();
      expect(retrieved?.mean).toBe(learned.mean);
      expect(retrieved?.standardDeviation).toBe(learned.standardDeviation);
    });

    it('should return undefined for non-existent baseline', () => {
      const baseline = engine.getBaseline(DataSource.TRADING_VOLUME, 'XYZ');
      expect(baseline).toBeUndefined();
    });
  });

  describe('getAllBaselines', () => {
    it('should return all learned baselines', async () => {
      await engine.learnBaseline(
        DataSource.TRADING_VOLUME,
        generateNormalData(1000, 100, 20),
        'BTC'
      );
      await engine.learnBaseline(
        DataSource.SENTIMENT,
        generateNormalData(1000, 0, 0.5),
        'ETH'
      );

      const baselines = engine.getAllBaselines();

      expect(baselines.size).toBe(2);
    });
  });
});

// Helper functions
function generateNormalData(
  count: number,
  mean: number,
  stdDev: number
): DataPoint[] {
  const data: DataPoint[] = [];
  const now = Date.now();

  for (let i = 0; i < count; i++) {
    // Box-Muller transform for normal distribution
    const u1 = Math.random();
    const u2 = Math.random();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    const value = mean + z * stdDev;

    data.push({
      timestamp: new Date(now - (count - i) * 3600000),
      source: DataSource.TRADING_VOLUME,
      value: Math.max(0, value),
      metadata: {}
    });
  }

  return data;
}

function generateSeasonalData(
  count: number,
  baseMean: number,
  stdDev: number,
  period: number
): DataPoint[] {
  const data: DataPoint[] = [];
  const now = Date.now();

  for (let i = 0; i < count; i++) {
    const seasonal = Math.sin((i / period) * 2 * Math.PI) * 20;
    const noise = (Math.random() - 0.5) * stdDev;
    const value = baseMean + seasonal + noise;

    data.push({
      timestamp: new Date(now - (count - i) * 3600000),
      source: DataSource.TRADING_VOLUME,
      value: Math.max(0, value),
      metadata: {}
    });
  }

  return data;
}

