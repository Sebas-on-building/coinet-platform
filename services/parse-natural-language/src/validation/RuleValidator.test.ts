/**
 * =========================================
 * RULE VALIDATOR TESTS
 * =========================================
 * Divine world-class tests for rule validation functionality
 */

import { RuleValidator } from './RuleValidator';
import { ParsedRule, TriggerType, ComparisonOperator, NotificationChannel, NotificationPriority } from '@/types';

describe('RuleValidator', () => {
  let validator: RuleValidator;

  beforeEach(() => {
    validator = new RuleValidator();
  });

  describe('validate', () => {
    it('should validate complete valid rule successfully', () => {
      const rule: ParsedRule = {
        triggers: [{
          type: TriggerType.PRICE,
          symbol: 'BTCUSDT',
          operator: ComparisonOperator.GREATER_THAN,
          value: 50000
        }],
        filters: [],
        conditions: [],
        timeWindows: [],
        routing: {
          channels: [NotificationChannel.EMAIL],
          priority: NotificationPriority.NORMAL
        }
      };

      const result = validator.validate(rule);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing triggers', () => {
      const rule: ParsedRule = {
        triggers: [],
        filters: [],
        conditions: [],
        timeWindows: [],
        routing: {
          channels: [NotificationChannel.EMAIL],
          priority: NotificationPriority.NORMAL
        }
      };

      const result = validator.validate(rule);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'NO_TRIGGERS')).toBe(true);
    });

    it('should warn about invalid symbols', () => {
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
        routing: {
          channels: [NotificationChannel.EMAIL],
          priority: NotificationPriority.NORMAL
        }
      };

      const result = validator.validate(rule);

      expect(result.valid).toBe(true); // Symbol warning doesn't make rule invalid
      expect(result.warnings.some(w => w.code === 'INVALID_SYMBOL_LENGTH')).toBe(true);
    });

    it('should warn about unrealistic price thresholds', () => {
      const rule: ParsedRule = {
        triggers: [{
          type: TriggerType.PRICE,
          symbol: 'BTCUSDT',
          operator: ComparisonOperator.GREATER_THAN,
          value: 1000000000 // Unrealistic price
        }],
        filters: [],
        conditions: [],
        timeWindows: [],
        routing: {
          channels: [NotificationChannel.EMAIL],
          priority: NotificationPriority.NORMAL
        }
      };

      const result = validator.validate(rule);

      expect(result.warnings.some(w => w.code === 'UNREALISTIC_PRICE')).toBe(true);
    });

    it('should detect conflicting triggers', () => {
      const rule: ParsedRule = {
        triggers: [
          {
            type: TriggerType.PRICE,
            symbol: 'BTCUSDT',
            operator: ComparisonOperator.GREATER_THAN,
            value: 50000
          },
          {
            type: TriggerType.PRICE,
            symbol: 'BTCUSDT',
            operator: ComparisonOperator.LESS_THAN,
            value: 60000
          }
        ],
        filters: [],
        conditions: [],
        timeWindows: [],
        routing: {
          channels: [NotificationChannel.EMAIL],
          priority: NotificationPriority.NORMAL
        }
      };

      const result = validator.validate(rule);

      expect(result.warnings.some(w => w.code === 'CONFLICTING_TRIGGERS')).toBe(true);
    });

    it('should warn about too many channels', () => {
      const rule: ParsedRule = {
        triggers: [{
          type: TriggerType.PRICE,
          symbol: 'BTCUSDT',
          operator: ComparisonOperator.GREATER_THAN,
          value: 50000
        }],
        filters: [],
        conditions: [],
        timeWindows: [],
        routing: {
          channels: [NotificationChannel.EMAIL, NotificationChannel.SMS, NotificationChannel.PUSH],
          priority: NotificationPriority.NORMAL
        }
      };

      const result = validator.validate(rule);

      expect(result.warnings.some(w => w.code === 'MULTIPLE_CHANNELS')).toBe(true);
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
        }],
        routing: {
          channels: [NotificationChannel.EMAIL],
          priority: NotificationPriority.NORMAL
        }
      };

      const result = validator.validate(rule);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'INVALID_TIME_FORMAT')).toBe(true);
    });

    it('should validate logical time ranges', () => {
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
          startTime: '17:00',
          endTime: '09:00' // End before start
        }],
        routing: {
          channels: [NotificationChannel.EMAIL],
          priority: NotificationPriority.NORMAL
        }
      };

      const result = validator.validate(rule);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'INVALID_TIME_RANGE')).toBe(true);
    });
  });

  describe('generateUserFriendlyErrors', () => {
    it('should generate user-friendly error messages', () => {
      const errors = [{
        code: 'NO_TRIGGERS',
        message: 'No triggers found',
        userMessage: 'I need to know what should trigger your alert.',
        suggestions: ['Tell me when Bitcoin price goes above $50,000'],
        severity: 'error' as const
      }];

      const messages = validator.generateUserFriendlyErrors(errors);

      expect(messages).toHaveLength(1);
      expect(messages[0]).toContain('I need to know what should trigger your alert');
      expect(messages[0]).toContain('Suggestions:');
    });

    it('should handle errors without suggestions', () => {
      const errors = [{
        code: 'INVALID_SYMBOL',
        message: 'Invalid symbol format',
        userMessage: 'The symbol format is invalid.',
        severity: 'error' as const
      }];

      const messages = validator.generateUserFriendlyErrors(errors);

      expect(messages[0]).toBe('The symbol format is invalid.');
    });
  });

  describe('generateUserFriendlyWarnings', () => {
    it('should generate user-friendly warning messages', () => {
      const warnings = [{
        code: 'UNREALISTIC_PRICE',
        message: 'Unrealistic price threshold',
        userMessage: 'This price seems unusual.',
        suggestions: ['Please verify the price threshold'],
        severity: 'warning' as const
      }];

      const messages = validator.generateUserFriendlyWarnings(warnings);

      expect(messages[0]).toContain('This price seems unusual');
      expect(messages[0]).toContain('Suggestions:');
    });
  });
});
