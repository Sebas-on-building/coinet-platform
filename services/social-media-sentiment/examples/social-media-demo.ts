/**
 * =========================================
 * SOCIAL MEDIA SENTIMENT ANALYSIS DEMO
 * =========================================
 * Example usage of the social media sentiment analysis service
 */

import { SocialMediaMonitor, Platform } from '../src/index';

async function runDemo() {
  console.log('🚀 Starting Social Media Sentiment Analysis Demo...\n');

  // Initialize the monitor with custom configuration
  const monitor = new SocialMediaMonitor({
    enabledPlatforms: ['twitter', 'reddit'], // Enable specific platforms
    processingLatencyMs: 3000, // 3-second processing target
    batchSize: 50,
    aggregationWindows: {
      short: 30,   // 30 seconds
      medium: 300, // 5 minutes
      long: 1800   // 30 minutes
    },
    privacySettings: {
      hashUserIds: true,
      storeRawContent: false,
      retentionDays: 7,
      anonymizeLocation: true
    }
  });

  try {
    // Start the service
    await monitor.start();
    console.log('✅ Service started successfully\n');

    // Set up event listeners
    setupEventListeners(monitor);

    // Subscribe to cryptocurrency-related keywords
    console.log('🔍 Subscribing to cryptocurrency keywords...');
    const subscriptionId = await monitor.subscribeToKeywords(
      ['#bitcoin', '#ethereum', '#crypto', 'BTC', 'ETH', 'cryptocurrency'],
      {
        platforms: ['twitter', 'reddit'],
        includeInfluencerAnalysis: true,
        sentimentThreshold: 0.6,
        timeWindows: {
          short: 1,
          medium: 5,
          long: 30
        }
      }
    );

    console.log(`✅ Subscribed with ID: ${subscriptionId}\n`);

    // Subscribe to specific topics
    console.log('📊 Subscribing to financial topics...');
    const topicSubscriptionId = await monitor.subscribeToTopics(
      ['cryptocurrency', 'blockchain', 'defi', 'trading'],
      {
        platforms: ['twitter'],
        languageFilter: ['en', 'es', 'zh'],
        minFollowers: 1000
      }
    );

    console.log(`✅ Topic subscription ID: ${topicSubscriptionId}\n`);

    // Monitor for 2 minutes then show summary
    console.log('📈 Monitoring social media sentiment for 2 minutes...\n');

    setTimeout(async () => {
      console.log('📊 Generating summary report...\n');

      // Get health status
      const health = await monitor.getHealthStatus();
      console.log('Health Status:');
      console.log(`- Running: ${health.is_running}`);
      console.log(`- Active Subscriptions: ${health.active_subscriptions}`);
      console.log(`- Posts Processed: ${health.posts_processed_total}`);
      console.log(`- Posts/sec: ${health.posts_per_second.toFixed(2)}`);
      console.log(`- Avg Latency: ${health.avg_processing_latency_ms.toFixed(0)}ms`);
      console.log(`- Error Rate: ${(health.error_rate * 100).toFixed(2)}%\n`);

      // Get aggregated metrics
      const shortMetrics = await monitor.getAggregatedMetrics('short');
      const mediumMetrics = await monitor.getAggregatedMetrics('medium');
      const longMetrics = await monitor.getAggregatedMetrics('long');

      console.log('📈 Aggregation Summary:');
      console.log(`- Short Window: ${shortMetrics.length} platforms`);
      console.log(`- Medium Window: ${mediumMetrics.length} platforms`);
      console.log(`- Long Window: ${longMetrics.length} platforms\n`);

      // Show sample metrics for each platform
      for (const metrics of shortMetrics) {
        console.log(`${metrics.platform.toUpperCase()} (${metrics.window.duration / 1000}s window):`);
        console.log(`  - Posts: ${metrics.total_posts}`);
        console.log(`  - Unique Authors: ${metrics.unique_authors}`);
        console.log(`  - Sentiment: +${metrics.sentiment_distribution.positive} / -${metrics.sentiment_distribution.negative} / ~${metrics.sentiment_distribution.neutral}`);
        console.log(`  - Posts/min: ${metrics.volume_metrics.posts_per_minute.toFixed(1)}`);
        console.log(`  - Anomaly Score: ${(metrics.volume_metrics.anomaly_score * 100).toFixed(1)}%\n`);
      }

      // Stop the service
      await monitor.stop();
      console.log('✅ Demo completed successfully!\n');

      process.exit(0);

    }, 120000); // 2 minutes

  } catch (error: any) {
    console.error('❌ Demo failed:', error.message);
    await monitor.stop();
    process.exit(1);
  }
}

function setupEventListeners(monitor: SocialMediaMonitor) {
  console.log('🎧 Setting up event listeners...\n');

  // Post events
  monitor.on('post', (event) => {
    const post = event.data;
    console.log(`📝 [${post.platform.toUpperCase()}] New post from ${post.author.username || post.author.id}:`);
    console.log(`   "${post.content.substring(0, 100)}${post.content.length > 100 ? '...' : ''}"`);
    console.log(`   Sentiment: ${post.sentiment.label} (${post.sentiment.score.toFixed(2)})`);
    console.log(`   Topics: ${post.topics.topics.slice(0, 3).join(', ')}`);
    console.log('');
  });

  // Sentiment events (aggregated)
  monitor.on('sentiment', (event) => {
    const metrics = event.data;
    console.log(`📊 [${metrics.platform.toUpperCase()}] Sentiment update (${metrics.window.duration / 1000}s):`);
    console.log(`   Posts: ${metrics.total_posts}, Authors: ${metrics.unique_authors}`);
    console.log(`   Distribution: +${metrics.sentiment_distribution.positive} / -${metrics.sentiment_distribution.negative} / ~${metrics.sentiment_distribution.neutral}`);
    console.log('');
  });

  // Influencer events
  monitor.on('influencer', (event) => {
    const influencer = event.data;
    console.log(`⭐ Influencer Activity:`);
    console.log(`   User: ${influencer.id}, Score: ${influencer.influence_score.toFixed(1)}`);
    console.log(`   Posts: ${influencer.posts}, Reach: ${influencer.reach}`);
    console.log('');
  });

  // Anomaly events
  monitor.on('anomaly', (event) => {
    const anomaly = event.data;
    console.log(`🚨 ANOMALY DETECTED [${anomaly.platform.toUpperCase()}]:`);
    console.log(`   Score: ${(anomaly.anomaly_score * 100).toFixed(1)}%`);
    console.log(`   Volume Anomaly: ${(anomaly.volume_anomaly * 100).toFixed(1)}%`);
    console.log(`   Current Volume: ${anomaly.current_metrics?.total_posts || 0} posts`);
    console.log('');
  });

  // Error events
  monitor.on('error', (event) => {
    const error = event.data;
    console.error(`❌ Error [${error.platform}]:`, error.error_message);
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
