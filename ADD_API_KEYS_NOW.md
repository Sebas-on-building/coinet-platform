# 🔑 ADD THESE API KEYS TO RAILWAY NOW

## Your API Keys (from the information you provided)

### CryptoPanic (Developer Tier)
```
CRYPTOPANIC_API_KEY=07b3e13fd6db44d4b23fc48ea1cb85a6e739ccb3
```

### Coinglass (Free Tier - Upgrade to Startup recommended)
```
COINGLASS_API_KEY=cf0bf4c5b17b415da431c6a92d472ff1
```

---

## How to Add to Railway

1. **Go to Railway Dashboard**: https://railway.app/dashboard
2. **Click on `coinet-platform` service**
3. **Click "Variables" tab**
4. **Add each variable:**

### Required Variables to Add:

| Variable Name | Value | Status |
|--------------|-------|--------|
| `CRYPTOPANIC_API_KEY` | `07b3e13fd6db44d4b23fc48ea1cb85a6e739ccb3` | 🔴 ADD NOW |
| `COINGLASS_API_KEY` | `cf0bf4c5b17b415da431c6a92d472ff1` | 🔴 ADD NOW |

5. **Railway will auto-redeploy** after adding variables

---

## After Adding - Verify

Wait 2 minutes for deployment, then run:

```bash
curl "https://api.coinet.ai/api/diagnostic?symbol=BTC" | python3 -c "
import sys, json
data = json.load(sys.stdin)
news = data.get('services', {}).get('newsService', {})
env = data.get('environment', {})
print('📰 NEWS SERVICE:')
print(f'   Articles: {news.get(\"articlesFound\", 0)}')
print(f'   Sources Used: {news.get(\"sourcesUsed\", [])}')
print()
print('🔑 API KEYS STATUS:')
print(f'   CRYPTOPANIC: {env.get(\"CRYPTOPANIC_API_KEY\", \"not shown\")}')
print(f'   COINGLASS: {env.get(\"COINGLASS_API_KEY\", \"not shown\")}')
"
```

---

## Expected Results After Adding Keys

### News Service
- **Before**: 0-14 articles from RSS only
- **After**: 20-50 articles from CryptoPanic + RSS

### Liquidation Service  
- **Before**: No data (API key missing)
- **After**: Real-time liquidation data, funding rates, open interest

---

## CryptoPanic API Details

- **Plan**: Developer (Free)
- **Rate Limit**: 2 requests/second
- **Monthly Cap**: 1,000 requests
- **Endpoint**: `https://cryptopanic.com/api/developer/v2/posts/`

## Coinglass API Details

- **Plan**: Free (consider upgrading to Startup $62/mo)
- **Endpoint**: `https://open-api.coinglass.com/public/v2`
- **Features**: Liquidations, Funding Rates, Open Interest

---

## 🚀 GO ADD THESE NOW!

1. Open: https://railway.app/dashboard
2. Click: coinet-platform → Variables
3. Add: `CRYPTOPANIC_API_KEY` = `07b3e13fd6db44d4b23fc48ea1cb85a6e739ccb3`
4. Add: `COINGLASS_API_KEY` = `cf0bf4c5b17b415da431c6a92d472ff1`
5. Wait for redeploy (~2 min)
6. Test!

