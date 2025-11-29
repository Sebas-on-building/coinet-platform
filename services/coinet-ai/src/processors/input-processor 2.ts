/**
 * 🧠 DIVINE INPUT PROCESSOR
 * 
 * This is the gateway to Coinet AI - intelligently detecting and processing
 * various input types into enriched context for analysis.
 * 
 * DIVINE CAPABILITIES:
 * - Smart input type detection (ticker, URL, thread, question)
 * - Context enrichment from multiple data sources
 * - Real-time data validation and freshness scoring
 * - Confidence assessment and error handling
 * 
 * INPUT TYPES SUPPORTED:
 * - Tickers: "BTC", "$BITCOIN", "Bitcoin", "BTC-USD"
 * - URLs: CoinMarketCap, CoinGecko, news articles
 * - Twitter/X threads: Tweet and thread links
 * - Natural questions: "What do you think about Ethereum?"
 * 
 * OUTPUT: ProcessedInput with enriched context ready for AI analysis
 */

import { logger } from '../utils/logger';
import { 
  UserInput, 
  ProcessedInput, 
  InputType, 
  MarketDataContext,
  SocialContext,
  NewsContext,
  OnChainContext,
  validateUserInput 
} from '../types/coinet-brief';
import { MarketDataService } from '../services/market-data-service';
import { SocialDataService } from '../services/social-data-service';
import { NewsDataService } from '../services/news-data-service';
import { OnChainDataService } from '../services/onchain-data-service';
import { v4 as uuidv4 } from 'uuid';

export class InputProcessor {
  private marketDataService: MarketDataService;
  private socialDataService: SocialDataService;
  private newsDataService: NewsDataService;
  private onChainDataService: OnChainDataService;

  // Known crypto symbols and aliases for detection
  private static readonly CRYPTO_SYMBOLS = new Map<string, string>([
    // Major cryptocurrencies
    ['bitcoin', 'BTC'], ['btc', 'BTC'], ['$btc', 'BTC'], ['btc-usd', 'BTC'],
    ['ethereum', 'ETH'], ['eth', 'ETH'], ['$eth', 'ETH'], ['eth-usd', 'ETH'],
    ['solana', 'SOL'], ['sol', 'SOL'], ['$sol', 'SOL'],
    ['cardano', 'ADA'], ['ada', 'ADA'], ['$ada', 'ADA'],
    ['polkadot', 'DOT'], ['dot', 'DOT'], ['$dot', 'DOT'],
    ['chainlink', 'LINK'], ['link', 'LINK'], ['$link', 'LINK'],
    ['polygon', 'MATIC'], ['matic', 'MATIC'], ['$matic', 'MATIC'],
    ['avalanche', 'AVAX'], ['avax', 'AVAX'], ['$avax', 'AVAX'],
    ['uniswap', 'UNI'], ['uni', 'UNI'], ['$uni', 'UNI'],
    ['aave', 'AAVE'], ['$aave', 'AAVE'],
    // Add more as needed
  ]);

  // URL patterns for different data sources
  private static readonly URL_PATTERNS = {
    coinmarketcap: /coinmarketcap\.com\/currencies\/([^\/]+)/,
    coingecko: /coingecko\.com\/en\/coins\/([^\/]+)/,
    twitter: /(?:twitter\.com|x\.com)\/\w+\/status\/\d+/,
    youtube: /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/,
    news: /(?:coindesk|cointelegraph|decrypt|bitcoinmagazine)\.com/,
  };

  constructor() {
    this.marketDataService = new MarketDataService();
    this.socialDataService = new SocialDataService();
    this.newsDataService = new NewsDataService();
    this.onChainDataService = new OnChainDataService();

    logger.info('🧠 InputProcessor initialized with divine intelligence');
  }

