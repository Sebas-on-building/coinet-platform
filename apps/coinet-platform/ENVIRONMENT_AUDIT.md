# 🔐 Environment Variables Audit

**Generated:** December 7, 2025  
**Version:** OmniScore v2.3.2 + COMM v2.2 Diabolical

---

## ⚠️ CRITICAL: Production Variables (Set These First)

Before deploying, ensure these variables are configured:

| Variable | Required | Validation | Example |
|----------|----------|------------|---------|
| `DATABASE_URL` | ✅ Always | Valid URL format | `postgresql://user:pass@host:5432/db` |
| `JWT_SECRET` | ✅ Always | ≥ 32 chars | `openssl rand -base64 32` |
| `NODE_ENV` | ✅ | Must be `production` | `production` |
| `CORS_ORIGIN` | ✅ Production | Non-empty, comma-separated origins | `https://app.coinet.ai,https://coinet.ai` |
| `XAI_API_KEY` / `OPENAI_API_KEY` | Recommended | Non-empty | `xai-xxx` / `sk-xxx` |
| `REDIS_URL` | Recommended in prod | Non-empty | `redis://:pass@host:6379` |
| `TWITTER_API_KEY` | For COMM | Non-empty | From twitterapi.io |

**Without these:** Startup exits immediately for `DATABASE_URL` and `JWT_SECRET`. Missing `CORS_ORIGIN` in production blocks all unknown origins and logs a warning. Missing AI keys degrade chat to error responses.

### Startup validation

`validateEnv()` in `src/utils/validateEnv.ts` runs **before** `express()` is initialised:
- **Fails startup** (`process.exit(1)`) for: `DATABASE_URL` (always), `JWT_SECRET` (always), `CORS_ORIGIN` (production only).
- **Warns** (continues) for: missing AI keys, missing `REDIS_URL` in production.

This means misconfigured environments are caught at boot rather than failing silently at runtime.

**Legacy JWT:** `JWT_SECRET` is optional — only required when `services/user` or `services/api-gateway` issue HS256 JWTs that `coinet-platform` must also accept. For Clerk-only deployments leave it unset. When set, it must be ≥ 32 characters and **identical** across `coinet-platform`, `services/user`, and `services/api-gateway`. Generate: `openssl rand -base64 32`.

> **How it works:** `requireAuth` first validates the Bearer token with Clerk. If Clerk rejects it *and* `JWT_SECRET` is set, it verifies the token as a legacy HS256 JWT (signature + algorithm + claims checked). If `JWT_SECRET` is absent, legacy JWT verification is skipped entirely — the Clerk path is the only route.

**Config sources:** See `docs/CONFIG_SOURCES.md` for which env example files are canonical and how they relate.

---

## 🔒 Security: API Key Rotation

If any API key was ever committed to version control, exposed in documentation, or shared outside secure channels, **rotate it immediately**:

1. Revoke or regenerate the key in the provider's dashboard (Twitter, xAI, OpenAI, etc.).
2. Update the new key in your deployment environment (Railway, `.env`, secrets manager).
3. Never commit real keys to git; use placeholders in examples.

**Check:** Search your git history for any key that may have been committed. If a key like `new1_*` or `sk-*` appeared in docs or code, assume it was compromised and rotate.

---

## 📊 Current Status

### ✅ Configured in `.env`

| Variable | Status | Value | Impact |
|----------|--------|-------|--------|
| `DATABASE_URL` | ✅ **ACTIVE** | `postgresql://...` | Core database connection |
| `PORT` | ✅ **ACTIVE** | `3000` | Server port |
| `MARKET_PRICES_URL` | ✅ **ACTIVE** | Railway service | Market data pipeline |
| `ALCHEMY_WHALES_URL` | ✅ **ACTIVE** | Railway service | Whale monitoring |

### ⚠️ Configured but Empty

