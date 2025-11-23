/**
 * =========================================
 * RULE VALIDATOR
 * =========================================
 * Divine world-class rule validation with user-friendly error messages
 */

import { Logger } from '@/utils/Logger';
import {
  ParsedRule,
  TriggerCondition,
  FilterCondition,
  TimeWindow,
  RoutingPreferences,
  TriggerType,
  ComparisonOperator,
  NotificationChannel,
  NotificationPriority,
  Exchange,
  ParsingError
} from '@/types';

/**
 * Validation rule definition
 */
interface ValidationRule {
  name: string;
  validate: (rule: ParsedRule) => ValidationResult;
  severity: 'error' | 'warning' | 'info';
}

/**
 * Validation result
 */
interface ValidationResult {
  valid: boolean;
  errors: ParsingError[];
  warnings: ParsingError[];
  suggestions: string[];
}

/**
 * Rule validator for comprehensive rule validation
 */
export class RuleValidator {
  private logger: Logger;

  // Predefined validation rules
  private validationRules: ValidationRule[] = [
    {
      name: 'has_triggers',
      validate: this.validateHasTriggers.bind(this),
      severity: 'error'
    },
    {
      name: 'valid_symbols',
      validate: this.validateValidSymbols.bind(this),
      severity: 'warning'
    },
    {
      name: 'valid_exchanges',
      validate: this.validateValidExchanges.bind(this),
      severity: 'warning'
    },
    {
      name: 'reasonable_thresholds',
      validate: this.validateReasonableThresholds.bind(this),
      severity: 'warning'
    },
    {
      name: 'valid_time_windows',
      validate: this.validateValidTimeWindows.bind(this),
      severity: 'error'
    },
    {
      name: 'valid_routing',
      validate: this.validateValidRouting.bind(this),
      severity: 'warning'
    },
    {
      name: 'conflicting_conditions',
      validate: this.validateConflictingConditions.bind(this),
      severity: 'warning'
    },
    {
      name: 'performance_impact',
      validate: this.validatePerformanceImpact.bind(this),
      severity: 'info'
    }
  ];

  constructor() {
    this.logger = new Logger('RuleValidator');
  }

  /**
   * Validate parsed rule comprehensively
   */
  validate(rule: ParsedRule): ValidationResult {
    this.logger.debug('Validating rule', { triggers: rule.triggers.length });

    const errors: ParsingError[] = [];
    const warnings: ParsingError[] = [];
    const suggestions: string[] = [];

    // Run all validation rules
    for (const validationRule of this.validationRules) {
      try {
        const result = validationRule.validate(rule);

        errors.push(...result.errors);
        warnings.push(...result.warnings);
        suggestions.push(...result.suggestions);
      } catch (error: any) {
        this.logger.error(`Validation rule ${validationRule.name} failed`, { error: error.message });
      }
    }

    const valid = errors.length === 0;

    this.logger.debug('Validation complete', {
      valid,
      errorCount: errors.length,
      warningCount: warnings.length
    });

    return { valid, errors, warnings, suggestions };
  }

  /**
   * Validate that rule has at least one trigger
   */
  private validateHasTriggers(rule: ParsedRule): ValidationResult {
    const valid = rule.triggers.length > 0;

    if (!valid) {
      return {
        valid: false,
        errors: [{
          code: 'NO_TRIGGERS',
          message: 'Rule must have at least one trigger condition',
          userMessage: 'I need to know what should trigger your alert. Please specify what you want to be notified about.',
          severity: 'error',
          suggestions: [
            'Tell me when Bitcoin price goes above $50,000',
            'Alert me if trading volume exceeds 1 million',
            'Notify me when a large liquidation happens'
          ]
        }],
        warnings: [],
        suggestions: []
      };
    }

    return { valid: true, errors: [], warnings: [], suggestions: [] };
  }

