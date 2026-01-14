# 🔧 Fix: Frontend Cannot Connect to Backend API

## ❌ Problem

Frontend at `app.coinet.ai` shows error:
```
Unable to connect to the backend API. Please check your connection or contact support.
```

## 🔍 Root Cause

The frontend is configured to connect to `https://api.coinet.ai`, but this domain is not configured in Railway to point to your backend service.

## ✅ Solution Options

### Option 1: Configure Custom Domain in Railway (Recommended)

1. **Get your Railway backend URL**:
   - Go to Railway Dashboard → `coinet-platform` service
   - Check the **Settings** → **Networking** tab
   - Copy the **Public Domain** (e.g., `coinet-platform-production.up.railway.app`)

2. **Configure DNS for `api.coinet.ai`**:
   - Go to your DNS provider (where `coinet.ai` domain is managed)
   - Add a CNAME record:
     ```
     Type: CNAME
     Name: api
     Value: coinet-platform-production.up.railway.app
     TTL: 3600 (or auto)
     ```

3. **Add Custom Domain in Railway**:
   - Railway Dashboard → `coinet-platform` service → **Settings** → **Networking**
   - Click **"Add Domain"** or **"Custom Domain"**
   - Enter: `api.coinet.ai`
   - Railway will verify the DNS configuration
   - Wait for SSL certificate provisioning (usually 1-5 minutes)

4. **Verify**:
   - Visit `https://api.coinet.ai/api/health` in your browser
   - Should return: `{"status":"ok","timestamp":"..."}`

### Option 2: Set VITE_API_URL in Vercel (Quick Fix)

If you can't configure the custom domain right now:

1. **Get your Railway backend URL**:
   - Railway Dashboard → `coinet-platform` service → **Settings** → **Networking**
   - Copy the **Public Domain** (e.g., `coinet-platform-production.up.railway.app`)

2. **Set Environment Variable in Vercel**:
   - Go to Vercel Dashboard → Your project (`app.coinet.ai`)
   - Go to **Settings** → **Environment Variables**
   - Add new variable:
     ```
     Name: VITE_API_URL
     Value: https://coinet-platform-production.up.railway.app
     Environment: Production (and Preview if needed)
     ```
   - Click **Save**

3. **Redeploy Frontend**:
   - Vercel Dashboard → **Deployments** tab
   - Click **"Redeploy"** on the latest deployment
   - OR push a new commit to trigger auto-deploy

4. **Verify**:
   - Visit `app.coinet.ai`
   - Check browser console (F12) → Should see: `🔗 Backend API URL: https://coinet-platform-production.up.railway.app`

## 🔍 How to Verify Backend is Running

Test the backend directly:

```bash
# Replace with your actual Railway URL
curl https://coinet-platform-production.up.railway.app/api/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2026-01-14T22:12:29.936Z",
  "services": {
    "database": "✅ connected",
    "redisCache": "✅ connected",
    ...
  }
}
```

## 🎯 Recommended Approach

**Use Option 1 (Custom Domain)** because:
- ✅ Cleaner URLs (`api.coinet.ai` vs Railway URL)
- ✅ Easier to remember
- ✅ Can change backend hosting without updating frontend
- ✅ Better for production

**Use Option 2 (VITE_API_URL)** if:
- ⚠️ You need a quick fix right now
- ⚠️ DNS changes take too long
- ⚠️ You're testing/debugging

## 📝 Current Configuration

### Frontend (`apps/client-web/src/utils/api-config.ts`):
- Checks `VITE_API_URL` environment variable first
- Falls back to `https://api.coinet.ai` if on `app.coinet.ai` domain
- Falls back to `http://localhost:3000` in development

### Backend (`apps/coinet-platform/src/index.ts`):
- CORS allows `https://app.coinet.ai`
- Health endpoint: `/api/health`
- Running on Railway (check Railway dashboard for actual URL)

## ✅ After Fix

Once configured, the frontend should:
1. ✅ Connect to backend successfully
2. ✅ Show chat interface
3. ✅ Load conversation history
4. ✅ Send/receive messages

---

**Need Help?** Check:
- Railway Dashboard → Service logs for backend errors
- Vercel Dashboard → Function logs for frontend errors
- Browser Console (F12) for connection errors
