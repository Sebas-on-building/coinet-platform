/**
 * QuickNode Integration - Usage Examples
 * 
 * Comprehensive examples demonstrating world-class QuickNode integration
 */

import { 
  QuickNodeClientManager,
  ChainQuickNodeClient,
} from '../src/clients/QuickNodeClient';
import { ProviderOrchestrator } from '../src/services/ProviderOrchestrator';
import { CrossValidationService } from '../src/services/CrossValidationService';
import { AlchemyClientManager } from '../src/clients/AlchemyClient';
import { RateLimiterManager } from '../src/utils/rateLimiter';
import { CacheManager } from '../src/cache/CacheManager';
import { 
  QuickNodeChain,
  QuickNodeEndpoint,
  ProviderPriority,
} from '../src/types/quicknode';
import { Chain } from '../src/types';
import { config, quickNodeConfig, crossValidationConfig, multiProviderConfig } from '../src/config';

// ========================================
// Example 1: Basic QuickNode Setup
// ========================================

async function example1_BasicSetup() {
  console.log('Example 1: Basic QuickNode Setup\n');

  // Create rate limiter
  const rateLimiter = new RateLimiterManager(config.rateLimit);

  // Create QuickNode client manager
  const quickNodeClient = new QuickNodeClientManager(
    quickNodeConfig.endpoints,
    rateLimiter
  );

  // Get client for Ethereum
  const ethClient = quickNodeClient.getClient(QuickNodeChain.ETHEREUM);

  // Get transfers
  const transfers = await ethClient.getTransfersByAddress({
    address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    fromBlock: 18000000,
    toBlock: 18001000,
    maxCount: 100,
  });

  console.log(`✅ Found ${transfers.transfers.length} transfers`);
  console.log('First transfer:', transfers.transfers[0]);
  
  // Get metrics
  const metrics = ethClient.getMetrics();
  console.log('\n📊 Client Metrics:', {
    requests: metrics.requests,
    errors: metrics.errors,
    transfersFetched: metrics.transfersFetched,
    averageLatency: `${metrics.averageLatency}ms`,
    computeUtilization: `${metrics.computeUtilization.toFixed(2)}%`,
  });
}

// ========================================
// Example 2: Wallet Token Balance
// ========================================

async function example2_WalletBalance() {
  console.log('\n\nExample 2: Wallet Token Balance\n');

  const rateLimiter = new RateLimiterManager(config.rateLimit);
  const quickNodeClient = new QuickNodeClientManager(
    quickNodeConfig.endpoints,
    rateLimiter
  );

  const ethClient = quickNodeClient.getClient(QuickNodeChain.ETHEREUM);

  // Get wallet balance
  const balance = await ethClient.getWalletTokenBalance({
    wallet: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    perPage: 50,
  });

  console.log(`✅ Wallet Address: ${balance.address}`);
  console.log(`💰 Total Portfolio Value: $${balance.totalValueUsd.toLocaleString()}`);
  console.log(`🪙 Number of Tokens: ${balance.tokens.length}`);
  
  // Display top 5 tokens
  console.log('\n🏆 Top 5 Tokens by Value:');
  balance.tokens
    .sort((a, b) => (b.totalValueUsd || 0) - (a.totalValueUsd || 0))
    .slice(0, 5)
    .forEach((token, index) => {
      console.log(`${index + 1}. ${token.symbol}: ${token.balanceWithDecimals} ($${token.totalValueUsd?.toLocaleString()})`);
    });
}

// ========================================
// Example 3: NFT Enumeration
// ========================================

