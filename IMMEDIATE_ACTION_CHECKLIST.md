# ⚡ IMMEDIATE ACTION CHECKLIST

## Priority 0: Fix Today (Critical)

### 1. API Keys Needed NOW

```bash
# Add these to Railway Environment Variables IMMEDIATELY

# News (Fix 0 articles issue)
CRYPTOPANIC_API_KEY=           # Get from: https://cryptopanic.com/developers/api/

# Social Sentiment (Currently broken)  
LUNARCRUSH_API_KEY=            # Get from: https://lunarcrush.com/developers

# Liquidation Data (Code exists, not working)
COINGLASS_API_KEY=             # Get from: https://coinglass.com/pricing

# Price Data Backup
CMC_API_KEY=                   # Get from: https://pro.coinmarketcap.com/

# Upgrade CoinGecko (Rate limited on free tier)
COINGECKO_API_KEY=             # Upgrade at: https://www.coingecko.com/en/api/pricing
```

### 2. How to Add to Railway

1. Go to: https://railway.app/dashboard
2. Click on `coinet-platform` service
3. Click "Variables" tab
4. Add each key above
5. Railway will auto-redeploy

### 3. Verify After Adding

```bash
# Test the diagnostic endpoint
curl "https://api.coinet.ai/api/diagnostic?symbol=BTC"

# Should show:
# - newsService.status: "✅ working"
# - sentimentService: with social data
# - liquidationService: with data
```

---

## Priority 1: This Week

### Streaming Responses

**Why:** Users currently wait 3-5 seconds. Competitors stream instantly.

**File to modify:** `apps/coinet-platform/src/api/chat/routes.ts`

Add new endpoint:
```typescript
router.post('/stream', async (req, res) => {
  // SSE streaming implementation
});
```

### TradingView Chart Fix

**Issue:** Chart shows $61,550 instead of current ~$95K

**File:** `apps/client-web/src/components/charts/TradingViewChatChart.tsx`

**Fix:** Force widget refresh, disable caching

---

## Priority 2: This Month

### User Memory Persistence

**Why:** AI forgets user between sessions

**Files:**
- `apps/coinet-platform/src/services/memory-service.ts`
- `apps/coinet-platform/prisma/schema.prisma`

### Conversation History Sidebar

**Why:** Can't access past chats easily

**File:** `apps/client-web/src/components/ChatInterface.tsx`

### Voice Input

**Why:** Mic button exists but doesn't work

**File:** `apps/client-web/src/components/ChatInterface.tsx`

---

## Quick Commands

```bash
# Check current production status
curl "https://api.coinet.ai/api/health"

# Full diagnostic
curl "https://api.coinet.ai/api/diagnostic?symbol=BTC"

# Test specific coin
curl "https://api.coinet.ai/api/test/price/SUPRA"

# Check Railway logs
# Go to: https://railway.app/dashboard → coinet-platform → Logs
```

---

## Cost Summary

| Item | Monthly | Priority |
|------|---------|----------|
| CryptoPanic Pro | $79 | P0 |
| LunarCrush | $99 | P0 |
| Coinglass | $99 | P0 |
| CoinGecko Pro | $129 | P0 |
| CMC Pro | $79 | P1 |
| **Total P0** | **$406/mo** | |

---

## Progress Tracker

- [ ] CryptoPanic API key added
- [ ] LunarCrush API key added  
- [ ] Coinglass API key added
- [ ] CoinGecko upgraded to Pro
- [ ] CMC API key added
- [ ] News service returning articles
- [ ] Social sentiment working
- [ ] Liquidation data flowing
- [ ] Streaming responses implemented
- [ ] TradingView chart fixed
- [ ] User memory persisting
- [ ] Conversation sidebar added
- [ ] Voice input working

---

*Last Updated: December 2, 2025*

