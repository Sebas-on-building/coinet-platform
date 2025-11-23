/**
 * =========================================
 * NEWS AGGREGATOR DEMO
 * =========================================
 * Example usage of the news aggregator service
 */

import { NewsAggregator, NewsSource, TokenProjectMapping } from '../src/index';

async function runDemo() {
  console.log('📰 Starting News Aggregator Demo...\n');

  // Define token mappings for cryptocurrency projects
  const tokenMappings: TokenProjectMapping[] = [
    {
      token: 'Bitcoin',
      symbol: 'BTC',
      project: 'Bitcoin',
      blockchain: 'Bitcoin',
      categories: ['currency', 'store-of-value'],
      aliases: ['bitcoin', 'btc']
    },
    {
      token: 'Ethereum',
      symbol: 'ETH',
      project: 'Ethereum',
      blockchain: 'Ethereum',
      categories: ['smart-contract', 'platform'],
      aliases: ['ethereum', 'eth', 'ether']
    },
    {
      token: 'Binance Coin',
      symbol: 'BNB',
      project: 'Binance Smart Chain',
      blockchain: 'BSC',
      categories: ['exchange', 'platform'],
      aliases: ['binance coin', 'bnb', 'bsc']
    },
    {
      token: 'Cardano',
      symbol: 'ADA',
      project: 'Cardano',
      blockchain: 'Cardano',
      categories: ['smart-contract', 'platform'],
      aliases: ['cardano', 'ada']
    }
  ];

  // Initialize the aggregator with custom configuration
  const aggregator = new NewsAggregator({
    maxProcessingLatencyMs: 2000, // 2 seconds for news processing
    batchSize: 25,
    maxConcurrentRequests: 5,
    cacheTtlSeconds: 300,
    aggregationWindows: {
      short: 60,   // 1 minute
      medium: 300, // 5 minutes
      long: 3600   // 1 hour
    },
    classificationThresholds: {
      breaking: 0.8,
      regulatory: 0.7,
      exploit: 0.9,
      macro: 0.6
    },
    backfillSettings: {
      maxDaysBack: 7,
      maxArticlesPerDay: 500,
      retryAttempts: 3
    },
    tokenProjectMappings: tokenMappings
  });

  try {
    // Start the service
    await aggregator.start();
    console.log('✅ News Aggregator started successfully\n');

    // Set up event listeners
    setupEventListeners(aggregator);

    // Backfill recent news data
    console.log('📚 Starting backfill of recent news data...\n');

    const backfillResult = await aggregator.backfillData({
      startDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
      endDate: new Date(),
      maxArticles: 50
    });

    console.log(`✅ Backfill completed: ${backfillResult.articles.length} articles fetched\n`);

    // Monitor for 2 minutes then show summary
    console.log('📈 Monitoring news feeds for 2 minutes...\n');

    setTimeout(async () => {
      console.log('📊 Generating summary report...\n');

      // Get health status
      const health = await aggregator.getHealthStatus();
      console.log('Health Status:');
      console.log(`- Running: ${health.is_running}`);
      console.log(`- Articles Processed: ${health.articles_processed_total}`);
      console.log(`- Articles/sec: ${health.articles_per_second.toFixed(2)}`);
      console.log(`- Avg Latency: ${health.avg_processing_latency_ms.toFixed(0)}ms`);
      console.log(`- Error Rate: ${(health.error_rate * 100).toFixed(2)}%\n`);

      // Show source health
      console.log('Source Health:');
      for (const [sourceId, sourceHealth] of Object.entries(health.source_health)) {
        console.log(`- ${sourceId}: ${sourceHealth.status} (${sourceHealth.articles_fetched} articles)`);
      }
      console.log('');

      // Stop the service
      await aggregator.stop();
      console.log('✅ Demo completed successfully!\n');

      process.exit(0);

    }, 120000); // 2 minutes

  } catch (error: any) {
    console.error('❌ Demo failed:', error.message);
    await aggregator.stop();
    process.exit(1);
  }
}

function setupEventListeners(aggregator: NewsAggregator) {
  console.log('🎧 Setting up event listeners...\n');

  // Article events
  aggregator.on('article', (event) => {
    const article = event.data;
    console.log(`📰 [${article.source.name}] New article:`);
    console.log(`   "${article.title}"`);
    console.log(`   Classification: ${article.classification} (${(article.confidence * 100).toFixed(1)}%)`);
    console.log(`   Sentiment: ${article.sentiment.label} (${article.sentiment.score.toFixed(2)})`);
    console.log(`   Tokens: ${article.keyFacts.tokens.join(', ')}`);
    console.log(`   Projects: ${article.keyFacts.projects.join(', ')}`);
    console.log('');
  });

  // Alert events
  aggregator.on('alert', (event) => {
    const alert = event.data;
    console.log(`🚨 [${alert.type.toUpperCase()}] ${alert.urgency.toUpperCase()} ALERT:`);
    console.log(`   "${alert.title}"`);
    console.log(`   Affected: ${alert.affectedTokens.join(', ')}`);
    console.log(`   Projects: ${alert.affectedProjects.join(', ')}`);
    console.log('');
  });

  // Classification events (for debugging)
  aggregator.on('classification', (event) => {
    const classification = event.data;
    console.log(`🏷️  Classification: ${classification.type} (${(classification.confidence * 100).toFixed(1)}%)`);
  });

  // Error events
  aggregator.on('error', (event) => {
    const error = event.data;
    console.error(`❌ Error [${error.source}]:`, error.error_message);
  });

  // Backfill events
  aggregator.on('backfill', (event) => {
    const result = event.data;
    console.log(`📚 Backfill: ${result.articles.length} articles processed`);
  });
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

// Run the demo
if (require.main === module) {
  runDemo().catch((error) => {
    console.error('Demo failed:', error);
    process.exit(1);
  });
}

export { runDemo };
