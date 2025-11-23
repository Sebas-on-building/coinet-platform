/**
 * Simple CryptoPanic Usage Example
 * Run with: npx ts-node use-cryptopanic.ts
 */

import CryptoPanicRestClient from './src/providers/cryptopanic-rest';
import CryptoPanicNewsService from './src/services/cryptopanic-news.service';
import CryptoPanicSentimentAnalyzer from './src/services/cryptopanic-sentiment.service';
import { CryptoPanicPlan } from './src/types/cryptopanic.types';

async function main() {
  console.log('🚀 CryptoPanic Integration Example\n');

  // Initialize client
  const client = new CryptoPanicRestClient({
    authToken: process.env.CRYPTOPANIC_AUTH_TOKEN!,
    plan: CryptoPanicPlan.DEVELOPMENT,
    enableCaching: true,
  });

  // Initialize news service
  const newsService = new CryptoPanicNewsService({ client });

  // Fetch important news for BTC and ETH
  console.log('📰 Fetching important news for BTC and ETH...');
  const articles = await newsService.fetchImportantNews(['BTC', 'ETH']);

  console.log(`✅ Found ${articles.length} articles\n`);

  // Show first 3 articles
  articles.slice(0, 3).forEach((article, idx) => {
    console.log(`${idx + 1}. ${article.title}`);
    console.log(`   Sentiment: ${article.sentiment} (${article.sentimentScore})`);
    console.log(`   Panic Score: ${article.panicScore}/100`);
    console.log(`   Tokens: ${article.tokens.join(', ') || 'None'}`);
    console.log('');
  });

  // Analyze sentiment
  const analyzer = new CryptoPanicSentimentAnalyzer();
  const analyses = analyzer.analyzeBatch(articles);

  const overview = analyzer.getMarketSentimentOverview();
  console.log('📈 Market Sentiment:');
  console.log(`   Overall: ${overview.overallSentiment.toUpperCase()}`);
  console.log(`   Average Sentiment: ${Math.round(overview.averageSentimentScore)}`);
  console.log(`   Average Panic: ${Math.round(overview.averagePanicScore)}`);
}

main().catch(console.error);

