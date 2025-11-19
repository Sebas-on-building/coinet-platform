/**
 * Market Data Streamer Integration Tests
 * Tests real-time streaming functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MarketDataStreamer } from '../services/market-data-streamer';
import { CoinGeckoWebSocketClient } from '../providers/coingecko-websocket';
import { DataSource, PriceUpdateEvent, MarketPrice } from '../types';

// Mock the WebSocket client
vi.mock('../providers/coingecko-websocket');

describe('MarketDataStreamer', () => {
  let streamer: MarketDataStreamer;
  let mockGeckoWs: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockGeckoWs = {
      subscribe: vi.fn().mockResolvedValue(undefined),
      on: vi.fn(),
      off: vi.fn(),
      emit: vi.fn(),
    };

    (CoinGeckoWebSocketClient as any).mockImplementation(() => mockGeckoWs);

    streamer = new MarketDataStreamer(mockGeckoWs, {
      symbols: [],
      channels: ['price'],
    });
  });

  afterEach(async () => {
    if (streamer && streamer.isActive()) {
      await streamer.stopStreaming();
    }
  });

  describe('startStreaming', () => {
    it('should start streaming for given symbols', async () => {
      await streamer.startStreaming(['BTC', 'ETH']);

      expect(streamer.isActive()).toBe(true);
      expect(mockGeckoWs.subscribe).toHaveBeenCalledWith({
        coins: ['btc', 'eth'],
        channels: ['price'],
      });
    });

    it('should not start if already streaming', async () => {
      await streamer.startStreaming(['BTC']);
      const subscribeCallCount = mockGeckoWs.subscribe.mock.calls.length;

      await streamer.startStreaming(['ETH']);

      expect(mockGeckoWs.subscribe).toHaveBeenCalledTimes(subscribeCallCount);
    });

    it('should emit stream_started event', async () => {
      const onStreamStarted = vi.fn();
      streamer.on('stream_started', onStreamStarted);

      await streamer.startStreaming(['BTC']);

      expect(onStreamStarted).toHaveBeenCalledWith(
        expect.objectContaining({ symbols: ['BTC'] })
      );
    });
  });

  describe('stopStreaming', () => {
    it('should stop streaming', async () => {
      await streamer.startStreaming(['BTC']);
      expect(streamer.isActive()).toBe(true);

      await streamer.stopStreaming();

      expect(streamer.isActive()).toBe(false);
    });

    it('should emit stream_stopped event', async () => {
      const onStreamStopped = vi.fn();
      streamer.on('stream_stopped', onStreamStopped);

      await streamer.startStreaming(['BTC']);
      await streamer.stopStreaming();

      expect(onStreamStopped).toHaveBeenCalled();
    });
  });

  describe('addSymbols', () => {
    it('should add symbols to stream', async () => {
      await streamer.startStreaming(['BTC']);

      await streamer.addSymbols(['ETH', 'SOL']);

      expect(streamer.getSubscribedSymbols()).toContain('BTC');
      expect(streamer.getSubscribedSymbols()).toContain('ETH');
      expect(streamer.getSubscribedSymbols()).toContain('SOL');
    });

    it('should not add duplicate symbols', async () => {
      await streamer.startStreaming(['BTC']);

      await streamer.addSymbols(['BTC']);

      const symbols = streamer.getSubscribedSymbols();
      expect(symbols.filter((s) => s === 'BTC').length).toBe(1);
    });
  });

  describe('removeSymbols', () => {
    it('should remove symbols from stream', async () => {
      await streamer.startStreaming(['BTC', 'ETH', 'SOL']);

      await streamer.removeSymbols(['ETH']);

      expect(streamer.getSubscribedSymbols()).toContain('BTC');
      expect(streamer.getSubscribedSymbols()).not.toContain('ETH');
      expect(streamer.getSubscribedSymbols()).toContain('SOL');
    });
  });

  describe('price updates', () => {
    it('should handle price updates and emit unified updates', (done) => {
      streamer.on('price_update', (update) => {
        expect(update.symbol).toBe('BTC');
        expect(update.price).toBe(50000);
        expect(update.sources).toBeDefined();
        expect(update.bestPrice).toBeGreaterThan(0);
        expect(update.confidence).toBeGreaterThan(0);
        done();
      });

      // Simulate price update from CoinGecko
      const priceUpdate: PriceUpdateEvent = {
        type: 'price',
        data: {
          symbol: 'BTC',
          coinId: 'bitcoin',
          price: 50000,
          priceChange24h: 1000,
          priceChangePercentage24h: 2.0,
          marketCap: 1000000000000,
          volume24h: 20000000000,
          lastUpdated: new Date(),
          source: DataSource.COINGECKO,
          updateType: 'rest' as any,
        } as MarketPrice,
        source: DataSource.COINGECKO,
        timestamp: new Date(),
      };

      // Trigger the handler manually
      (streamer as any).handlePriceUpdate(priceUpdate, DataSource.COINGECKO);

      // Wait for deduplication window
      setTimeout(() => {
        // Update should be emitted
      }, 1100);
    });
  });

  describe('statistics', () => {
    it('should track stream statistics', async () => {
      await streamer.startStreaming(['BTC']);

      const stats = streamer.getStats();

      expect(stats.totalUpdates).toBe(0);
      expect(stats.updatesBySource).toBeDefined();
      expect(stats.connectedSources).toBeDefined();
      expect(stats.reconnectCount).toBe(0);
      expect(stats.errors).toBe(0);
    });

    it('should reset statistics', async () => {
      await streamer.startStreaming(['BTC']);

      // Simulate some updates
      const priceUpdate: PriceUpdateEvent = {
        type: 'price',
        data: {
          symbol: 'BTC',
          coinId: 'bitcoin',
          price: 50000,
          priceChange24h: 0,
          priceChangePercentage24h: 0,
          marketCap: 0,
          volume24h: 0,
          lastUpdated: new Date(),
          source: DataSource.COINGECKO,
          updateType: 'rest' as any,
        } as MarketPrice,
        source: DataSource.COINGECKO,
        timestamp: new Date(),
      };

      (streamer as any).handlePriceUpdate(priceUpdate, DataSource.COINGECKO);

      streamer.resetStats();

      const stats = streamer.getStats();
      expect(stats.totalUpdates).toBe(0);
      expect(stats.reconnectCount).toBe(0);
    });
  });
});

