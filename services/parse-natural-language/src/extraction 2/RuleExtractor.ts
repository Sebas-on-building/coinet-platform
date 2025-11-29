/**
 * =========================================
 * RULE EXTRACTOR
 * =========================================
 * Divine world-class rule extraction from natural language
 */

import { Logger } from '@/utils/Logger';
import {
  TriggerType,
  ComparisonOperator,
  LogicalOperator,
  NotificationChannel,
  NotificationPriority,
  Exchange,
  TriggerCondition,
  FilterCondition,
  TimeWindow,
  RoutingPreferences,
  ParsedRule
} from '@/types';

/**
 * Rule extraction patterns
 */
interface ExtractionPattern {
  regex: RegExp;
  handler: (match: RegExpMatchArray, context: any) => any;
  confidence: number;
}

/**
 * Rule extractor for parsing natural language into structured rules
 */
export class RuleExtractor {
  private logger: Logger;

  // Extraction patterns for different components
  private pricePatterns: ExtractionPattern[] = [
    {
      regex: /(?:bitcoin|btc)\s+(?:price|value|cost)\s+(?:goes?|is)\s+(?:above|over|greater than|exceeds?|>\s*)\s*\$?(\d+(?:,\d{3})*(?:\.\d+)?)/i,
      handler: (match) => ({
        type: TriggerType.PRICE,
        symbol: 'BTCUSDT',
        operator: ComparisonOperator.GREATER_THAN,
        value: parseFloat(match[1].replace(/,/g, ''))
      }),
      confidence: 0.9
    },
    {
      regex: /(\w+)\s+(?:price|value|cost)\s+(?:is\s+)?(?:above|over|greater than|exceeds?|>\s*)\s*\$?(\d+(?:,\d{3})*(?:\.\d+)?)/i,
      handler: (match) => ({
        type: TriggerType.PRICE,
        symbol: match[1].toUpperCase(),
        operator: ComparisonOperator.GREATER_THAN,
        value: parseFloat(match[2].replace(/,/g, ''))
      }),
      confidence: 0.9
    },
    {
      regex: /(\w+)\s+(?:price|value|cost)\s+(?:is\s+)?(?:below|under|less than|<\s*)\s*\$?(\d+(?:,\d{3})*(?:\.\d+)?)/i,
      handler: (match) => ({
        type: TriggerType.PRICE,
        symbol: match[1].toUpperCase(),
        operator: ComparisonOperator.LESS_THAN,
        value: parseFloat(match[2].replace(/,/g, ''))
      }),
      confidence: 0.9
    }
  ];

  private volumePatterns: ExtractionPattern[] = [
    {
      regex: /(?:trading volume|volume|amount)\s+(?:exceeds?|is\s+above|>\s*)\s*(\d+(?:\.\d+)?)\s*(?:million|m|k?)/i,
      handler: (match) => {
        let value = parseFloat(match[1]);
        if (match[0].includes('million') || match[0].includes('m')) {
          value *= 1000000;
        } else if (match[0].includes('k')) {
          value *= 1000;
        }
        return {
          type: TriggerType.VOLUME,
          symbol: 'BTC', // Default to BTC
          operator: ComparisonOperator.GREATER_THAN,
          value: value
        };
      },
      confidence: 0.8
    }
  ];

  private timePatterns: ExtractionPattern[] = [
    {
      regex: /(?:every|each)\s+(\d+)\s+(minute|hour|day|week|month)s?/i,
      handler: (match) => ({
        type: match[2] as any,
        duration: parseInt(match[1]) * this.getTimeMultiplier(match[2])
      }),
      confidence: 0.9
    },
    {
      regex: /(?:between|from)\s+(\d{1,2}):(\d{2})\s+(?:and|to)\s+(\d{1,2}):(\d{2})/i,
      handler: (match) => ({
        type: 'custom' as any,
        startTime: `${match[1].padStart(2, '0')}:${match[2]}`,
        endTime: `${match[3].padStart(2, '0')}:${match[4]}`
      }),
      confidence: 0.8
    }
  ];

  private exchangePatterns: ExtractionPattern[] = [
    {
      regex: /(?:on|at|from)\s+(binance|coinbase|kraken|bybit|okex|huobi|kucoin|gate|ftx)/i,
      handler: (match) => ({
        exchange: match[1].toLowerCase() as Exchange
      }),
      confidence: 0.9
    }
  ];

  private channelPatterns: ExtractionPattern[] = [
    {
      regex: /(?:notify|alert|send)\s+(?:me\s+)?(?:via|through|on|to)\s+(email|sms|push|webhook|telegram|discord|slack)/i,
      handler: (match) => ({
        channel: match[1].toLowerCase() as NotificationChannel
      }),
      confidence: 0.9
    },
    {
      regex: /(email|sms|push|webhook|telegram|discord|slack)\s+(?:and|&)\s+(email|sms|push|webhook|telegram|discord|slack)/i,
      handler: (match) => ({
        channels: [match[1], match[2]].filter(Boolean).map(c => c.toLowerCase() as NotificationChannel)
      }),
      confidence: 0.9
    }
  ];

