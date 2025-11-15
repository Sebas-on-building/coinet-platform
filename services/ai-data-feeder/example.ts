/**
 * Example: Using AI Data Feeder
 * 
 * Run: npx ts-node example.ts
 */

import dotenv from 'dotenv';
import { AIDataFeeder } from './src/data-feeder';
import { getConfig } from './src/config';

dotenv.config();

async function main() {
  console.log('🤖 AI Data Feeder Example\n');

  // Get configuration
  const config = getConfig();
  console.log('Configuration:', {
    coins: config.coins,
    priceInterval: `${config.priceUpdateInterval / 1000}s`,
    newsInterval: `${config.newsUpdateInterval / 1000}s`,
    aiInterval: `${config.aiAnalysisInterval / 1000}s`,
  });

  // Create data feeder
  const feeder = new AIDataFeeder(config);

  // Listen for data updates
  feeder.on('data_update', (event) => {
    console.log(`\n📊 ${event.type.toUpperCase()}`);
    console.log(`Coin: ${event.coin}`);
    console.log(`Time: ${event.timestamp.toISOString()}`);
    
    if (event.type === 'price_update') {
      console.log(`Price: $${event.data.current.toLocaleString()}`);
      console.log(`Change: ${event.data.changePercentage24h.toFixed(2)}%`);
    } else if (event.type === 'news_update') {
      console.log(`News: ${event.data.count} articles`);
      console.log(`Sentiment: ${event.data.sentiment} (${event.data.sentimentScore})`);
      console.log(`Panic: ${event.data.panicScore}/100`);
    } else if (event.type === 'ai_analysis') {
      console.log(`Recommendation: ${event.data.recommendation.toUpperCase()}`);
      console.log(`Confidence: ${event.data.confidence}%`);
      console.log(`Reasoning: ${event.data.reasoning}`);
      if (event.data.signals.length > 0) {
        console.log('Signals:');
        event.data.signals.forEach((signal: any) => {
          console.log(`  - ${signal.type}: ${signal.description} (${signal.strength}%)`);
        });
      }
    }
  });

  // Listen for errors
  feeder.on('error', (event) => {
    console.error('❌ Error:', event.data);
  });

  // Start the feeder
  await feeder.start();

  console.log('\n✅ Data feeder started!');
  console.log('Watching for updates...\n');

  // Show status every 30 seconds
  setInterval(() => {
    const status = feeder.getStatus();
    console.log('\n📊 Status:', status);
    
    // Show current data for Bitcoin
    const btcData = feeder.getDataPoint('bitcoin');
    if (btcData) {
      console.log('\n₿ Bitcoin:');
      console.log(`  Price: $${btcData.price.current.toLocaleString()}`);
      console.log(`  Change: ${btcData.price.changePercentage24h.toFixed(2)}%`);
      console.log(`  News: ${btcData.news.count} articles (${btcData.news.sentiment})`);
      console.log(`  Sentiment: ${btcData.news.sentimentScore}`);
      console.log(`  Panic: ${btcData.news.panicScore}/100`);
    }
  }, 30000);

  // Keep running
  console.log('Press Ctrl+C to stop');
}

main().catch(console.error);

