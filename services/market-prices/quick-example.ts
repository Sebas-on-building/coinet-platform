/**
 * Quick CryptoPanic Example
 * Run: npx ts-node quick-example.ts
 */

import CryptoPanicRestClient from './src/providers/cryptopanic-rest';
import CryptoPanicNewsService from './src/services/cryptopanic-news.service';
import { CryptoPanicPlan } from './src/types/cryptopanic.types';

async function main() {
  const client = new CryptoPanicRestClient({
    authToken: process.env.CRYPTOPANIC_AUTH_TOKEN!,
    plan: CryptoPanicPlan.DEVELOPMENT,
  });

  const newsService = new CryptoPanicNewsService({ client });
  const articles = await newsService.fetchImportantNews(['BTC', 'ETH']);
  
  console.log(`Found ${articles.length} articles`);
  
  articles.forEach((article, idx) => {
    console.log(`\n${idx + 1}. ${article.title}`);
    console.log(`   Sentiment: ${article.sentiment} (${article.sentimentScore})`);
    console.log(`   Panic Score: ${article.panicScore}/100`);
  });
}

main().catch(console.error);

