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
  const apiKey = getEnv('COINMARKETCAP_API_KEY', ''); // Optional - can be empty if not using CoinMarketCap
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
 * Build DeFiLlama provider configuration
 */
function buildDefiLlamaConfig(): ProviderConfig | undefined {
  const apiKey = process.env.DEFILLAMA_API_KEY || ''; // Optional - free tier works without key
  const apiUrl = getEnv('DEFILLAMA_API_URL', 'https://api.llama.fi');
  
  const rateLimitPerMinute = getEnvNumber('DEFILLAMA_RATE_LIMIT_PER_MINUTE', 300);
  
  const rateLimit: RateLimitConfig = {
    maxRequestsPerMinute: rateLimitPerMinute,
    reservoir: rateLimitPerMinute,
    reservoirRefreshAmount: rateLimitPerMinute,
    reservoirRefreshInterval: 60 * 1000,
  };

  const retry: RetryConfig = {
    retries: getEnvNumber('DEFILLAMA_MAX_RETRIES', 3),
    retryDelay: getEnvNumber('DEFILLAMA_RETRY_DELAY_MS', 1000),
  };

  return {
    apiKey: apiKey || 'free-tier',
    apiUrl,
    rateLimit,
    retry,
    priority: 4,
  };
}

/**
 * Build CryptoPanic provider configuration
 */
function buildCryptoPanicConfig(): ProviderConfig | undefined {
  const apiKey = process.env.CRYPTOPANIC_API_KEY;
  if (!apiKey) return undefined;
  
  const apiUrl = getEnv('CRYPTOPANIC_API_URL', 'https://cryptopanic.com/api');
  const plan = getEnv('CRYPTOPANIC_PLAN', 'growth'); // development, growth, enterprise
  
  // Rate limits vary by plan
  let rateLimitPerSecond = 5; // growth default
  if (plan === 'development') rateLimitPerSecond = 2;
  if (plan === 'enterprise') rateLimitPerSecond = 100;
  
  const rateLimitPerMinute = rateLimitPerSecond * 60;
  
  const rateLimit: RateLimitConfig = {
    maxRequestsPerMinute: rateLimitPerMinute,
    reservoir: rateLimitPerSecond * 10,
    reservoirRefreshAmount: rateLimitPerSecond,
    reservoirRefreshInterval: 1000,
  };

  const retry: RetryConfig = {
    retries: getEnvNumber('CRYPTOPANIC_MAX_RETRIES', 3),
    retryDelay: getEnvNumber('CRYPTOPANIC_RETRY_DELAY_MS', 1000),
  };

  return {
    apiKey,
    apiUrl,
    rateLimit,
    retry,
    priority: 5,
  };
}

/**
 * Build Messari provider configuration
 */
function buildMessariConfig(): ProviderConfig | undefined {
  const apiKey = process.env.MESSARI_API_KEY;
  if (!apiKey) return undefined;
  
  const apiUrl = getEnv('MESSARI_API_URL', 'https://data.messari.io/api/v1');
  const rateLimitPerMinute = getEnvNumber('MESSARI_RATE_LIMIT_PER_MINUTE', 60);
  
  const rateLimit: RateLimitConfig = {
    maxRequestsPerMinute: rateLimitPerMinute,
    reservoir: rateLimitPerMinute,
    reservoirRefreshAmount: rateLimitPerMinute,
    reservoirRefreshInterval: 60 * 1000,
  };

  const retry: RetryConfig = {
    retries: getEnvNumber('MESSARI_MAX_RETRIES', 3),
    retryDelay: getEnvNumber('MESSARI_RETRY_DELAY_MS', 1000),
  };

  return {
    apiKey,
    apiUrl,
    rateLimit,
    retry,
    priority: 6,
  };
}

/**
 * Build The Tie provider configuration
 */
function buildTheTieConfig(): ProviderConfig | undefined {
  const apiKey = process.env.THETIE_API_KEY;
  if (!apiKey) return undefined;
  
  const apiUrl = getEnv('THETIE_API_URL', 'https://api.thetie.io/v1');
  const rateLimitPerMinute = getEnvNumber('THETIE_RATE_LIMIT_PER_MINUTE', 60);
  
  const rateLimit: RateLimitConfig = {
    maxRequestsPerMinute: rateLimitPerMinute,
    reservoir: rateLimitPerMinute,
    reservoirRefreshAmount: rateLimitPerMinute,
    reservoirRefreshInterval: 60 * 1000,
  };

  const retry: RetryConfig = {
    retries: getEnvNumber('THETIE_MAX_RETRIES', 3),
    retryDelay: getEnvNumber('THETIE_RETRY_DELAY_MS', 1000),
  };

  return {
    apiKey,
    apiUrl,
    rateLimit,
    retry,
    priority: 7,
  };
}