| Variable | Priority | Required For | Impact if Missing |
|----------|----------|--------------|-------------------|
| `XAI_API_KEY` | 🔴 **CRITICAL** | AI responses | **Chat completely broken** |
| `OPENAI_API_KEY` | 🟡 **HIGH** | AI fallback | No fallback if Grok fails |
| `COINGECKO_API_KEY` | 🟡 **HIGH** | Market data | Rate limited (10 req/min) |
| `COINGLASS_API_KEY` | 🟡 **HIGH** | Derivatives Intelligence | Mock data only |
| `CRYPTOPANIC_API_KEY` | 🟡 **HIGH** | News feed | Rate limited (5 req/min) |
| `CMC_API_KEY` | 🟢 **MEDIUM** | Backup pricing | Uses CoinGecko only |

### ❌ Missing from `.env`

| Variable | Priority | Required For | Impact |
|----------|----------|--------------|--------|
| `TWITTER_API_KEY` | 🔴 **CRITICAL** | **COMM v2.1 Diabolical** | **OmniScore COMM broken** |
| `NODE_ENV` | 🟡 **HIGH** | Production mode | Default fallbacks used |
| `CORS_ORIGIN` | 🟡 **HIGH** | Frontend security | Allows all origins (insecure) |
| `REDIS_URL` | 🟡 **HIGH** | Enterprise cache | No cache acceleration |
| `LUNARCRUSH_API_KEY` | 🟡 **HIGH** | Social Intelligence | CSS/CSI degraded |
| `TWITTER_BEARER_TOKEN` | 🟢 **MEDIUM** | Enhanced social | Reduced social data |
| `TWITTER_API_SECRET` | 🟢 **MEDIUM** | Enhanced social | Reduced social data |
| `GROK_MODEL` | 🟢 **MEDIUM** | AI config | Uses default model |
| `OPENAI_MODEL` | 🟢 **MEDIUM** | AI config | Uses default model |
| `MESSARI_API_KEY` | 🔵 **LOW** | Premium news | RSS fallback works |
| `THEBLOCK_API_KEY` | 🔵 **LOW** | Premium news | RSS fallback works |
| `GITHUB_TOKEN` | 🔵 **LOW** | QS GitHub analysis | Estimate used |
| `CRUNCHBASE_API_KEY` | 🔵 **LOW** | QS team data | Estimate used |
| `LAEVITAS_API_KEY` | 🔵 **LOW** | Advanced derivatives | Coinglass fallback |

---

## 🚨 Critical Missing Variables

### 1. **`TWITTER_API_KEY`** (HIGHEST PRIORITY)

**Status:** ❌ Missing  
**Impact:** 🔴 **BREAKS COMM v2.1**

**Why Critical:**
- OmniScore COMM v2.1 Diabolical Edition requires Twitter data
- ICR (Influencer Concentration Risk) calculation broken
- NMI (Narrative Manipulation Index) degraded
- Peer normalization impossible

**Current Behavior:**
- No hardcoded fallback (production-ready)
- When `TWITTER_API_KEY` is unset, Twitter API calls return gracefully with "not configured"
- OmniScore COMM uses fallback logic when Twitter data is unavailable

**Action Required:**
```bash
# Add to Railway (obtain key from twitterapi.io)
TWITTER_API_KEY=your_twitter_api_key_here
```

---

### 2. **`XAI_API_KEY` or `OPENAI_API_KEY`** (CRITICAL)

**Status:** ⚠️ Empty in .env  
**Impact:** 🔴 **CHAT COMPLETELY BROKEN**

**Why Critical:**
- AI service won't start without at least one
- Chat endpoints return mock responses
- All AI analysis unavailable

**Current Workaround:**
```typescript
// ai-service.ts line 77
if (!process.env.XAI_API_KEY && !process.env.GROK_API_KEY && !process.env.OPENAI_API_KEY) {
  logger.warn('No AI API key configured - using mock responses');
}
```

**Action Required:**
```bash
# Add at least one to Railway
XAI_API_KEY=xai-xxxxxxxxxxxxx
# OR
OPENAI_API_KEY=sk-xxxxxxxxxxxxx
```

---

### 3. **`NODE_ENV`** (HIGH PRIORITY)

**Status:** ❌ Missing  
**Impact:** 🟡 **PRODUCTION OPTIMIZATIONS DISABLED**

**Why Important:**
- Error stack traces exposed (security risk)
- Verbose logging (performance hit)
- Development mode defaults

**Action Required:**
```bash
NODE_ENV=production
```

---

