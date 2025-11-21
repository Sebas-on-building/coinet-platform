/**
 * =========================================
 * NLP ENGINE
 * =========================================
 * Divine world-class NLP engine for parsing natural language into structured rules
 */

import { Logger } from '@/utils/Logger';
import { CacheManager } from '@/caching/CacheManager';
import {
  NaturalLanguageInput,
  ParsingResult,
  ParsedRule,
  LLMProvider,
  NLPConfig,
  TriggerCondition,
  FilterCondition,
  TimeWindow,
  RoutingPreferences,
  NotificationChannel
} from '@/types';

/**
 * Core NLP Engine
 */
export class NLPEngine {
  private logger: Logger;
  private cache: CacheManager;
  private config: NLPConfig;
  private providers: Map<string, LLMProvider>;

  constructor(config: NLPConfig, cache?: CacheManager) {
    this.logger = new Logger('NLPEngine');
    this.config = config;
    this.cache = cache || new CacheManager({
      enabled: config.caching.enabled,
      ttl: config.caching.ttl,
      maxSize: config.caching.maxSize
    });

    this.providers = new Map();
    this.initializeProviders();
  }

  /**
   * Parse natural language input into structured rule
   */
  async parse(input: NaturalLanguageInput): Promise<ParsingResult> {
    return this.logger.withTiming('parse', async () => {
      // Check cache first
      const cached = this.cache.get(input.text, input.options);
      if (cached) {
        return cached;
      }

      try {
        // Pre-process input
        const processedInput = await this.preprocessInput(input);

        // Parse with primary provider
        const result = await this.parseWithProviders(processedInput);

        // Post-process result
        const finalResult = await this.postprocessResult(result, input);

        // Cache successful results
        if (finalResult.success) {
          this.cache.set(input.text, input.options, finalResult);
        }

        return finalResult;

      } catch (error: any) {
        this.logger.error('NLP parsing failed', { error: error.message, input: input.text });

        return {
          success: false,
          errors: [{
            code: 'PARSING_FAILED',
            message: error.message,
            userMessage: 'I had trouble understanding your alert request. Could you try rephrasing it?',
            severity: 'error',
            suggestions: [
              'Be more specific about what you want to monitor',
              'Include the asset symbol (like BTC, ETH)',
              'Specify the condition (above, below, changes by)',
              'Mention the exchange if relevant'
            ]
          }],
          confidence: 0
        };
      }
    });
  }

  /**
   * Pre-process input text
   */
  private async preprocessInput(input: NaturalLanguageInput): Promise<string> {
    let text = input.text;

    // Normalize text
    text = text.toLowerCase().trim();

    // Handle common variations
    text = text.replace(/\bprice\b/gi, 'price');
    text = text.replace(/\balert me\b/gi, '');
    text = text.replace(/\bwhen\b/gi, '');

    // Extract context hints
    if (input.context?.preferredExchanges?.length) {
      const exchanges = input.context.preferredExchanges.join(', ');
      text += ` on ${exchanges}`;
    }

    return text;
  }

  /**
   * Parse with available LLM providers
   */
  private async parseWithProviders(input: string): Promise<ParsingResult> {
    const errors: any[] = [];

    for (const [name, provider] of this.providers) {
      try {
        this.logger.debug(`Attempting parse with ${name}`);
        const result = await this.parseWithProvider(provider, input);

        if (result.success) {
          return result;
        }

        errors.push({ provider: name, error: result.errors });
      } catch (error: any) {
        this.logger.warn(`Provider ${name} failed`, { error: error.message });
        errors.push({ provider: name, error: error.message });
      }
    }

    // If all providers failed, return best error
    return {
      success: false,
      errors: [{
        code: 'ALL_PROVIDERS_FAILED',
        message: 'All LLM providers failed to parse the request',
        userMessage: 'I\'m having trouble understanding your request. Could you try rephrasing it?',
        severity: 'error',
        context: { errors }
      }],
      confidence: 0
    };
  }

  /**
   * Parse with specific LLM provider
   */
  private async parseWithProvider(provider: LLMProvider, input: string): Promise<ParsingResult> {
    switch (provider.name) {
      case 'openai':
        return this.parseWithOpenAI(provider, input);
      case 'anthropic':
        return this.parseWithAnthropic(provider, input);
      case 'google':
        return this.parseWithGoogle(provider, input);
      case 'local':
        return this.parseWithLocal(provider, input);
      default:
        throw new Error(`Unsupported provider: ${provider.name}`);
    }
  }

  /**
   * Parse with OpenAI GPT models
   */
  private async parseWithOpenAI(provider: LLMProvider, input: string): Promise<ParsingResult> {
    // TODO: Implement OpenAI integration
    // For now, return mock response for development
    return this.mockParseResponse(input);
  }