/**
 * Build complete service configuration
 */
export function buildConfig(): ServiceConfig {
  const dexscreenerConfig = buildDexScreenerConfig();
  const defillamaConfig = buildDefiLlamaConfig();
  const cryptopanicConfig = buildCryptoPanicConfig();
  const messariConfig = buildMessariConfig();
  const thetieConfig = buildTheTieConfig();
  
  const providers: ServiceConfig['providers'] = {
    coingecko: buildCoinGeckoConfig(),
    coinmarketcap: buildCoinMarketCapConfig(),
  };
  
  if (dexscreenerConfig) {
    providers.dexscreener = dexscreenerConfig;
  }
  
  if (defillamaConfig) {
    providers.defillama = defillamaConfig;
  }
  
  if (cryptopanicConfig) {
    providers.cryptopanic = cryptopanicConfig;
  }
  
  if (messariConfig) {
    providers.messari = messariConfig;
  }
  
  if (thetieConfig) {
    providers.thetie = thetieConfig;
  }
  
  return {
    providers,
    database: {
      host: getEnv('TIMESCALE_HOST', 'localhost'),
      port: getEnvNumber('TIMESCALE_PORT', 5432),
      database: getEnv('TIMESCALE_DATABASE', 'coinet'),
      user: getEnv('TIMESCALE_USER', 'coinet_user'),
      password: getEnv('TIMESCALE_PASSWORD', ''), // Optional - can be empty if not using database
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
    enableCMCFallback: getEnvBoolean('ENABLE_CMC_FALLBACK', false), // Disabled by default - requires API key
    enableMessari: getEnvBoolean('ENABLE_MESSARI', false), // Disabled by default - requires API key
    enableTheTie: getEnvBoolean('ENABLE_THETIE', false), // Disabled by default - requires API key
    logLevel: getEnv('LOG_LEVEL', 'info'),
  };
}

/**
 * Validate configuration
 */
export function validateConfig(config: ServiceConfig): void {
  // CoinGecko API key is optional (can use free tier without key)
  // Note: Some features may require an API key, but basic functionality works without it
  
  // Validate CoinMarketCap (only if fallback is enabled)
  if (config.enableCMCFallback && !config.providers.coinmarketcap.apiKey) {
    throw new Error('CoinMarketCap API key is required when CMC fallback is enabled');
  }

  // Database password is optional (can be empty if not using database)
  // Note: Database features will fail if password is required but not provided

  // Validate rate limits
  if (config.providers.coingecko.rateLimit.maxRequestsPerMinute <= 0) {
    throw new Error('CoinGecko rate limit must be greater than 0');
  }

  // Only validate CoinMarketCap rate limits if CMC fallback is enabled
  if (config.enableCMCFallback && config.providers.coinmarketcap.rateLimit.maxRequestsPerMinute <= 0) {
    throw new Error('CoinMarketCap rate limit must be greater than 0');
  }

  // Validate WebSocket config (only if WebSocket is enabled and config exists)
  if (config.enableWebSocket && config.providers.coingecko.websocket) {
    const ws = config.providers.coingecko.websocket;
    if (ws.maxConnections <= 0) {
      throw new Error('WebSocket max connections must be greater than 0');
    }
    if (ws.maxSubscriptionsPerChannel <= 0) {
      throw new Error('WebSocket max subscriptions per channel must be greater than 0');
    }
  }
  // If WebSocket is disabled or config doesn't exist, skip validation (it's optional)
}

// Export singleton instance
let configInstance: ServiceConfig | null = null;

export function getConfig(): ServiceConfig {
  if (!configInstance) {
    configInstance = buildConfig();
    // Validate config - catch errors to prevent crashes, log warnings instead
    try {
      validateConfig(configInstance);
    } catch (error) {
      // Log warning but don't crash - allow service to start with partial config
      console.warn('Configuration validation warning:', error instanceof Error ? error.message : String(error));
      console.warn('Service will continue with partial configuration. Some features may not work.');
    }
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