### 4. **`CORS_ORIGIN`** (HIGH PRIORITY)

**Status:** ❌ Missing  
**Impact:** 🟡 **SECURITY RISK**

**Why Important:**
- Currently allows all origins
- Open to CSRF attacks
- No frontend protection

**Current Behavior:**
- When `CORS_ORIGIN` is set: only listed origins + defaults allowed; unknown origins rejected in production
- When unset in production: logs warning; defaults (app.coinet.ai, localhost) allowed
- Comma-separated for multiple origins

**Action Required:**
```bash
# Production: restrict to your frontend origins
CORS_ORIGIN=https://app.coinet.ai,https://coinet.ai
```

---

### 5. **`REDIS_URL`** (HIGH PRIORITY for Performance)

**Status:** ❌ Missing  
**Impact:** 🟡 **NO CACHE ACCELERATION**

**Why Important:**
- Enterprise Market Data Pipeline runs in-memory only
- No shared cache across instances
- Higher API costs
- Slower response times

**Benefits if Added:**
- <50ms cache hits
- Shared cache across Railway instances
- Reduced external API calls

**Action Required:**
```bash
# Add Redis service in Railway, then:
REDIS_URL=redis://default:xxxxx@redis.railway.internal:6379
```

---

## 📋 Railway Deployment Checklist

### Minimal (Chat works)
```bash
DATABASE_URL=postgresql://...  # ✅ Already set
XAI_API_KEY=xai-xxxxxxxxxxxxx  # ❌ ADD THIS
TWITTER_API_KEY=your_twitter_api_key_here  # From twitterapi.io
NODE_ENV=production  # ❌ ADD THIS
PORT=3000  # ✅ Already set
```

### Recommended (Full features)
```bash
# Above + these:
COINGECKO_API_KEY=CG-xxxxxxxxxxxxx
COINGLASS_API_KEY=xxxxxxxxxxxxx
CRYPTOPANIC_API_KEY=xxxxxxxxxxxxx
LUNARCRUSH_API_KEY=xxxxxxxxxxxxx
REDIS_URL=redis://...
CORS_ORIGIN=https://your-frontend.com
```

### Complete (All features)
```bash
# Above + optional premium:
CMC_API_KEY=xxxxxxxxxxxxx
MESSARI_API_KEY=xxxxxxxxxxxxx
THEBLOCK_API_KEY=xxxxxxxxxxxxx
GITHUB_TOKEN=ghp_xxxxxxxxxxxxx
LAEVITAS_API_KEY=xxxxxxxxxxxxx
CRUNCHBASE_API_KEY=xxxxxxxxxxxxx
```

---

## 🎯 Recommended Next Steps

1. **Add Critical Variables** (5 minutes)
   ```bash
   XAI_API_KEY=xai-xxxxxxxxxxxxx
   TWITTER_API_KEY=your_twitter_api_key_here
   NODE_ENV=production
   CORS_ORIGIN=https://coinet.app
   ```

2. **Add High-Value APIs** (10 minutes)
   ```bash
   COINGECKO_API_KEY=CG-xxxxxxxxxxxxx  # Get from coingecko.com
   COINGLASS_API_KEY=xxxxxxxxxxxxx    # Get from coinglass.com
   REDIS_URL=redis://...               # Add Redis service in Railway
   ```

3. **Test OmniScore** (verify COMM v2.1 works)
   ```bash
   curl https://your-railway-url.railway.app/api/omniscore/v2.3?project=ethereum
   # Should show real Twitter data in COMM section
   ```

4. **Add Social Intelligence** (15 minutes)
   ```bash
   LUNARCRUSH_API_KEY=xxxxxxxxxxxxx
   CRYPTOPANIC_API_KEY=xxxxxxxxxxxxx
   ```

5. **Deploy and Monitor**
   ```bash
   git add -A
   git commit -m "feat: add missing environment variables"
   git push origin main
   # Watch Railway logs for any remaining issues
   ```

---

## 📊 Feature Impact Matrix

