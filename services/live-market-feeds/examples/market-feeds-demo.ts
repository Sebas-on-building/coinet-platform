#!/usr/bin/env tsx

/**
 * =========================================
 * LIVE MARKET DATA FEEDS DEMO
 * =========================================
 * Demonstrates the live market data feeds system
 * with WebSocket connections to major exchanges
 */

import { LiveMarketDataService } from '../src/index';
import { AlertIntegration } from '../src/integration/AlertIntegration';
import { PrismaClient } from '@prisma/client';
import { Logger } from '../src/utils/Logger';

async function main() {
  console.log('🚀 LIVE MARKET DATA FEEDS DEMO');
  console.log('═══════════════════════════════════');

  const logger = new Logger('Demo');
  const prisma = new PrismaClient();

  try {
    // Initialize the live market data service
    logger.info('Initializing Live Market Data Service...');
    const marketDataService = new LiveMarketDataService();

    // Initialize alert integration
    logger.info('Initializing Alert Integration...');
    const alertIntegration = new AlertIntegration(marketDataService, prisma);

    // Start the services
    await marketDataService.start();
    await alertIntegration.start();

    logger.info('✅ Services started successfully');

    // Subscribe to market data for popular symbols
    const symbols = ['BTCUSDT', 'ETHUSDT', 'ADAUSDT'];
    const exchanges = ['binance', 'coinbase', 'kraken'];

    logger.info(`📡 Subscribing to market data for: ${symbols.join(', ')}`);

    const subscriptionId = await marketDataService.subscribeToMarketData(symbols, exchanges, {
      dataTypes: ['trades', 'quotes'],
      maxLatency: 100,
      enableBuffering: true
    });

    logger.info(`✅ Subscription created: ${subscriptionId}`);

    // Create some alert conditions
    logger.info('🚨 Creating alert conditions...');

    await alertIntegration.createAlertCondition({
      symbol: 'BTCUSDT',
      exchange: 'binance',
      condition: 'price_above',
      threshold: 50000, // Alert when BTC goes above $50k
      timeframe: 60,
      isActive: true
    });

    await alertIntegration.createAlertCondition({
      symbol: 'ETHUSDT',
      exchange: 'binance',
      condition: 'volume_spike',
      threshold: 2.0, // Alert on 2x volume spike
      timeframe: 300,
      isActive: true
    });

    logger.info('✅ Alert conditions created');

    // Display service status
    console.log('\n📊 SERVICE STATUS');
    console.log('─────────────────');
    console.log('Market Data Service:', marketDataService.getStatus());
    console.log('Alert Integration:', alertIntegration.getStatus());

    // Listen for market data events
    marketDataService.on('processedData', (data) => {
      console.log(`📈 ${data.symbol} on ${data.exchange}: ${JSON.stringify(data, null, 2)}`);
    });

    // Listen for alert triggers
    alertIntegration.on('alertTriggered', (evaluation) => {
      console.log(`🚨 ALERT TRIGGERED: ${evaluation.alertId} - ${evaluation.condition} (${evaluation.currentValue})`);
    });

    // Keep the demo running
    console.log('\n🎉 Demo running! Press Ctrl+C to stop...\n');

    // Graceful shutdown
    process.on('SIGINT', async () => {
      logger.info('Shutting down demo...');

      await alertIntegration.stop();
      await marketDataService.stop();
      await prisma.$disconnect();

      logger.info('✅ Demo stopped gracefully');
      process.exit(0);
    });

    // Keep alive
    setInterval(() => {
      // Periodic status updates
    }, 30000);

  } catch (error) {
    logger.error('❌ Demo failed to start', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

// Run the demo
main().catch(console.error);
