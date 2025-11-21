#!/usr/bin/env tsx

/**
 * =========================================
 * ON-CHAIN TRANSACTION MONITOR DEMO
 * =========================================
 * Demonstrates the on-chain transaction monitoring system
 * with multi-chain support and real-time transaction processing
 */

import { OnChainMonitor } from '../dist/index';
import { Logger } from '../dist/utils/Logger';

async function main(): Promise<void> {
  console.log('🚀 ON-CHAIN TRANSACTION MONITOR DEMO');
  console.log('═════════════════════════════════════');

  const logger = new Logger('Demo');

  try {
    // Initialize the on-chain monitor
    logger.info('Initializing On-Chain Monitor...');
    const monitor = new OnChainMonitor();

    // Start the monitor
    await monitor.start();

    logger.info('✅ On-Chain Monitor started successfully');

    // Subscribe to transactions on multiple chains
    const chains = ['ethereum', 'bsc', 'solana', 'polygon'];

    logger.info(`📡 Subscribing to transactions for chains: ${chains.join(', ')}`);

    const subscriptionId = await monitor.subscribeToTransactions(chains, {
      includeTransfers: true,
      includeDexTrades: true,
      includeContractCalls: true,
      minValue: 1000, // USD value threshold
      whaleOnly: false
    });

    logger.info(`✅ Subscription created: ${subscriptionId}`);

    // Display service status
    console.log('\n📊 SERVICE STATUS');
    console.log('─────────────────');
    console.log('On-Chain Monitor:', monitor.getStatus());

    // Listen for transactions
    monitor.on('transactionProcessed', (data) => {
      console.log(`💰 Transaction: ${data.transaction.hash}`);
      console.log(`   Chain: ${data.transaction.exchange}`);
      console.log(`   Type: ${data.transaction.type}`);
      console.log(`   Value: ${data.transaction.amount} wei`);
      if (data.whaleInfo?.isWhale) {
        console.log(`   🐋 WHALE DETECTED! Score: ${data.whaleInfo.score}`);
      }
      console.log('');
    });

    // Listen for whale detections
    monitor.on('whaleDetected', (data) => {
      console.log(`🐋 WHALE DETECTED!`);
      console.log(`   Address: ${data.transaction.from}`);
      console.log(`   Type: ${data.result.cluster?.type}`);
      console.log(`   Score: ${data.result.score}`);
      console.log('');
    });

    // Listen for health status changes
    monitor.on('healthStatusChanged', (status) => {
      console.log(`🏥 Health Status: ${status.status}`);
      if (status.issues.length > 0) {
        console.log(`   Issues: ${status.issues.join(', ')}`);
      }
    });

    // Keep the demo running
    console.log('\n🎉 Demo running! Press Ctrl+C to stop...\n');

    // Graceful shutdown
    process.on('SIGINT', async () => {
      logger.info('Shutting down demo...');

      await monitor.stop();

      logger.info('✅ Demo stopped gracefully');
      process.exit(0);
    });

    // Keep alive
    setInterval(() => {
      // Periodic status updates
    }, 30000);

  } catch (error) {
    logger.error('❌ Demo failed to start', error);
    process.exit(1);
  }
}

// Run the demo
main().catch(console.error);
