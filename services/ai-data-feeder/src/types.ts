/**
 * AI Data Feeder Types
 * Types for 24/7 AI data feeding service
 */

export interface AIMarketDataPoint {
  coin: string;
  timestamp: Date;
  price: {
    current: number;
    change24h: number;
    changePercentage24h: number;
    high24h?: number;
    low24h?: number;
    volume24h: number;
    marketCap: number;
  };
  news: {
    count: number;
    sentiment: 'positive' | 'negative' | 'neutral';
    sentimentScore: number;
    panicScore: number;
    topHeadlines: Array<{
      title: string;
      sentiment: string;
      publishedAt: Date;
    }>;
  };
  technicalIndicators?: {
    rsi?: number;
    macd?: number;
    ema20?: number;
    ema50?: number;
  };
}

export interface AIAnalysisResult {
  coin: string;
  timestamp: Date;
  recommendation: 'buy' | 'sell' | 'hold';
  confidence: number;
  reasoning: string;
  signals: Array<{
    type: string;
    strength: number;
    description: string;
  }>;
}

export interface DataFeederConfig {
  // Coins to track
  coins: string[];
  
  // Update intervals (in milliseconds)
  priceUpdateInterval: number;  // Default: 60000 (1 minute)
  newsUpdateInterval: number;    // Default: 300000 (5 minutes)
  aiAnalysisInterval: number;   // Default: 600000 (10 minutes)
  
  // Storage
  enableRedisCache: boolean;
  enableDatabase: boolean;
  
  // Features
  enableSentimentAnalysis: boolean;
  enableTechnicalAnalysis: boolean;
  enableAIInsights: boolean;
  
  // Limits
  maxHistoricalDays: number;
  maxNewsArticles: number;
}

export interface DataFeedEvent {
  type: 'price_update' | 'news_update' | 'ai_analysis' | 'error';
  coin: string;
  timestamp: Date;
  data: any;
}

