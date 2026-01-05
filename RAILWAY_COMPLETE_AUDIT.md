# 🚂 Railway Services - Complete Audit & Action Plan

**Generated:** December 2025  
**Purpose:** Comprehensive audit of ALL Railway services and deployment status

---

## 📊 ALL Railway Services in Codebase

Based on `railway.json` files found, you have **8 services** configured:

| # | Service | Location | Port | Status | Priority |
|---|---------|----------|------|--------|----------|
| 1 | **user-service** | `services/user/` | 8005 | ❌ **NOT DEPLOYED** | 🔴 **CRITICAL** |
| 2 | **api-gateway** | `services/api-gateway/` | 8000 | ❌ **NOT DEPLOYED** | 🔴 **CRITICAL** |
| 3 | **coinet-platform** | `apps/coinet-platform/` | 3000 | ⚠️ **PARTIALLY** | 🟡 **HIGH** |
| 4 | **market-prices** | `services/market-prices/` | ? | ❓ **UNKNOWN** | 🟡 **HIGH** |
| 5 | **alchemy-whales** | `services/alchemy-whales/` | ? | ❓ **UNKNOWN** | 🟢 **MEDIUM** |
| 6 | **ai-data-feeder** | `services/ai-data-feeder/` | ? | ✅ **RUNNING** | 🟢 **MEDIUM** |
| 7 | **coinet-ai** | `services/coinet-ai/` | 3001 | ❓ **UNKNOWN** | 🟢 **LOW** |

---

## 🔴 CRITICAL: Auth Services (Deploy NOW)

### Service 1: **user-service** (Authentication Backend)

**Status:** ❌ **NOT DEPLOYED** - **BLOCKS ALL AUTH**

**What it does:**
- Handles user registration (`/auth/register`)
- Handles login (`/auth/login`)
- Manages user sessions (`/users/me`)
- JWT token generation
- Password hashing & validation

**Required Environment Variables:**
```bash
# Database (CRITICAL)
DATABASE_URL=${{Postgres.DATABASE_URL}}  # Link to PostgreSQL service
USE_DATABASE=true
NODE_ENV=production

# JWT Secret (CRITICAL - Generate with: openssl rand -base64 32)
JWT_SECRET=<32+ character secret>

# Port
PORT=8005

# CORS (if needed)
CORS_ORIGINS=https://app.coinet.ai,http://localhost:3000

# Optional
LOG_LEVEL=info
KAFKA_ENABLED=false
SENTRY_DSN=  # Leave empty if not using
```

