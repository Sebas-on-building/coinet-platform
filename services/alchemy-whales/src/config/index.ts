/**
 * Configuration loader for Alchemy Whales Service
 * Now includes QuickNode integration for 70+ chain support
 */

import * as dotenv from 'dotenv';
import { ServiceConfig, Chain, RateLimiterConfig } from '../types';
import { QuickNodeChain, QuickNodeEndpoint } from '../types/quicknode';

// Load environment variables
dotenv.config();

/**
 * Get required environment variable or throw error
 */
function getRequiredEnv(key: string, defaultValue?: string): string {
  const value = process.env[key];
  if (!value) {
    // In development/example mode, allow defaults for non-critical vars
    if (defaultValue !== undefined && (process.env.NODE_ENV !== 'production' || process.env.ALLOW_DEFAULTS === 'true')) {
      return defaultValue;
    }
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
 * QuickNode endpoints configuration (70+ chains supported)
 */
const quickNodeEndpoints: QuickNodeEndpoint[] = [
  // Primary chains
  {
    chain: QuickNodeChain.ETHEREUM,
    httpUrl: getOptionalEnv('QUICKNODE_ETH_HTTP_URL', 'https://your-ethereum-endpoint.quiknode.pro/'),
    wsUrl: getOptionalEnv('QUICKNODE_ETH_WS_URL', ''),
    computeUnitsPerSecond: getNumberEnv('QUICKNODE_ETH_CU_PER_SEC', 300),
    features: {
      supportsTransfers: true,
      supportsTokenBalance: true,
      supportsNFTs: true,
      supportsTracing: true,
      supportsDebug: true,
      supportsArchive: true,
    },
  },
  {
    chain: QuickNodeChain.POLYGON,
    httpUrl: getOptionalEnv('QUICKNODE_POLYGON_HTTP_URL', 'https://your-polygon-endpoint.quiknode.pro/'),
    computeUnitsPerSecond: getNumberEnv('QUICKNODE_POLYGON_CU_PER_SEC', 300),
    features: {
      supportsTransfers: true,
      supportsTokenBalance: true,
      supportsNFTs: true,
      supportsTracing: true,
      supportsDebug: false,
      supportsArchive: true,
    },
  },
  {
    chain: QuickNodeChain.ARBITRUM,
    httpUrl: getOptionalEnv('QUICKNODE_ARBITRUM_HTTP_URL', 'https://your-arbitrum-endpoint.quiknode.pro/'),
    computeUnitsPerSecond: getNumberEnv('QUICKNODE_ARBITRUM_CU_PER_SEC', 300),
    features: {
      supportsTransfers: true,
      supportsTokenBalance: true,
      supportsNFTs: true,
      supportsTracing: true,
      supportsDebug: false,
      supportsArchive: true,
    },
  },
  {
    chain: QuickNodeChain.OPTIMISM,
    httpUrl: getOptionalEnv('QUICKNODE_OPTIMISM_HTTP_URL', 'https://your-optimism-endpoint.quiknode.pro/'),
    computeUnitsPerSecond: getNumberEnv('QUICKNODE_OPTIMISM_CU_PER_SEC', 300),
    features: {
      supportsTransfers: true,
      supportsTokenBalance: true,
      supportsNFTs: true,
      supportsTracing: true,
      supportsDebug: false,
      supportsArchive: true,
    },
  },
  {
    chain: QuickNodeChain.BASE,
    httpUrl: getOptionalEnv('QUICKNODE_BASE_HTTP_URL', 'https://your-base-endpoint.quiknode.pro/'),
    computeUnitsPerSecond: getNumberEnv('QUICKNODE_BASE_CU_PER_SEC', 300),
    features: {
      supportsTransfers: true,
      supportsTokenBalance: true,
      supportsNFTs: true,
      supportsTracing: true,
      supportsDebug: false,
      supportsArchive: true,
    },
  },
  {
    chain: QuickNodeChain.SOLANA,
    httpUrl: getOptionalEnv('QUICKNODE_SOLANA_HTTP_URL', 'https://your-solana-endpoint.quiknode.pro/'),
    wsUrl: getOptionalEnv('QUICKNODE_SOLANA_WS_URL', ''),
    computeUnitsPerSecond: getNumberEnv('QUICKNODE_SOLANA_CU_PER_SEC', 300),
    features: {
      supportsTransfers: true,
      supportsTokenBalance: true,
      supportsNFTs: true,
      supportsTracing: false, // Solana uses different tracing
      supportsDebug: false,
      supportsArchive: true,
    },
  },
  // Additional chains can be configured via environment variables
].filter(endpoint => !endpoint.httpUrl.includes('your-')); // Filter out unconfigured endpoints

/**
 * Load and validate service configuration
 */
export const config: ServiceConfig = {
  alchemy: {
    apiKeys: {
      [Chain.ETHEREUM]: getRequiredEnv('ALCHEMY_API_KEY_ETH', 'demo-key'),
      [Chain.POLYGON]: getRequiredEnv('ALCHEMY_API_KEY_POLYGON', 'demo-key'),
      [Chain.ARBITRUM]: getRequiredEnv('ALCHEMY_API_KEY_ARBITRUM', 'demo-key'),
      [Chain.OPTIMISM]: getRequiredEnv('ALCHEMY_API_KEY_OPTIMISM', 'demo-key'),
      [Chain.BASE]: getRequiredEnv('ALCHEMY_API_KEY_BASE', 'demo-key'),
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
    password: getOptionalEnv('DATABASE_PASSWORD', 'postgres'), // Allow default for examples
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
    secret: getOptionalEnv('WEBHOOK_SECRET', 'dev-secret-change-in-production'), // Allow default for examples
  },
  metrics: {
    port: getNumberEnv('PORT', getNumberEnv('METRICS_PORT', 9090)),
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
 * QuickNode configuration
 */
export const quickNodeConfig = {
  endpoints: quickNodeEndpoints,
  enabled: getBooleanEnv('QUICKNODE_ENABLED', false),
  defaultComputeUnitsPerSecond: getNumberEnv('QUICKNODE_DEFAULT_CU_PER_SEC', 300),
};

/**
 * Cross-validation configuration
 */
export const crossValidationConfig = {
  enableAutoValidation: getBooleanEnv('CROSS_VALIDATION_ENABLED', true),
  validationThresholdUsd: getNumberEnv('CROSS_VALIDATION_THRESHOLD_USD', 100000), // Validate transfers >$100K
  maxDiscrepancyPercent: getNumberEnv('CROSS_VALIDATION_MAX_DISCREPANCY', 5), // Max 5% difference
  minConfidenceScore: getNumberEnv('CROSS_VALIDATION_MIN_CONFIDENCE', 85), // Min 85% confidence
  cacheValidationResults: getBooleanEnv('CROSS_VALIDATION_CACHE', true),
  validationCacheTtl: getNumberEnv('CROSS_VALIDATION_CACHE_TTL', 3600000), // 1 hour
};

/**
 * Multi-provider strategy configuration
 */
export const multiProviderConfig = {
  defaultProvider: getOptionalEnv('DEFAULT_PROVIDER', 'alchemy'), // 'alchemy' | 'quicknode'
  enableLoadBalancing: getBooleanEnv('ENABLE_LOAD_BALANCING', true),
  enableFallback: getBooleanEnv('ENABLE_FALLBACK', true),
  quotaAwareRouting: getBooleanEnv('QUOTA_AWARE_ROUTING', true),
  preferAlchemyForChains: [Chain.ETHEREUM, Chain.POLYGON], // Chains where Alchemy is preferred
};

/**
 * Validate configuration
 */
export function validateConfig(): void {
  // Validate API keys (only in production or if explicitly required)
  const requireApiKeys = process.env.REQUIRE_API_KEYS === 'true' || process.env.NODE_ENV === 'production';
  
  if (requireApiKeys) {
    Object.entries(config.alchemy.apiKeys).forEach(([chain, key]) => {
      if (!key || key === 'your_' + chain + '_api_key_here' || key.includes('your_')) {
        throw new Error(`Invalid API key for chain: ${chain}. Please set ALCHEMY_API_KEY_${chain.toUpperCase()} in your .env file`);
      }
    });
  } else {
    // In development, just warn about missing keys
    Object.entries(config.alchemy.apiKeys).forEach(([chain, key]) => {
      if (!key || key === 'your_' + chain + '_api_key_here' || key.includes('your_')) {
        console.warn(`⚠️  Warning: API key not configured for chain: ${chain}. Set ALCHEMY_API_KEY_${chain.toUpperCase()} in .env`);
      }
    });
  }

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

