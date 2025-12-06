/**
 * 🔑 API Keys Configuration Service
 * 
 * Centralized API key management with:
 * - Detection of available/missing keys at startup
 * - Graceful degradation recommendations
 * - Tier-based feature enablement
 * - Security-conscious logging (no key values exposed)
 * 
 * @module api-keys
 * @version 1.0.0 - Divine Perfection Step 1.1.2
 */

import { logger } from '../utils/logger';

// ============================================================================
// TYPES
// ============================================================================

export interface ApiKeyConfig {
  name: string;
  envVar: string;
  required: boolean;
  category: 'ai' | 'market' | 'news' | 'social' | 'derivatives' | 'infrastructure';
  description: string;
  freeAlternative?: string;
  docsUrl?: string;
  tier: 'free' | 'basic' | 'pro' | 'enterprise';
}

export interface ApiKeyStatus {
  name: string;
  envVar: string;
  configured: boolean;
  category: string;
  tier: string;
  required: boolean;
  freeAlternative?: string;
}

export interface ApiKeysReport {
  timestamp: string;
  totalKeys: number;
  configuredKeys: number;
  missingRequired: string[];
  missingOptional: string[];
  recommendations: string[];
  categories: Record<string, {
    configured: number;
    total: number;
    status: 'full' | 'partial' | 'none';
  }>;
  featureAvailability: Record<string, boolean>;
}

// ============================================================================
// API KEY DEFINITIONS
// ============================================================================