  /**
   * 🎯 MASTER INPUT PROCESSING
   * 
   * Main entry point that processes any user input into enriched context
   */
  async processInput(input: UserInput): Promise<ProcessedInput> {
    const startTime = Date.now();
    const requestId = uuidv4();

    try {
      logger.info(`🎯 Processing input [${requestId}]: "${input.content.substring(0, 100)}..."`);

      // 1. Validate input
      const validatedInput = validateUserInput(input);

      // 2. Detect input type if auto
      const detectedType = input.type === 'auto' 
        ? await this.detectInputType(input.content)
        : input.type;

      // 3. Extract symbol/entity
      const symbolInfo = await this.extractSymbol(input.content, detectedType);

      // 4. Enrich with context data
      const enrichedData = await this.enrichWithContextData(
        symbolInfo.symbol, 
        detectedType, 
        input.content,
        input.context
      );

      // 5. Assess data quality
      const qualityMetrics = this.assessDataQuality(enrichedData);

      const processedInput: ProcessedInput = {
        originalInput: validatedInput,
        detectedType,
        symbol: symbolInfo.symbol,
        confidence: symbolInfo.confidence,
        ...enrichedData,
        processedAt: new Date(),
        dataFreshness: qualityMetrics.freshness,
        completeness: qualityMetrics.completeness
      };

      const processingTime = Date.now() - startTime;
      logger.info(`✅ Input processed successfully [${requestId}] in ${processingTime}ms - Symbol: ${symbolInfo.symbol}, Type: ${detectedType}, Confidence: ${symbolInfo.confidence}`);

      return processedInput;

    } catch (error) {
      const processingTime = Date.now() - startTime;
      logger.error(`❌ Input processing failed [${requestId}] after ${processingTime}ms:`, error);
      throw new Error(`Input processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 🔍 INTELLIGENT INPUT TYPE DETECTION
   * 
   * Uses pattern matching and heuristics to detect input type
   */
  private async detectInputType(content: string): Promise<InputType> {
    const cleanContent = content.trim().toLowerCase();

    // Check for URLs first
    if (this.isUrl(content)) {
      if (InputProcessor.URL_PATTERNS.twitter.test(content)) {
        return 'thread';
      }
      if (InputProcessor.URL_PATTERNS.news.test(content)) {
        return 'news';
      }
      return 'url';
    }

    // Check for ticker symbols
    if (this.isTicker(cleanContent)) {
      return 'ticker';
    }

    // If it's a question or conversational
    if (this.isQuestion(cleanContent)) {
      return 'question';
    }

    // Default to question for natural language
    return 'question';
  }

  /**
   * 🎯 SYMBOL EXTRACTION
   * 
   * Extracts cryptocurrency symbol from various input formats
   */
  private async extractSymbol(content: string, inputType: InputType): Promise<{ symbol: string; confidence: number }> {
    const cleanContent = content.trim().toLowerCase();

    switch (inputType) {
      case 'ticker':
        return this.extractSymbolFromTicker(cleanContent);
      
      case 'url':
        return this.extractSymbolFromUrl(content);
      
      case 'thread':
      case 'news':
        return this.extractSymbolFromContent(content);
      
      case 'question':
        return this.extractSymbolFromQuestion(cleanContent);
      
      default:
        return { symbol: 'BTC', confidence: 0.1 }; // Default fallback
    }
  }

  /**
   * Extract symbol from direct ticker input
   */
  private extractSymbolFromTicker(ticker: string): { symbol: string; confidence: number } {
    // Remove common prefixes/suffixes
    const cleaned = ticker
      .replace(/^\$/, '')           // Remove $ prefix
      .replace(/-usd$|\/usd$/, '')  // Remove USD suffix
      .replace(/usdt$/, '')         // Remove USDT suffix
      .trim();

    const symbol = InputProcessor.CRYPTO_SYMBOLS.get(cleaned);
    if (symbol) {
      return { symbol, confidence: 0.95 };
    }

    // If not found, try uppercase
    const upperCleaned = cleaned.toUpperCase();
    if (upperCleaned.length >= 2 && upperCleaned.length <= 5) {
      return { symbol: upperCleaned, confidence: 0.8 };
    }

    return { symbol: 'BTC', confidence: 0.1 };
  }

  /**
   * Extract symbol from URL
   */
  private extractSymbolFromUrl(url: string): { symbol: string; confidence: number } {
    // CoinMarketCap
    const cmcMatch = url.match(InputProcessor.URL_PATTERNS.coinmarketcap);
    if (cmcMatch) {
      const slug = cmcMatch[1];
      const symbol = this.slugToSymbol(slug);
      return { symbol, confidence: 0.9 };
    }

    // CoinGecko
    const cgMatch = url.match(InputProcessor.URL_PATTERNS.coingecko);
    if (cgMatch) {
      const slug = cgMatch[1];
      const symbol = this.slugToSymbol(slug);
      return { symbol, confidence: 0.9 };
    }

    return { symbol: 'BTC', confidence: 0.2 };
  }

  /**
   * Extract symbol from content or questions
   */
  private extractSymbolFromContent(content: string): { symbol: string; confidence: number } {
    const cleanContent = content.toLowerCase();
    
    // Look for crypto mentions
    for (const [key, symbol] of InputProcessor.CRYPTO_SYMBOLS.entries()) {
      if (cleanContent.includes(key)) {
        return { symbol, confidence: 0.85 };
      }
    }

    // Look for common patterns like $BTC, #bitcoin, etc.
    const symbolMatch = cleanContent.match(/[\$#]?([a-z]{2,10})/g);
    if (symbolMatch) {
      for (const match of symbolMatch) {
        const cleaned = match.replace(/[\$#]/, '');
        const symbol = InputProcessor.CRYPTO_SYMBOLS.get(cleaned);
        if (symbol) {
          return { symbol, confidence: 0.75 };
        }
      }
    }

    return { symbol: 'BTC', confidence: 0.3 };
  }

  /**
   * Extract symbol from natural language questions
   */
  private extractSymbolFromQuestion(question: string): { symbol: string; confidence: number } {
    // Similar to content extraction but with question-specific patterns
    return this.extractSymbolFromContent(question);
  }

  /**
   * 🔄 CONTEXT DATA ENRICHMENT
   * 
   * Fetches and enriches with market, social, news, and on-chain data
   */
  private async enrichWithContextData(
    symbol: string, 
    inputType: InputType, 
    originalContent: string,
    userContext?: UserInput['context']
  ): Promise<{
    marketData?: MarketDataContext;
    socialData?: SocialContext;
    newsData?: NewsContext;
    onChainData?: OnChainContext;
  }> {
    try {
      logger.info(`🔄 Enriching data for ${symbol}...`);

      // Fetch data in parallel for speed
      const [marketData, socialData, newsData, onChainData] = await Promise.allSettled([
        this.marketDataService.getMarketData(symbol),
        this.socialDataService.getSocialData(symbol),
        this.newsDataService.getNewsData(symbol),
        this.onChainDataService.getOnChainData(symbol)
      ]);

      return {
        marketData: marketData.status === 'fulfilled' ? marketData.value : undefined,
        socialData: socialData.status === 'fulfilled' ? socialData.value : undefined,
        newsData: newsData.status === 'fulfilled' ? newsData.value : undefined,
        onChainData: onChainData.status === 'fulfilled' ? onChainData.value : undefined
      };

    } catch (error) {
      logger.warn(`⚠️ Context enrichment partially failed for ${symbol}:`, error);
      return {};
    }
  }

  /**
   * 📊 DATA QUALITY ASSESSMENT
   * 
   * Assesses freshness and completeness of gathered data
   */
  private assessDataQuality(data: any): { freshness: number; completeness: number } {
    let freshnessScore = 0;
    let completenessScore = 0;
    let dataSourceCount = 0;

    // Assess each data source
    if (data.marketData) {
      dataSourceCount++;
      freshnessScore += this.calculateFreshness(data.marketData.lastUpdated);
      completenessScore += data.marketData.currentPrice ? 1 : 0.5;
    }

    if (data.socialData) {
      dataSourceCount++;
      freshnessScore += this.calculateFreshness(data.socialData.lastUpdated);
      completenessScore += data.socialData.sentiment ? 1 : 0.5;
    }

    if (data.newsData) {
      dataSourceCount++;
      freshnessScore += this.calculateFreshness(data.newsData.lastUpdated);
      completenessScore += data.newsData.recentNews?.length > 0 ? 1 : 0.3;
    }

    if (data.onChainData) {
      dataSourceCount++;
      freshnessScore += this.calculateFreshness(data.onChainData.lastUpdated);
      completenessScore += data.onChainData.activeAddresses ? 1 : 0.5;
    }

    return {
      freshness: dataSourceCount > 0 ? freshnessScore / dataSourceCount : 0,
      completeness: dataSourceCount > 0 ? completenessScore / dataSourceCount : 0
    };
  }

  // =============================================================================
  // UTILITY METHODS
  // =============================================================================

  private isUrl(content: string): boolean {
    try {
      new URL(content);
      return true;
    } catch {
      return false;
    }
  }

  private isTicker(content: string): boolean {
    // Check if it looks like a ticker symbol
    const tickerPattern = /^[\$#]?[a-z]{2,10}(-usd|\/usd|usdt)?$/i;
    return tickerPattern.test(content) || InputProcessor.CRYPTO_SYMBOLS.has(content);
  }

  private isQuestion(content: string): boolean {
    const questionWords = ['what', 'how', 'why', 'when', 'where', 'should', 'can', 'will', 'is', 'are'];
    const words = content.toLowerCase().split(' ');
    return questionWords.some(q => words.includes(q)) || content.includes('?');
  }

  private slugToSymbol(slug: string): string {
    const symbolMap: Record<string, string> = {
      'bitcoin': 'BTC',
      'ethereum': 'ETH',
      'solana': 'SOL',
      'cardano': 'ADA',
      'polkadot': 'DOT',
      'chainlink': 'LINK',
      'polygon': 'MATIC',
      'avalanche-2': 'AVAX',
      'uniswap': 'UNI',
      'aave': 'AAVE'
    };

    return symbolMap[slug] || slug.toUpperCase();
  }

  private calculateFreshness(lastUpdated: Date): number {
    const now = new Date();
    const ageInMinutes = (now.getTime() - lastUpdated.getTime()) / (1000 * 60);
    
    // Fresh data scores higher
    if (ageInMinutes < 5) return 1.0;      // Very fresh
    if (ageInMinutes < 15) return 0.9;     // Fresh
    if (ageInMinutes < 60) return 0.7;     // Acceptable
    if (ageInMinutes < 240) return 0.5;    // Aging
    return 0.2;                            // Stale
  }
}
