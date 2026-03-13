#!/usr/bin/env ts-node

/**
 * =========================================
 * ⚠️  DEMO ONLY - DO NOT USE IN PRODUCTION  ⚠️
 * =========================================
 * NEWS AGGREGATOR DEMO
 * Demonstration of enhanced news API integrations for event detection
 */

import { NewsAggregator } from './src/NewsAggregator';
import { NewsAPIClient } from './src/sources/api/NewsAPIClient';
import { ReutersAPIClient } from './src/sources/api/ReutersAPIClient';
import { Logger } from './src/utils/Logger';

async function demoNewsAPIIntegration() {
  console.log('\n📰 === NEWS API INTEGRATION DEMO ===');

  // Initialize NewsAPI client (requires API key — no placeholder credentials)
  const newsApiKey = process.env.NEWSAPI_KEY;
  if (!newsApiKey?.trim()) {
    console.log('⏭️  Skipping NewsAPI demo: NEWSAPI_KEY not set');
    return;
  }
  const newsAPIClient = new NewsAPIClient({
    apiKey: newsApiKey,
    rateLimit: {
      requestsPerMinute: 1000,
      requestsPerHour: 50
    }
  });

  try {
    await newsAPIClient.initialize();
    console.log('✅ NewsAPI Client initialized');

    // Fetch crypto news
    console.log('\n📈 Fetching cryptocurrency news from NewsAPI...');
    const cryptoNews = await newsAPIClient.fetchCryptoNews({
      query: 'bitcoin OR ethereum OR cryptocurrency',
      category: 'technology',
      pageSize: 5
    });

    console.log(`Found ${cryptoNews.length} articles:`);
    cryptoNews.forEach((article, index) => {
      console.log(`${index + 1}. ${article.title}`);
      console.log(`   📅 ${article.publishedAt.toISOString().split('T')[0]}`);
      console.log(`   🔗 ${article.url}`);
      console.log('');
    });

    // Fetch top headlines
    console.log('\n📰 Fetching top headlines from NewsAPI...');
    const headlines = await newsAPIClient.fetchTopHeadlines({
      category: 'technology',
      country: 'us',
      pageSize: 3
    });

    console.log(`Found ${headlines.length} headlines:`);
    headlines.forEach((article, index) => {
      console.log(`${index + 1}. ${article.title}`);
      console.log('');
    });

  } catch (error: any) {
    console.log(`❌ NewsAPI demo failed: ${error.message}`);
  } finally {
    await newsAPIClient.stop();
  }
}

async function demoReutersAPIIntegration() {
  console.log('\n🏦 === REUTERS API INTEGRATION DEMO ===');

  // Initialize Reuters API client (requires API key — no placeholder credentials)
  const reutersApiKey = process.env.REUTERS_API_KEY;
  if (!reutersApiKey?.trim()) {
    console.log('⏭️  Skipping Reuters demo: REUTERS_API_KEY not set');
    return;
  }
  const reutersClient = new ReutersAPIClient({
    apiKey: reutersApiKey,
    rateLimit: {
      requestsPerMinute: 100,
      requestsPerHour: 1000
    }
  });

  try {
    await reutersClient.initialize();
    console.log('✅ Reuters API Client initialized');

    // Fetch financial news
    console.log('\n💰 Fetching financial news from Reuters...');
    const financialNews = await reutersClient.fetchFinancialNews({
      query: 'cryptocurrency OR bitcoin OR "digital assets"',
      category: 'financial',
      limit: 5
    });

    console.log(`Found ${financialNews.length} financial articles:`);
    financialNews.forEach((article, index) => {
      console.log(`${index + 1}. ${article.title}`);
      console.log(`   📅 ${article.publishedAt.toISOString().split('T')[0]}`);
      console.log(`   🔗 ${article.url}`);
      console.log('');
    });

    // Fetch breaking news
    console.log('\n🚨 Fetching breaking financial news from Reuters...');
    const breakingNews = await reutersClient.fetchBreakingNews({
      limit: 3
    });

    console.log(`Found ${breakingNews.length} breaking news articles:`);
    breakingNews.forEach((article, index) => {
      console.log(`${index + 1}. ${article.title}`);
      console.log('');
    });

  } catch (error: any) {
    console.log(`❌ Reuters API demo failed: ${error.message}`);
  } finally {
    await reutersClient.stop();
  }
}

