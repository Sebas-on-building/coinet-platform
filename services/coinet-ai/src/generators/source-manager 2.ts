/**
 * 📚 SOURCE MANAGER
 * 
 * Manages source attribution and credibility scoring for transparent
 * and trustworthy analysis results.
 */

import { logger } from '../utils/logger';
import { ProcessedInput, Source } from '../types/coinet-brief';

export class SourceManager {
  private credibilityMap: Map<string, number>;

  constructor() {
    this.credibilityMap = new Map([
      // Market data sources
      ['CoinMarketCap', 0.9],
      ['CoinGecko', 0.85],
      ['Binance', 0.95],
      ['Coinbase', 0.95],
      
      // News sources
      ['Reuters', 0.95],
      ['Bloomberg', 0.95],
      ['CoinDesk', 0.9],
      ['Bitcoin Magazine', 0.85],
      ['The Block', 0.85],
      ['Decrypt', 0.8],
      ['CoinTelegraph', 0.75],
      
      // Social sources
      ['Twitter', 0.6],
      ['Reddit', 0.7],
      ['Telegram', 0.5],
      
      // On-chain sources
      ['Glassnode', 0.9],
      ['IntoTheBlock', 0.85],
      ['Whale Alert', 0.85],
      
      // AI sources
      ['Coinet Psychology Engine', 0.95],
      ['Coinet Oracle System', 0.92],
      ['Coinet Market Data', 0.88]
    ]);

    logger.info('📚 SourceManager initialized');
  }

  /**
   * Compile comprehensive source list for the analysis
   */
  async compileSources(input: ProcessedInput): Promise<Source[]> {
    const sources: Source[] = [];

    try {
      // Market data sources
      if (input.marketData) {
        sources.push({
          type: 'market_data',
          provider: 'Coinet Market Data',
          title: `Market data for ${input.symbol}`,
          credibility: this.getCredibility('Coinet Market Data'),
          relevance: 1.0,
          publishedAt: input.marketData.lastUpdated
        });

        // Add external market data sources based on availability
        sources.push({
          type: 'market_data',
          provider: 'CoinMarketCap',
          title: `${input.symbol} price and market data`,
          url: `https://coinmarketcap.com/currencies/${input.symbol.toLowerCase()}`,
          credibility: this.getCredibility('CoinMarketCap'),
          relevance: 0.95
        });
      }

      // Social data sources
      if (input.socialData) {
        sources.push({
          type: 'social',
          provider: 'Social Media Aggregator',
          title: `Social sentiment analysis for ${input.symbol}`,
          credibility: Math.max(0.5, input.socialData.sentiment.authenticity),
          relevance: 0.8,
          publishedAt: input.socialData.lastUpdated
        });

        // Add specific social mentions
        if (input.socialData.topMentions) {
          input.socialData.topMentions.slice(0, 2).forEach((mention, index) => {
            sources.push({
              type: 'social',
              provider: mention.platform,
              title: `${mention.platform} mention: ${mention.content.substring(0, 50)}...`,
              credibility: this.getCredibility(mention.platform) * (mention.influence || 0.5),
              relevance: Math.min(1.0, mention.engagement / 1000) // Normalize engagement and cap at 1.0
            });
          });
        }
      }

      // News sources
      if (input.newsData?.recentNews) {
        input.newsData.recentNews.slice(0, 3).forEach(news => {
          sources.push({
            type: 'news',
            provider: news.source,
            title: news.title,
            url: news.url,
            credibility: news.credibility,
            relevance: this.calculateNewsRelevance(news.title, input.symbol),
            publishedAt: news.publishedAt
          });
        });
      }

      // On-chain sources
      if (input.onChainData) {
        sources.push({
          type: 'onchain',
          provider: 'On-Chain Analytics',
          title: `On-chain metrics for ${input.symbol}`,
          credibility: this.getCredibility('Glassnode'),
          relevance: 0.9,
          publishedAt: input.onChainData.lastUpdated
        });

        // Add whale activity source if significant
        if (input.onChainData.whaleActivity.largeTransfers > 10) {
          sources.push({
            type: 'onchain',
            provider: 'Whale Alert',
            title: `Large transaction monitoring for ${input.symbol}`,
            credibility: this.getCredibility('Whale Alert'),
            relevance: 0.85
          });
        }
      }

      // AI analysis sources (these will be added when psychology/oracle insights are included)
      sources.push({
        type: 'analysis',
        provider: 'Coinet AI Analysis Engine',
        title: `AI-powered analysis for ${input.symbol}`,
        credibility: 0.88,
        relevance: 1.0
      });

      // Sort by credibility and relevance
      return sources
        .sort((a, b) => (b.credibility * b.relevance) - (a.credibility * a.relevance))
        .slice(0, 8); // Limit to top 8 sources

    } catch (error) {
      logger.error('❌ Source compilation failed:', error);
      
      // Return minimal fallback sources
      return [{
        type: 'analysis',
        provider: 'Coinet AI',
        title: `Analysis for ${input.symbol}`,
        credibility: 0.8,
        relevance: 1.0
      }];
    }
  }

