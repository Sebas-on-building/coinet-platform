# ✅ Correct Auth Architecture

## 🔍 Current Situation Analysis

### What We Have:
1. **Frontend** (`apps/client-web`) → Calls `/auth/login`
2. **user-service** (`services/user/`) → Has `/auth/login` endpoint ✅
3. **auth-service** (`services/auth/`) → Has `/login` endpoint (different!)
4. **API Gateway** → Routes `/api/v1/auth/login` → `auth-service` ❌ (WRONG!)
5. **coinet-platform** → Already deployed at `api.coinet.ai`

### The Problem:
- Frontend expects `/auth/login` → `user-service`
- API Gateway routes `/api/v1/auth/login` → `auth-service` (wrong service!)
- Two different auth systems exist (`auth` vs `user`)

---

## ✅ CORRECT SOLUTION

### Option 1: Use `coinet-platform` Directly (SIMPLEST)

Since `coinet-platform` is already deployed at `api.coinet.ai`, we should:

1. **Add auth routes to `coinet-platform`** that proxy to `user-service`
2. **OR** integrate `user-service` endpoints directly into `coinet-platform`
3. **Frontend** → `https://api.coinet.ai/auth/login` → `coinet-platform` → `user-service`

**Pros:**
- Uses existing deployed service
- No new services needed
- Simple architecture

**Cons:**
- Need to add routing/proxy logic to `coinet-platform`

---

### Option 2: Deploy `user-service` + Update API Gateway (RECOMMENDED)

1. **Deploy `user-service`** to Railway
2. **Update API Gateway** to route `/auth/*` (not `/api/v1/auth/*`) to `user-service`
3. **Frontend** → `https://api-gateway-url/auth/login` → `user-service`

**Changes needed:**
- Add route in API Gateway: `{ path: '/auth/*', service: 'user', pathRewrite: { '^/auth': '/auth' } }`
- Deploy `user-service` to Railway
- Set `USER_SERVICE_URL` in API Gateway

**Pros:**
- Proper microservices architecture
- Separation of concerns
- Scalable

**Cons:**
- Need to deploy new service
- Need to update API Gateway code

---

### Option 3: Use API Gateway with Correct Routes (CURRENT PLAN - NEEDS FIX)

1. **Deploy `user-service`** to Railway
2. **Deploy `api-gateway`** to Railway  
3. **Fix API Gateway** to route `/auth/*` → `user-service` (not `auth-service`)
4. **Frontend** → `https://api-gateway-url/auth/login` → `user-service`

**Changes needed:**
- Update API Gateway routes to use `user-service` instead of `auth-service`
- Add `/auth/*` route (without `/api/v1` prefix)

---

## 🎯 RECOMMENDED APPROACH: Option 2

### Step 1: Deploy `user-service`

1. Railway → "+ Create" → "GitHub Repo"
2. Root Directory: `services/user`
3. Port: 8005
4. Variables:
   ```bash
   DATABASE_URL=${{Postgres.DATABASE_URL}}
   USE_DATABASE=true
   NODE_ENV=production
   PORT=8005
   JWT_SECRET=EmwmbgZ4i8zjPAhxmKwofdkWibd09K6Mc5GeW/ER5jE=
   LOG_LEVEL=info
   ```
5. Deploy and copy URL

### Step 2: Update API Gateway Routes

**File:** `services/api-gateway/src/index.ts`

**Add BEFORE line 1028:**
```typescript
// Direct auth routes (without /api/v1 prefix) - routes to user-service
{ path: '/auth/login', service: 'user', pathRewrite: { '^/auth': '/auth' }, auth: { required: false } },
{ path: '/auth/register', service: 'user', pathRewrite: { '^/auth': '/auth' }, auth: { required: false } },
{ path: '/auth/logout', service: 'user', pathRewrite: { '^/auth': '/auth' }, auth: { required: true } },
{ path: '/auth/refresh', service: 'user', pathRewrite: { '^/auth': '/auth' }, auth: { required: true } },
{ path: '/users/me', service: 'user', pathRewrite: { '^/users': '/users' }, auth: { required: true } },
```

**Update line 1029** (change `auth` service to `user` service):
```typescript
// Keep existing /api/v1 routes but route to user-service instead
{ path: '/api/v1/auth/login', service: 'user', pathRewrite: { '^/api/v1/auth': '/auth' }, auth: { required: false } },
```

### Step 3: Deploy API Gateway

1. Railway → "+ Create" → "GitHub Repo"
2. Root Directory: `services/api-gateway`
3. Port: 8000
4. Variables:
   ```bash
   PORT=8000
   NODE_ENV=production
   USER_SERVICE_URL=<user-service URL from Step 1>
   CORS_ORIGIN=https://app.coinet.ai
   LOG_LEVEL=info
   ```
5. Deploy and copy URL

### Step 4: Update Frontend

**Vercel Environment Variables:**
```bash
VITE_API_URL=<api-gateway URL from Step 3>
```

---

## 🔧 Alternative: Use `coinet-platform` Directly

If you want to avoid deploying new services:

### Add to `apps/coinet-platform/src/index.ts`:

```typescript
// Proxy auth routes to user-service
import { createProxyMiddleware } from 'http-proxy-middleware';

const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://localhost:8005';

app.use('/auth', createProxyMiddleware({
  target: USER_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: { '^/auth': '/auth' },
  onError: (err, req, res) => {
    res.status(500).json({ error: 'Auth service unavailable' });
  }
}));
```

Then:
1. Deploy `user-service` to Railway
2. Add `USER_SERVICE_URL` to `coinet-platform` variables
3. Redeploy `coinet-platform`
4. Frontend uses `https://api.coinet.ai/auth/login`

---

## 📊 Comparison

| Approach | Services Needed | Complexity | Recommended |
|----------|----------------|------------|-------------|
| **Option 1: coinet-platform proxy** | 1 new (`user-service`) | Low | ✅ Yes (simplest) |
| **Option 2: API Gateway** | 2 new (`user-service`, `api-gateway`) | Medium | ✅ Yes (proper architecture) |
| **Option 3: Direct connection** | 1 new (`user-service`) | Low | ⚠️ No (bypasses gateway) |

---

## 🎯 My Recommendation

**Use Option 1** (coinet-platform proxy) because:
- ✅ `coinet-platform` is already deployed
- ✅ Minimal changes needed
- ✅ No new services to manage
- ✅ Frontend already configured correctly

**Then later**, migrate to Option 2 (API Gateway) for proper microservices architecture.

---

## 🚀 Quick Start (Option 1)

1. Deploy `user-service` to Railway
2. Add proxy code to `coinet-platform`
3. Add `USER_SERVICE_URL` to `coinet-platform` variables
4. Redeploy `coinet-platform`
5. Done! Frontend works at `https://api.coinet.ai/auth/login`