async function demoAggregatorWithAPIIntegrations() {
  console.log('\n🔥 === FULL NEWS AGGREGATOR DEMO ===');

  // Create aggregator with API sources
  const aggregator = new NewsAggregator({
    maxProcessingLatencyMs: 2000,
    batchSize: 50,
    maxConcurrentRequests: 10,
    cacheTtlSeconds: 300,
    sources: [
      // RSS sources
      {
        id: 'coindesk',
        name: 'CoinDesk',
        type: 'rss',
        url: 'https://www.coindesk.com/arc/outboundfeeds/rss/',
        enabled: true,
        updateInterval: 60000,
        errorCount: 0
      },
      {
        id: 'cointelegraph',
        name: 'CoinTelegraph',
        type: 'rss',
        url: 'https://cointelegraph.com/rss',
        enabled: true,
        updateInterval: 60000,
        errorCount: 0
      },
      // API sources
      {
        id: 'newsapi',
        name: 'NewsAPI',
        type: 'api',
        url: 'https://newsapi.org/v2',
        enabled: !!process.env.NEWSAPI_KEY,
        updateInterval: 300000, // 5 minutes
        errorCount: 0,
        apiKey: process.env.NEWSAPI_KEY
      },
      {
        id: 'reuters',
        name: 'Reuters',
        type: 'api',
        url: 'https://api.reuters.com/content/v1',
        enabled: !!process.env.REUTERS_API_KEY,
        updateInterval: 300000, // 5 minutes
        errorCount: 0,
        apiKey: process.env.REUTERS_API_KEY
      }
    ],
    tokenProjectMappings: [
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
        categories: ['platform', 'smart-contracts'],
        aliases: ['ethereum', 'eth']
      }
    ],
    classificationKeywords: {
      breaking_news: ['breaking', 'urgent', 'flash', 'alert', 'emergency'],
      regulatory: ['sec', 'fda', 'regulation', 'compliance', 'law', 'legal'],
      protocol_exploit: ['exploit', 'hack', 'breach', 'vulnerability', 'attack'],
      macroeconomic: ['fed', 'interest rate', 'inflation', 'recession', 'gdp'],
      technical_analysis: ['technical', 'chart', 'pattern', 'resistance', 'support'],
      market_analysis: ['market', 'analysis', 'trend', 'forecast', 'prediction'],
      company_news: ['company', 'announcement', 'earnings', 'quarterly'],
      partnership: ['partnership', 'alliance', 'collaboration', 'joint'],
      funding: ['funding', 'investment', 'raised', 'series', 'venture'],
      adoption: ['adoption', 'integration', 'implementation', 'mainstream'],
      security: ['security', 'protection', 'defense', 'safety'],
      general: []
    }
  });

  try {
    // Set up event listeners
    aggregator.on('article', (event) => {
      const article = event.data;
      console.log(`📄 New article: ${article.title.substring(0, 60)}...`);
      console.log(`   🎯 Classification: ${article.classification}`);
      console.log(`   ⚡ Urgency: ${article.urgency}`);
      console.log(`   🏷️  Tokens: ${article.keyFacts.tokens.join(', ')}`);
      console.log(`   📊 Market Impact: ${article.marketImpact.relevance.toFixed(2)}`);
      console.log('');
    });

    aggregator.on('alert', (event) => {
      const alert = event.data;
      console.log(`🚨 ALERT: ${alert.title}`);
      console.log(`   Type: ${alert.type}`);
      console.log(`   Urgency: ${alert.urgency}`);
      console.log(`   Affected Tokens: ${alert.affectedTokens.join(', ')}`);
      console.log('');
    });

    // Start the aggregator
    console.log('🚀 Starting news aggregator...');
    await aggregator.start();

    // Show initial status
    console.log('📊 Initial Status:', aggregator.getStatus());

    // Wait for some articles to be processed
    console.log('\n⏳ Waiting for articles to be processed...');
    await new Promise(resolve => setTimeout(resolve, 10000)); // 10 seconds

    // Show health status
    const health = await aggregator.getHealthStatus();
    console.log('\n📊 Health Status:');
    console.log(`   Articles processed: ${health.articles_processed_total}`);
    console.log(`   Articles per second: ${health.articles_per_second.toFixed(2)}`);
    console.log(`   Queue items: ${health.queue_stats.total_items}`);
    console.log(`   High priority items: ${health.queue_stats.high_priority_items}`);

    // Query stored articles
    console.log('\n🔍 Querying stored articles...');
    const recentArticles = await aggregator.queryArticles({
      limit: 5,
      sortBy: 'storedAt',
      sortOrder: 'desc'
    });

    console.log(`Found ${recentArticles.articles.length} recent articles in storage`);
    recentArticles.articles.forEach((article: any, index: number) => {
      console.log(`${index + 1}. ${article.title.substring(0, 50)}... (${article.source.name})`);
    });

    // Get storage stats
    const storageStats = await aggregator.getStorageStats();
    console.log('\n💾 Storage Stats:');
    console.log(`   Total articles: ${storageStats.totalArticles}`);
    console.log(`   Total alerts: ${storageStats.totalAlerts}`);
    console.log(`   Sources: ${storageStats.sourcesCount}`);
    console.log(`   Storage size: ~${(storageStats.storageSize / 1024).toFixed(1)}KB`);

  } catch (error: any) {
    console.log(`❌ Aggregator demo failed: ${error.message}`);
  } finally {
    console.log('\n🛑 Stopping aggregator...');
    await aggregator.stop();
  }
}

