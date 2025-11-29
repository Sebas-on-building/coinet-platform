// =============================================================================
// COINET AI PROMPT BUILDER - INTELLIGENT PROMPT GENERATION
// Advanced prompt engineering for AI-powered crypto analysis
// =============================================================================

import { AssembledContext, MarketContext, NewsContext, SocialContext, OnChainContext } from './contextAssembler';

// =============================================================================
// PROMPT TEMPLATES AND CONFIGURATIONS
// =============================================================================

export interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  category: PromptCategory;
  systemPrompt: string;
  userPromptTemplate: string;
  requiresMarketData: boolean;
  requiresNews: boolean;
  requiresSocial: boolean;
  requiresOnChain: boolean;
  maxTokens: number;
  temperature: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
}

export type PromptCategory = 
  | 'price_analysis'
  | 'sentiment_analysis'
  | 'technical_analysis'
  | 'fundamental_analysis'
  | 'risk_assessment'
  | 'trading_signals'
  | 'market_summary'
  | 'news_impact'
  | 'social_trends'
  | 'on_chain_analysis'
  | 'portfolio_optimization'
  | 'educational_content';

export interface PromptGenerationOptions {
  template: string; // Template ID
  focus?: string[]; // Specific aspects to focus on
  timeHorizon?: 'short_term' | 'medium_term' | 'long_term';
  riskTolerance?: 'conservative' | 'moderate' | 'aggressive';
  analysisDepth?: 'quick' | 'standard' | 'comprehensive';
  includeDisclaimer?: boolean;
  customInstructions?: string;
  outputFormat?: 'text' | 'json' | 'markdown';
}

export interface GeneratedPrompt {
  id: string;
  template: PromptTemplate;
  systemPrompt: string;
  userPrompt: string;
  context: AssembledContext;
  metadata: {
    generatedAt: number;
    contextCompleteness: number;
    contextImportance: number;
    estimatedTokens: number;
    analysisType: string;
  };
  options: PromptGenerationOptions;
}

// =============================================================================
// PROMPT BUILDER CORE CLASS
// =============================================================================

export class PromptBuilder {
  private templates: Map<string, PromptTemplate> = new Map();
  
  constructor() {
    this.initializeDefaultTemplates();
  }
  
  // =============================================================================
  // PUBLIC API METHODS
  // =============================================================================
  
