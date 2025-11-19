# 🚀 How to Use CryptoPanic Integration

## ✅ Your Code is Working!

The test passed successfully. Now here's how to use it in your code:

---

## 📝 Option 1: Create a TypeScript File

Create a file: `my-crypto-news.ts`

```typescript
import CryptoPanicRestClient from './src/providers/cryptopanic-rest';
import CryptoPanicNewsService from './src/services/cryptopanic-news.service';
import CryptoPanicSentimentAnalyzer from './src/services/cryptopanic-sentiment.service';
import { CryptoPanicPlan } from './src/types/cryptopanic.types';

async function getCryptoNews() {
  // Initialize client
  const client = new CryptoPanicRestClient({
    authToken: process.env.CRYPTOPANIC_AUTH_TOKEN!,
    plan: CryptoPanicPlan.DEVELOPMENT,
    enableCaching: true,
  });

  // Initialize news service
  const newsService = new CryptoPanicNewsService({ client });

  // Fetch important news for BTC and ETH
  const articles = await newsService.fetchImportantNews(['BTC', 'ETH']);
  
  console.log(`Found ${articles.length} articles`);
  
  // Analyze sentiment
  const analyzer = new CryptoPanicSentimentAnalyzer();
  const analyses = analyzer.analyzeBatch(articles);
  
  const bullish = analyses.filter(a => a.sentiment === 'positive');
  console.log(`${bullish.length} are bullish!`);
}

getCryptoNews();
```

**Run it:**
```bash
export CRYPTOPANIC_AUTH_TOKEN=07b3e13fd6db44d4b23fc48ea1cb85a6e739ccb3
npx ts-node my-crypto-news.ts
```

---

## 📝 Option 2: Use the Simple Example

I created `use-cryptopanic.ts` for you. Run:

```bash
export CRYPTOPANIC_AUTH_TOKEN=07b3e13fd6db44d4b23fc48ea1cb85a6e739ccb3
npx ts-node use-cryptopanic.ts
```

---

## 📝 Option 3: Run Full Examples

The example file exists but might need to be copied to codespace:

```bash
# Check if it exists
ls -la src/examples/cryptopanic-integration.example.ts

# If it exists, run:
export CRYPTOPANIC_AUTH_TOKEN=07b3e13fd6db44d4b23fc48ea1cb85a6e739ccb3
npx ts-node src/examples/cryptopanic-integration.example.ts

# If it doesn't exist, copy it from local first
```

---

## ⚠️ Important Notes

1. **Don't run TypeScript in bash** - TypeScript code must be in a `.ts` file
2. **Set environment variables** - Always set `CRYPTOPANIC_AUTH_TOKEN` before running
3. **Use `npx ts-node`** - This runs TypeScript files directly

---

## 🎯 Quick Start

```bash
# 1. Set token
export CRYPTOPANIC_AUTH_TOKEN=07b3e13fd6db44d4b23fc48ea1cb85a6e739ccb3

# 2. Create file (or use use-cryptopanic.ts)
npx ts-node use-cryptopanic.ts

# 3. Done! ✅
```

---

**The integration is working! Just use it in TypeScript files, not bash!** 🚀