**Deployment Steps:**
1. Railway Dashboard → "+ New" → "GitHub Repo"
2. Select: `Sebas-on-building/coinet-platform`
3. **Root Directory:** `services/user`
4. **Port:** 8005 (auto-detected)
5. Add environment variables above
6. **Link PostgreSQL Database** (create if doesn't exist)
7. Deploy

**Health Check:** `GET /health`

---

### Service 2: **api-gateway** (Routes All Requests)

**Status:** ❌ **NOT DEPLOYED** - **BLOCKS FRONTEND CONNECTIONS**

**What it does:**
- Routes `/auth/*` → user-service
- Routes `/users/*` → user-service
- Routes `/api/*` → various services
- CORS handling
- Rate limiting
- Request logging

**Required Environment Variables:**
```bash
# Port
PORT=8000
NODE_ENV=production

# Service URLs (CRITICAL - Update after user-service deploys)
USER_SERVICE_URL=https://user-service-xxxx.up.railway.app
AUTH_SERVICE_URL=https://user-service-xxxx.up.railway.app  # Same as USER_SERVICE_URL

# CORS (CRITICAL)
CORS_ORIGIN=https://app.coinet.ai

# Optional Service URLs (can be added later)
PORTFOLIO_SERVICE_URL=
AI_SERVICE_URL=
DATA_SERVICE_URL=
CONTEXT_SERVICE_URL=
INGEST_SERVICE_URL=
INFERENCE_SERVICE_URL=
FEEDBACK_SERVICE_URL=

# Optional
LOG_LEVEL=info
REDIS_URL=  # Leave empty if not using Redis
REDIS_ENABLED=false
SENTRY_DSN=
```

**Deployment Steps:**
1. Railway Dashboard → "+ New" → "GitHub Repo"
2. Select: `Sebas-on-building/coinet-platform`
3. **Root Directory:** `services/api-gateway`
4. **Port:** 8000 (auto-detected)
5. Add environment variables above
6. **IMPORTANT:** Set `USER_SERVICE_URL` AFTER user-service deploys
7. Deploy

**Health Check:** `GET /health`

---

## 🟡 HIGH PRIORITY: Existing Services

### Service 3: **coinet-platform** (Main Backend)

**Status:** ⚠️ **PARTIALLY DEPLOYED** (likely exists but missing variables)

**What it does:**
- Main API server
- Chat API (`/api/chat/*`)
- OmniScore API (`/api/omniscore/*`)
- CSI API
- Frontend backend

**Check if deployed:**
```bash
curl https://coinet-platform-production.up.railway.app/api/health
```

**If deployed, verify these variables:**
```bash
# Critical (blocks core features)
XAI_API_KEY=  # Chat won't work without this
TWITTER_API_KEY=  # COMM v2.1 broken without this
NODE_ENV=production
CORS_ORIGIN=https://app.coinet.ai

# High Priority
COINGECKO_API_KEY=
COINGLASS_API_KEY=
CRYPTOPANIC_API_KEY=
LUNARCRUSH_API_KEY=
REDIS_URL=

# Database
DATABASE_URL=${{Postgres.DATABASE_URL}}
```

**Action:** Check Railway Dashboard → `coinet-platform` → Variables tab

---

### Service 4: **market-prices** (Market Data API)

**Status:** ❓ **UNKNOWN** (may be deployed)

**What it does:**
- Aggregates crypto prices
- CoinGecko & CoinMarketCap integration
- REST API for market data

**Check if deployed:**
```bash
curl https://market-prices-production.up.railway.app/api/health
```

**If NOT deployed:**
1. Railway Dashboard → "+ New" → "GitHub Repo"
2. **Root Directory:** `services/market-prices`
3. Deploy

**Required Variables:**
```bash
COINGECKO_API_KEY=
CMC_API_KEY=
DATABASE_URL=  # TimescaleDB if using
```

---

## 🟢 MEDIUM/LOW PRIORITY: Other Services

### Service 5: **alchemy-whales** (Fraud Detection)

**Status:** ❓ **UNKNOWN**

**What it does:**
- 99.99% fraud detection
- Whale tracking
- Solana token monitoring

**Check if deployed:**
```bash
curl https://alchemy-whales-production.up.railway.app/api/health
```

**If NOT deployed:** Can deploy later (not blocking auth)

---

### Service 6: **ai-data-feeder** (Background Data Service)

**Status:** ✅ **RUNNING** (according to docs)

**What it does:**
- Fetches prices from CoinGecko
- Aggregates news
- Feeds data to AI

**Action:** Verify Root Directory is `services/ai-data-feeder`

---

### Service 7: **coinet-ai** (AI Service)

**Status:** ❓ **UNKNOWN**

**What it does:**
- AI inference service
- Can be used by api-gateway

**Action:** Deploy later if needed

---

## 🗄️ Database Services

### PostgreSQL Database

**Status:** ❓ **UNKNOWN** - **REQUIRED FOR AUTH**

**Action:**
1. Railway Dashboard → Check if PostgreSQL exists
2. If NOT exists:
   - "+ New" → "Database" → "PostgreSQL"
   - Copy `DATABASE_URL`
   - Use in user-service

**Link to:** user-service (required)

---

## 📋 IMMEDIATE ACTION PLAN

### Phase 1: Deploy Auth Services (30 minutes)

#### Step 1.1: Create PostgreSQL Database
1. Railway Dashboard → "+ New" → "Database" → "PostgreSQL"
2. Wait for creation (30 seconds)
3. Copy `DATABASE_URL` from Variables tab

#### Step 1.2: Deploy user-service
1. Railway Dashboard → "+ New" → "GitHub Repo"
2. Select: `Sebas-on-building/coinet-platform`
3. **Root Directory:** `services/user`
4. **Port:** 8005
5. **Variables:**
   ```bash
   DATABASE_URL=${{Postgres.DATABASE_URL}}
   USE_DATABASE=true
   NODE_ENV=production
   JWT_SECRET=<generate: openssl rand -base64 32>
   PORT=8005
   LOG_LEVEL=info
   ```
6. **Link PostgreSQL** service
7. Deploy (3-5 minutes)
8. **Copy URL** from Settings → Networking

#### Step 1.3: Deploy api-gateway
1. Railway Dashboard → "+ New" → "GitHub Repo"
2. Select: `Sebas-on-building/coinet-platform`
3. **Root Directory:** `services/api-gateway`
4. **Port:** 8000
5. **Variables:**
   ```bash
   PORT=8000
   NODE_ENV=production
   USER_SERVICE_URL=<paste from Step 1.2>
   AUTH_SERVICE_URL=<same as USER_SERVICE_URL>
   CORS_ORIGIN=https://app.coinet.ai
   LOG_LEVEL=info
   ```
6. Deploy (3-5 minutes)
7. **Copy URL** from Settings → Networking

#### Step 1.4: Update Frontend (Vercel)
1. Vercel Dashboard → Project → Settings → Environment Variables
2. Add/Update:
   ```bash
   VITE_API_URL=<api-gateway URL from Step 1.3>
   ```
3. Redeploy

---

### Phase 2: Verify Existing Services (15 minutes)

#### Step 2.1: Check coinet-platform
1. Railway Dashboard → Find `coinet-platform` service
2. Check Variables tab
3. Add missing critical variables:
   - `XAI_API_KEY`
   - `TWITTER_API_KEY`
   - `NODE_ENV=production`
   - `CORS_ORIGIN=https://app.coinet.ai`

#### Step 2.2: Check market-prices
1. Railway Dashboard → Find `market-prices` service
2. If exists: Verify Root Directory = `services/market-prices`
3. If NOT exists: Deploy (see Service 4 above)

#### Step 2.3: Check ai-data-feeder
1. Railway Dashboard → Find `ai-data-feeder` service
2. Verify Root Directory = `services/ai-data-feeder`
3. If wrong: Fix in Settings

---

### Phase 3: Test Everything (10 minutes)

#### Test 1: User Service
```bash
curl https://user-service-xxxx.up.railway.app/health
```

#### Test 2: API Gateway
```bash
curl https://api-gateway-xxxx.up.railway.app/health
```

#### Test 3: Registration
```bash
curl -X POST https://api-gateway-xxxx.up.railway.app/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "test123456",
    "name": "Test User"
  }'
```

#### Test 4: Login
```bash
curl -X POST https://api-gateway-xxxx.up.railway.app/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "test123456"
  }'
```

#### Test 5: Frontend
1. Go to: https://app.coinet.ai/auth
2. Try registering a new account
3. Try logging in
4. Check browser console (F12) for errors

---

## 🎯 Quick Checklist

### Auth Services (CRITICAL)
- [ ] PostgreSQL database created
- [ ] user-service deployed
- [ ] user-service URL copied
- [ ] api-gateway deployed
- [ ] api-gateway URL copied
- [ ] Vercel `VITE_API_URL` updated
- [ ] Frontend redeployed

### Existing Services (HIGH)
- [ ] coinet-platform variables checked
- [ ] market-prices service verified/deployed
- [ ] ai-data-feeder Root Directory verified

### Testing
- [ ] User Service health check passes
- [ ] API Gateway health check passes
- [ ] Registration endpoint works
- [ ] Login endpoint works
- [ ] Frontend auth page loads
- [ ] Can register new user
- [ ] Can log in
- [ ] Token stored in localStorage

---

## 🚨 Common Issues & Fixes

### Issue: 404 on `/auth/login`
**Fix:** Check API Gateway routes include `/auth/*` → user-service

### Issue: Database connection errors
**Fix:** Verify `DATABASE_URL` is correct and PostgreSQL is linked

### Issue: CORS errors
**Fix:** Verify `CORS_ORIGIN=https://app.coinet.ai` in api-gateway

### Issue: JWT errors
**Fix:** Verify `JWT_SECRET` is set (32+ characters) in user-service

### Issue: Service not found
**Fix:** Check Root Directory is correct in Railway Settings

---

## 📊 Summary

**Total Services:** 8 configured  
**Critical (Auth):** 2 services need deployment  
**High Priority:** 2 services need verification  
**Medium/Low:** 3 services can wait  

**Next Step:** Start with Phase 1 - Deploy Auth Services

---

## 🔗 Useful Links

- Railway Dashboard: https://railway.app/dashboard
- Vercel Dashboard: https://vercel.com/dashboard
- Frontend: https://app.coinet.ai/auth
- Generate JWT Secret: `openssl rand -base64 32`
