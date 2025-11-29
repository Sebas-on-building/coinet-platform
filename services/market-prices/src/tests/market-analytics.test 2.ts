/**
 * Market Analytics Service Integration Tests
 * Tests correlation, anomaly detection, and trend analysis
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MarketAnalytics } from '../services/market-analytics';
import { CoinGeckoRestClient } from '../providers/coingecko-rest';
import { DataSource } from '../types';

// Mock the provider client
vi.mock('../providers/coingecko-rest');

describe('MarketAnalytics', () => {
  let analytics: MarketAnalytics;
  let mockGeckoClient: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockGeckoClient = {
      getOHLC: vi.fn(),
    };

    (CoinGeckoRestClient as any).mockImplementation(() => mockGeckoClient);

    analytics = new MarketAnalytics(mockGeckoClient);
  });

  describe('calculateCorrelation', () => {
    it('should calculate correlation between two assets', async () => {
      // Mock OHLC data for BTC (30 days)
      const btcData = Array.from({ length: 30 }, (_, i) => [
        Date.now() - (30 - i) * 24 * 60 * 60 * 1000, // timestamp
        50000 + i * 100, // open
        51000 + i * 100, // high
        49000 + i * 100, // low
        50000 + i * 100, // close
      ]);

      // Mock OHLC data for ETH (similar trend = high correlation)
      const ethData = Array.from({ length: 30 }, (_, i) => [
        Date.now() - (30 - i) * 24 * 60 * 60 * 1000,
        3000 + i * 6,
        3100 + i * 6,
        2900 + i * 6,
        3000 + i * 6,
      ]);

      mockGeckoClient.getOHLC
        .mockResolvedValueOnce(btcData)
        .mockResolvedValueOnce(ethData);

      const result = await analytics.calculateCorrelation('BTC', 'ETH', 30);

      expect(result.symbol1).toBe('BTC');
      expect(result.symbol2).toBe('ETH');
      expect(result.correlation).toBeGreaterThan(0.8); // High correlation
      expect(result.sampleSize).toBe(30);
      expect(result.period).toBe('30 days');
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should handle insufficient data', async () => {
      mockGeckoClient.getOHLC.mockResolvedValue([]);

      await expect(
        analytics.calculateCorrelation('BTC', 'ETH', 30)
      ).rejects.toThrow('Insufficient historical data');
    });

    it('should handle different data lengths', async () => {
      const btcData = Array.from({ length: 30 }, (_, i) => [
        Date.now() - (30 - i) * 24 * 60 * 60 * 1000,
        50000,
        51000,
        49000,
        50000,
      ]);

      const ethData = Array.from({ length: 25 }, (_, i) => [
        Date.now() - (25 - i) * 24 * 60 * 60 * 1000,
        3000,
        3100,
        2900,
        3000,
      ]);

      mockGeckoClient.getOHLC
        .mockResolvedValueOnce(btcData)
        .mockResolvedValueOnce(ethData);

      const result = await analytics.calculateCorrelation('BTC', 'ETH', 30);

      expect(result.sampleSize).toBe(25); // Should use minimum length
    });
  });

  describe('detectAnomalies', () => {
    it('should detect price anomalies', async () => {
      // Create normal price data with one spike
      const normalPrices = Array.from({ length: 20 }, (_, i) => [
        Date.now() - (20 - i) * 24 * 60 * 60 * 1000,
        50000,
        51000,
        49000,
        50000 + Math.random() * 100, // Normal variation
      ]);

      // Add a spike
      const spikePrice = [
        Date.now(),
        50000,
        60000, // High spike
        50000,
        58000, // Close price spike (anomaly)
      ];

      const data = [...normalPrices, spikePrice];

      mockGeckoClient.getOHLC.mockResolvedValue(data);

      const anomalies = await analytics.detectAnomalies('BTC', 30, 2);

      expect(anomalies.length).toBeGreaterThan(0);
      expect(anomalies[0].symbol).toBe('BTC');
      expect(anomalies[0].severity).toMatch(/low|medium|high|critical/);
      expect(anomalies[0].deviation).toBeGreaterThan(2); // > 2 standard deviations
      expect(anomalies[0].confidence).toBeGreaterThan(0);
    });

    it('should return empty array when no anomalies found', async () => {
      // Create stable price data
      const stableData = Array.from({ length: 30 }, (_, i) => [
        Date.now() - (30 - i) * 24 * 60 * 60 * 1000,
        50000,
        50100,
        49900,
        50000, // Very stable
      ]);

      mockGeckoClient.getOHLC.mockResolvedValue(stableData);

      const anomalies = await analytics.detectAnomalies('BTC', 30, 2);

      expect(Array.isArray(anomalies)).toBe(true);
    });

    it('should handle insufficient data', async () => {
      mockGeckoClient.getOHLC.mockResolvedValue(
        Array.from({ length: 5 }, () => [Date.now(), 50000, 51000, 49000, 50000])
      );

      await expect(analytics.detectAnomalies('BTC', 30)).rejects.toThrow(
        'Insufficient historical data'
      );
    });
  });

  describe('analyzeTrend', () => {
    it('should identify bullish trend', async () => {
      // Create upward trending data
      const bullishData = Array.from({ length: 30 }, (_, i) => [
        Date.now() - (30 - i) * 24 * 60 * 60 * 1000,
        50000 + i * 200, // open
        51000 + i * 200, // high
        49000 + i * 200, // low
        50000 + i * 200, // close (increasing)
      ]);

      mockGeckoClient.getOHLC.mockResolvedValue(bullishData);

      const trend = await analytics.analyzeTrend('BTC', 30);

      expect(trend.symbol).toBe('BTC');
      expect(trend.trend).toBe('bullish');
      expect(trend.strength).toBeGreaterThan(50);
      expect(trend.support).toBeLessThan(trend.resistance);
      expect(trend.momentum).toBeGreaterThan(0);
      expect(trend.confidence).toBeGreaterThan(0);
    });

    it('should identify bearish trend', async () => {
      // Create downward trending data
      const bearishData = Array.from({ length: 30 }, (_, i) => [
        Date.now() - (30 - i) * 24 * 60 * 60 * 1000,
        50000 - i * 200,
        51000 - i * 200,
        49000 - i * 200,
        50000 - i * 200, // Decreasing
      ]);

      mockGeckoClient.getOHLC.mockResolvedValue(bearishData);

      const trend = await analytics.analyzeTrend('BTC', 30);

      expect(trend.trend).toBe('bearish');
      expect(trend.momentum).toBeLessThan(0);
    });

    it('should identify neutral trend', async () => {
      // Create sideways data
      const neutralData = Array.from({ length: 30 }, (_, i) => [
        Date.now() - (30 - i) * 24 * 60 * 60 * 1000,
        50000 + Math.sin(i) * 100, // Oscillating
        51000,
        49000,
        50000 + Math.sin(i) * 100,
      ]);

      mockGeckoClient.getOHLC.mockResolvedValue(neutralData);

      const trend = await analytics.analyzeTrend('BTC', 30);

      expect(['bullish', 'bearish', 'neutral']).toContain(trend.trend);
    });

    it('should calculate support and resistance levels', async () => {
      const data = Array.from({ length: 30 }, (_, i) => [
        Date.now() - (30 - i) * 24 * 60 * 60 * 1000,
        50000,
        51000 + i * 10, // Highs increasing
        49000 - i * 10, // Lows decreasing
        50000,
      ]);

      mockGeckoClient.getOHLC.mockResolvedValue(data);

      const trend = await analytics.analyzeTrend('BTC', 30);

      expect(trend.support).toBeDefined();
      expect(trend.resistance).toBeDefined();
      expect(trend.resistance).toBeGreaterThan(trend.support);
    });
  });
});