| Feature | Works Without Variables | Degraded Mode | Full Mode |
|---------|------------------------|---------------|-----------|
| **Chat API** | ❌ Mock only | ⚠️ With XAI/OpenAI | ✅ With both |
| **OmniScore QS** | ⚠️ Estimates only | 🟡 Partial data | ✅ Full analysis |
| **OmniScore OS** | ⚠️ Price only | 🟡 Basic metrics | ✅ Full metrics |
| **COMM v2.1** | ❌ Broken | ⚠️ With Twitter API | ✅ With Twitter + LunarCrush |
| **Derivatives Intel** | ⚠️ Mock data | 🟡 With Coinglass | ✅ With Coinglass + Laevitas |
| **News Intel v2** | 🟡 RSS only | 🟡 + CryptoPanic | ✅ + Premium sources |
| **Social Intel v2** | ⚠️ Limited | 🟡 With LunarCrush | ✅ With LunarCrush + Twitter |
| **CSI v5** | 🟡 Partial | 🟡 Most factors | ✅ All factors |
| **Market Data** | 🟡 Free tier | 🟡 With CG Pro | ✅ With CG + CMC |
| **Caching** | ❌ None | ❌ None | ✅ With Redis |

---

## 🔍 How to Find Your API Keys

### CoinGecko Pro
1. https://www.coingecko.com/en/api/pricing
2. Sign up for Pro tier ($129/mo)
3. Copy API key from dashboard

### Coinglass
1. https://www.coinglass.com/
2. Create account
3. API key in settings

### LunarCrush
1. https://lunarcrush.com/
2. Sign up
3. Generate API key

### CryptoPanic
1. https://cryptopanic.com/developers/api/
2. Free tier available
3. Get API key from dashboard

---

## ✅ Verification Commands

After adding variables to Railway:

```bash
# Check health
curl https://your-app.railway.app/api/health

# Check status (shows which APIs are configured)
curl https://your-app.railway.app/api/status

# Test OmniScore
curl https://your-app.railway.app/api/omniscore/v2.3?project=ethereum

# Test chat
curl -X POST https://your-app.railway.app/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "What is Bitcoin?"}'
```

---

---

## 🛡️ CORS Configuration

### Variable naming

| Variable | Role |
|----------|------|
| `CORS_ORIGIN` | **Primary** — comma-separated list of allowed origins. Required in production. |
| `CORS_ORIGINS` | Alias accepted for backward compatibility with other services. |

### Behavior by environment

| Scenario | Result |
|----------|--------|
| Request has no `Origin` header (server-to-server, mobile, Postman) | Always allowed |
| Origin is in `CORS_ORIGIN` / built-in list | Allowed |
| Development + Vercel preview URL or `*.coinet.*` origin | Allowed (dev convenience) |
| Production + origin not in allowed list | **Blocked** — even if `CORS_ORIGIN` is unset |
| Development + unknown origin | Allowed (local tooling convenience) |

### Implementation

The single-source-of-truth origin function lives in each service. No separate `app.options('*', ...)` handler exists in `coinet-platform` — the `cors()` middleware handles preflight automatically with the same origin logic, eliminating the reflected-origin vulnerability (the previous handler wrote `req.headers.origin || '*'` regardless of whether the origin was allowed).

### Services updated

| Service | File | Fix applied |
|---------|------|-------------|
| coinet-platform | `src/index.ts` | Removed custom OPTIONS handler; production always rejects unknowns |
| api-gateway (enhanced) | `src/enhanced.ts` | `origin:true` → `corsConfig()` |
| api-gateway (main) | `src/index.ts` + `src/cors.ts` | Local `corsConfig()` replaces phantom shared-utils import |
| ingest | `src/index.ts` + `src/index.production.ts` | `origin:true` → env-driven allow-list |
| portfolio | `src/index.ts` | Bare `cors()` → env-driven options |
| stream-processor | `src/index.ts` | Bare `cors()` → env-driven options |
| Socket.IO backend | `src/app.ts` | `origin:'*'` → env-driven allow-list |
| Custom middleware | `src/middleware/cors.ts` | Hardcoded `.co` origins → env-driven |

---

**Status:** 🟢 **Foundation ready for production**  
**Startup validation:** DATABASE_URL, JWT_SECRET, CORS_ORIGIN (prod)  
**CORS:** All services restricted to explicit allow-list; unknown origins blocked in production