async function example3_NFTsByOwner() {
  console.log('\n\nExample 3: NFT Enumeration\n');

  const rateLimiter = new RateLimiterManager(config.rateLimit);
  const quickNodeClient = new QuickNodeClientManager(
    quickNodeConfig.endpoints,
    rateLimiter
  );

  const ethClient = quickNodeClient.getClient(QuickNodeChain.ETHEREUM);

  // Get NFTs owned by address
  const nfts = await ethClient.getNFTsByOwner({
    owner: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    perPage: 50,
  });

  console.log(`✅ Owner: ${nfts.owner}`);
  console.log(`🖼️  Total NFTs: ${nfts.nfts.length}`);
  
  // Group by collection
  const collections = new Map<string, number>();
  nfts.nfts.forEach(nft => {
    const count = collections.get(nft.collectionName) || 0;
    collections.set(nft.collectionName, count + 1);
  });

  console.log('\n📦 NFTs by Collection:');
  Array.from(collections.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .forEach(([collection, count]) => {
      console.log(`  ${collection}: ${count} NFTs`);
    });
}

// ========================================
// Example 4: Cross-Validation
// ========================================

async function example4_CrossValidation() {
  console.log('\n\nExample 4: Cross-Validation between Alchemy & QuickNode\n');

  const rateLimiter = new RateLimiterManager(config.rateLimit);
  const alchemyClient = new AlchemyClientManager(config.alchemy.apiKeys, rateLimiter);
  const quickNodeClient = new QuickNodeClientManager(
    quickNodeConfig.endpoints,
    rateLimiter
  );

  const cache = new CacheManager(config.redis);
  await cache.connect();

  const crossValidation = new CrossValidationService(
    alchemyClient,
    quickNodeClient,
    crossValidationConfig
  );

  // Validate transfers for a whale address
  const validation = await crossValidation.validateTransfers(
    '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    Chain.ETHEREUM,
    18000000,
    18001000
  );

  console.log('✅ Validation Result:');
  console.log({
    validated: validation.validated,
    confidence: `${validation.confidence.toFixed(2)}%`,
    discrepancies: {
      transferCountDiff: validation.discrepancies.transferCountDiff,
      valueDiffPercent: `${validation.discrepancies.valueDiffPercentage.toFixed(2)}%`,
      missingInAlchemy: validation.discrepancies.missingInAlchemy.length,
      missingInQuickNode: validation.discrepancies.missingInQuickNode.length,
    },
  });

  if (!validation.validated) {
    console.log('\n⚠️  Discrepancies found - reconciling...');
    const bestProvider = await crossValidation.reconcileDiscrepancies(validation);
    console.log(`✅ Recommended provider: ${bestProvider}`);
  }

  // Get validation metrics
  const metrics = crossValidation.getMetrics();
  console.log('\n📊 Cross-Validation Metrics:', {
    totalValidations: metrics.totalValidations,
    passRate: `${metrics.passRate.toFixed(2)}%`,
    avgConfidence: `${metrics.avgConfidenceScore.toFixed(2)}%`,
    discrepanciesFound: metrics.discrepanciesFound,
    quotaSaved: metrics.quotaSaved,
  });

  await cache.disconnect();
}

// ========================================
// Example 5: Provider Orchestration
// ========================================

async function example5_ProviderOrchestration() {
  console.log('\n\nExample 5: Provider Orchestration with Smart Routing\n');

  const rateLimiter = new RateLimiterManager(config.rateLimit);
  const alchemyClient = new AlchemyClientManager(config.alchemy.apiKeys, rateLimiter);
  const quickNodeClient = new QuickNodeClientManager(
    quickNodeConfig.endpoints,
    rateLimiter
  );

  const cache = new CacheManager(config.redis);
  await cache.connect();

  const crossValidation = new CrossValidationService(
    alchemyClient,
    quickNodeClient,
    crossValidationConfig
  );

  const orchestrator = new ProviderOrchestrator(
    alchemyClient,
    quickNodeClient,
    crossValidation,
    cache,
    {
      defaultProvider: multiProviderConfig.defaultProvider as any,
      enableLoadBalancing: multiProviderConfig.enableLoadBalancing,
      enableFallback: multiProviderConfig.enableFallback,
      quotaAwareRouting: multiProviderConfig.quotaAwareRouting,
      preferAlchemyForChains: multiProviderConfig.preferAlchemyForChains,
      maxErrorRateThreshold: 0.1, // 10%
      maxQuotaUtilization: 80, // 80%
      healthCheckIntervalMs: 60000, // 1 minute
    }
  );

  // Example 5a: Smart routing (automatic)
  console.log('5a. Smart Routing (Automatic):');
  const transfers1 = await orchestrator.getTransfers({
    address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    chain: Chain.ETHEREUM,
    limit: 100,
  });
  console.log(`✅ Fetched ${transfers1.length} transfers with automatic routing`);

  // Example 5b: Cross-validation for large transfer
  console.log('\n5b. Cross-Validation Strategy:');
  const transfers2 = await orchestrator.getTransfers(
    {
      address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
      chain: Chain.ETHEREUM,
      limit: 100,
    },
    {
      priority: ProviderPriority.CROSS_VALIDATE,
      crossValidateThreshold: 100000,
      fallbackEnabled: true,
      quotaAwareRouting: true,
      cacheResults: true,
    }
  );
  console.log(`✅ Cross-validated ${transfers2.length} transfers`);

  // Example 5c: Quota-aware routing
  console.log('\n5c. Quota-Aware Routing:');
  const transfers3 = await orchestrator.getTransfers(
    {
      address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
      chain: Chain.POLYGON,
      limit: 100,
    },
    {
      priority: ProviderPriority.LOAD_BALANCE,
      fallbackEnabled: true,
      quotaAwareRouting: true,
      cacheResults: true,
    }
  );
  console.log(`✅ Fetched ${transfers3.length} transfers with quota-aware routing`);

  // Get orchestrator metrics
  const metrics = orchestrator.getMetrics();
  console.log('\n📊 Orchestrator Metrics:');
  console.log('Alchemy:', {
    requests: metrics.providers.alchemy.requests,
    successes: metrics.providers.alchemy.successes,
    errorRate: `${(metrics.providers.alchemy.errorRate * 100).toFixed(2)}%`,
    avgLatency: `${metrics.providers.alchemy.averageLatency}ms`,
  });
  console.log('QuickNode:', {
    requests: metrics.providers.quicknode.requests,
    successes: metrics.providers.quicknode.successes,
    errorRate: `${(metrics.providers.quicknode.errorRate * 100).toFixed(2)}%`,
    avgLatency: `${metrics.providers.quicknode.averageLatency}ms`,
  });

  await orchestrator.shutdown();
  await cache.disconnect();
}

// ========================================
// Example 6: Pagination Handling
// ========================================

async function example6_Pagination() {
  console.log('\n\nExample 6: Automatic Pagination Handling\n');

  const rateLimiter = new RateLimiterManager(config.rateLimit);
  const quickNodeClient = new QuickNodeClientManager(
    quickNodeConfig.endpoints,
    rateLimiter
  );

  const ethClient = quickNodeClient.getClient(QuickNodeChain.ETHEREUM);

  // Get ALL transfers with automatic pagination
  console.log('Fetching all transfers (this may take a while)...');
  const allTransfers = await ethClient.getAllTransfers({
    address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    fromBlock: 18000000,
    toBlock: 18001000,
  });

  console.log(`✅ Fetched ${allTransfers.transfers.length} total transfers`);
  console.log('Transfer categories:');
  
  const categories = new Map<string, number>();
  allTransfers.transfers.forEach(t => {
    const count = categories.get(t.category) || 0;
    categories.set(t.category, count + 1);
  });

  categories.forEach((count, category) => {
    console.log(`  ${category}: ${count}`);
  });
}

// ========================================
// Example 7: Health Monitoring
// ========================================

async function example7_HealthMonitoring() {
  console.log('\n\nExample 7: Health Monitoring & Metrics\n');

  const rateLimiter = new RateLimiterManager(config.rateLimit);
  const quickNodeClient = new QuickNodeClientManager(
    quickNodeConfig.endpoints,
    rateLimiter
  );

  // Check health of all endpoints
  console.log('🏥 Checking health of all QuickNode endpoints...\n');
  const health = await quickNodeClient.healthCheckAll();

  for (const [chain, isHealthy] of Object.entries(health)) {
    const icon = isHealthy ? '✅' : '❌';
    console.log(`${icon} ${chain}: ${isHealthy ? 'Healthy' : 'Unhealthy'}`);
  }

  // Get detailed metrics
  console.log('\n📊 Detailed Metrics:\n');
  const metrics = quickNodeClient.getAllMetrics();

  for (const [chain, metric] of Object.entries(metrics)) {
    console.log(`${chain}:`);
    console.log({
      requests: metric.requests,
      errors: metric.errors,
      transfersFetched: metric.transfersFetched,
      averageLatency: `${metric.averageLatency}ms`,
      computeUtilization: `${metric.computeUtilization.toFixed(2)}%`,
      rateLimitHits: metric.rateLimitHits,
    });
    console.log('');
  }

  // Get optimal client
  const optimalClient = quickNodeClient.getOptimalClient([
    QuickNodeChain.ETHEREUM,
    QuickNodeChain.POLYGON,
    QuickNodeChain.ARBITRUM,
  ]);

  if (optimalClient) {
    const optimalMetrics = optimalClient.getMetrics();
    console.log(`🎯 Optimal client: ${optimalMetrics.chain}`);
    console.log(`   Compute utilization: ${optimalMetrics.computeUtilization.toFixed(2)}%`);
  }
}

// ========================================
// Example 8: Error Handling & Fallback
// ========================================

async function example8_ErrorHandling() {
  console.log('\n\nExample 8: Error Handling & Fallback\n');

  const rateLimiter = new RateLimiterManager(config.rateLimit);
  const alchemyClient = new AlchemyClientManager(config.alchemy.apiKeys, rateLimiter);
  const quickNodeClient = new QuickNodeClientManager(
    quickNodeConfig.endpoints,
    rateLimiter
  );

  const cache = new CacheManager(config.redis);
  await cache.connect();

  const orchestrator = new ProviderOrchestrator(
    alchemyClient,
    quickNodeClient,
    null, // No cross-validation for this example
    cache,
    {
      defaultProvider: 'alchemy',
      enableLoadBalancing: true,
      enableFallback: true,
      quotaAwareRouting: true,
      preferAlchemyForChains: [],
      maxErrorRateThreshold: 0.1,
      maxQuotaUtilization: 80,
      healthCheckIntervalMs: 60000,
    }
  );

  try {
    // This will use Alchemy first, fallback to QuickNode if it fails
    const transfers = await orchestrator.getTransfers({
      address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
      chain: Chain.ETHEREUM,
      limit: 100,
    });

    console.log(`✅ Successfully fetched ${transfers.length} transfers with automatic fallback`);
  } catch (error: any) {
    if (error.message.includes('Rate limit exceeded')) {
      console.log('⚠️  Rate limit hit - implement backoff strategy');
    } else if (error.message.includes('Circuit breaker open')) {
      console.log('⚠️  Circuit breaker open - waiting for recovery');
    } else if (error.message.includes('Both providers failed')) {
      console.log('❌ Both Alchemy and QuickNode failed - check service health');
    } else {
      console.error('❌ Unexpected error:', error.message);
    }
  } finally {
    await orchestrator.shutdown();
    await cache.disconnect();
  }
}

// ========================================
// Run All Examples
// ========================================

async function runAllExamples() {
  console.log('='.repeat(60));
  console.log('🚀 QuickNode Integration - Usage Examples');
  console.log('   World-Class Implementation');
  console.log('='.repeat(60));

  try {
    await example1_BasicSetup();
    await example2_WalletBalance();
    await example3_NFTsByOwner();
    await example4_CrossValidation();
    await example5_ProviderOrchestration();
    await example6_Pagination();
    await example7_HealthMonitoring();
    await example8_ErrorHandling();

    console.log('\n' + '='.repeat(60));
    console.log('✅ All examples completed successfully!');
    console.log('='.repeat(60));
  } catch (error: any) {
    console.error('\n❌ Example failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run if executed directly
if (require.main === module) {
  runAllExamples()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

export {
  example1_BasicSetup,
  example2_WalletBalance,
  example3_NFTsByOwner,
  example4_CrossValidation,
  example5_ProviderOrchestration,
  example6_Pagination,
  example7_HealthMonitoring,
  example8_ErrorHandling,
};

