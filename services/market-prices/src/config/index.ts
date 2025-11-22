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
  const nodeEnv = getEnv('NODE_ENV', 'development');
  
  // Use production key in production, otherwise use development key
  const apiKey = nodeEnv === 'production' 
    ? getEnv('COINGECKO_API_KEY_PROD', getEnv('COINGECKO_API_KEY'))
    : getEnv('COINGECKO_API_KEY');
  
  const tier = getEnv('COINGECKO_TIER', 'demo');
  const apiUrl = tier === 'demo' 
    ? getEnv('COINGECKO_API_URL', 'https://api.coingecko.com/api/v3')
    : getEnv('COINGECKO_PRO_API_URL', 'https://pro-api.coingecko.com/api/v3');
  
  // Auto-adjust rate limits based on tier
  let defaultRateLimit = 30; // demo
  if (tier === 'analyst') defaultRateLimit = 500;
  if (tier === 'lite' || tier === 'pro' || tier === 'pro_plus') defaultRateLimit = 1000;
  
  const rateLimitPerMinute = getEnvNumber('COINGECKO_RATE_LIMIT_PER_MINUTE', defaultRateLimit);
  
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
  const nodeEnv = getEnv('NODE_ENV', 'development');
  
  // Use production key in production, otherwise use development key
  const apiKey = nodeEnv === 'production'
    ? getEnv('COINMARKETCAP_API_KEY_PROD', getEnv('COINMARKETCAP_API_KEY'))
    : getEnv('COINMARKETCAP_API_KEY');
  
  const apiUrl = getEnv('COINMARKETCAP_API_URL', 'https://pro-api.coinmarketcap.com/v1');
  
  // Commercial license check for production/commercial use
  const hasCommercialLicense = getEnvBoolean('COINMARKETCAP_COMMERCIAL_LICENSE', false);
  if (nodeEnv === 'production' && !hasCommercialLicense) {
    console.warn(
      '⚠️  WARNING: CoinMarketCap requires a commercial license for commercial use. ' +
      'Set COINMARKETCAP_COMMERCIAL_LICENSE=true to acknowledge compliance.'
    );
  }
  
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
 * Build complete service configuration
 */
export function buildConfig(): ServiceConfig {
  return {
    providers: {
      coingecko: buildCoinGeckoConfig(),
      coinmarketcap: buildCoinMarketCapConfig(),
    },
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
 * Comprehensive configuration validation
 */
export function validateConfig(config: ServiceConfig): void {
  const errors: string[] = [];

  // Validate CoinGecko
  if (!config.providers.coingecko.apiKey) {
    errors.push('CoinGecko API key is required');
  } else if (config.providers.coingecko.apiKey.length < 10) {
    errors.push('CoinGecko API key appears invalid (too short)');
  }

  // Validate CoinGecko rate limits
  if (config.providers.coingecko.rateLimit.maxRequestsPerMinute <= 0) {
    errors.push('CoinGecko rate limit must be greater than 0');
  }
  if (config.providers.coingecko.rateLimit.maxRequestsPerMinute > 10000) {
    errors.push('CoinGecko rate limit exceeds reasonable maximum (10000)');
  }

  // Validate CoinMarketCap (only if fallback is enabled)
  if (config.enableCMCFallback) {
    if (!config.providers.coinmarketcap.apiKey) {
      errors.push('CoinMarketCap API key is required when CMC fallback is enabled');
    } else if (config.providers.coinmarketcap.apiKey.length < 10) {
      errors.push('CoinMarketCap API key appears invalid (too short)');
    }

    if (config.providers.coinmarketcap.rateLimit.maxRequestsPerMinute <= 0) {
      errors.push('CoinMarketCap rate limit must be greater than 0');
    }
    if (config.providers.coinmarketcap.rateLimit.maxRequestsPerMinute > 10000) {
      errors.push('CoinMarketCap rate limit exceeds reasonable maximum (10000)');
    }
  }

  // Validate database
  if (!config.database.host || typeof config.database.host !== 'string') {
    errors.push('Database host is required');
  }
  if (!config.database.port || config.database.port < 1 || config.database.port > 65535) {
    errors.push(`Invalid database port: ${config.database.port}`);
  }
  if (!config.database.database || typeof config.database.database !== 'string') {
    errors.push('Database name is required');
  }
  if (!config.database.user || typeof config.database.user !== 'string') {
    errors.push('Database user is required');
  }
  if (!config.database.password || typeof config.database.password !== 'string') {
    errors.push('Database password is required');
  }

  // Validate Redis
  if (!config.redis.host || typeof config.redis.host !== 'string') {
    errors.push('Redis host is required');
  }
  if (!config.redis.port || config.redis.port < 1 || config.redis.port > 65535) {
    errors.push(`Invalid Redis port: ${config.redis.port}`);
  }
  if (typeof config.redis.db !== 'number' || config.redis.db < 0 || config.redis.db > 15) {
    errors.push(`Invalid Redis DB: ${config.redis.db} (must be 0-15)`);
  }

  // Validate cache TTL
  if (config.cacheTTL <= 0) {
    errors.push('Cache TTL must be greater than 0');
  }
  if (config.cacheTTL > 3600) {
    errors.push('Cache TTL exceeds reasonable maximum (3600 seconds)');
  }

  // Validate WebSocket config
  if (config.enableWebSocket && config.providers.coingecko.websocket) {
    const ws = config.providers.coingecko.websocket;
    if (ws.maxConnections <= 0 || ws.maxConnections > 10) {
      errors.push(`WebSocket max connections must be between 1 and 10, got: ${ws.maxConnections}`);
    }
    if (ws.maxSubscriptionsPerChannel <= 0 || ws.maxSubscriptionsPerChannel > 100) {
      errors.push(
        `WebSocket max subscriptions per channel must be between 1 and 100, got: ${ws.maxSubscriptionsPerChannel}`
      );
    }
    if (ws.reconnectInterval < 1000) {
      errors.push(`WebSocket reconnect interval too short: ${ws.reconnectInterval}ms (minimum 1000ms)`);
    }
    if (ws.heartbeatInterval < 10000) {
      errors.push(`WebSocket heartbeat interval too short: ${ws.heartbeatInterval}ms (minimum 10000ms)`);
    }
  }

  // Validate retry configs
  if (config.providers.coingecko.retry.retries < 0 || config.providers.coingecko.retry.retries > 10) {
    errors.push(`CoinGecko retries must be between 0 and 10, got: ${config.providers.coingecko.retry.retries}`);
  }
  if (config.providers.coinmarketcap.retry.retries < 0 || config.providers.coinmarketcap.retry.retries > 10) {
    errors.push(`CoinMarketCap retries must be between 0 and 10, got: ${config.providers.coinmarketcap.retry.retries}`);
  }

  // Validate failover delay
  if (config.failoverRetryDelay < 0) {
    errors.push('Failover retry delay must be non-negative');
  }

  // Validate max retry attempts
  if (config.maxRetryAttempts < 0 || config.maxRetryAttempts > 10) {
    errors.push(`Max retry attempts must be between 0 and 10, got: ${config.maxRetryAttempts}`);
  }

  // Validate log level
  const validLogLevels = ['error', 'warn', 'info', 'debug', 'verbose'];
  if (!validLogLevels.includes(config.logLevel.toLowerCase())) {
    errors.push(`Invalid log level: ${config.logLevel}. Valid: ${validLogLevels.join(', ')}`);
  }

  // Throw if any errors found
  if (errors.length > 0) {
    throw new Error(`Configuration validation failed:\n${errors.map((e) => `  - ${e}`).join('\n')}`);
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