  /**
   * Add psychology engine as a source
   */
  addPsychologySource(symbol: string, hasWarnings: boolean): Source {
    return {
      type: 'psychology',
      provider: 'Coinet Psychology Engine',
      title: `Psychological analysis for ${symbol}`,
      credibility: this.getCredibility('Coinet Psychology Engine'),
      relevance: hasWarnings ? 1.0 : 0.8
    };
  }

  /**
   * Add oracle system as a source
   */
  addOracleSource(symbol: string, predictionCount: number): Source {
    return {
      type: 'oracle',
      provider: 'Coinet Oracle System',
      title: `Predictive analysis for ${symbol}`,
      credibility: this.getCredibility('Coinet Oracle System'),
      relevance: Math.min(1.0, Math.max(0.0, predictionCount * 0.3))
    };
  }

  /**
   * Get credibility score for a provider
   */
  private getCredibility(provider: string): number {
    return this.credibilityMap.get(provider) || 0.6;
  }

  /**
   * Calculate news relevance to the symbol
   */
  private calculateNewsRelevance(title: string, symbol: string): number {
    const lowerTitle = title.toLowerCase();
    const lowerSymbol = symbol.toLowerCase();
    
    // Direct symbol mention
    if (lowerTitle.includes(lowerSymbol)) return 1.0;
    
    // Cryptocurrency names
    const cryptoNames: Record<string, string[]> = {
      'BTC': ['bitcoin', 'btc'],
      'ETH': ['ethereum', 'eth', 'ether'],
      'SOL': ['solana', 'sol'],
      'ADA': ['cardano', 'ada'],
      'DOT': ['polkadot', 'dot'],
      'LINK': ['chainlink', 'link'],
      'MATIC': ['polygon', 'matic'],
      'AVAX': ['avalanche', 'avax'],
      'UNI': ['uniswap', 'uni'],
      'AAVE': ['aave']
    };
    
    const names = cryptoNames[symbol.toUpperCase()] || [];
    for (const name of names) {
      if (lowerTitle.includes(name)) return 0.9;
    }
    
    // General crypto terms
    const generalTerms = ['crypto', 'cryptocurrency', 'bitcoin', 'blockchain', 'defi'];
    for (const term of generalTerms) {
      if (lowerTitle.includes(term)) return 0.4;
    }
    
    return 0.2; // Minimal relevance
  }

  /**
   * Validate source data quality
   */
  validateSources(sources: Source[]): {
    averageCredibility: number;
    averageRelevance: number;
    warnings: string[];
  } {
    const warnings: string[] = [];
    
    if (sources.length === 0) {
      warnings.push('No sources available');
      return { averageCredibility: 0, averageRelevance: 0, warnings };
    }
    
    const avgCredibility = sources.reduce((sum, s) => sum + s.credibility, 0) / sources.length;
    const avgRelevance = sources.reduce((sum, s) => sum + s.relevance, 0) / sources.length;
    
    if (avgCredibility < 0.7) {
      warnings.push('Below-average source credibility');
    }
    
    if (avgRelevance < 0.6) {
      warnings.push('Limited source relevance to query');
    }
    
    const lowCredibilitySources = sources.filter(s => s.credibility < 0.6).length;
    if (lowCredibilitySources > sources.length * 0.3) {
      warnings.push('High proportion of low-credibility sources');
    }
    
    return {
      averageCredibility: Math.round(avgCredibility * 100) / 100,
      averageRelevance: Math.round(avgRelevance * 100) / 100,
      warnings
    };
  }
}
