/**
 * Configuration Management
 * Loads and validates configuration from environment variables
 */

import * as dotenv from 'dotenv';
import { ServiceConfig, ProviderConfig, RateLimitConfig, RetryConfig, WebSocketConfig } from '../types';

// Load environment variables
dotenv.config();

/**
 * Get environment variable with fallback
 */
function getEnv(key: string, defaultValue?: string): string {
  const value = process.env[key];
  if (value === undefined && defaultValue === undefined) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value || defaultValue!;
}

/**
 * Get environment variable as number
 */
function getEnvNumber(key: string, defaultValue?: number): number {
  const value = process.env[key];
  if (value === undefined) {
    if (defaultValue === undefined) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
    return defaultValue;
  }
  const num = parseInt(value, 10);
  if (isNaN(num)) {
    throw new Error(`Invalid number for environment variable ${key}: ${value}`);
  }
  return num;
}

/**
 * Get environment variable as boolean
 */
function getEnvBoolean(key: string, defaultValue: boolean): boolean {
  const value = process.env[key];
  if (value === undefined) {
    return defaultValue;
  }
  return value.toLowerCase() === 'true' || value === '1';
}

/**
 * Build CoinGecko provider configuration
 */
function buildCoinGeckoConfig(): ProviderConfig {
  const apiKey = getEnv('COINGECKO_API_KEY', ''); // Optional - can be empty for free tier
  const tier = getEnv('COINGECKO_TIER', 'demo');
  const apiUrl = tier === 'demo' 
    ? getEnv('COINGECKO_API_URL', 'https://api.coingecko.com/api/v3')
    : getEnv('COINGECKO_PRO_API_URL', 'https://pro-api.coingecko.com/api/v3');
  
  const rateLimitPerMinute = getEnvNumber('COINGECKO_RATE_LIMIT_PER_MINUTE', 30);
  
  const rateLimit: RateLimitConfig = {
    maxRequestsPerMinute: rateLimitPerMinute,
    reservoir: rateLimitPerMinute,
    reservoirRefreshAmount: rateLimitPerMinute,
    reservoirRefreshInterval: 60 * 1000, // 1 minute
  };

  const retry: RetryConfig = {
    retries: getEnvNumber('COINGECKO_MAX_RETRIES', 3),
    retryDelay: getEnvNumber('COINGECKO_RETRY_DELAY_MS', 1000),
    retryCondition: (error: any) => {
      // Retry on network errors and 5xx errors
      return !error.response || error.response.status >= 500;
    },
  };

  const websocket: WebSocketConfig = {
    url: getEnv('COINGECKO_WS_URL', 'wss://ws.coingecko.com/v1'),
    maxConnections: getEnvNumber('COINGECKO_MAX_CONCURRENT_WS', 10),
    maxSubscriptionsPerChannel: getEnvNumber('COINGECKO_MAX_SUBSCRIPTIONS_PER_CHANNEL', 100),
    reconnectInterval: getEnvNumber('COINGECKO_WS_RECONNECT_INTERVAL_MS', 5000),
    heartbeatInterval: getEnvNumber('COINGECKO_WS_HEARTBEAT_INTERVAL_MS', 30000),
    enabled: getEnvBoolean('ENABLE_WEBSOCKET', true),
  };

  return {
    apiKey,
    apiUrl,
    wsUrl: websocket.url,
    rateLimit,
    retry,
    websocket,
    priority: 1, // Highest priority (primary source)
  };
}

/**
 * Build CoinMarketCap provider configuration
 */
function buildCoinMarketCapConfig(): ProviderConfig {
  const apiKey = getEnv('COINMARKETCAP_API_KEY');
  const apiUrl = getEnv('COINMARKETCAP_API_URL', 'https://pro-api.coinmarketcap.com/v1');
  
  const rateLimitPerMinute = getEnvNumber('COINMARKETCAP_RATE_LIMIT_PER_MINUTE', 30);
  
  const rateLimit: RateLimitConfig = {
    maxRequestsPerMinute: rateLimitPerMinute,
    reservoir: rateLimitPerMinute,
    reservoirRefreshAmount: rateLimitPerMinute,
    reservoirRefreshInterval: 60 * 1000, // 1 minute
  };

  const retry: RetryConfig = {
    retries: getEnvNumber('COINMARKETCAP_MAX_RETRIES', 3),
    retryDelay: getEnvNumber('COINMARKETCAP_RETRY_DELAY_MS', 1000),
    retryCondition: (error: any) => {
      return !error.response || error.response.status >= 500;
    },
  };

  return {
    apiKey,
    apiUrl,
    rateLimit,
    retry,
    priority: 2, // Lower priority (backup source)
  };
}

/**
 * Build DexScreener provider configuration
 * DexScreener free tier doesn't require an API key
 */
