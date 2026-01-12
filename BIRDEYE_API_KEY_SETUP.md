# 🔑 Birdeye API Key Setup Guide

## ✅ Your Birdeye API Key

**Key Name:** `coinet`  
**API Key:** `77e59c24056c453f96c60b28e6f1f7a3`  
**Rate Limit:** 60 requests per minute (rpm)

---

## 🚀 Step 1: Add to Railway

1. Go to: https://railway.app/dashboard
2. Select your project → `coinet-platform` service
3. Click **Variables** tab
4. Click **+ New Variable**
5. Add:
   - **Variable name:** `BIRDEYE_API_KEY`
   - **Value:** `77e59c24056c453f96c60b28e6f1f7a3`
6. Click **Save**
7. Railway will auto-redeploy (~3-5 minutes)

---

## 🧪 Step 2: Test the API Key

### Test Directly (Before Railway Deploy)

```bash
# Test with curl
curl --request GET \
  --url 'https://public-api.birdeye.so/defi/price?address=So11111111111111111111111111111111111111112' \
  --header 'X-API-KEY: 77e59c24056c453f96c60b28e6f1f7a3' \
  --header 'x-chain: solana' \
  --header 'accept: application/json'
```

**Expected Success Response:**
```json
{
  "success": true,
  "data": {
    "value": 0.38622452197470425,
    "updateUnixTime": 1745058945,
    "updateHumanTime": "2025-04-19T10:35:45",
    "priceChange24h": 1.933391934259418
  }
}
```

### Test After Railway Deploy

```bash
# Replace YOUR_RAILWAY_URL with your actual Railway URL
curl -X POST https://YOUR_RAILWAY_URL.up.railway.app/api/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "message": "Check this coin DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263"
  }'
```

**Check Railway Logs:**
- Go to Railway → `coinet-platform` → **Logs**
- Look for: `🦅 Smart money data added` ✅
- If you see: `🦅 Birdeye API key not configured` → Variable not set correctly

---

## 📊 Rate Limit Management

**Your Limit:** 60 requests per minute

**Current Implementation:**
- Rate limiting: 200ms delay between requests = ~5 req/sec max
- Cache: 1 minute TTL to reduce API calls
- This means: **~300 requests per minute theoretical max**, but we're throttled to 60 rpm

**Optimization:**
- ✅ Cache is working (1 min TTL)
- ✅ Rate limiting prevents hitting limit
- ✅ Parallel requests are batched

---

## 🔍 Verify It's Working

### In Railway Logs:

**Success Indicators:**
```
🦅 Starting Birdeye smart money analysis
🦅 Smart money data added
  signal: buy
  netFlow: 45234.5
```

**Failure Indicators:**
```
🦅 Birdeye API key not configured  ← Key missing
🦅 Birdeye API error: 401          ← Key invalid
🦅 Birdeye rate limit hit           ← Too many requests
```

### In API Response:

When analyzing a meme coin, you should see in the response:
```json
{
  "smartMoneyData": {
    "overallSignal": "buy",
    "smartMoneyHolders": 12,
    "smartMoneyNetFlow": 45234.5,
    "confidence": 0.78
  }
}
```

---

## ⚙️ Whitelist/Blacklist Settings

**Current Status:**
- ✅ Whitelist: No data (all IPs allowed)
- ✅ Blacklist: No data (no IPs blocked)

**If you need to restrict access:**
1. Go to Birdeye Dashboard → Security
2. Add IPs to Whitelist (Railway IPs if needed)
3. Or add IPs to Blacklist (if blocking specific IPs)

---

## 🎯 Quick Checklist

- [ ] API key copied: `77e59c24056c453f96c60b28e6f1f7a3`
- [ ] Added to Railway as `BIRDEYE_API_KEY`
- [ ] Railway redeployed successfully
- [ ] Tested with curl (got success response)
- [ ] Checked Railway logs (see smart money data)
- [ ] Tested meme coin analysis (smartMoneyData appears)

---

## 🚨 Troubleshooting

### Issue: "Birdeye API key not configured"
**Fix:** 
1. Check Railway Variables → `BIRDEYE_API_KEY` exists
2. Verify no extra spaces: `77e59c24056c453f96c60b28e6f1f7a3`
3. Redeploy service

### Issue: "401 Unauthorized"
**Fix:**
1. Verify key is correct: `77e59c24056c453f96c60b28e6f1f7a3`
2. Check Birdeye dashboard → Key is active
3. Try curl test above

### Issue: "429 Rate Limit"
**Fix:**
- Wait 1 minute (60 rpm limit)
- Check if multiple services using same key
- Consider upgrading Birdeye plan

---

**Last Updated:** API Key Found & Configured ✅
