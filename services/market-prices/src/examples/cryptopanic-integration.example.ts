/**
 * =========================================
 * CRYPTOPANIC INTEGRATION EXAMPLE
 * =========================================
 * Divine world-class demonstration of all CryptoPanic features
 * 
 * This example demonstrates:
 * 1. Plan-aware initialization (Development, Growth, Enterprise)
 * 2. News fetching with filters and currencies
 * 3. Sentiment analysis with panic scoring
 * 4. Caching and rate limiting
 * 5. Real-time news watching
 * 6. Trending token detection
 * 7. Protocol impact analysis
 * 8. Statistics and analytics
 */

import CryptoPanicRestClient from '../providers/cryptopanic-rest';
import CryptoPanicNewsService from '../services/cryptopanic-news.service';
import CryptoPanicSentimentAnalyzer from '../services/cryptopanic-sentiment.service';
import {
  CryptoPanicPlan,
  CryptoPanicFilter,
  CryptoPanicRegion,
  NormalizedNewsArticle,
} from '../types/cryptopanic.types';

// ============================================
// CONFIGURATION
// ============================================

const CRYPTOPANIC_AUTH_TOKEN = process.env.CRYPTOPANIC_AUTH_TOKEN || '';
const CRYPTOPANIC_PLAN = (process.env.CRYPTOPANIC_PLAN || 'growth') as CryptoPanicPlan;

// ============================================
// EXAMPLE 1: BASIC NEWS FETCHING
// ============================================

