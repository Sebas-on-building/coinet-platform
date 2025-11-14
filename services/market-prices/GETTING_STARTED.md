# 🚀 Getting Started with CryptoPanic Integration

## Step-by-Step Guide

### **Step 1: Get Your API Token** (2 minutes)

1. Visit: https://cryptopanic.com/developers/api/
2. Sign up or log in
3. Choose a plan:
   - **Development**: FREE (2 req/s, 100/month, 24h delay)
   - **Growth**: $19/mo (5 req/s, 180k/month, real-time)
   - **Enterprise**: Custom pricing (unlimited)
4. Copy your auth token

### **Step 2: Set Environment Variable** (30 seconds)

```bash
# In your terminal (Linux/Mac):
export CRYPTOPANIC_AUTH_TOKEN=your-actual-token-here
export CRYPTOPANIC_PLAN=growth

# OR create a .env file in services/market-prices/:
echo "CRYPTOPANIC_AUTH_TOKEN=your-actual-token-here" > .env
echo "CRYPTOPANIC_PLAN=growth" >> .env
```

### **Step 3: Run Quick Test** (1 minute)

```bash
cd services/market-prices
npx ts-node test-cryptopanic.ts
```

This will test all features and show you if everything works!

### **Step 4: Run Full Examples** (2 minutes)

```bash
npm run example:cryptopanic
```

This runs 7 comprehensive examples showing all features.

---

## ✅ Quick Verification

Check if your token is set:

```bash
echo $CRYPTOPANIC_AUTH_TOKEN
```

If it shows your token, you're ready!

---

## 🎯 Usage in Your Code

### Basic Example

Create a file: `my-crypto-news.ts`

```typescript
import {
  CryptoPanicRestClient,
  CryptoPanicNewsService,
  CryptoPanicSentimentAnalyzer,
  CryptoPanicPlan,
} from '@coinet/market-prices';

async function getCryptoNews() {
  // Initialize
  const client = new CryptoPanicRestClient({
    authToken: process.env.CRYPTOPANIC_AUTH_TOKEN!,
    plan: CryptoPanicPlan.GROWTH,
    enableCaching: true,
  });

  const newsService = new CryptoPanicNewsService({ client });
  const analyzer = new CryptoPanicSentimentAnalyzer();

  // Get Bitcoin news
  const articles = await newsService.fetchNewsByToken('BTC');
  
  // Analyze sentiment
  const analyses = analyzer.analyzeBatch(articles);
  
  // Show results
  console.log(`Found ${articles.length} BTC articles`);
  
  const bullish = analyses.filter(a => a.sentiment === 'positive');
  console.log(`${bullish.length} are bullish!`);
  
  // Market overview
  const overview = analyzer.getMarketSentimentOverview();
  console.log(`Market sentiment: ${overview.overallSentiment}`);
}

getCryptoNews();
```

Run it:

```bash
npx ts-node my-crypto-news.ts
```

---

## 🔧 Troubleshooting

### Problem: "CRYPTOPANIC_AUTH_TOKEN not set"

**Solution:**
```bash
export CRYPTOPANIC_AUTH_TOKEN=your-token-here
```

### Problem: "Invalid auth token"

**Solution:**
- Check you copied the token correctly
- Verify at: https://cryptopanic.com/developers/api/

### Problem: "Rate limit exceeded"

**Solution:**
- Enable caching (reduces calls by 90%)
- Upgrade to Growth or Enterprise plan
- Check usage: `client.getRateLimitStatus()`

### Problem: "Feature not available"

**Solution:**
- Check your plan supports the feature
- Real-time news: Growth or Enterprise
- Search API: Enterprise only

---

## 📚 Documentation

- **Quick Start**: `CRYPTOPANIC_QUICKSTART.md`
- **Full Guide**: `CRYPTOPANIC_INTEGRATION.md`
- **Summary**: `CRYPTOPANIC_SUMMARY.md`

---

## 🎉 You're Ready!

Once the quick test passes, you can:

1. ✅ Fetch real-time crypto news
2. ✅ Analyze sentiment automatically
3. ✅ Detect panic events
4. ✅ Track DeFi protocols
5. ✅ Monitor trending tokens
6. ✅ Get market overviews

**Have fun! 🚀**