function buildDexScreenerConfig(): ProviderConfig | undefined {
  const apiKey = process.env.DEXSCREENER_API_KEY || ''; // Optional - free tier doesn't require key
  const apiUrl = getEnv('DEXSCREENER_API_URL', 'https://api.dexscreener.com/latest/dex');
  
  // DexScreener has different rate limits for different endpoints:
  // Search: 300 rpm, Profile/Boost: 60 rpm
  // We'll use 60 rpm as the base (for profile endpoints)
  const rateLimitPerMinute = getEnvNumber('DEXSCREENER_RATE_LIMIT_PER_MINUTE', 60);
  
  const rateLimit: RateLimitConfig = {
    maxRequestsPerMinute: rateLimitPerMinute,
    reservoir: rateLimitPerMinute,
    reservoirRefreshAmount: rateLimitPerMinute,
    reservoirRefreshInterval: 60 * 1000, // 1 minute
  };

  const retry: RetryConfig = {
    retries: getEnvNumber('DEXSCREENER_MAX_RETRIES', 3),
    retryDelay: getEnvNumber('DEXSCREENER_RETRY_DELAY_MS', 1000),
    retryCondition: (error: any) => {
      return !error.response || error.response.status >= 500;
    },
  };

  // Return config even without API key (free tier support)
  return {
    apiKey: apiKey || 'free-tier', // Use placeholder for free tier
    apiUrl,
    rateLimit,
    retry,
    priority: 3, // Lower priority (DEX data source)
  };
}

/**
 * Build complete service configuration
 */
export function buildConfig(): ServiceConfig {
  const dexscreenerConfig = buildDexScreenerConfig();
  
  const providers: ServiceConfig['providers'] = {
    coingecko: buildCoinGeckoConfig(),
    coinmarketcap: buildCoinMarketCapConfig(),
  };
  
  if (dexscreenerConfig) {
    providers.dexscreener = dexscreenerConfig;
  }
  
  return {
    providers,
    database: {
      host: getEnv('TIMESCALE_HOST', 'localhost'),
      port: getEnvNumber('TIMESCALE_PORT', 5432),
      database: getEnv('TIMESCALE_DATABASE', 'coinet'),
      user: getEnv('TIMESCALE_USER', 'coinet_user'),
      password: getEnv('TIMESCALE_PASSWORD'),
    },
    redis: {
      host: getEnv('REDIS_HOST', 'localhost'),
      port: getEnvNumber('REDIS_PORT', 6379),
      password: getEnv('REDIS_PASSWORD', ''),
      db: getEnvNumber('REDIS_DB', 0),
    },
    cacheTTL: getEnvNumber('CACHE_TTL_SECONDS', 30),
    failoverRetryDelay: getEnvNumber('FAILOVER_RETRY_DELAY_MS', 5000),
    maxRetryAttempts: getEnvNumber('MAX_RETRY_ATTEMPTS', 3),
    enableWebSocket: getEnvBoolean('ENABLE_WEBSOCKET', true),
    enableRestFallback: getEnvBoolean('ENABLE_REST_FALLBACK', true),
    enableCMCFallback: getEnvBoolean('ENABLE_CMC_FALLBACK', true),
    logLevel: getEnv('LOG_LEVEL', 'info'),
  };
}

/**
 * Validate configuration
 */
export function validateConfig(config: ServiceConfig): void {
  // Validate CoinGecko
  if (!config.providers.coingecko.apiKey) {
    throw new Error('CoinGecko API key is required');
  }

  // Validate CoinMarketCap (only if fallback is enabled)
  if (config.enableCMCFallback && !config.providers.coinmarketcap.apiKey) {
    throw new Error('CoinMarketCap API key is required when CMC fallback is enabled');
  }

  // Validate database
  if (!config.database.password) {
    throw new Error('Database password is required');
  }

  // Validate rate limits
  if (config.providers.coingecko.rateLimit.maxRequestsPerMinute <= 0) {
    throw new Error('CoinGecko rate limit must be greater than 0');
  }

  if (config.providers.coinmarketcap.rateLimit.maxRequestsPerMinute <= 0) {
    throw new Error('CoinMarketCap rate limit must be greater than 0');
  }

  // Validate WebSocket config
  if (config.enableWebSocket && config.providers.coingecko.websocket) {
    const ws = config.providers.coingecko.websocket;
    if (ws.maxConnections <= 0) {
      throw new Error('WebSocket max connections must be greater than 0');
    }
    if (ws.maxSubscriptionsPerChannel <= 0) {
      throw new Error('WebSocket max subscriptions per channel must be greater than 0');
    }
  }
}

// Export singleton instance
let configInstance: ServiceConfig | null = null;

export function getConfig(): ServiceConfig {
  if (!configInstance) {
    configInstance = buildConfig();
    validateConfig(configInstance);
  }
  return configInstance;
}

export function resetConfig(): void {
  configInstance = null;
}

export default {
  buildConfig,
  validateConfig,
  getConfig,
  resetConfig,
};