const API_KEYS: ApiKeyConfig[] = [
  // AI Services
  {
    name: 'Grok (xAI)',
    envVar: 'XAI_API_KEY',
    required: false,
    category: 'ai',
    description: 'Primary AI model for chat responses',
    freeAlternative: 'OpenAI (if configured)',
    docsUrl: 'https://x.ai/api',
    tier: 'pro',
  },
  {
    name: 'Grok (Alt)',
    envVar: 'GROK_API_KEY',
    required: false,
    category: 'ai',
    description: 'Alternative Grok API key',
    tier: 'pro',
  },
  {
    name: 'OpenAI',
    envVar: 'OPENAI_API_KEY',
    required: false,
    category: 'ai',
    description: 'Fallback AI model (GPT-4)',
    docsUrl: 'https://platform.openai.com/api-keys',
    tier: 'basic',
  },

  // Market Data
  {
    name: 'CoinGecko',
    envVar: 'COINGECKO_API_KEY',
    required: false,
    category: 'market',
    description: 'Cryptocurrency market data (Pro tier)',
    freeAlternative: 'Free tier with rate limits (10 req/min)',
    docsUrl: 'https://www.coingecko.com/en/api/pricing',
    tier: 'free',
  },
  {
    name: 'CoinMarketCap',
    envVar: 'CMC_API_KEY',
    required: false,
    category: 'market',
    description: 'Backup market data source',
    freeAlternative: 'CoinGecko free tier',
    docsUrl: 'https://coinmarketcap.com/api/',
    tier: 'basic',
  },

  // News Services
  {
    name: 'CryptoPanic',
    envVar: 'CRYPTOPANIC_API_KEY',
    required: false,
    category: 'news',
    description: 'Crypto news aggregator with sentiment',
    freeAlternative: 'RSS feeds (CoinDesk, Decrypt, etc.)',
    docsUrl: 'https://cryptopanic.com/developers/api/',
    tier: 'basic',
  },
  {
    name: 'Messari',
    envVar: 'MESSARI_API_KEY',
    required: false,
    category: 'news',
    description: 'Institutional-grade research & news',
    freeAlternative: 'CryptoPanic or RSS feeds',
    docsUrl: 'https://messari.io/api',
    tier: 'pro',
  },
  {
    name: 'The Block',
    envVar: 'THEBLOCK_API_KEY',
    required: false,
    category: 'news',
    description: 'Premium crypto journalism',
    freeAlternative: 'RSS feeds',
    docsUrl: 'https://www.theblock.co/',
    tier: 'enterprise',
  },

  // Social Intelligence
  {
    name: 'LunarCrush',
    envVar: 'LUNARCRUSH_API_KEY',
    required: false,
    category: 'social',
    description: 'Social media sentiment & metrics',
    freeAlternative: 'Basic sentiment analysis',
    docsUrl: 'https://lunarcrush.com/developers/api',
    tier: 'basic',
  },
  {
    name: 'Twitter API Key',
    envVar: 'TWITTER_API_KEY',
    required: false,
    category: 'social',
    description: 'Twitter/X data access',
    tier: 'basic',
  },
  {
    name: 'Twitter API Secret',
    envVar: 'TWITTER_API_SECRET',
    required: false,
    category: 'social',
    description: 'Twitter/X API secret',
    tier: 'basic',
  },
  {
    name: 'Twitter Bearer Token',
    envVar: 'TWITTER_BEARER_TOKEN',
    required: false,
    category: 'social',
    description: 'Twitter/X bearer token for API v2',
    tier: 'basic',
  },

  // Derivatives & Liquidations
  {
    name: 'Coinglass',
    envVar: 'COINGLASS_API_KEY',
    required: false,
    category: 'derivatives',
    description: 'Primary liquidation data & funding rates aggregator',
    freeAlternative: 'Exchange APIs (Binance, OKX, Bybit)',
    docsUrl: 'https://coinglass.com/api',
    tier: 'basic',
  },
  {
    name: 'Laevitas',
    envVar: 'LAEVITAS_API_KEY',
    required: false,
    category: 'derivatives',
    description: 'Options & derivatives analytics (cross-verification)',
    freeAlternative: 'Coinglass or exchange APIs',
    docsUrl: 'https://laevitas.ch/',
    tier: 'pro',
  },
  {
    name: 'Deribit',
    envVar: 'DERIBIT_API_KEY',
    required: false,
    category: 'derivatives',
    description: 'Options market data & funding rates',
    freeAlternative: 'Public API endpoints',
    docsUrl: 'https://docs.deribit.com/',
    tier: 'free',
  },
  {
    name: 'CryptoQuant',
    envVar: 'CRYPTOQUANT_API_KEY',
    required: false,
    category: 'derivatives',
    description: 'On-chain & derivatives analytics',
    freeAlternative: 'Basic metrics only',
    docsUrl: 'https://cryptoquant.com/docs',
    tier: 'pro',
  },
  {
    name: 'Glassnode',
    envVar: 'GLASSNODE_API_KEY',
    required: false,
    category: 'derivatives',
    description: 'On-chain metrics & market indicators',
    freeAlternative: 'Limited free tier',
    docsUrl: 'https://docs.glassnode.com/',
    tier: 'pro',
  },

  // Infrastructure
  {
    name: 'Database URL',
    envVar: 'DATABASE_URL',
    required: true,
    category: 'infrastructure',
    description: 'PostgreSQL database connection',
    tier: 'free',
  },
  {
    name: 'Redis URL',
    envVar: 'REDIS_URL',
    required: false,
    category: 'infrastructure',
    description: 'Redis cache for ai-data-feeder integration',
    freeAlternative: 'Local caching (slower)',
    tier: 'free',
  },
  {
    name: 'Market Prices Service',
    envVar: 'MARKET_PRICES_URL',
    required: false,
    category: 'infrastructure',
    description: 'Internal market prices microservice',
    freeAlternative: 'Direct CoinGecko API calls',
    tier: 'free',
  },
  {
    name: 'Alchemy Whales Service',
    envVar: 'ALCHEMY_WHALES_URL',
    required: false,
    category: 'infrastructure',
    description: 'Whale tracking microservice',
    tier: 'free',
  },
];

// ============================================================================
// FUNCTIONS
// ============================================================================

/**
 * Check if an API key is configured
 */
function isKeyConfigured(envVar: string): boolean {
  const value = process.env[envVar];
  return !!(value && value.length > 5 && !value.includes('<') && !value.includes('>'));
}

/**
 * Get status of all API keys
 */
