/**
 * Quick Test Script for CryptoPanic Integration
 * Run with: npx ts-node test-cryptopanic.ts
 */

import CryptoPanicRestClient from './src/providers/cryptopanic-rest';
import CryptoPanicNewsService from './src/services/cryptopanic-news.service';
import CryptoPanicSentimentAnalyzer from './src/services/cryptopanic-sentiment.service';
import { CryptoPanicPlan, CryptoPanicFilter } from './src/types/cryptopanic.types';

async function quickTest() {
  console.log('🚀 Testing CryptoPanic Integration...\n');

  // Check if auth token is set
  const authToken = process.env.CRYPTOPANIC_AUTH_TOKEN;
  
  if (!authToken) {
    console.error('❌ ERROR: CRYPTOPANIC_AUTH_TOKEN not set!');
    console.log('\n📝 To fix this:');
    console.log('1. Get token from: https://cryptopanic.com/developers/api/');
    console.log('2. Set it: export CRYPTOPANIC_AUTH_TOKEN=your-token-here');
    console.log('3. Run again: npx ts-node test-cryptopanic.ts\n');
    process.exit(1);
  }

  try {
    // Initialize client
    console.log('✅ Initializing CryptoPanic client...');
    const plan = (process.env.CRYPTOPANIC_PLAN || 'development') as CryptoPanicPlan;
    const client = new CryptoPanicRestClient({
      authToken,
      plan: plan === 'development' ? CryptoPanicPlan.DEVELOPMENT : 
            plan === 'growth' ? CryptoPanicPlan.GROWTH : 
            CryptoPanicPlan.ENTERPRISE,
      enableCaching: true,
    });

    // Test 1: Basic API call
    console.log('\n📰 Test 1: Fetching latest crypto news...');
    const response = await client.fetchPosts({ public: true });
    console.log(`✅ Success! Fetched ${response.results.length} posts`);
    
    if (response.results.length > 0) {
      const first = response.results[0];
      console.log(`\n📄 Latest Article:`);
      console.log(`   Title: ${first.title}`);
      console.log(`   Source: ${first.source?.title || first.source?.domain || 'Unknown'}`);
      console.log(`   URL: ${first.url || first.original_url || 'N/A'}`);
    }

    // Test 2: Currency-specific news
    console.log('\n\n📊 Test 2: Fetching Bitcoin news...');
    const btcNews = await client.fetchNewsByCurrency('BTC', {
      filter: CryptoPanicFilter.IMPORTANT,
    });
    console.log(`✅ Found ${btcNews.results.length} important BTC articles`);

    // Test 3: News Service with normalization
    console.log('\n\n🔄 Test 3: Testing News Service...');
    const newsService = new CryptoPanicNewsService({
      client,
      enableCaching: true,
      enableTokenMapping: true,
      protocolDetection: true,
    });

    const articles = await newsService.fetchImportantNews(['BTC', 'ETH']);
    console.log(`✅ Normalized ${articles.length} articles`);
    
    if (articles.length > 0) {
      const first = articles[0];
      console.log(`\n📄 First Normalized Article:`);
      console.log(`   Title: ${first.title}`);
      console.log(`   Sentiment: ${first.sentiment} (${first.sentimentScore})`);
      console.log(`   Panic Score: ${first.panicScore}/100`);
      console.log(`   Tokens: ${first.tokens.join(', ')}`);
      if (first.protocols.length > 0) {
        console.log(`   Protocols: ${first.protocols.join(', ')}`);
      }
    }

    // Test 4: Sentiment Analysis
    console.log('\n\n🧠 Test 4: Testing Sentiment Analyzer...');
    const analyzer = new CryptoPanicSentimentAnalyzer({
      enableAdvancedAnalysis: true,
    });

    const analyses = analyzer.analyzeBatch(articles);
    console.log(`✅ Analyzed ${analyses.length} articles`);

    const overview = analyzer.getMarketSentimentOverview();
    console.log(`\n📈 Market Sentiment Overview:`);
    console.log(`   Overall: ${overview.overallSentiment.toUpperCase()}`);
    console.log(`   Avg Sentiment: ${Math.round(overview.averageSentimentScore)}`);
    console.log(`   Avg Panic: ${Math.round(overview.averagePanicScore)}`);
    console.log(`   Distribution: +${overview.sentimentDistribution.positive} =${overview.sentimentDistribution.neutral} -${overview.sentimentDistribution.negative}`);

    // Test 5: Rate Limit Status
    console.log('\n\n📊 Test 5: Rate Limit Status...');
    const status = client.getRateLimitStatus();
    console.log(`✅ Plan: ${status.plan}`);
    console.log(`   Requests this month: ${status.currentMonthCount}`);
    console.log(`   Monthly limit: ${status.monthlyLimit === Infinity ? 'Unlimited' : status.monthlyLimit}`);
    console.log(`   Real-time: ${status.isRealTime ? 'Yes' : 'No (24h delay)'}`);

    // Test 6: Cache Statistics
    console.log('\n\n💾 Test 6: Cache Statistics...');
    const cacheStats = client.getCacheStats();
    console.log(`✅ Cache size: ${cacheStats.size} entries`);
    console.log(`   Total hits: ${cacheStats.totalHits}`);

    // Summary
    console.log('\n\n' + '='.repeat(60));
    console.log('🎉 ALL TESTS PASSED! CryptoPanic integration is working!');
    console.log('='.repeat(60));
    console.log('\n📚 Next Steps:');
    console.log('1. Read docs: cat CRYPTOPANIC_QUICKSTART.md');
    console.log('2. Run examples: npm run example:cryptopanic');
    console.log('3. Run tests: npm run test:cryptopanic');
    console.log('4. Integrate into your app!\n');

  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
    
    if (error.message.includes('Invalid')) {
      console.log('\n💡 Tip: Check your CRYPTOPANIC_AUTH_TOKEN is correct');
      console.log('   Get it from: https://cryptopanic.com/developers/api/\n');
    }
    
    process.exit(1);
  }
}

// Run the test
quickTest().catch(console.error);

