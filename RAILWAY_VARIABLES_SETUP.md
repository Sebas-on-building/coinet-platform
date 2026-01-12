# 🔧 Railway Variables Setup Guide

## 📋 Variables Summary by Service

### ✅ Existing Services (Already Configured)

#### **coinet-platform**
- ✅ `DATABASE_URL` - Linked to Postgres
- ✅ `REDIS_URL` - Linked to Redis
- ✅ `XAI_API_KEY` - Set
- ✅ `TWITTER_API_KEY` - Set
- ✅ `CORS_ORIGIN` - Set
- ✅ `NODE_ENV` - Set
- ✅ All API keys configured

#### **alchemy-whales**
- ✅ All 22 shared variables ADDED
- ✅ Fully configured

#### **market-prices**
- ✅ `REDIS_URL` - Set
- ⚠️ Could add more shared variables if needed

#### **ai-data-feeder**
- ✅ 5 shared variables ADDED
- ✅ 64 service-specific variables configured

---

## 🔴 NEW SERVICES TO DEPLOY

### Service 1: **user-service**

**Required Variables:**

```bash
# Database (Link to Postgres - use Railway's link feature)
DATABASE_URL=${{Postgres.DATABASE_URL}}

# Required
USE_DATABASE=true
NODE_ENV=production
PORT=8005

# JWT Secret (CRITICAL - Generate secure random string)
JWT_SECRET=EmwmbgZ4i8zjPAhxmKwofdkWibd09K6Mc5GeW/ER5jE=

# Optional but recommended
LOG_LEVEL=info
KAFKA_ENABLED=false
CORS_ORIGINS=https://app.coinet.ai,http://localhost:3000

# Optional - Redis (if you want caching)
REDIS_URL=${{Redis.REDIS_URL}}
```

**How to Add:**
1. Create service → Go to Variables tab
2. Click "Add Variable" for each one
3. For `DATABASE_URL`: Click the link icon → Select "Postgres" → Railway auto-fills `${{Postgres.DATABASE_URL}}`
4. For `REDIS_URL` (optional): Click link icon → Select "Redis" → Railway auto-fills `${{Redis.REDIS_URL}}`

---

### Service 2: **api-gateway**

**Required Variables:**

```bash
# Port
PORT=8000
NODE_ENV=production

# User Service URL (CRITICAL - Get this AFTER user-service deploys)
USER_SERVICE_URL=https://user-service-production.up.railway.app
AUTH_SERVICE_URL=https://user-service-production.up.railway.app

# CORS (CRITICAL)
CORS_ORIGIN=https://app.coinet.ai

# Optional
LOG_LEVEL=info
REDIS_ENABLED=false
REDIS_URL=${{Redis.REDIS_URL}}  # Optional - for caching

# Optional - Other service URLs (can add later)
PORTFOLIO_SERVICE_URL=
AI_SERVICE_URL=
DATA_SERVICE_URL=
CONTEXT_SERVICE_URL=
INGEST_SERVICE_URL=
INFERENCE_SERVICE_URL=
FEEDBACK_SERVICE_URL=
```

**How to Add:**
1. Create service → Go to Variables tab
2. Add variables manually (no linking needed for service URLs)
3. **IMPORTANT:** Set `USER_SERVICE_URL` AFTER user-service is deployed and you have its URL

---

## 🚀 Step-by-Step Deployment

### Step 1: Deploy user-service

1. **Create Service:**
   - Railway Dashboard → "+ Create" → "GitHub Repo"
   - Select: `Sebas-on-building/coinet-platform`
   - Name: `user-service`

2. **Set Root Directory:**
   - Settings → Root Directory: `services/user`

3. **Add Variables:**
   - Variables tab → Add these one by one:
   
   | Variable | Value | How to Add |
   |----------|-------|------------|
   | `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` | Click link icon → Select Postgres |
   | `USE_DATABASE` | `true` | Add Variable → Type manually |
   | `NODE_ENV` | `production` | Add Variable → Type manually |
   | `PORT` | `8005` | Add Variable → Type manually |
   | `JWT_SECRET` | `EmwmbgZ4i8zjPAhxmKwofdkWibd09K6Mc5GeW/ER5jE=` | Add Variable → Paste |
   | `LOG_LEVEL` | `info` | Add Variable → Type manually |
   | `KAFKA_ENABLED` | `false` | Add Variable → Type manually |
   | `CORS_ORIGINS` | `https://app.coinet.ai,http://localhost:3000` | Add Variable → Type manually |
   | `REDIS_URL` | `${{Redis.REDIS_URL}}` | Click link icon → Select Redis (optional) |