export function getApiKeyStatuses(): ApiKeyStatus[] {
  return API_KEYS.map(key => ({
    name: key.name,
    envVar: key.envVar,
    configured: isKeyConfigured(key.envVar),
    category: key.category,
    tier: key.tier,
    required: key.required,
    freeAlternative: key.freeAlternative,
  }));
}

/**
 * Generate comprehensive API keys report
 */
export function generateApiKeysReport(): ApiKeysReport {
  const statuses = getApiKeyStatuses();
  
  const configuredKeys = statuses.filter(s => s.configured).length;
  const missingRequired = statuses.filter(s => s.required && !s.configured).map(s => s.envVar);
  const missingOptional = statuses.filter(s => !s.required && !s.configured).map(s => s.envVar);
  
  // Calculate category stats
  const categories: Record<string, { configured: number; total: number; status: 'full' | 'partial' | 'none' }> = {};
  
  for (const status of statuses) {
    if (!categories[status.category]) {
      categories[status.category] = { configured: 0, total: 0, status: 'none' };
    }
    categories[status.category].total++;
    if (status.configured) {
      categories[status.category].configured++;
    }
  }
  
  // Determine category status
  for (const [cat, stats] of Object.entries(categories)) {
    if (stats.configured === stats.total) {
      stats.status = 'full';
    } else if (stats.configured > 0) {
      stats.status = 'partial';
    } else {
      stats.status = 'none';
    }
  }
  
  // Generate recommendations
  const recommendations: string[] = [];
  
  // AI recommendations
  const hasAnyAI = isKeyConfigured('XAI_API_KEY') || isKeyConfigured('GROK_API_KEY') || isKeyConfigured('OPENAI_API_KEY');
  if (!hasAnyAI) {
    recommendations.push('🚨 CRITICAL: No AI API key configured. Set XAI_API_KEY or OPENAI_API_KEY for chat functionality.');
  }
  
  // News recommendations
  const hasNewsApi = isKeyConfigured('CRYPTOPANIC_API_KEY');
  if (!hasNewsApi) {
    recommendations.push('💡 Add CRYPTOPANIC_API_KEY for better news coverage (currently using RSS fallback).');
  }
  
  // Market data recommendations
  const hasCoinGecko = isKeyConfigured('COINGECKO_API_KEY');
  if (!hasCoinGecko) {
    recommendations.push('💡 Add COINGECKO_API_KEY for higher rate limits (currently limited to 10 req/min).');
  }
  
  // Derivatives recommendations
  const hasCoinglass = isKeyConfigured('COINGLASS_API_KEY');
  if (!hasCoinglass) {
    recommendations.push('💡 Add COINGLASS_API_KEY for liquidation data and funding rates.');
  }
  
  // Social recommendations
  const hasLunarCrush = isKeyConfigured('LUNARCRUSH_API_KEY');
  if (!hasLunarCrush) {
    recommendations.push('💡 Add LUNARCRUSH_API_KEY for social sentiment analysis.');
  }
  
  // Redis recommendations
  const hasRedis = isKeyConfigured('REDIS_URL');
  if (!hasRedis) {
    recommendations.push('💡 Add REDIS_URL to enable shared cache with ai-data-feeder (reduces API calls).');
  }
  
  // Feature availability
  const featureAvailability: Record<string, boolean> = {
    aiChat: hasAnyAI,
    premiumNews: hasNewsApi,
    rssNews: true, // Always available
    marketData: true, // CoinGecko free tier always works
    premiumMarketData: hasCoinGecko,
    liquidations: hasCoinglass,
    socialSentiment: hasLunarCrush,
    whaleTracking: isKeyConfigured('ALCHEMY_WHALES_URL') || true, // Has default URL
    redisCache: hasRedis,
    database: isKeyConfigured('DATABASE_URL'),
  };
  
  return {
    timestamp: new Date().toISOString(),
    totalKeys: statuses.length,
    configuredKeys,
    missingRequired,
    missingOptional,
    recommendations,
    categories,
    featureAvailability,
  };
}

/**
 * Log API keys status at startup
 */