  /**
   * Generate a prompt based on context and options
   */
  generatePrompt(
    context: AssembledContext,
    options: PromptGenerationOptions
  ): GeneratedPrompt {
    const template = this.getTemplate(options.template);
    if (!template) {
      throw new Error(`Template '${options.template}' not found`);
    }
    
    // Validate context requirements
    this.validateContextRequirements(context, template);
    
    // Generate system prompt
    const systemPrompt = this.buildSystemPrompt(template, context, options);
    
    // Generate user prompt
    const userPrompt = this.buildUserPrompt(template, context, options);
    
    // Create prompt metadata
    const metadata = {
      generatedAt: Date.now(),
      contextCompleteness: context.completeness,
      contextImportance: context.importance,
      estimatedTokens: this.estimateTokens(systemPrompt + userPrompt),
      analysisType: template.category,
    };
    
    return {
      id: `prompt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      template,
      systemPrompt,
      userPrompt,
      context,
      metadata,
      options,
    };
  }
  
  /**
   * Get available templates by category
   */
  getTemplatesByCategory(category?: PromptCategory): PromptTemplate[] {
    const allTemplates = Array.from(this.templates.values());
    return category 
      ? allTemplates.filter(t => t.category === category)
      : allTemplates;
  }
  
  /**
   * Register a custom template
   */
  registerTemplate(template: PromptTemplate): void {
    this.templates.set(template.id, template);
  }
  
  /**
   * Remove a template
   */
  removeTemplate(templateId: string): boolean {
    return this.templates.delete(templateId);
  }
  
  /**
   * Get a specific template
   */
  getTemplate(templateId: string): PromptTemplate | undefined {
    return this.templates.get(templateId);
  }
  
  // =============================================================================
  // PRIVATE HELPER METHODS
  // =============================================================================
  
  private buildSystemPrompt(
    template: PromptTemplate,
    context: AssembledContext,
    options: PromptGenerationOptions
  ): string {
    let systemPrompt = template.systemPrompt;
    
    // Add context-specific instructions
    systemPrompt += this.getContextualInstructions(context, options);
    
    // Add formatting instructions
    systemPrompt += this.getFormattingInstructions(options);
    
    // Add disclaimer if requested
    if (options.includeDisclaimer !== false) {
      systemPrompt += `\n\nIMPORTANT DISCLAIMER: This analysis is for informational purposes only and should not be considered as financial advice. Cryptocurrency investments carry significant risks and past performance does not guarantee future results. Always conduct your own research and consult with qualified financial advisors before making investment decisions.`;
    }
    
    return systemPrompt;
  }
  
  private buildUserPrompt(
    template: PromptTemplate,
    context: AssembledContext,
    options: PromptGenerationOptions
  ): string {
    let userPrompt = template.userPromptTemplate;
    
    // Replace template variables
    userPrompt = this.replaceTemplateVariables(userPrompt, context, options);
    
    // Add context data
    userPrompt += this.formatContextData(context, template);
    
    // Add custom instructions if provided
    if (options.customInstructions) {
      userPrompt += `\n\nAdditional Instructions: ${options.customInstructions}`;
    }
    
    return userPrompt;
  }
  
  private replaceTemplateVariables(
    template: string,
    context: AssembledContext,
    options: PromptGenerationOptions
  ): string {
    const variables: Record<string, string> = {
      '{SYMBOL}': context.symbol,
      '{TIMEFRAME}': context.timeframe,
      '{CURRENT_PRICE}': context.market.currentPrice.toString(),
      '{PRICE_CHANGE_24H}': context.market.priceChangePercent24h.toFixed(2),
      '{VOLUME_24H}': this.formatNumber(context.market.volume24h),
      '{SENTIMENT_TREND}': context.aggregatedSentiment.trend,
      '{MARKET_MOMENTUM}': context.marketConditions.momentum,
      '{VOLATILITY}': context.marketConditions.volatility,
      '{TIME_HORIZON}': options.timeHorizon || 'medium_term',
      '{RISK_TOLERANCE}': options.riskTolerance || 'moderate',
      '{ANALYSIS_DEPTH}': options.analysisDepth || 'standard',
      '{TIMESTAMP}': new Date(context.timestamp).toISOString(),
    };
    
    let result = template;
    for (const [variable, value] of Object.entries(variables)) {
      result = result.replace(new RegExp(variable.replace(/[{}]/g, '\\$&'), 'g'), value);
    }
    
    return result;
  }
  
  private formatContextData(context: AssembledContext, template: PromptTemplate): string {
    let contextData = '\n\n=== MARKET CONTEXT ===\n';
    
    // Market data
    if (template.requiresMarketData) {
      contextData += this.formatMarketData(context.market);
    }
    
    // News data
    if (template.requiresNews && context.news.length > 0) {
      contextData += this.formatNewsData(context.news);
    }
    
    // Social data
    if (template.requiresSocial && context.social.length > 0) {
      contextData += this.formatSocialData(context.social);
    }
    
    // On-chain data
    if (template.requiresOnChain && context.onChain) {
      contextData += this.formatOnChainData(context.onChain);
    }
    
    // Sentiment summary
    contextData += this.formatSentimentSummary(context);
    
    return contextData;
  }
  
  private formatMarketData(market: MarketContext): string {
    let data = `\n**Price Data:**\n`;
    data += `- Current Price: $${market.currentPrice.toFixed(2)}\n`;
    data += `- 24h Change: ${market.priceChangePercent24h.toFixed(2)}% (${market.priceChange24h >= 0 ? '+' : ''}$${market.priceChange24h.toFixed(2)})\n`;
    data += `- 24h Range: $${market.low24h.toFixed(2)} - $${market.high24h.toFixed(2)}\n`;
    data += `- 24h Volume: ${this.formatNumber(market.volume24h)}\n`;
    
    if (market.marketCap) {
      data += `- Market Cap: ${this.formatNumber(market.marketCap)}\n`;
    }
    
    if (market.technicalIndicators) {
      data += `\n**Technical Indicators:**\n`;
      const ti = market.technicalIndicators;
      
      if (ti.rsi !== undefined) {
        data += `- RSI (14): ${ti.rsi.toFixed(2)} (${this.interpretRSI(ti.rsi)})\n`;
      }
      
      if (ti.macd) {
        data += `- MACD: ${ti.macd.value.toFixed(4)} (Signal: ${ti.macd.signal.toFixed(4)})\n`;
      }
      
      if (ti.bollinger) {
        data += `- Bollinger Bands: ${ti.bollinger.lower.toFixed(2)} | ${ti.bollinger.middle.toFixed(2)} | ${ti.bollinger.upper.toFixed(2)}\n`;
      }
      
      if (ti.support !== undefined) {
        data += `- Support Level: $${ti.support.toFixed(2)}\n`;
      }
      
      if (ti.resistance !== undefined) {
        data += `- Resistance Level: $${ti.resistance.toFixed(2)}\n`;
      }
    }
    
    if (market.orderBook) {
      data += `\n**Order Book:**\n`;
      data += `- Best Bid: $${market.orderBook.bestBid.toFixed(2)}\n`;
      data += `- Best Ask: $${market.orderBook.bestAsk.toFixed(2)}\n`;
      data += `- Spread: ${market.orderBook.spreadPercent.toFixed(4)}%\n`;
    }
    
    return data;
  }
  
  private formatNewsData(news: NewsContext[]): string {
    let data = `\n**Recent News (${news.length} items):**\n`;
    
    news.slice(0, 5).forEach((item, index) => {
      const publishedAt = new Date(item.publishedAt).toLocaleString();
      const sentiment = `${item.sentiment.label} (${(item.sentiment.score * 100).toFixed(0)}%)`;
      
      data += `\n${index + 1}. **${item.title}**\n`;
      data += `   Source: ${item.source} | Published: ${publishedAt}\n`;
      data += `   Sentiment: ${sentiment} | Importance: ${(item.importance * 100).toFixed(0)}%\n`;
      
      if (item.content.length > 200) {
        data += `   Summary: ${item.content.substring(0, 200)}...\n`;
      } else {
        data += `   Content: ${item.content}\n`;
      }
      
      if (item.topics.length > 0) {
        data += `   Topics: ${item.topics.join(', ')}\n`;
      }
    });
    
    return data;
  }
  
  private formatSocialData(social: SocialContext[]): string {
    let data = `\n**Social Media Mentions (${social.length} items):**\n`;
    
    // Group by platform
    const byPlatform = social.reduce((acc, item) => {
      if (!acc[item.platform]) acc[item.platform] = [];
      acc[item.platform].push(item);
      return acc;
    }, {} as Record<string, SocialContext[]>);
    
    for (const [platform, mentions] of Object.entries(byPlatform)) {
      data += `\n**${platform.toUpperCase()}:**\n`;
      
      mentions.slice(0, 3).forEach((mention, index) => {
        const timestamp = new Date(mention.timestamp).toLocaleString();
        const sentiment = `${mention.sentiment.label} (${(mention.sentiment.score * 100).toFixed(0)}%)`;
        const engagement = mention.engagement.likes + mention.engagement.shares + mention.engagement.comments;
        
        data += `${index + 1}. @${mention.author.username}`;
        if (mention.author.influence) {
          data += ` (Influence: ${(mention.author.influence * 100).toFixed(0)}%)`;
        }
        data += `\n   Posted: ${timestamp} | Sentiment: ${sentiment}\n`;
        data += `   Engagement: ${engagement} interactions\n`;
        
        if (mention.content.length > 150) {
          data += `   Content: ${mention.content.substring(0, 150)}...\n`;
        } else {
          data += `   Content: ${mention.content}\n`;
        }
      });
    }
    
    return data;
  }
  
  private formatOnChainData(onChain: OnChainContext): string {
    let data = `\n**On-Chain Metrics (${onChain.network}):**\n`;
    
    const metrics = onChain.metrics;
    
    if (metrics.activeAddresses !== undefined) {
      data += `- Active Addresses: ${this.formatNumber(metrics.activeAddresses)}\n`;
    }
    
    if (metrics.transactionCount !== undefined) {
      data += `- Transaction Count: ${this.formatNumber(metrics.transactionCount)}\n`;
    }
    
    if (metrics.transactionVolume !== undefined) {
      data += `- Transaction Volume: ${this.formatNumber(metrics.transactionVolume)}\n`;
    }
    
    if (metrics.averageTransactionValue !== undefined) {
      data += `- Average Transaction Value: $${metrics.averageTransactionValue.toFixed(2)}\n`;
    }
    
    if (metrics.whaleActivity) {
      data += `\n**Whale Activity:**\n`;
      data += `- Large Transactions: ${metrics.whaleActivity.largeTransactions}\n`;
      data += `- Total Value: ${this.formatNumber(metrics.whaleActivity.totalValue)}\n`;
    }
    
    if (metrics.networkHealth) {
      data += `\n**Network Health:**\n`;
      const health = metrics.networkHealth;
      
      if (health.hashRate !== undefined) {
        data += `- Hash Rate: ${this.formatNumber(health.hashRate)} H/s\n`;
      }
      
      if (health.difficulty !== undefined) {
        data += `- Difficulty: ${this.formatNumber(health.difficulty)}\n`;
      }
      
      if (health.blockTime !== undefined) {
        data += `- Average Block Time: ${health.blockTime.toFixed(2)}s\n`;
      }
    }
    
    return data;
  }
  
  private formatSentimentSummary(context: AssembledContext): string {
    const sentiment = context.aggregatedSentiment;
    
    let data = `\n**Sentiment Analysis:**\n`;
    data += `- Overall Sentiment: ${sentiment.trend} (${(sentiment.overall * 100).toFixed(0)}%)\n`;
    data += `- News Sentiment: ${(sentiment.news * 100).toFixed(0)}%\n`;
    data += `- Social Sentiment: ${(sentiment.social * 100).toFixed(0)}%\n`;
    data += `- Confidence Level: ${(sentiment.confidence * 100).toFixed(0)}%\n`;
    
    data += `\n**Market Conditions:**\n`;
    data += `- Trend: ${context.marketConditions.trend}\n`;
    data += `- Momentum: ${context.marketConditions.momentum}\n`;
    data += `- Volatility: ${context.marketConditions.volatility}\n`;
    data += `- Volume: ${context.marketConditions.volume}\n`;
    
    return data;
  }
  
  private getContextualInstructions(
    context: AssembledContext,
    options: PromptGenerationOptions
  ): string {
    let instructions = '\n\nContextual Guidelines:\n';
    
    // Time horizon specific instructions
    switch (options.timeHorizon) {
      case 'short_term':
        instructions += '- Focus on immediate price movements and short-term technical indicators\n';
        instructions += '- Emphasize minute-to-hour timeframes and momentum signals\n';
        break;
      case 'medium_term':
        instructions += '- Balance technical and fundamental analysis for medium-term outlook\n';
        instructions += '- Consider daily to weekly trends and news impact\n';
        break;
      case 'long_term':
        instructions += '- Emphasize fundamental analysis and long-term adoption trends\n';
        instructions += '- Focus on weekly to monthly patterns and strategic developments\n';
        break;
    }
    
    // Risk tolerance instructions
    switch (options.riskTolerance) {
      case 'conservative':
        instructions += '- Prioritize capital preservation and risk management\n';
        instructions += '- Highlight potential downside risks and defensive strategies\n';
        break;
      case 'moderate':
        instructions += '- Balance growth opportunities with risk management\n';
        instructions += '- Provide measured analysis with clear risk/reward ratios\n';
        break;
      case 'aggressive':
        instructions += '- Focus on growth opportunities and momentum plays\n';
        instructions += '- Highlight potential upside while acknowledging higher risks\n';
        break;
    }
    
    // Market condition adjustments
    if (context.marketConditions.volatility === 'high') {
      instructions += '- Account for high volatility in recommendations\n';
      instructions += '- Emphasize position sizing and stop-loss strategies\n';
    }
    
    if (context.aggregatedSentiment.confidence < 0.5) {
      instructions += '- Note low sentiment confidence in analysis\n';
      instructions += '- Recommend waiting for clearer signals\n';
    }
    
    return instructions;
  }
  
  private getFormattingInstructions(options: PromptGenerationOptions): string {
    let instructions = '\n\nFormatting Requirements:\n';
    
    switch (options.outputFormat) {
      case 'json':
        instructions += '- Provide response in valid JSON format\n';
        instructions += '- Include structured fields for analysis, risks, opportunities, and recommendations\n';
        break;
      case 'markdown':
        instructions += '- Use markdown formatting with headers, lists, and emphasis\n';
        instructions += '- Structure with clear sections and subsections\n';
        break;
      default:
        instructions += '- Use clear, well-structured text with bullet points and sections\n';
        instructions += '- Organize information logically with clear headings\n';
    }
    
    switch (options.analysisDepth) {
      case 'quick':
        instructions += '- Provide concise analysis focusing on key points\n';
        instructions += '- Limit response to essential insights and recommendations\n';
        break;
      case 'comprehensive':
        instructions += '- Provide detailed analysis covering all available data points\n';
        instructions += '- Include thorough explanations and multiple perspectives\n';
        break;
      default:
        instructions += '- Provide balanced analysis with appropriate detail level\n';
        instructions += '- Include key insights without overwhelming detail\n';
    }
    
    return instructions;
  }
  
  private validateContextRequirements(context: AssembledContext, template: PromptTemplate): void {
    const errors: string[] = [];
    
    if (template.requiresMarketData && !context.market) {
      errors.push('Market data is required but not available');
    }
    
    if (template.requiresNews && context.news.length === 0) {
      errors.push('News data is required but not available');
    }
    
    if (template.requiresSocial && context.social.length === 0) {
      errors.push('Social data is required but not available');
    }
    
    if (template.requiresOnChain && !context.onChain) {
      errors.push('On-chain data is required but not available');
    }
    
    if (errors.length > 0) {
      throw new Error(`Context validation failed: ${errors.join(', ')}`);
    }
  }
  
  private estimateTokens(text: string): number {
    // Rough estimation: ~4 characters per token for English text
    return Math.ceil(text.length / 4);
  }
  
  private interpretRSI(rsi: number): string {
    if (rsi > 70) return 'Overbought';
    if (rsi < 30) return 'Oversold';
    return 'Neutral';
  }
  
  private formatNumber(num: number): string {
    if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
    if (num >= 1e3) return `$${(num / 1e3).toFixed(2)}K`;
    return `$${num.toFixed(2)}`;
  }
  
  // =============================================================================
  // DEFAULT TEMPLATE INITIALIZATION
  // =============================================================================
  
  private initializeDefaultTemplates(): void {
    const templates: PromptTemplate[] = [
      {
        id: 'comprehensive_analysis',
        name: 'Comprehensive Crypto Analysis',
        description: 'Complete technical, fundamental, and sentiment analysis',
        category: 'market_summary',
        systemPrompt: `You are a professional cryptocurrency analyst with expertise in technical analysis, fundamental analysis, and market sentiment. Provide comprehensive, data-driven analysis based on the latest market data, news, and social sentiment.

Your analysis should be:
- Objective and fact-based
- Include both bullish and bearish perspectives
- Provide clear reasoning for your conclusions
- Include specific price levels and indicators where relevant
- Acknowledge uncertainties and limitations`,
        userPromptTemplate: `Please provide a comprehensive analysis of {SYMBOL} based on the current market conditions. The analysis should cover:

1. **Technical Analysis**: Current price action, key technical indicators, support/resistance levels
2. **Fundamental Analysis**: Recent news impact, market developments, and project fundamentals
3. **Sentiment Analysis**: Social media sentiment and overall market mood
4. **Risk Assessment**: Key risks and potential catalysts
5. **Trading Outlook**: Short-term and medium-term outlook for {TIME_HORIZON} perspective

Current Context:
- Symbol: {SYMBOL}
- Current Price: {CURRENT_PRICE}
- 24h Change: {PRICE_CHANGE_24H}%
- Market Sentiment: {SENTIMENT_TREND}
- Market Momentum: {MARKET_MOMENTUM}`,
        requiresMarketData: true,
        requiresNews: true,
        requiresSocial: true,
        requiresOnChain: false,
        maxTokens: 2000,
        temperature: 0.3,
        topP: 0.9,
      },
      
      {
        id: 'trading_signals',
        name: 'Trading Signal Generation',
        description: 'Generate actionable trading signals with entry/exit points',
        category: 'trading_signals',
        systemPrompt: `You are an expert trading strategist specializing in cryptocurrency markets. Generate clear, actionable trading signals based on technical analysis, market sentiment, and current market conditions.

Your signals should include:
- Clear entry and exit points
- Risk management recommendations
- Position sizing guidance
- Stop-loss and take-profit levels
- Timeframe-specific recommendations`,
        userPromptTemplate: `Generate trading signals for {SYMBOL} based on current market analysis:

Requirements:
- Time horizon: {TIME_HORIZON}
- Risk tolerance: {RISK_TOLERANCE}
- Current price: {CURRENT_PRICE}
- Volatility level: {VOLATILITY}

Please provide:
1. **Signal Direction**: Long/Short/Neutral with confidence level
2. **Entry Strategy**: Optimal entry points and conditions
3. **Exit Strategy**: Take-profit and stop-loss levels
4. **Position Sizing**: Recommended position size based on risk tolerance
5. **Risk Factors**: Key risks that could invalidate the signal`,
        requiresMarketData: true,
        requiresNews: false,
        requiresSocial: false,
        requiresOnChain: false,
        maxTokens: 1500,
        temperature: 0.2,
        topP: 0.8,
      },
      
      {
        id: 'sentiment_deep_dive',
        name: 'Sentiment Analysis Deep Dive',
        description: 'Detailed analysis of market sentiment and social trends',
        category: 'sentiment_analysis',
        systemPrompt: `You are a sentiment analysis expert specializing in cryptocurrency markets. Analyze social media sentiment, news sentiment, and overall market mood to provide insights into market psychology and potential price movements.

Focus on:
- Sentiment trend analysis and implications
- Identification of sentiment extremes
- Correlation between sentiment and price action
- Social media influence and viral trends
- News impact on market sentiment`,
        userPromptTemplate: `Analyze the current sentiment landscape for {SYMBOL}:

Current Sentiment Overview:
- Overall Trend: {SENTIMENT_TREND}
- News Sentiment: Analyze recent news impact
- Social Sentiment: Examine social media trends and discussions

Please provide:
1. **Sentiment Summary**: Current sentiment state and recent changes
2. **Trend Analysis**: How sentiment has evolved and what it indicates
3. **Market Psychology**: What the sentiment reveals about market participants
4. **Contrarian Indicators**: Any signs of sentiment extremes
5. **Price Correlation**: How sentiment aligns with recent price action`,
        requiresMarketData: true,
        requiresNews: true,
        requiresSocial: true,
        requiresOnChain: false,
        maxTokens: 1800,
        temperature: 0.4,
        topP: 0.9,
      },
      
      {
        id: 'risk_assessment',
        name: 'Risk Assessment Report',
        description: 'Comprehensive risk analysis and management recommendations',
        category: 'risk_assessment',
        systemPrompt: `You are a risk management specialist focusing on cryptocurrency investments. Provide thorough risk assessment covering market risks, technical risks, fundamental risks, and external factors.

Your assessment should include:
- Quantified risk levels where possible
- Multiple risk scenarios
- Risk mitigation strategies
- Portfolio impact considerations
- Correlation risks with broader markets`,
        userPromptTemplate: `Conduct a comprehensive risk assessment for {SYMBOL}:

Current Market State:
- Price: {CURRENT_PRICE} (24h change: {PRICE_CHANGE_24H}%)
- Volatility: {VOLATILITY}
- Market Momentum: {MARKET_MOMENTUM}

Please analyze:
1. **Technical Risks**: Price volatility, support/resistance breaks, technical failures
2. **Fundamental Risks**: Project risks, regulatory concerns, market developments
3. **Market Risks**: Correlation risks, liquidity risks, systemic risks
4. **Sentiment Risks**: Social media manipulation, FOMO/FUD cycles
5. **Risk Mitigation**: Strategies to manage identified risks`,
        requiresMarketData: true,
        requiresNews: true,
        requiresSocial: true,
        requiresOnChain: false,
        maxTokens: 1600,
        temperature: 0.3,
        topP: 0.8,
      },
    ];
    
    templates.forEach(template => {
      this.templates.set(template.id, template);
    });
  }
}

// =============================================================================
// DEFAULT CONFIGURATION AND EXPORTS
// =============================================================================

export const DEFAULT_PROMPT_OPTIONS: Partial<PromptGenerationOptions> = {
  timeHorizon: 'medium_term',
  riskTolerance: 'moderate',
  analysisDepth: 'standard',
  includeDisclaimer: true,
  outputFormat: 'text',
}; 