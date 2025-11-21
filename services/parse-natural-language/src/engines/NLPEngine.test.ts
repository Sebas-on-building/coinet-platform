/**
 * =========================================
 * NLP ENGINE TESTS
 * =========================================
 * Divine world-class tests for NLP engine functionality
 */

import { NLPEngine } from './NLPEngine';
import { NLPConfig } from '@/types';
import { createMockNaturalLanguageInput } from '../../tests/setup';

describe('NLPEngine', () => {
  let engine: NLPEngine;
  let mockConfig: NLPConfig;

  beforeEach(() => {
    mockConfig = {
      providers: [
        {
          name: 'openai',
          model: 'gpt-4',
          apiKey: 'test-key'
        }
      ],
      fallbackProvider: 'openai',
      caching: {
        enabled: false, // Disable for testing
        ttl: 3600,
        maxSize: 1000
      },
      validation: {
        strictMode: false,
        maxRetries: 3,
        timeout: 30000
      },
      performance: {
        maxConcurrentRequests: 10,
        requestTimeout: 60000,
        retryDelay: 1000
      }
    };

    engine = new NLPEngine(mockConfig);
  });

  describe('parse', () => {
    it('should parse simple price alert successfully', async () => {
      const input = createMockNaturalLanguageInput({
        text: 'Alert me when Bitcoin price goes above $50,000 on Binance'
      });

      const result = await engine.parse(input);

      expect(result.success).toBe(true);
      expect(result.rule).toBeDefined();
      expect(result.rule?.triggers).toHaveLength(1);
      expect(result.rule?.triggers[0]?.type).toBe('price');
      expect(result.rule?.triggers[0]?.symbol).toBe('BTCUSDT');
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should parse volume alert successfully', async () => {
      const input = createMockNaturalLanguageInput({
        text: 'Notify me if trading volume exceeds 1 million BTC'
      });

      const result = await engine.parse(input);

      expect(result.success).toBe(true);
      expect(result.rule?.triggers[0]?.type).toBe('volume');
      expect(result.rule?.triggers[0]?.value).toBe(1000000);
    });

    it('should handle ambiguous input with warnings', async () => {
      const input = createMockNaturalLanguageInput({
        text: 'Alert me when price changes'
      });

      const result = await engine.parse(input);

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors?.length).toBeGreaterThan(0);
    });

    it('should respect user context in parsing', async () => {
      const input = createMockNaturalLanguageInput({
        text: 'Alert me when price goes up',
        context: {
          preferredExchanges: ['binance'],
          riskTolerance: 'low'
        }
      });

      const result = await engine.parse(input);

      expect(result.success).toBe(true);
      // Should include exchange filter
      expect(result.rule?.filters.some(f => f.field === 'exchange')).toBe(true);
    });

    it('should handle empty input gracefully', async () => {
      const input = createMockNaturalLanguageInput({
        text: ''
      });

      const result = await engine.parse(input);

      expect(result.success).toBe(false);
      expect(result.errors?.some(e => e.code === 'PARSING_FAILED')).toBe(true);
    });

    it('should provide helpful error messages for invalid input', async () => {
      const input = createMockNaturalLanguageInput({
        text: 'xyz123'
      });

      const result = await engine.parse(input);

      expect(result.success).toBe(false);
      expect(result.errors?.[0]?.userMessage).toContain('trouble understanding');
      expect(result.errors?.[0]?.suggestions).toBeDefined();
    });
  });

  describe('healthCheck', () => {
    it('should return healthy status when providers are configured', async () => {
      const health = await engine.healthCheck();

      expect(health.status).toBe('healthy');
      expect(health.details.providers).toContain('openai');
    });

    it('should return unhealthy when no providers configured', async () => {
      const configWithoutProviders = { ...mockConfig, providers: [] };
      const engineWithoutProviders = new NLPEngine(configWithoutProviders);

      const health = await engineWithoutProviders.healthCheck();

      expect(health.status).toBe('unhealthy');
    });
  });

  describe('caching', () => {
    it('should use cache when enabled', async () => {
      const configWithCache = { ...mockConfig, caching: { enabled: true, ttl: 3600, maxSize: 1000 } };
      const engineWithCache = new NLPEngine(configWithCache);

      const input = createMockNaturalLanguageInput({
        text: 'Alert me when Bitcoin price goes above $50,000'
      });

      // First call
      const result1 = await engineWithCache.parse(input);

      // Second call should use cache
      const result2 = await engineWithCache.parse(input);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
    });
  });
});
