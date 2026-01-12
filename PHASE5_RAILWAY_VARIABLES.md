# 🔑 Phase 5 Railway Variables Checklist

## ✅ Already Configured (No Action Needed)
These should already be set in your Railway `coinet-platform` service:

| Variable | Status | Notes |
|----------|:------:|-------|
| `DATABASE_URL` | ✅ | Linked to Postgres |
| `REDIS_URL` | ✅ | Linked to Redis |
| `XAI_API_KEY` | ✅ | For Grok AI |
| `OPENAI_API_KEY` | ✅ | For OpenAI (if used) |
| `NODE_ENV` | ✅ | `production` |
| `CORS_ORIGIN` | ✅ | Frontend URLs |
| `JWT_SECRET` | ✅ | Auth tokens |

---

## 🆕 NEW Variables for Phase 5

Add these to enable full Phase 5 functionality:

### 1. Birdeye API (Smart Money Tracking)
```
Variable: BIRDEYE_API_KEY
Value: <your_birdeye_api_key>
Required: OPTIONAL (graceful degradation if missing)
```
**Get it from:** https://birdeye.so/api → Sign up → Get API key

### 2. Twitter/X API (Social Mentions)
```
Variable: TWITTER_BEARER_TOKEN
Value: <your_twitter_bearer_token>
Required: OPTIONAL (limited functionality if missing)
```
**Get it from:** https://developer.twitter.com → Create App → Get Bearer Token

### 3. RugCheck API
```
Variable: (none needed)
Status: ✅ Works automatically - public API
```

---

## 📝 How to Add Variables in Railway

1. Go to: https://railway.app/dashboard
2. Select your project → `coinet-platform` service
3. Click **Variables** tab
4. Click **+ New Variable**
5. Add each variable:

### Birdeye (Optional)
- **Variable name:** `BIRDEYE_API_KEY`
- **Value:** Paste your Birdeye API key

### Twitter (Optional)
- **Variable name:** `TWITTER_BEARER_TOKEN`  
- **Value:** Paste your Twitter Bearer token

6. Click **Deploy** to restart with new variables

---

## 🧪 Verification After Deployment

### Step 1: Verify Birdeye API Key

**Option A: Test Script (Recommended)**
```bash
# In Railway: Go to Deployments → Click latest deployment → View Logs
# Or locally:
cd apps/coinet-platform
BIRDEYE_API_KEY=your_key_here npx ts-node --transpile-only scripts/test-birdeye-api.ts
```

**Option B: Direct API Test**
```bash
# Replace YOUR_KEY with your actual Birdeye API key
curl --request GET \
  --url 'https://public-api.birdeye.so/defi/price?address=So11111111111111111111111111111111111111112' \
  --header 'X-API-KEY: YOUR_KEY' \
  --header 'x-chain: solana' \
  --header 'accept: application/json'
```

**Expected Response (Success):**
```json
{
  "success": true,
  "data": {
    "value": 0.38622452197470425,
    "updateUnixTime": 1745058945
  }
}
```

**Common Errors:**
- `401 Unauthorized` → API key is invalid or missing
- `403 Forbidden` → API key doesn't have permission
- `429 Too Many Requests` → Rate limit hit

### Step 2: Test Meme Coin Analysis

```bash
# Health check
curl https://your-railway-url.up.railway.app/api/health

# Test meme coin analysis (replace with real token)
curl -X POST https://your-railway-url.up.railway.app/api/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"message": "Check this coin DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263"}'
```

### Step 3: Check Logs for Birdeye Integration

In Railway → `coinet-platform` → **Logs**, look for:
- ✅ `🦅 Smart money data added` → API key working
- ❌ `🦅 Birdeye API key not configured` → Key missing
- ❌ `🦅 Birdeye API key invalid` → Key wrong

---

## 📊 Feature Availability by API Key

| Feature | Without API Keys | With API Keys |
|---------|:----------------:|:-------------:|
| DexScreener data | ✅ Full | ✅ Full |
| Pump.fun data | ✅ Full | ✅ Full |
| Solscan holders | ✅ Full | ✅ Full |
| RugCheck security | ✅ Full | ✅ Full |
| Risk/Potential scoring | ✅ Full | ✅ Full |
| Trading recommendations | ✅ Full | ✅ Full |
| **Birdeye smart money** | ❌ None | ✅ Full |
| **Twitter mentions** | ⚠️ Limited | ✅ Full |

**Note:** The system works great even without Birdeye/Twitter keys - they just add extra intelligence.

---

## 🚀 Deployment Flow

```
1. Git Push → Railway auto-detects
          ↓
2. Railway rebuilds (3-5 min)
          ↓
3. Health check passes
          ↓
4. ✅ Phase 5 Live!
```

---

## ✅ Quick Checklist

- [ ] Committed all Phase 5 files
- [ ] Pushed to `origin/main`
- [ ] Railway shows new deployment
- [ ] (Optional) Added `BIRDEYE_API_KEY`
- [ ] (Optional) Added `TWITTER_BEARER_TOKEN`
- [ ] Tested health endpoint
- [ ] Tested meme coin analysis

---

**Last Updated:** Phase 5 Enhancement Complete
