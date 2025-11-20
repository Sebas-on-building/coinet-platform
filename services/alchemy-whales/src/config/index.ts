/**
 * Configuration loader for Alchemy Whales Service
 */

import * as dotenv from 'dotenv';
import { ServiceConfig, Chain, RateLimiterConfig } from '../types';

// Load environment variables
dotenv.config();

/**
 * Get required environment variable or throw error
 */
function getRequiredEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

/**
 * Get optional environment variable with default
 */
function getOptionalEnv(key: string, defaultValue: string): string {
  return process.env[key] || defaultValue;
}

/**
 * Get number environment variable
 */
function getNumberEnv(key: string, defaultValue: number): number {
  const value = process.env[key];
  return value ? parseInt(value, 10) : defaultValue;
}

/**
 * Get boolean environment variable
 */
function getBooleanEnv(key: string, defaultValue: boolean): boolean {
  const value = process.env[key];
  if (!value) return defaultValue;
  return value.toLowerCase() === 'true';
}

/**
 * Rate limiter configuration
 */
const rateLimiterConfig: RateLimiterConfig = {
  maxRequestsPerSecond: getNumberEnv('RATE_LIMIT_MAX_REQUESTS_PER_SECOND', 25),
  maxConcurrent: getNumberEnv('RATE_LIMIT_MAX_CONCURRENT', 10),
  reservoir: getNumberEnv('RATE_LIMIT_RESERVOIR', 100),
  reservoirRefreshAmount: getNumberEnv('RATE_LIMIT_RESERVOIR_REFRESH_AMOUNT', 25),
  reservoirRefreshInterval: getNumberEnv('RATE_LIMIT_RESERVOIR_REFRESH_INTERVAL', 1000),
  minTime: 1000 / getNumberEnv('RATE_LIMIT_MAX_REQUESTS_PER_SECOND', 25),
  highWater: getNumberEnv('RATE_LIMIT_RESERVOIR', 100) * 0.8,
  strategy: 'leak',
};

/**
 * Load and validate service configuration
 */
export const config: ServiceConfig = {
  alchemy: {
    apiKeys: {
      [Chain.ETHEREUM]: getRequiredEnv('ALCHEMY_API_KEY_ETH'),
      [Chain.POLYGON]: getRequiredEnv('ALCHEMY_API_KEY_POLYGON'),
      [Chain.ARBITRUM]: getRequiredEnv('ALCHEMY_API_KEY_ARBITRUM'),
      [Chain.OPTIMISM]: getRequiredEnv('ALCHEMY_API_KEY_OPTIMISM'),
      [Chain.BASE]: getRequiredEnv('ALCHEMY_API_KEY_BASE'),
    },
  },
  rateLimit: rateLimiterConfig,
  whaleThresholds: {
    whale: getNumberEnv('WHALE_THRESHOLD_USD', 100000),
    largeWhale: getNumberEnv('LARGE_WHALE_THRESHOLD_USD', 1000000),
    megaWhale: getNumberEnv('MEGA_WHALE_THRESHOLD_USD', 10000000),
  },
  database: {
    host: getOptionalEnv('DATABASE_HOST', 'localhost'),
    port: getNumberEnv('DATABASE_PORT', 5432),
    database: getOptionalEnv('DATABASE_NAME', 'coinet_whales'),
    user: getOptionalEnv('DATABASE_USER', 'postgres'),
    password: getRequiredEnv('DATABASE_PASSWORD'),
    ssl: getBooleanEnv('DATABASE_SSL', false),
    poolMin: getNumberEnv('DATABASE_POOL_MIN', 2),
    poolMax: getNumberEnv('DATABASE_POOL_MAX', 10),
  },
  redis: {
    host: getOptionalEnv('REDIS_HOST', 'localhost'),
    port: getNumberEnv('REDIS_PORT', 6379),
    password: getOptionalEnv('REDIS_PASSWORD', ''),
    db: getNumberEnv('REDIS_DB', 0),
    keyPrefix: getOptionalEnv('REDIS_KEY_PREFIX', 'coinet:whales:'),
  },
  webhook: {
    port: getNumberEnv('WEBHOOK_PORT', 3001),
    path: getOptionalEnv('WEBHOOK_PATH', '/webhooks/alchemy'),
    secret: getRequiredEnv('WEBHOOK_SECRET'),
  },
  metrics: {
    port: getNumberEnv('METRICS_PORT', 9090),
    path: getOptionalEnv('METRICS_PATH', '/metrics'),
  },
  performance: {
    batchSize: getNumberEnv('BATCH_SIZE', 100),
    batchIntervalMs: getNumberEnv('BATCH_INTERVAL_MS', 5000),
    maxBlockRange: getNumberEnv('MAX_BLOCK_RANGE', 1000),
    enableAsyncBatching: getBooleanEnv('ENABLE_ASYNC_BATCHING', true),
  },
  features: {
    enableNotifications: getBooleanEnv('ENABLE_NOTIFICATIONS', true),
    enableEntityLabeling: getBooleanEnv('ENABLE_ENTITY_LABELING', false),
    notificationServiceUrl: getOptionalEnv('NOTIFICATION_SERVICE_URL', ''),
  },
};

/**
 * Validate configuration
 */
export function validateConfig(): void {
  // Validate API keys
  Object.entries(config.alchemy.apiKeys).forEach(([chain, key]) => {
    if (!key || key === 'your_' + chain + '_api_key_here') {
      throw new Error(`Invalid API key for chain: ${chain}`);
    }
  });

  // Validate thresholds
  if (config.whaleThresholds.whale >= config.whaleThresholds.largeWhale) {
    throw new Error('Whale threshold must be less than large whale threshold');
  }
  if (config.whaleThresholds.largeWhale >= config.whaleThresholds.megaWhale) {
    throw new Error('Large whale threshold must be less than mega whale threshold');
  }

  // Validate rate limits
  if (config.rateLimit.maxRequestsPerSecond <= 0) {
    throw new Error('Max requests per second must be greater than 0');
  }
  if (config.rateLimit.maxConcurrent <= 0) {
    throw new Error('Max concurrent requests must be greater than 0');
  }

  // Validate database config
  if (config.database.poolMin > config.database.poolMax) {
    throw new Error('Database pool min must be less than or equal to max');
  }

  // Configuration validated successfully
  if (process.env.NODE_ENV !== 'test') {
    console.log('✅ Configuration validated successfully');
  }
}

export default config;

