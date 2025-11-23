import CryptoPanicRestClient from './src/providers/cryptopanic-rest';
import CryptoPanicNewsService from './src/services/cryptopanic-news.service';
import CryptoPanicSentimentAnalyzer from './src/services/cryptopanic-sentiment.service';
import { CryptoPanicPlan } from './src/types/cryptopanic.types';

async function main() {
  // Step 1: Create client
  const client = new CryptoPanicRestClient({
    authToken: process.env.CRYPTOPANIC_AUTH_TOKEN!,
    plan: CryptoPanicPlan.DEVELOPMENT,
    enableCaching: true,
  });

  // Step 2: Create news service
  const newsService = new CryptoPanicNewsService({ client });

  // Step 3: Fetch news for Bitcoin
  console.log('Fetching Bitcoin news...');
  const articles = await newsService.fetchNewsByToken('BTC');
  
  console.log(`\nFound ${articles.length} articles:\n`);
  
  // Step 4: Show articles
  articles.slice(0, 5).forEach((article, idx) => {
    console.log(`${idx + 1}. ${article.title}`);
    console.log(`   Sentiment: ${article.sentiment} (score: ${article.sentimentScore})`);
    console.log(`   Panic: ${article.panicScore}/100`);
    console.log('');
  });

  // Step 5: Analyze sentiment
  const analyzer = new CryptoPanicSentimentAnalyzer();
  const analyses = analyzer.analyzeBatch(articles);
  
  const bullish = analyses.filter(a => a.sentiment === 'positive');
  const bearish = analyses.filter(a => a.sentiment === 'negative');
  
  console.log(`\n📊 Summary:`);
  console.log(`   Bullish: ${bullish.length}`);
  console.log(`   Bearish: ${bearish.length}`);
  console.log(`   Neutral: ${articles.length - bullish.length - bearish.length}`);
}

main().catch(console.error);