export function logApiKeysStatus(): void {
  const report = generateApiKeysReport();
  
  logger.info('🔑 API Keys Configuration Report', {
    configured: `${report.configuredKeys}/${report.totalKeys}`,
    missingRequired: report.missingRequired.length,
    missingOptional: report.missingOptional.length,
  });
  
  // Log by category
  for (const [category, stats] of Object.entries(report.categories)) {
    const emoji = stats.status === 'full' ? '✅' : stats.status === 'partial' ? '⚠️' : '❌';
    logger.info(`${emoji} ${category.toUpperCase()}: ${stats.configured}/${stats.total} keys configured`);
  }
  
  // Log critical warnings
  if (report.missingRequired.length > 0) {
    logger.error('🚨 MISSING REQUIRED KEYS', { keys: report.missingRequired });
  }
  
  // Log recommendations (first 3)
  for (const rec of report.recommendations.slice(0, 3)) {
    logger.warn(rec);
  }
  
  // Log feature availability
  logger.info('📊 Feature Availability', report.featureAvailability);
}

/**
 * Check if a specific feature is available based on API keys
 */
export function isFeatureAvailable(feature: string): boolean {
  const report = generateApiKeysReport();
  return report.featureAvailability[feature] ?? false;
}

/**
 * Get graceful degradation info for a service
 */
export function getGracefulDegradation(service: string): {
  available: boolean;
  tier: 'premium' | 'basic' | 'fallback';
  message: string;
} {
  switch (service) {
    case 'news':
      if (isKeyConfigured('CRYPTOPANIC_API_KEY')) {
        return { available: true, tier: 'premium', message: 'CryptoPanic Pro enabled' };
      }
      return { available: true, tier: 'fallback', message: 'Using RSS feeds (CoinDesk, Decrypt, etc.)' };
    
    case 'market':
      if (isKeyConfigured('COINGECKO_API_KEY')) {
        return { available: true, tier: 'premium', message: 'CoinGecko Pro tier (500 req/min)' };
      }
      return { available: true, tier: 'basic', message: 'CoinGecko free tier (10 req/min)' };
    
    case 'ai':
      if (isKeyConfigured('XAI_API_KEY') || isKeyConfigured('GROK_API_KEY')) {
        return { available: true, tier: 'premium', message: 'Grok AI enabled' };
      }
      if (isKeyConfigured('OPENAI_API_KEY')) {
        return { available: true, tier: 'basic', message: 'OpenAI fallback enabled' };
      }
      return { available: false, tier: 'fallback', message: 'No AI service available' };
    
    case 'social':
      if (isKeyConfigured('LUNARCRUSH_API_KEY')) {
        return { available: true, tier: 'premium', message: 'LunarCrush social intelligence' };
      }
      return { available: true, tier: 'fallback', message: 'Basic sentiment analysis only' };
    
    case 'derivatives':
      const coinglassOk = isKeyConfigured('COINGLASS_API_KEY');
      const laevitasOk = isKeyConfigured('LAEVITAS_API_KEY');
      const deribitOk = isKeyConfigured('DERIBIT_API_KEY');
      const cryptoquantOk = isKeyConfigured('CRYPTOQUANT_API_KEY');
      const glassnodeOk = isKeyConfigured('GLASSNODE_API_KEY');
      
      const premiumSources = [coinglassOk, laevitasOk, cryptoquantOk, glassnodeOk].filter(Boolean).length;
      
      if (coinglassOk) {
        return { 
          available: true, 
          tier: 'premium', 
          message: `Coinglass primary + ${premiumSources} backup sources active` 
        };
      }
      // Free exchange APIs always work as backup
      return { 
        available: true, 
        tier: 'basic', 
        message: 'Using Binance/OKX/Bybit APIs (Coinglass unavailable)' 
      };
    
    default:
      return { available: false, tier: 'fallback', message: 'Unknown service' };
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export const apiKeys = {
  getStatuses: getApiKeyStatuses,
  generateReport: generateApiKeysReport,
  logStatus: logApiKeysStatus,
  isFeatureAvailable,
  getGracefulDegradation,
  isConfigured: isKeyConfigured,
};

export default apiKeys;