  private priorityPatterns: ExtractionPattern[] = [
    {
      regex: /(?:high|critical|urgent|important)\s+(?:priority|alert)/i,
      handler: () => ({ priority: NotificationPriority.HIGH }),
      confidence: 0.8
    },
    {
      regex: /(?:low|normal|regular)\s+(?:priority|alert)/i,
      handler: () => ({ priority: NotificationPriority.NORMAL }),
      confidence: 0.8
    }
  ];

  constructor() {
    this.logger = new Logger('RuleExtractor');
  }

  /**
   * Extract rule components from natural language text
   */
  extract(text: string): ParsedRule {
    this.logger.debug('Extracting rule from text', { text });

    const components = {
      triggers: this.extractTriggers(text),
      filters: this.extractFilters(text),
      conditions: this.extractConditions(text),
      timeWindows: this.extractTimeWindows(text),
      routing: this.extractRouting(text)
    };

    return {
      ...components,
      metadata: {
        confidence: this.calculateOverallConfidence(components),
        parsedTokens: text.split(/\s+/)
      }
    };
  }

  /**
   * Extract trigger conditions
   */
  private extractTriggers(text: string): TriggerCondition[] {
    const triggers: TriggerCondition[] = [];

    // Try price patterns
    for (const pattern of this.pricePatterns) {
      const match = text.match(pattern.regex);
      if (match) {
        triggers.push({
          ...pattern.handler(match, {}),
          confidence: pattern.confidence
        });
      }
    }

    // Try volume patterns
    for (const pattern of this.volumePatterns) {
      const match = text.match(pattern.regex);
      if (match) {
        triggers.push({
          ...pattern.handler(match, {}),
          confidence: pattern.confidence
        });
      }
    }

    return triggers;
  }

  /**
   * Extract filter conditions
   */
  private extractFilters(text: string): FilterCondition[] {
    const filters: FilterCondition[] = [];

    // Exchange filters
    for (const pattern of this.exchangePatterns) {
      const match = text.match(pattern.regex);
      if (match) {
        filters.push({
          field: 'exchange',
          operator: ComparisonOperator.EQUAL_TO,
          value: pattern.handler(match, {}).exchange,
          logicalOperator: LogicalOperator.AND
        });
      }
    }

    return filters;
  }

  /**
   * Extract additional conditions
   */
  private extractConditions(text: string): FilterCondition[] {
    // Similar to filters but for additional conditions
    return this.extractFilters(text);
  }

  /**
   * Extract time windows
   */
  private extractTimeWindows(text: string): TimeWindow[] {
    const windows: TimeWindow[] = [];

    for (const pattern of this.timePatterns) {
      const match = text.match(pattern.regex);
      if (match) {
        windows.push({
          type: 'custom' as any,
          ...pattern.handler(match, {}),
          enabled: true
        });
      }
    }

    return windows;
  }

  /**
   * Extract routing preferences
   */
  private extractRouting(text: string): RoutingPreferences {
    const channels: NotificationChannel[] = [];
    let priority: NotificationPriority = NotificationPriority.NORMAL;

    // Extract channels
    for (const pattern of this.channelPatterns) {
      const match = text.match(pattern.regex);
      if (match) {
        const result = pattern.handler(match, {});
        if (result.channel) {
          if (!channels.includes(result.channel)) {
            channels.push(result.channel);
          }
        }
        if (result.channels) {
          result.channels.forEach((channel: NotificationChannel) => {
            if (!channels.includes(channel)) {
              channels.push(channel);
            }
          });
        }
      }
    }

    // Extract priority
    for (const pattern of this.priorityPatterns) {
      const match = text.match(pattern.regex);
      if (match) {
        priority = pattern.handler(match, {}).priority;
        break;
      }
    }

    // Default channels if none specified
    if (channels.length === 0) {
      channels.push(NotificationChannel.EMAIL);
    }

    return {
      channels,
      priority
    };
  }

  /**
   * Calculate overall confidence score
   */
  private calculateOverallConfidence(components: any): number {
    const confidences = [
      ...components.triggers.map((t: any) => t.confidence || 0),
      ...components.filters.map((f: any) => 0.7), // Filters have medium confidence
      ...components.timeWindows.map((w: any) => 0.8) // Time windows have high confidence
    ];

    if (confidences.length === 0) {
      return 0;
    }

    return confidences.reduce((sum: number, conf: number) => sum + conf, 0) / confidences.length;
  }

  /**
   * Get time multiplier for duration calculation
   */
  private getTimeMultiplier(unit: string): number {
    const multipliers = {
      minute: 60 * 1000,
      hour: 60 * 60 * 1000,
      day: 24 * 60 * 60 * 1000,
      week: 7 * 24 * 60 * 60 * 1000,
      month: 30 * 24 * 60 * 60 * 1000
    };

    return multipliers[unit as keyof typeof multipliers] || 60 * 1000;
  }

  /**
   * Validate extracted components
   */
  validate(components: ParsedRule): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (components.triggers.length === 0) {
      errors.push('No triggers found. Please specify what should trigger the alert.');
    }

    if (components.routing.channels.length === 0) {
      errors.push('No notification channels specified.');
    }

    // Validate symbols
    for (const trigger of components.triggers) {
      if (trigger.symbol && trigger.symbol.length < 2) {
        errors.push(`Invalid symbol: ${trigger.symbol}. Please use valid asset symbols.`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}
