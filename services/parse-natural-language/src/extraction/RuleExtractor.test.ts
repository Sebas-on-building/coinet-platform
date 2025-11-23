/**
 * =========================================
 * RULE EXTRACTOR TESTS
 * =========================================
 * Divine world-class tests for rule extraction functionality
 */

import { RuleExtractor } from './RuleExtractor';
import { TriggerType, ComparisonOperator, NotificationChannel, ParsedRule } from '@/types';

describe('RuleExtractor', () => {
  let extractor: RuleExtractor;

  beforeEach(() => {
    extractor = new RuleExtractor();
  });

  describe('extract', () => {
    it('should extract price trigger from simple text', () => {
      const text = 'Alert me when Bitcoin price goes above $50,000';
      const rule = extractor.extract(text);

      expect(rule.triggers).toHaveLength(1);
      expect(rule.triggers[0]?.type).toBe(TriggerType.PRICE);
      expect(rule.triggers[0]?.symbol).toBe('BTCUSDT');
      expect(rule.triggers[0]?.operator).toBe(ComparisonOperator.GREATER_THAN);
      expect(rule.triggers[0]?.value).toBe(50000);
    });

    it('should extract volume trigger', () => {
      const text = 'Notify me if trading volume exceeds 1 million BTC';
      const rule = extractor.extract(text);

      expect(rule.triggers).toHaveLength(1);
      expect(rule.triggers[0]?.type).toBe(TriggerType.VOLUME);
      expect(rule.triggers[0]?.value).toBe(1000000);
    });

    it('should extract time windows', () => {
      const text = 'Alert me every hour between 9:00 and 17:00';
      const rule = extractor.extract(text);

      expect(rule.timeWindows).toHaveLength(1);
      expect(rule.timeWindows[0]?.startTime).toBe('09:00');
      expect(rule.timeWindows[0]?.endTime).toBe('17:00');
    });

    it('should extract routing preferences', () => {
      const text = 'Alert me via email and SMS when price changes';
      const rule = extractor.extract(text);

      expect(rule.routing.channels).toContain(NotificationChannel.EMAIL);
      expect(rule.routing.channels).toContain(NotificationChannel.SMS);
    });

    it('should extract exchange filters', () => {
      const text = 'Alert me on Binance when price goes above $50,000';
      const rule = extractor.extract(text);

      expect(rule.filters).toHaveLength(1);
      expect(rule.filters[0]?.field).toBe('exchange');
      expect(rule.filters[0]?.value).toBe('binance');
    });

    it('should handle complex multi-trigger scenarios', () => {
      const text = 'Alert me when Bitcoin price goes above $50,000 or volume exceeds 1 million on Binance';
      const rule = extractor.extract(text);

      expect(rule.triggers.length).toBeGreaterThan(0);
      expect(rule.filters.length).toBeGreaterThan(0);
    });

    it('should provide confidence scores', () => {
      const text = 'Alert me when BTC price > $50k';
      const rule = extractor.extract(text);

      expect(rule.metadata?.confidence).toBeGreaterThan(0);
      expect(rule.metadata?.confidence).toBeLessThanOrEqual(1);
    });

    it('should handle ambiguous input gracefully', () => {
      const text = 'Alert me when something happens';
      const rule = extractor.extract(text);

      expect(rule.triggers).toHaveLength(0);
      expect(rule.metadata?.confidence).toBeLessThan(0.5);
    });
  });

  describe('validate', () => {
    it('should validate complete rules successfully', () => {
      const text = 'Alert me when Bitcoin price goes above $50,000 on Binance';
      const rule = extractor.extract(text);
      const validation = extractor.validate(rule);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect missing triggers', () => {
      const rule: ParsedRule = {
        triggers: [],
        filters: [],
        conditions: [],
        timeWindows: [],
        routing: { channels: ['email' as any], priority: 'normal' as any },
        metadata: { confidence: 0 }
      };

      const validation = extractor.validate(rule);

      expect(validation.valid).toBe(false);
      expect(validation.errors.some(e => e.includes('No triggers'))).toBe(true);
    });

    it('should detect invalid symbols', () => {
      const rule: ParsedRule = {
        triggers: [{
          type: TriggerType.PRICE,
          symbol: 'X',
          operator: ComparisonOperator.GREATER_THAN,
          value: 50000
        }],
        filters: [],
        conditions: [],
        timeWindows: [],
        routing: { channels: ['email' as any], priority: 'normal' as any },
        metadata: { confidence: 0.9 }
      };

      const validation = extractor.validate(rule);

      expect(validation.valid).toBe(false);
      expect(validation.errors.some(e => e.includes('symbol'))).toBe(true);
    });

    it('should validate time window formats', () => {
      const rule: ParsedRule = {
        triggers: [{
          type: TriggerType.PRICE,
          symbol: 'BTCUSDT',
          operator: ComparisonOperator.GREATER_THAN,
          value: 50000
        }],
        filters: [],
        conditions: [],
        timeWindows: [{
          type: 'custom' as any,
          startTime: '25:00', // Invalid hour
          endTime: '17:00'
        }] as any,
        routing: { channels: ['email' as any], priority: 'normal' as any },
        metadata: { confidence: 0.9 }
      };

      const validation = extractor.validate(rule);

      expect(validation.valid).toBe(false);
      expect(validation.errors.some(e => e.includes('time format'))).toBe(true);
    });
  });
});