  /**
   * Validate that symbols are valid
   */
  private validateValidSymbols(rule: ParsedRule): ValidationResult {
    const errors: ParsingError[] = [];
    const warnings: ParsingError[] = [];

    for (const trigger of rule.triggers) {
      if (trigger.symbol) {
        const symbol = trigger.symbol.toUpperCase();

        // Check for obviously invalid symbols
        if (symbol.length < 2 || symbol.length > 10) {
          warnings.push({
            code: 'INVALID_SYMBOL_LENGTH',
            message: `Symbol ${symbol} has invalid length`,
            userMessage: `The symbol "${symbol}" doesn't look right. Asset symbols are usually 3-6 characters long.`,
            severity: 'warning',
            suggestions: ['Use symbols like BTC, ETH, BTCUSDT, ETHUSDT']
          });
        }

        // Check for suspicious symbols
        if (/[^A-Z0-9]/.test(symbol)) {
          warnings.push({
            code: 'SUSPICIOUS_SYMBOL',
            message: `Symbol ${symbol} contains non-alphanumeric characters`,
            userMessage: `The symbol "${symbol}" contains special characters. Are you sure this is correct?`,
            severity: 'warning'
          });
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      suggestions: []
    };
  }

  /**
   * Validate that exchanges are valid
   */
  private validateValidExchanges(rule: ParsedRule): ValidationResult {
    const errors: ParsingError[] = [];

    for (const trigger of rule.triggers) {
      if (trigger.exchange) {
        const validExchanges = Object.values(Exchange);
        if (!validExchanges.includes(trigger.exchange)) {
          errors.push({
            code: 'INVALID_EXCHANGE',
            message: `Exchange ${trigger.exchange} is not supported`,
            userMessage: `The exchange "${trigger.exchange}" is not recognized. Please use a supported exchange.`,
            severity: 'warning',
            suggestions: ['Supported exchanges: binance, coinbase, kraken, bybit, okex, huobi, kucoin, gate']
          });
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings: [],
      suggestions: []
    };
  }

  /**
   * Validate that thresholds are reasonable
   */
  private validateReasonableThresholds(rule: ParsedRule): ValidationResult {
    const warnings: ParsingError[] = [];

    for (const trigger of rule.triggers) {
      if (trigger.type === TriggerType.PRICE && trigger.value) {
        const price = trigger.value;

        // Warn about unrealistic prices
        if (typeof price === 'number' && (price < 0.01 || price > 1000000)) {
          warnings.push({
            code: 'UNREALISTIC_PRICE',
            message: `Price threshold ${price} seems unrealistic`,
            userMessage: `A price threshold of $${price.toLocaleString()} seems unusual. Are you sure this is correct?`,
            severity: 'warning'
          });
        }
      }

      if (trigger.type === TriggerType.VOLUME && trigger.value) {
        const volume = trigger.value;

        // Warn about unrealistic volumes
        if (typeof volume === 'number' && (volume < 1000 || volume > 1000000000)) {
          warnings.push({
            code: 'UNREALISTIC_VOLUME',
            message: `Volume threshold ${volume} seems unrealistic`,
            userMessage: `A volume threshold of ${volume.toLocaleString()} seems unusual. Are you sure this is correct?`,
            severity: 'warning'
          });
        }
      }
    }

    return {
      valid: true,
      errors: [],
      warnings,
      suggestions: []
    };
  }

  /**
   * Validate time windows
   */
  private validateValidTimeWindows(rule: ParsedRule): ValidationResult {
    const errors: ParsingError[] = [];

    for (const window of rule.timeWindows) {
      // Validate time format
      if (window.startTime && !/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(window.startTime)) {
        errors.push({
          code: 'INVALID_TIME_FORMAT',
          message: `Invalid start time format: ${window.startTime}`,
          userMessage: `The start time "${window.startTime}" is not in the correct format. Please use HH:MM format.`,
          severity: 'error',
          suggestions: ['Use format like "09:30" or "14:15"']
        });
      }

      if (window.endTime && !/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(window.endTime)) {
        errors.push({
          code: 'INVALID_TIME_FORMAT',
          message: `Invalid end time format: ${window.endTime}`,
          userMessage: `The end time "${window.endTime}" is not in the correct format. Please use HH:MM format.`,
          severity: 'error',
          suggestions: ['Use format like "09:30" or "14:15"']
        });
      }

      // Validate logical time range
      if (window.startTime && window.endTime) {
        const start = this.parseTime(window.startTime);
        const end = this.parseTime(window.endTime);

        if (start >= end) {
          errors.push({
            code: 'INVALID_TIME_RANGE',
            message: `Start time ${window.startTime} is after or equal to end time ${window.endTime}`,
            userMessage: `Your time window doesn't make sense. The start time should be before the end time.`,
            severity: 'error',
            suggestions: ['Make sure start time is before end time']
          });
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings: [],
      suggestions: []
    };
  }

  /**
   * Validate routing preferences
   */
  private validateValidRouting(rule: ParsedRule): ValidationResult {
    const warnings: ParsingError[] = [];

    // Check for missing channels
    if (rule.routing.channels.length === 0) {
      warnings.push({
        code: 'NO_CHANNELS',
        message: 'No notification channels specified',
        userMessage: 'You didn\'t specify how you want to be notified. I\'ll use email by default.',
        severity: 'warning',
        suggestions: ['Add "notify me via email" or "send SMS alerts" to your request']
      });
    }

    // Check for conflicting channels
    const hasEmail = rule.routing.channels.includes(NotificationChannel.EMAIL);
    const hasSMS = rule.routing.channels.includes(NotificationChannel.SMS);
    const hasPush = rule.routing.channels.includes(NotificationChannel.PUSH);

    if (hasEmail && hasSMS && hasPush) {
      warnings.push({
        code: 'MULTIPLE_CHANNELS',
        message: 'Multiple notification channels may be overwhelming',
        userMessage: 'You\'re asking for notifications via email, SMS, and push. This might be too many. Consider focusing on 1-2 channels.',
        severity: 'warning',
        suggestions: ['Choose your preferred notification method']
      });
    }

    return {
      valid: true,
      errors: [],
      warnings,
      suggestions: []
    };
  }

  /**
   * Validate for conflicting conditions
   */
  private validateConflictingConditions(rule: ParsedRule): ValidationResult {
    const warnings: ParsingError[] = [];

    // Check for contradictory triggers
    const priceTriggers = rule.triggers.filter(t => t.type === TriggerType.PRICE);
    if (priceTriggers.length > 1) {
      const hasAbove = priceTriggers.some(t => t.operator === ComparisonOperator.GREATER_THAN);
      const hasBelow = priceTriggers.some(t => t.operator === ComparisonOperator.LESS_THAN);

      if (hasAbove && hasBelow) {
        warnings.push({
          code: 'CONFLICTING_TRIGGERS',
          message: 'Rule has both above and below price triggers',
          userMessage: 'You have triggers for both price going up and down. This might cause confusion. Consider separate alerts for each direction.',
          severity: 'warning',
          suggestions: ['Create separate alerts for upward and downward movements']
        });
      }
    }

    return {
      valid: true,
      errors: [],
      warnings,
      suggestions: []
    };
  }

  /**
   * Validate performance impact
   */
  private validatePerformanceImpact(rule: ParsedRule): ValidationResult {
    const suggestions: string[] = [];

    // Check for potentially expensive rules
    const triggerCount = rule.triggers.length;
    const filterCount = rule.filters.length + rule.conditions.length;
    const timeWindowCount = rule.timeWindows.length;

    if (triggerCount > 5) {
      suggestions.push('Consider reducing the number of triggers for better performance');
    }

    if (filterCount > 10) {
      suggestions.push('Many filters may impact alert responsiveness');
    }

    if (timeWindowCount > 3) {
      suggestions.push('Multiple time windows may be complex to manage');
    }

    return {
      valid: true,
      errors: [],
      warnings: [],
      suggestions
    };
  }

  /**
   * Parse time string to minutes
   */
  private parseTime(timeStr: string): number {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  }

  /**
   * Generate user-friendly error messages
   */
  generateUserFriendlyErrors(errors: ParsingError[]): string[] {
    return errors.map(error => {
      let message = error.userMessage;

      if (error.suggestions && error.suggestions.length > 0) {
        message += '\n\nSuggestions:';
        error.suggestions.forEach((suggestion, index) => {
          message += `\n${index + 1}. ${suggestion}`;
        });
      }

      return message;
    });
  }

  /**
   * Generate user-friendly warnings
   */
  generateUserFriendlyWarnings(warnings: ParsingError[]): string[] {
    return warnings.map(warning => {
      let message = warning.userMessage;

      if (warning.suggestions && warning.suggestions.length > 0) {
        message += '\n\nSuggestions:';
        warning.suggestions.forEach((suggestion, index) => {
          message += `\n${index + 1}. ${suggestion}`;
        });
      }

      return message;
    });
  }
}