async function demoPriorityQueue() {
  console.log('\n⚡ === PRIORITY QUEUE DEMO ===');

  const { PriorityQueue } = await import('./src/queue/PriorityQueue');

  const queue = new PriorityQueue({
    maxConcurrent: 5,
    maxRetries: 2,
    baseRetryDelay: 1000
  });

  try {
    await queue.start();

    // Create mock articles with different priorities
    const mockArticles = [
      {
        id: 'critical-1',
        title: 'BREAKING: Major Bitcoin ETF Approved by SEC',
        classification: 'breaking_news',
        urgency: 'critical',
        marketImpact: { volatility: 0.9, relevance: 0.95, scope: 'global' },
        keyFacts: { tokens: ['BTC', 'ETF'], projects: [], companies: [], people: [], locations: [], amounts: [], dates: [] },
        publishedAt: new Date()
      },
      {
        id: 'high-1',
        title: 'Ethereum Merge Successfully Completed',
        classification: 'technical_analysis',
        urgency: 'high',
        marketImpact: { volatility: 0.8, relevance: 0.85, scope: 'global' },
        keyFacts: { tokens: ['ETH'], projects: [], companies: [], people: [], locations: [], amounts: [], dates: [] },
        publishedAt: new Date()
      },
      {
        id: 'medium-1',
        title: 'Cryptocurrency Market Analysis Report',
        classification: 'market_analysis',
        urgency: 'medium',
        marketImpact: { volatility: 0.4, relevance: 0.6, scope: 'regional' },
        keyFacts: { tokens: ['BTC', 'ETH'], projects: [], companies: [], people: [], locations: [], amounts: [], dates: [] },
        publishedAt: new Date()
      },
      {
        id: 'low-1',
        title: 'General Cryptocurrency News Update',
        classification: 'general',
        urgency: 'low',
        marketImpact: { volatility: 0.2, relevance: 0.3, scope: 'local' },
        keyFacts: { tokens: [], projects: [], companies: [], people: [], locations: [], amounts: [], dates: [] },
        publishedAt: new Date()
      }
    ];

    console.log('📥 Adding articles to priority queue...');

    // Add articles to queue
    mockArticles.forEach(article => {
      queue.enqueue(article as any);
    });

    // Monitor queue events
    queue.on('item-enqueued', (event) => {
      console.log(`📋 Enqueued: ${event.queueItem.article.title} (Priority: ${event.queueItem.priority})`);
    });

    queue.on('high-priority-item', (queueItem) => {
      console.log(`⚠️  High priority detected: ${queueItem.article.title}`);
    });

    queue.on('item-processed', (event) => {
      console.log(`✅ Processed: ${event.item.article.title} (${event.processingTime}ms)`);
    });

    // Wait for processing
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Show queue stats
    const stats = queue.getStats();
    console.log('\n📊 Queue Statistics:');
    console.log(`   Total items: ${stats.totalItems}`);
    console.log(`   High priority: ${stats.highPriorityItems}`);
    console.log(`   Processing: ${stats.processingItems}`);
    console.log(`   Failed: ${stats.failedItems}`);
    console.log(`   Avg processing time: ${stats.averageProcessingTime.toFixed(1)}ms`);

  } catch (error: any) {
    console.log(`❌ Priority queue demo failed: ${error.message}`);
  } finally {
    await queue.stop();
  }
}

async function main() {
  console.log('🚀 Starting News API Integration Demo Suite');
  console.log('===========================================');

  // Check for API keys
  const hasNewsAPI = !!process.env.NEWSAPI_KEY;
  const hasReuters = !!process.env.REUTERS_API_KEY;

  console.log(`📋 API Keys Status:`);
  console.log(`   NewsAPI: ${hasNewsAPI ? '✅ Configured' : '❌ Missing (set NEWSAPI_KEY)'}`);
  console.log(`   Reuters: ${hasReuters ? '✅ Configured' : '❌ Missing (set REUTERS_API_KEY)'}`);
  console.log('');

  // Run individual demos
  await demoNewsAPIIntegration();
  await demoReutersAPIIntegration();
  await demoPriorityQueue();
  await demoAggregatorWithAPIIntegrations();

  console.log('\n🎉 Demo suite completed!');
  console.log('\n📖 To get API keys:');
  console.log('   NewsAPI: https://newsapi.org/');
  console.log('   Reuters: Contact Reuters for API access');
  console.log('\n🔧 Environment variables needed:');
  console.log('   NEWSAPI_KEY=your_newsapi_key');
  console.log('   REUTERS_API_KEY=your_reuters_api_key');
}

if (require.main === module) {
  main().catch(console.error);
}