async function example1_BasicNewsFetching() {
  console.log('\n=== Example 1: Basic News Fetching ===\n');

  // Initialize client
  const client = new CryptoPanicRestClient({
    authToken: CRYPTOPANIC_AUTH_TOKEN,
    plan: CRYPTOPANIC_PLAN,
    enableCaching: true,
    cacheTTL: 300, // 5 minutes
  });

  try {
    // Fetch latest posts
    console.log('📰 Fetching latest posts...');
    const posts = await client.fetchPosts({
      public: true,
    });

    console.log(`✅ Fetched ${posts.results.length} posts`);
    console.log(`   Total available: ${posts.count}`);
    console.log(`   Next page: ${posts.next ? 'Available' : 'None'}`);

    // Show first post
    if (posts.results.length > 0) {
      const firstPost = posts.results[0];
      console.log(`\n📄 Latest Post:`);
      console.log(`   Title: ${firstPost.title}`);
      console.log(`   Source: ${firstPost.source.title}`);
      console.log(`   URL: ${firstPost.url}`);
      console.log(`   Published: ${firstPost.published_at}`);
      console.log(`   Votes: +${firstPost.votes.positive} -${firstPost.votes.negative}`);
      console.log(`   Important: ${firstPost.votes.important}`);
    }

    // Show rate limit status
    const rateLimitStatus = client.getRateLimitStatus();
    console.log(`\n📊 Rate Limit Status:`);
    console.log(`   Plan: ${rateLimitStatus.plan}`);
    console.log(`   Requests this month: ${rateLimitStatus.currentMonthCount}`);
    console.log(`   Monthly limit: ${rateLimitStatus.monthlyLimit}`);
    console.log(`   Real-time: ${rateLimitStatus.isRealTime}`);
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// ============================================
// EXAMPLE 2: CURRENCY-SPECIFIC NEWS
// ============================================

async function example2_CurrencySpecificNews() {
  console.log('\n=== Example 2: Currency-Specific News ===\n');

  const client = new CryptoPanicRestClient({
    authToken: CRYPTOPANIC_AUTH_TOKEN,
    plan: CRYPTOPANIC_PLAN,
  });

  try {
    // Fetch Bitcoin news
    console.log('🔸 Fetching Bitcoin (BTC) news...');
    const btcNews = await client.fetchNewsByCurrency('BTC', {
      filter: CryptoPanicFilter.IMPORTANT,
    });

    console.log(`✅ Found ${btcNews.results.length} important BTC articles`);
    btcNews.results.slice(0, 3).forEach((post, idx) => {
      console.log(`\n${idx + 1}. ${post.title}`);
      console.log(`   Source: ${post.source.title}`);
      console.log(`   Importance: ${post.votes.important}`);
    });

    // Fetch Ethereum news
    console.log('\n🔹 Fetching Ethereum (ETH) news...');
    const ethNews = await client.fetchNewsByCurrency('ETH', {
      filter: CryptoPanicFilter.BULLISH,
    });

    console.log(`✅ Found ${ethNews.results.length} bullish ETH articles`);

    // Fetch news for multiple currencies
    console.log('\n🔷 Fetching multi-currency news (BTC, ETH, SOL)...');
    const multiNews = await client.fetchNewsByMultipleCurrencies(['BTC', 'ETH', 'SOL']);

    console.log(`✅ Found ${multiNews.results.length} articles across 3 currencies`);
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// ============================================
// EXAMPLE 3: SENTIMENT ANALYSIS
// ============================================

async function example3_SentimentAnalysis() {
  console.log('\n=== Example 3: Sentiment Analysis ===\n');

  const client = new CryptoPanicRestClient({
    authToken: CRYPTOPANIC_AUTH_TOKEN,
    plan: CRYPTOPANIC_PLAN,
  });

  const newsService = new CryptoPanicNewsService({
    client,
    enableCaching: true,
    enableTokenMapping: true,
  });

  const sentimentAnalyzer = new CryptoPanicSentimentAnalyzer({
    enableAdvancedAnalysis: true,
  });

  try {
    // Fetch and normalize news
    console.log('📊 Fetching and analyzing news...');
    const articles = await newsService.fetchImportantNews(['BTC', 'ETH']);

    console.log(`✅ Fetched ${articles.length} articles`);

    // Analyze each article
    const analyses = sentimentAnalyzer.analyzeBatch(articles);

    console.log(`\n📈 Sentiment Analysis Results:\n`);

    // Show top 5 analyses
    analyses.slice(0, 5).forEach((analysis, idx) => {
      console.log(`${idx + 1}. ${analysis.article.title}`);
      console.log(`   Sentiment: ${analysis.sentiment.toUpperCase()} (${analysis.sentimentScore > 0 ? '+' : ''}${analysis.sentimentScore})`);
      console.log(`   Panic Score: ${Math.round(analysis.panicScore)}/100`);
      console.log(`   Confidence: ${Math.round(analysis.confidence * 100)}%`);
      console.log(`   Tokens: ${analysis.article.tokens.join(', ')}`);
      
      if (analysis.indicators.bullishSignals.length > 0) {
        console.log(`   Bullish signals: ${analysis.indicators.bullishSignals.slice(0, 3).join(', ')}`);
      }
      if (analysis.indicators.bearishSignals.length > 0) {
        console.log(`   Bearish signals: ${analysis.indicators.bearishSignals.slice(0, 3).join(', ')}`);
      }
      
      console.log('');
    });

    // Get market overview
    const marketOverview = sentimentAnalyzer.getMarketSentimentOverview();
    console.log('🌍 Market Sentiment Overview:');
    console.log(`   Overall: ${marketOverview.overallSentiment.toUpperCase()}`);
    console.log(`   Average Sentiment: ${Math.round(marketOverview.averageSentimentScore)}`);
    console.log(`   Average Panic: ${Math.round(marketOverview.averagePanicScore)}`);
    console.log(`   Distribution: +${marketOverview.sentimentDistribution.positive} =${marketOverview.sentimentDistribution.neutral} -${marketOverview.sentimentDistribution.negative}`);

    if (marketOverview.topBullishTokens.length > 0) {
      console.log(`\n📈 Top Bullish Tokens:`);
      marketOverview.topBullishTokens.slice(0, 5).forEach((token, idx) => {
        console.log(`   ${idx + 1}. ${token.token}: ${Math.round(token.score)}`);
      });
    }

    if (marketOverview.topBearishTokens.length > 0) {
      console.log(`\n📉 Top Bearish Tokens:`);
      marketOverview.topBearishTokens.slice(0, 5).forEach((token, idx) => {
        console.log(`   ${idx + 1}. ${token.token}: ${Math.round(token.score)}`);
      });
    }

    // Detect panic events
    const panicEvents = sentimentAnalyzer.detectPanicEvents(60, 0.7);
    if (panicEvents.length > 0) {
      console.log(`\n⚠️  High Panic Events Detected: ${panicEvents.length}`);
      panicEvents.slice(0, 3).forEach((event, idx) => {
        console.log(`   ${idx + 1}. ${event.article.title}`);
        console.log(`      Panic: ${Math.round(event.panicScore)}/100`);
        console.log(`      Tokens: ${event.impactedTokens.map(t => `${t.token}(${t.impact})`).join(', ')}`);
      });
    }
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// ============================================
// EXAMPLE 4: TRENDING & FILTERING
// ============================================

async function example4_TrendingAndFiltering() {
  console.log('\n=== Example 4: Trending & Filtering ===\n');

  const client = new CryptoPanicRestClient({
    authToken: CRYPTOPANIC_AUTH_TOKEN,
    plan: CRYPTOPANIC_PLAN,
  });

  const newsService = new CryptoPanicNewsService({ client });

  try {
    // Fetch trending news
    console.log('🔥 Fetching trending news...');
    const trending = await newsService.fetchTrendingNews(['BTC', 'ETH']);
    console.log(`✅ Found ${trending.length} trending articles`);

    // Fetch bullish news
    console.log('\n📈 Fetching bullish news...');
    const bullish = await newsService.fetchBullishNews(['BTC']);
    console.log(`✅ Found ${bullish.length} bullish articles`);

    // Fetch bearish news
    console.log('\n📉 Fetching bearish news...');
    const bearish = await newsService.fetchBearishNews(['BTC']);
    console.log(`✅ Found ${bearish.length} bearish articles`);

    // Get trending tokens from service
    const trendingTokens = newsService.getTrendingTokens(10);
    if (trendingTokens.length > 0) {
      console.log('\n🚀 Trending Tokens:');
      trendingTokens.forEach((token, idx) => {
        console.log(`   ${idx + 1}. ${token.token}: ${token.count} articles (${token.sentiment}, panic: ${Math.round(token.avgPanicScore)})`);
      });
    }

    // Get service statistics
    const stats = newsService.getStatistics();
    console.log('\n📊 Service Statistics:');
    console.log(`   Total Articles: ${stats.totalArticles}`);
    console.log(`   Average Panic: ${Math.round(stats.averagePanicScore)}`);
    console.log(`   Average Sentiment: ${Math.round(stats.averageSentimentScore)}`);
    console.log(`   Time Range: ${stats.timeRange.from.toLocaleString()} - ${stats.timeRange.to.toLocaleString()}`);
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// ============================================
// EXAMPLE 5: REAL-TIME NEWS WATCHING
// ============================================

async function example5_RealTimeWatching() {
  console.log('\n=== Example 5: Real-Time News Watching ===\n');

  const client = new CryptoPanicRestClient({
    authToken: CRYPTOPANIC_AUTH_TOKEN,
    plan: CRYPTOPANIC_PLAN,
  });

  const newsService = new CryptoPanicNewsService({
    client,
    enableAutoRefresh: true,
    refreshInterval: 60, // Check every 60 seconds
  });

  const sentimentAnalyzer = new CryptoPanicSentimentAnalyzer();

  // Set up event listeners
  newsService.on('news_fetched', (data: { count: number; articles: NormalizedNewsArticle[] }) => {
    console.log(`\n📰 New articles fetched: ${data.count}`);
    
    // Analyze sentiment
    const analyses = sentimentAnalyzer.analyzeBatch(data.articles);
    
    // Show high-impact articles
    const highImpact = analyses.filter(a => a.panicScore > 50 || Math.abs(a.sentimentScore) > 50);
    if (highImpact.length > 0) {
      console.log(`⚡ High-impact articles: ${highImpact.length}`);
      highImpact.forEach(a => {
        console.log(`   - ${a.article.title}`);
        console.log(`     Sentiment: ${a.sentiment} (${a.sentimentScore}), Panic: ${Math.round(a.panicScore)}`);
      });
    }
  });

  newsService.on('news_refreshed', (data: { currencies: string[]; count: number }) => {
    console.log(`\n🔄 News refreshed for ${data.currencies.join(', ')}: ${data.count} articles`);
  });

  newsService.on('error', (error: Error) => {
    console.error('❌ News service error:', error.message);
  });

  try {
    // Start watching currencies
    console.log('👀 Starting to watch BTC, ETH, SOL...');
    await newsService.watchCurrencies(['BTC', 'ETH', 'SOL']);

    // Initial fetch
    const initial = await newsService.fetchNewsByTokens(['BTC', 'ETH', 'SOL']);
    console.log(`✅ Initial fetch: ${initial.length} articles`);

    // Keep running for 5 minutes (for demo purposes)
    console.log('\n🔄 Watching for news updates (will run for 5 minutes)...');
    console.log('   Press Ctrl+C to stop\n');

    await new Promise((resolve) => setTimeout(resolve, 5 * 60 * 1000));

    // Cleanup
    await newsService.destroy();
    console.log('\n✅ Example complete');
  } catch (error) {
    console.error('❌ Error:', error);
    await newsService.destroy();
  }
}

// ============================================
// EXAMPLE 6: DEFI PROTOCOL NEWS
// ============================================

async function example6_DeFiProtocolNews() {
  console.log('\n=== Example 6: DeFi Protocol News ===\n');

  const client = new CryptoPanicRestClient({
    authToken: CRYPTOPANIC_AUTH_TOKEN,
    plan: CRYPTOPANIC_PLAN,
  });

  const newsService = new CryptoPanicNewsService({
    client,
    protocolDetection: true,
  });

  try {
    // Fetch news for DeFi tokens
    console.log('🏦 Fetching DeFi protocol news...');
    const defiTokens = ['AAVE', 'UNI', 'COMP', 'MKR', 'CRV', 'SNX'];
    const articles = await newsService.fetchNewsByTokens(defiTokens);

    console.log(`✅ Found ${articles.length} DeFi articles`);

    // Filter articles with protocol detections
    const protocolArticles = articles.filter(a => a.protocols.length > 0);
    console.log(`   ${protocolArticles.length} articles mention specific protocols`);

    // Group by protocol
    const byProtocol: Record<string, NormalizedNewsArticle[]> = {};
    protocolArticles.forEach(article => {
      article.protocols.forEach(protocol => {
        if (!byProtocol[protocol]) byProtocol[protocol] = [];
        byProtocol[protocol].push(article);
      });
    });

    console.log(`\n📊 Articles by Protocol:`);
    Object.entries(byProtocol)
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 5)
      .forEach(([protocol, articles]) => {
        console.log(`   ${protocol}: ${articles.length} articles`);
        
        // Show most important article
        const mostImportant = articles.sort((a, b) => b.importance - a.importance)[0];
        console.log(`      Top: ${mostImportant.title}`);
        console.log(`      Importance: ${Math.round(mostImportant.importance)}/100`);
        console.log('');
      });
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// ============================================
// EXAMPLE 7: CACHING & PERFORMANCE
// ============================================

async function example7_CachingPerformance() {
  console.log('\n=== Example 7: Caching & Performance ===\n');

  const client = new CryptoPanicRestClient({
    authToken: CRYPTOPANIC_AUTH_TOKEN,
    plan: CRYPTOPANIC_PLAN,
    enableCaching: true,
    cacheTTL: 300,
  });

  try {
    // First request (not cached)
    console.log('⏱️  First request (no cache)...');
    const start1 = Date.now();
    await client.fetchPosts({ currencies: 'BTC' });
    const time1 = Date.now() - start1;
    console.log(`   Time: ${time1}ms`);

    // Second request (cached)
    console.log('\n⏱️  Second request (cached)...');
    const start2 = Date.now();
    await client.fetchPosts({ currencies: 'BTC' });
    const time2 = Date.now() - start2;
    console.log(`   Time: ${time2}ms`);
    console.log(`   Speed improvement: ${Math.round(((time1 - time2) / time1) * 100)}%`);

    // Get cache statistics
    const cacheStats = client.getCacheStats();
    console.log(`\n📊 Cache Statistics:`);
    console.log(`   Total entries: ${cacheStats.size}`);
    console.log(`   Total hits: ${cacheStats.totalHits}`);
    console.log(`\n   Top cached queries:`);
    cacheStats.entries.slice(0, 5).forEach((entry, idx) => {
      console.log(`   ${idx + 1}. Hits: ${entry.hits}, Expires: ${entry.expiresAt.toLocaleString()}`);
    });

    // Get client statistics
    const clientStats = client.getStats();
    console.log(`\n📈 Client Statistics:`);
    console.log(`   Plan: ${clientStats.plan}`);
    console.log(`   Rate Limit:`);
    console.log(`      Per second: ${clientStats.rateLimit.requestsPerSecond}`);
    console.log(`      This month: ${clientStats.rateLimit.currentMonthCount}/${clientStats.rateLimit.monthlyLimit}`);
    console.log(`   Limiter Queue:`);
    console.log(`      Running: ${clientStats.limiter.running}`);
    console.log(`      Queued: ${clientStats.limiter.queued}`);
    console.log(`      Completed: ${clientStats.limiter.done}`);
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// ============================================
// MAIN EXECUTION
// ============================================

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   🌟 CRYPTOPANIC API INTEGRATION - DIVINE EXAMPLES 🌟     ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  if (!CRYPTOPANIC_AUTH_TOKEN) {
    console.error('\n❌ Error: CRYPTOPANIC_AUTH_TOKEN environment variable not set');
    console.log('   Please set it in your .env file or environment');
    process.exit(1);
  }

  console.log(`\n✅ Using plan: ${CRYPTOPANIC_PLAN.toUpperCase()}`);

  try {
    // Run examples
    await example1_BasicNewsFetching();
    await example2_CurrencySpecificNews();
    await example3_SentimentAnalysis();
    await example4_TrendingAndFiltering();
    await example6_DeFiProtocolNews();
    await example7_CachingPerformance();

    // Uncomment to run real-time watching example (runs for 5 minutes)
    // await example5_RealTimeWatching();

    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║              ✅ ALL EXAMPLES COMPLETED! ✅                 ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}

export {
  example1_BasicNewsFetching,
  example2_CurrencySpecificNews,
  example3_SentimentAnalysis,
  example4_TrendingAndFiltering,
  example5_RealTimeWatching,
  example6_DeFiProtocolNews,
  example7_CachingPerformance,
};

