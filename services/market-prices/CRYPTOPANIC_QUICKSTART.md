# 🚀 CryptoPanic Integration - Quick Start Guide

## 5-Minute Setup

### Step 1: Install Dependencies

All dependencies are already installed. The integration uses existing packages:
- `axios` & `axios-retry` - HTTP client
- `bottleneck` - Rate limiting
- `eventemitter3` - Event handling

### Step 2: Get API Credentials

1. Visit [CryptoPanic Developers](https://cryptopanic.com/developers/api/)
2. Create an account or log in
3. Choose your plan:
   - **Development**: Free, 2 req/s, 100/month, 24h delay
   - **Growth**: $19/mo, 5 req/s, 180k/month, real-time
   - **Enterprise**: Custom, unlimited, search & push API
4. Copy your auth token

### Step 3: Configure Environment

```bash
# Copy example env file
cp .env.example .env

# Edit .env and add your credentials
CRYPTOPANIC_AUTH_TOKEN=your-token-here
CRYPTOPANIC_PLAN=growth
```

### Step 4: Basic Usage

```typescript
import {
  CryptoPanicRestClient,
  CryptoPanicNewsService,
  CryptoPanicPlan,
} from '@coinet/market-prices';

// Initialize
const client = new CryptoPanicRestClient({
  authToken: process.env.CRYPTOPANIC_AUTH_TOKEN!,
  plan: CryptoPanicPlan.GROWTH,
  enableCaching: true,
});

const newsService = new CryptoPanicNewsService({ client });

// Fetch news
const articles = await newsService.fetchImportantNews(['BTC', 'ETH']);

console.log(`📰 Fetched ${articles.length} articles`);
articles.forEach(article => {
  console.log(`\n${article.title}`);
  console.log(`   Sentiment: ${article.sentiment} (${article.sentimentScore})`);
  console.log(`   Panic Score: ${article.panicScore}/100`);
  console.log(`   Tokens: ${article.tokens.join(', ')}`);
});
```

### Step 5: Run Examples

```bash
# Set your auth token
export CRYPTOPANIC_AUTH_TOKEN=your-token-here

# Run the comprehensive example
npm run example:cryptopanic
```

## Common Use Cases

### 1. Monitor Bitcoin News

```typescript
const articles = await newsService.fetchNewsByToken('BTC');
const bullish = articles.filter(a => a.sentiment === 'positive');
console.log(`📈 ${bullish.length} bullish BTC articles`);
```

### 2. Detect Market Panic

```typescript
import { CryptoPanicSentimentAnalyzer } from '@coinet/market-prices';

const analyzer = new CryptoPanicSentimentAnalyzer();
const analyses = analyzer.analyzeBatch(articles);

const panicEvents = analyzer.detectPanicEvents(70, 0.8);
console.log(`⚠️  ${panicEvents.length} high-panic events!`);
```

### 3. Track DeFi Protocols

```typescript
const defiNews = await newsService.fetchNewsByTokens(['AAVE', 'UNI', 'COMP']);
const protocolArticles = defiNews.filter(a => a.protocols.length > 0);

console.log(`🏦 ${protocolArticles.length} DeFi protocol articles`);
```

### 4. Real-Time Watching

```typescript
newsService.on('news_fetched', ({ articles }) => {
  const highImpact = articles.filter(a => a.importance > 80);
  highImpact.forEach(article => {
    console.log(`🚨 High-impact: ${article.title}`);
  });
});

await newsService.watchCurrencies(['BTC', 'ETH', 'SOL']);
```

### 5. Get Market Sentiment

```typescript
const overview = analyzer.getMarketSentimentOverview();

console.log(`Market Sentiment: ${overview.overallSentiment.toUpperCase()}`);
console.log(`Average Sentiment Score: ${Math.round(overview.averageSentimentScore)}`);
console.log(`Average Panic Score: ${Math.round(overview.averagePanicScore)}`);

console.log('\n📈 Top Bullish Tokens:');
overview.topBullishTokens.slice(0, 5).forEach(t => {
  console.log(`   ${t.token}: ${Math.round(t.score)}`);
});
```

## Testing

```bash
# Run CryptoPanic tests
npm run test:cryptopanic

# Run all tests
npm test
```

## Troubleshooting

### Issue: "Invalid auth token"

**Solution**: Check your `.env` file:
```bash
echo $CRYPTOPANIC_AUTH_TOKEN
```

### Issue: Rate limit exceeded

**Solution**: 
1. Enable caching (reduces API calls by 90%+)
2. Upgrade to Growth or Enterprise plan
3. Reduce refresh frequency

### Issue: "Feature not available"

**Solution**: Check plan requirements:
- Real-time news: Growth or Enterprise
- Search API: Enterprise only
- Push API: Enterprise only

## Next Steps

1. ✅ Read [Full Documentation](./CRYPTOPANIC_INTEGRATION.md)
2. ✅ Explore [Examples](./src/examples/cryptopanic-integration.example.ts)
3. ✅ Review [Test Suite](./src/tests/cryptopanic.test.ts)
4. ✅ Check [Type Definitions](./src/types/cryptopanic.types.ts)

## Support

- 📧 Email: support@coinet.com
- 💬 Discord: Join our server
- 📚 Docs: See CRYPTOPANIC_INTEGRATION.md

---

**Happy coding! 🎉**

