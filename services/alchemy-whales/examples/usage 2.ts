/**
 * Usage examples for Alchemy Whales Service
 */

import { AlchemyWhalesService, Chain, TransferCategory } from '../src';

async function main() {
  // Create service instance
  const service = new AlchemyWhalesService();

  try {
    // Initialize service
    await service.initialize();
    console.log('✅ Service initialized');

    // Example 1: Get recent whale transfers
    console.log('\n📊 Example 1: Recent Whale Transfers');
    const recentWhales = await service.getRecentWhaleTransfers(10, 100000);
    console.log(`Found ${recentWhales.length} recent whale transfers`);
    recentWhales.slice(0, 3).forEach((transfer: any) => {
      console.log(`  - $${transfer.value_usd.toLocaleString()} on ${transfer.chain}`);
    });

    // Example 2: Get transfers for specific address
    console.log('\n📊 Example 2: Address Transfers');
    const vitalikAddress = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';
    const transfers = await service.getTransfers({
      address: vitalikAddress,
      chain: Chain.ETHEREUM,
      minValueUsd: 10000,
      limit: 10,
    });
    console.log(`Found ${transfers.length} transfers for ${vitalikAddress}`);

    // Example 3: Get whale profile
    console.log('\n📊 Example 3: Whale Profile');
    const profile = await service.getWhaleProfile(vitalikAddress, Chain.ETHEREUM);
    if (profile) {
      console.log('Whale Profile:', {
        address: profile.address,
        tier: profile.tier,
        totalValue: `$${profile.totalValueUsd.toLocaleString()}`,
        totalTransfers: profile.totalTransfers,
        averageTransfer: `$${profile.averageTransferUsd.toLocaleString()}`,
      });
    }

    // Example 4: Get top whales leaderboard
    console.log('\n📊 Example 4: Whale Leaderboard');
    const topWhales = await service.getTopWhales(Chain.ETHEREUM, 10);
    console.log(`Top ${topWhales.length} whales on Ethereum:`);
    topWhales.slice(0, 5).forEach((whale: any, index: number) => {
      console.log(`  ${index + 1}. ${whale.address}: $${whale.total_value_usd.toLocaleString()}`);
    });

    // Example 5: Sync historical transfers
    console.log('\n📊 Example 5: Historical Sync');
    const result = await service.syncHistoricalTransfers(
      vitalikAddress,
      Chain.ETHEREUM,
      'latest'
    );
    console.log('Historical sync completed:', result);

    // Example 6: Get service metrics
    console.log('\n📊 Example 6: Service Metrics');
    const metrics = await service.getMetrics();
    console.log('Service Metrics:', {
      totalTransfers: metrics.transfers.total,
      whaleTransfers: metrics.transfers.whales,
      apiRequests: metrics.api.requests,
      webhooksReceived: metrics.webhooks.received,
    });

    // Example 7: Health check
    console.log('\n📊 Example 7: Health Check');
    const health = await service.getHealth();
    console.log('Service Health:', {
      status: health.status,
      uptime: `${Math.floor(health.uptime / 1000)}s`,
      database: health.components.database.status,
      cache: health.components.cache.status,
    });

  } catch (error: any) {
    console.error('Error:', error.message);
  } finally {
    // Shutdown service
    await service.shutdown();
    console.log('\n✅ Service shut down');
  }
}

// Run examples
main().catch(console.error);