4. **Deploy:**
   - Railway auto-detects `railway.json` and `Dockerfile`
   - Watch Deployments tab (3-5 minutes)

5. **Get URL:**
   - Settings → Networking → Generate Domain (if not auto-generated)
   - Copy URL (e.g., `https://user-service-production.up.railway.app`)

---

### Step 2: Deploy api-gateway

1. **Create Service:**
   - Railway Dashboard → "+ Create" → "GitHub Repo"
   - Select: `Sebas-on-building/coinet-platform`
   - Name: `api-gateway`

2. **Set Root Directory:**
   - Settings → Root Directory: `services/api-gateway`

3. **Add Variables:**
   - Variables tab → Add these:

   | Variable | Value | Notes |
   |----------|-------|-------|
   | `PORT` | `8000` | Required |
   | `NODE_ENV` | `production` | Required |
   | `USER_SERVICE_URL` | `<paste user-service URL>` | **Get from Step 1** |
   | `AUTH_SERVICE_URL` | `<same as USER_SERVICE_URL>` | Same as above |
   | `CORS_ORIGIN` | `https://app.coinet.ai` | Required |
   | `LOG_LEVEL` | `info` | Optional |
   | `REDIS_ENABLED` | `false` | Optional |
   | `REDIS_URL` | `${{Redis.REDIS_URL}}` | Optional - link to Redis |

4. **Deploy:**
   - Watch Deployments tab (3-5 minutes)

5. **Get URL:**
   - Settings → Networking → Copy URL (e.g., `https://api-gateway-production.up.railway.app`)

---

### Step 3: Update Vercel

1. Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add/Update:
   ```bash
   VITE_API_URL=https://api-gateway-production.up.railway.app
   ```
   (Replace with your actual api-gateway URL)
3. Redeploy frontend

---

## 🔗 Linking Variables in Railway

### How to Link DATABASE_URL:

1. In Variables tab, click "Add Variable"
2. Name: `DATABASE_URL`
3. Click the **link icon** (🔗) next to the value field
4. Select **"Postgres"** from the dropdown
5. Railway auto-fills: `${{Postgres.DATABASE_URL}}`
6. Save

### How to Link REDIS_URL:

1. Same process as above
2. Select **"Redis"** instead
3. Railway auto-fills: `${{Redis.REDIS_URL}}`

---

## ✅ Verification Checklist

After deploying user-service:
- [ ] Service shows "Online" status
- [ ] Health check works: `curl https://user-service-xxxx.up.railway.app/health`
- [ ] URL copied for api-gateway config

After deploying api-gateway:
- [ ] Service shows "Online" status
- [ ] Health check works: `curl https://api-gateway-xxxx.up.railway.app/health`
- [ ] URL copied for Vercel config

After updating Vercel:
- [ ] Frontend redeployed
- [ ] Test auth page: https://app.coinet.ai/auth
- [ ] Try registering a new account
- [ ] Check browser console for errors

---

## 🚨 Common Issues

### Issue: "DATABASE_URL not found"
**Fix:** Make sure you linked Postgres using the link icon, don't copy-paste manually

### Issue: "Service URL not working"
**Fix:** Wait for deployment to complete (check Deployments tab)

### Issue: "CORS errors"
**Fix:** Verify `CORS_ORIGIN=https://app.coinet.ai` in api-gateway

### Issue: "JWT errors"
**Fix:** Verify `JWT_SECRET` is set (32+ characters) in user-service

---

## 📊 Quick Reference

**JWT_SECRET (for user-service):**
```
EmwmbgZ4i8zjPAhxmKwofdkWibd09K6Mc5GeW/ER5jE=
```

**Variable Linking:**
- `DATABASE_URL` → Link to Postgres
- `REDIS_URL` → Link to Redis (optional)
- Service URLs → Type manually (after services deploy)

**Ports:**
- user-service: `8005`
- api-gateway: `8000`

---

## 🎯 Next Steps

1. ✅ Deploy user-service (use Postgres link)
2. ✅ Copy user-service URL
3. ✅ Deploy api-gateway (use user-service URL)
4. ✅ Copy api-gateway URL
5. ✅ Update Vercel
6. ✅ Test auth flow
