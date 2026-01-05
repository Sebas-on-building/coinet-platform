# 🚂 Railway Deployment for Authentication

## 📋 What Needs to Be Deployed

For authentication to work, you need **2 critical services** deployed to Railway:

### 1. **User Service** (CRITICAL - Handles Auth)
- **Location:** `services/user/`
- **Port:** 8005
- **Endpoints:** `/auth/login`, `/auth/register`, `/users/me`, `/auth/logout`
- **Status:** ❌ **NOT DEPLOYED** (no railway.json found)
- **Dockerfile:** ✅ Exists

### 2. **API Gateway** (CRITICAL - Routes Requests)
- **Location:** `services/api-gateway/`
- **Port:** 8000
- **Purpose:** Routes `/auth/*` and `/users/*` to User Service
- **Status:** ❌ **NOT DEPLOYED** (no railway.json found)
- **Dockerfile:** ✅ Exists

---

## 🚀 Deployment Steps

### Step 1: Deploy User Service

1. **Go to Railway Dashboard:** https://railway.app/dashboard
2. **Create New Service:**
   - Click "+ New" → "GitHub Repo"
   - Select your repository
   - Name it: `user-service`

3. **Configure Service:**
   - **Root Directory:** `services/user`
   - **Port:** 8005 (auto-detected)
   - **Build Command:** (auto-detected)
   - **Start Command:** `npm start`

4. **Add Environment Variables:**
```bash
# Database (CRITICAL)
DATABASE_URL=${{Postgres.DATABASE_URL}}
USE_DATABASE=true
NODE_ENV=production

# JWT Secret (CRITICAL - Generate a secure random string)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Port
PORT=8005

# Optional but recommended
SENTRY_DSN=your-sentry-dsn-if-using
KAFKA_ENABLED=false
REDIS_URL=${{Redis.REDIS_URL}}  # If you have Redis
```

5. **Deploy:** Railway will auto-detect Dockerfile and deploy

---

### Step 2: Deploy API Gateway

1. **In Railway Dashboard:**
   - Click "+ New" → "GitHub Repo"
   - Select your repository
   - Name it: `api-gateway`

2. **Configure Service:**
   - **Root Directory:** `services/api-gateway`
   - **Port:** 8000 (auto-detected)

3. **Add Environment Variables:**
```bash
# Port
PORT=8000
NODE_ENV=production

# User Service URL (CRITICAL - Replace with your user-service URL after deployment)
USER_SERVICE_URL=https://user-service-production.up.railway.app

# Auth Service URL (if you have a separate auth service, otherwise same as USER_SERVICE_URL)
AUTH_SERVICE_URL=https://user-service-production.up.railway.app

# CORS (CRITICAL)
CORS_ORIGIN=https://app.coinet.ai

# Optional
REDIS_URL=${{Redis.REDIS_URL}}
SENTRY_DSN=your-sentry-dsn-if-using
LOG_LEVEL=info
```

4. **Deploy:** Railway will auto-detect Dockerfile and deploy

---

## 🔗 Service URLs

After deployment, Railway will give you URLs like:
- **User Service:** `https://user-service-production.up.railway.app`
- **API Gateway:** `https://api-gateway-production.up.railway.app`

**Update your frontend** (`apps/client-web/.env` or Vercel):
```bash
VITE_API_URL=https://api-gateway-production.up.railway.app
```

---

## ✅ Verification

After deployment, test these endpoints:

```bash
# 1. User Service Health
curl https://user-service-production.up.railway.app/health

# 2. API Gateway Health
curl https://api-gateway-production.up.railway.app/health

# 3. Test Login Endpoint (via API Gateway)
curl -X POST https://api-gateway-production.up.railway.app/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123456"}'

# 4. Test Register Endpoint
curl -X POST https://api-gateway-production.up.railway.app/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123456","name":"Test User"}'
```

---

## 🗄️ Database Setup

**IMPORTANT:** The User Service needs a PostgreSQL database.

1. **In Railway Dashboard:**
   - Click "+ New" → "Database" → "PostgreSQL"
   - Railway will create a PostgreSQL database
   - Copy the `DATABASE_URL` from the database service

2. **Run Migrations:**
   - The User Service uses Prisma
   - Migrations should run automatically on startup
   - Or manually: `npx prisma migrate deploy` in the user-service

---

## 📊 Current Status

| Service | Status | Action Needed |
|---------|--------|---------------|
| User Service | ❌ Not Deployed | Deploy to Railway |
| API Gateway | ❌ Not Deployed | Deploy to Railway |
| Database | ❓ Unknown | Create PostgreSQL in Railway |
| Frontend | ✅ Ready | Just needs API URL |

---

## 🎯 Quick Start (5 Minutes)

1. **Create PostgreSQL Database in Railway**
2. **Deploy User Service** (use DATABASE_URL from step 1)
3. **Deploy API Gateway** (use USER_SERVICE_URL from step 2)
4. **Update Frontend** VITE_API_URL to API Gateway URL
5. **Test** at https://app.coinet.ai/auth

---

## ⚠️ Important Notes

- **JWT_SECRET:** Must be a secure random string (at least 32 characters)
- **CORS_ORIGIN:** Must match your frontend domain (`https://app.coinet.ai`)
- **Database:** User Service requires PostgreSQL (Railway can create this)
- **Service URLs:** Railway generates these automatically - use them in API Gateway config

---

## 🆘 Troubleshooting

**If auth endpoints return 404:**
- Check API Gateway is routing to User Service correctly
- Verify USER_SERVICE_URL in API Gateway environment variables

**If database errors:**
- Verify DATABASE_URL is correct
- Check Prisma migrations ran successfully
- Look at User Service logs in Railway

**If CORS errors:**
- Verify CORS_ORIGIN matches your frontend domain
- Check API Gateway CORS configuration
