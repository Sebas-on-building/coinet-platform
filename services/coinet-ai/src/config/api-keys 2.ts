/**
 * 🔑 API KEYS CONFIGURATION
 *
 * Centralized API key management for all external data sources
 * Supports environment variables and secure key storage
 */

export interface ApiKeysConfig {
  // Market Data APIs
  binance?: {
    apiKey: string;
    secretKey: string;
  };
  coinbase?: {
    apiKey: string;
    secretKey: string;
  };
  kraken?: {
    apiKey: string;
    secretKey: string;
  };
  coingecko?: {
    apiKey: string;
  };

  // Social Media APIs
  twitter?: {
    bearerToken: string;
  };
  reddit?: {
    clientId: string;
    clientSecret: string;
  };
  discord?: {
    botToken: string;
  };
  telegram?: {
    botToken: string;
  };

  // Blockchain APIs
  etherscan?: {
    apiKey: string;
  };
  helius?: {
    apiKey: string;
  };
  polygonscan?: {
    apiKey: string;
  };
  avalanche?: {
    apiKey: string;
  };

  // News APIs
  news?: {
    apiKey: string;
  };
}

// Load API keys from environment variables
export const loadApiKeys = (): ApiKeysConfig => {
  return {
    binance: process.env.BINANCE_API_KEY && process.env.BINANCE_SECRET_KEY ? {
      apiKey: process.env.BINANCE_API_KEY,
      secretKey: process.env.BINANCE_SECRET_KEY
    } : undefined,

    coinbase: process.env.COINBASE_API_KEY && process.env.COINBASE_SECRET_KEY ? {
      apiKey: process.env.COINBASE_API_KEY,
      secretKey: process.env.COINBASE_SECRET_KEY
    } : undefined,

    kraken: process.env.KRAKEN_API_KEY && process.env.KRAKEN_SECRET_KEY ? {
      apiKey: process.env.KRAKEN_API_KEY,
      secretKey: process.env.KRAKEN_SECRET_KEY
    } : undefined,

    coingecko: process.env.COINGECKO_API_KEY ? {
      apiKey: process.env.COINGECKO_API_KEY
    } : undefined,

    twitter: process.env.TWITTER_BEARER_TOKEN ? {
      bearerToken: process.env.TWITTER_BEARER_TOKEN
    } : undefined,

    reddit: process.env.REDDIT_CLIENT_ID && process.env.REDDIT_CLIENT_SECRET ? {
      clientId: process.env.REDDIT_CLIENT_ID,
      clientSecret: process.env.REDDIT_CLIENT_SECRET
    } : undefined,

    discord: process.env.DISCORD_BOT_TOKEN ? {
      botToken: process.env.DISCORD_BOT_TOKEN
    } : undefined,

    telegram: process.env.TELEGRAM_BOT_TOKEN ? {
      botToken: process.env.TELEGRAM_BOT_TOKEN
    } : undefined,

    etherscan: process.env.ETHERSCAN_API_KEY ? {
      apiKey: process.env.ETHERSCAN_API_KEY
    } : undefined,

    helius: process.env.HELIUS_API_KEY ? {
      apiKey: process.env.HELIUS_API_KEY
    } : undefined,

    polygonscan: process.env.POLYGONSCAN_API_KEY ? {
      apiKey: process.env.POLYGONSCAN_API_KEY
    } : undefined,

    avalanche: process.env.AVALANCHE_API_KEY ? {
      apiKey: process.env.AVALANCHE_API_KEY
    } : undefined,

    news: process.env.NEWS_API_KEY ? {
      apiKey: process.env.NEWS_API_KEY
    } : undefined
  };
};

// Check if required API keys are available
export const validateApiKeys = (requiredKeys: (keyof ApiKeysConfig)[]): boolean => {
  const keys = loadApiKeys();

  return requiredKeys.every(key => {
    const keyConfig = keys[key];
    if (!keyConfig) return false;

    // Check if the key configuration has the required properties
    switch (key) {
      case 'binance':
      case 'coinbase':
      case 'kraken':
        return !!(keyConfig as any).apiKey && !!(keyConfig as any).secretKey;
      case 'coingecko':
      case 'etherscan':
      case 'helius':
      case 'polygonscan':
      case 'avalanche':
      case 'news':
        return !!(keyConfig as any).apiKey;
      case 'twitter':
        return !!(keyConfig as any).bearerToken;
      case 'reddit':
        return !!(keyConfig as any).clientId && !!(keyConfig as any).clientSecret;
      case 'discord':
      case 'telegram':
        return !!(keyConfig as any).botToken;
      default:
        return false;
    }
  });
};

// Get API key configuration for a specific service
export const getApiKeyConfig = (service: keyof ApiKeysConfig): any => {
  const keys = loadApiKeys();
  return keys[service];
};

// Environment-specific API key requirements
export const getRequiredApiKeys = (environment: string = 'development'): (keyof ApiKeysConfig)[] => {
  switch (environment) {
    case 'production':
      return ['binance', 'coinbase', 'kraken', 'reddit', 'etherscan'];
    case 'staging':
      return ['binance', 'reddit', 'etherscan'];
    case 'development':
    default:
      return ['coingecko']; // Free tier for development
  }
};

export default loadApiKeys;