  /**
   * Parse with Anthropic Claude models
   */
  private async parseWithAnthropic(provider: LLMProvider, input: string): Promise<ParsingResult> {
    // TODO: Implement Anthropic integration
    return this.mockParseResponse(input);
  }

  /**
   * Parse with Google Gemini models
   */
  private async parseWithGoogle(provider: LLMProvider, input: string): Promise<ParsingResult> {
    // TODO: Implement Google AI integration
    return this.mockParseResponse(input);
  }

  /**
   * Parse with local models
   */
  private async parseWithLocal(provider: LLMProvider, input: string): Promise<ParsingResult> {
    // TODO: Implement local model integration (e.g., TensorFlow.js models)
    return this.mockParseResponse(input);
  }

  /**
   * Mock parsing response for development
   * TODO: Replace with actual LLM integration
   */
  private mockParseResponse(input: string): ParsingResult {
    // Simple rule-based parsing for development
    const rule = this.simpleRuleExtraction(input);

    return {
      success: true,
      rule,
      confidence: 0.8,
      processingTime: 150
    };
  }

  /**
   * Simple rule extraction for development
   */
  private simpleRuleExtraction(input: string): ParsedRule {
    // This is a simplified implementation
    // In production, this would use the LLM response

    const triggers: TriggerCondition[] = [];
    const filters: FilterCondition[] = [];
    const timeWindows: TimeWindow[] = [];
    const routing: RoutingPreferences = {
      channels: [NotificationChannel.EMAIL],
      priority: 'normal' as any
    };

    // Simple keyword-based extraction
    if (input.includes('bitcoin') || input.includes('btc')) {
      triggers.push({
        type: 'price' as any,
        symbol: 'BTCUSDT',
        operator: '>' as any,
        value: 50000
      });
    }

    if (input.includes('above') || input.includes('over')) {
      // Extract price threshold
      const priceMatch = input.match(/(\d+(?:,\d{3})*(?:\.\d+)?)/);
      if (priceMatch) {
        triggers[0] = {
          ...triggers[0],
          value: parseFloat(priceMatch[1].replace(/,/g, ''))
        };
      }
    }

    return {
      triggers,
      filters,
      conditions: [],
      timeWindows,
      routing,
      metadata: {
        confidence: 0.8,
        parsedTokens: input.split(' ')
      }
    };
  }

  /**
   * Post-process parsing result
   */
  private async postprocessResult(result: ParsingResult, input: NaturalLanguageInput): Promise<ParsingResult> {
    if (!result.success || !result.rule) {
      return result;
    }

    // Validate parsed rule
    const validation = await this.validateRule(result.rule, input);

    return {
      ...result,
      errors: validation.errors,
      warnings: validation.warnings,
      suggestions: validation.suggestions
    };
  }

  /**
   * Validate parsed rule
   */
  private async validateRule(rule: ParsedRule, input: NaturalLanguageInput): Promise<{
    errors: any[];
    warnings: any[];
    suggestions: string[];
  }> {
    const errors: any[] = [];
    const warnings: any[] = [];
    const suggestions: string[] = [];

    // Check if rule has at least one trigger
    if (rule.triggers.length === 0) {
      errors.push({
        code: 'NO_TRIGGERS',
        message: 'No triggers found in parsed rule',
        userMessage: 'I couldn\'t find what you want to be alerted about. Please specify what should trigger the alert.',
        severity: 'error'
      });
    }

    // Check for ambiguous symbols
    if (rule.triggers.some(t => t.symbol && t.symbol.length < 3)) {
      warnings.push({
        code: 'AMBIGUOUS_SYMBOL',
        message: 'Symbol may be ambiguous',
        userMessage: 'The asset symbol might be unclear. Could you specify the full symbol (like BTCUSDT)?',
        severity: 'warning'
      });
    }

    // Suggest improvements based on context
    if (input.context?.riskTolerance === 'low' && rule.routing.priority === 'critical') {
      suggestions.push('Consider lowering the priority since you have low risk tolerance');
    }

    return { errors, warnings, suggestions };
  }

  /**
   * Initialize LLM providers
   */
  private initializeProviders(): void {
    for (const provider of this.config.providers) {
      this.providers.set(provider.name, provider);
    }

    if (this.providers.size === 0) {
      this.logger.warn('No LLM providers configured');
    }
  }

  /**
   * Health check for NLP engine
   */
  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; details: any }> {
    try {
      const cacheHealth = this.cache.healthCheck();
      const providersHealthy = this.providers.size > 0;

      const isHealthy = cacheHealth.status === 'healthy' && providersHealthy;

      return {
        status: isHealthy ? 'healthy' : 'unhealthy',
        details: {
          cache: cacheHealth,
          providers: Array.from(this.providers.keys()),
          providerCount: this.providers.size
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: { error: error instanceof Error ? error.message : String(error) }
      };
    }
  }
}
