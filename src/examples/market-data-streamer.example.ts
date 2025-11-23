/**
 * Example Usage: Market Data Streamer
 * Demonstrates how to use the MarketDataStreamer for real-time updates
 */

import { MarketDataStreamer } from '../services/market-data-streamer';
import { CoinGeckoWebSocketClient } from '../providers/coingecko-websocket';
import { UnifiedPriceUpdate } from '../services/market-data-streamer';

async function exampleMarketDataStreamer() {
  // Initialize WebSocket client (if available)
  const wsConfig = {
    url: process.env.COINGECKO_WS_URL || 'wss://ws.coingecko.com/v3',
    maxConnections: 1,
    maxSubscriptionsPerChannel: 100,
    reconnectInterval: 5000,
    heartbeatInterval: 30000,
    enabled: true,
  };

  const geckoWs = new CoinGeckoWebSocketClient(
    wsConfig,
    process.env.COINGECKO_API_KEY || ''
  );

  // Create streamer
  const streamer = new MarketDataStreamer(geckoWs, {
    symbols: ['BTC', 'ETH', 'SOL'],
    channels: ['price'],
    reconnectInterval: 5000,
    maxReconnectAttempts: 10,
    deduplicationWindow: 1000, // 1 second
  });

  // Example 1: Listen to price updates
  console.log('=== Example 1: Real-time Price Updates ===');
  streamer.on('price_update', (update: UnifiedPriceUpdate) => {
    console.log(`\n📊 ${update.symbol} Price Update:`);
    console.log(`  Price: $${update.price}`);
    console.log(`  Best Source: ${update.bestSource}`);
    console.log(`  Confidence: ${update.confidence}%`);
    console.log(`  Sources: ${update.sources.length}`);
    update.sources.forEach((source: { source: string; price: number; timestamp: Date }) => {
      console.log(`    - ${source.source}: $${source.price}`);
    });
  });

  // Example 2: Listen to stream events
  streamer.on('stream_started', (data: { symbols: string[] }) => {
    console.log(`\n✅ Stream started for: ${data.symbols.join(', ')}`);
  });

  streamer.on('stream_stopped', () => {
    console.log('\n⏹️  Stream stopped');
  });

  streamer.on('error', (error: Error) => {
    console.error('\n❌ Stream error:', error);
  });

  streamer.on('connect', (data: { source: string }) => {
    console.log(`\n🔌 Connected to ${data.source}`);
  });

  streamer.on('disconnect', (data: { source: string }) => {
    console.log(`\n🔌 Disconnected from ${data.source}`);
  });

  // Example 3: Start streaming
  console.log('\n=== Starting Stream ===');
  try {
    await streamer.startStreaming(['BTC', 'ETH', 'SOL']);
    console.log('Stream started successfully');

    // Example 4: Add symbols dynamically
    setTimeout(async () => {
      console.log('\n=== Adding More Symbols ===');
      await streamer.addSymbols(['MATIC', 'AVAX']);
      console.log('Added MATIC and AVAX to stream');
    }, 5000);

    // Example 5: Get statistics
    setInterval(() => {
      const stats = streamer.getStats();
      console.log('\n📈 Stream Statistics:');
      console.log(`  Total Updates: ${stats.totalUpdates}`);
      console.log(`  Updates by Source:`, stats.updatesBySource);
      console.log(`  Connected Sources: ${stats.connectedSources.join(', ')}`);
      console.log(`  Reconnect Count: ${stats.reconnectCount}`);
      console.log(`  Errors: ${stats.errors}`);
      if (stats.lastUpdate) {
        console.log(`  Last Update: ${stats.lastUpdate}`);
      }
    }, 10000);

    // Example 6: Remove symbols
    setTimeout(async () => {
      console.log('\n=== Removing Symbol ===');
      await streamer.removeSymbols(['SOL']);
      console.log('Removed SOL from stream');
    }, 15000);

    // Keep running for demonstration
    console.log('\nStream will run for 30 seconds...');
    setTimeout(async () => {
      await streamer.stopStreaming();
      console.log('\nStream stopped. Example complete.');
      process.exit(0);
    }, 30000);
  } catch (error) {
    console.error('Error starting stream:', error);
  }
}

// Run example if executed directly
if (require.main === module) {
  exampleMarketDataStreamer().catch(console.error);
}

export { exampleMarketDataStreamer };

