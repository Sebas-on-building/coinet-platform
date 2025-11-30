# 🔧 Railway Root Directory Fix

## ⚠️ Current Error

```
Could not find root directory: services/market-prices
```

## ✅ Solution: Set Root Directory in Railway Dashboard

Railway needs to know where to build from in the monorepo.

### Steps:

1. **Go to Railway Dashboard**
   - Navigate to your `market-prices` service
   - Click on **Settings** tab

2. **Find "Source" Section**
   - Scroll down to **Source** settings
   - Look for **Root Directory** field

3. **Set Root Directory**
   - Enter: `services/market-prices`
   - Click **Save**

4. **Redeploy**
   - Railway will automatically trigger a new deployment
   - Or manually click **Redeploy** button

### Visual Guide:

```
Railway Dashboard
├── market-prices service
    ├── Settings tab
        ├── Source section
            └── Root Directory: [services/market-prices] ← SET THIS
```

---

## 🎯 What This Does

- **Before:** Railway builds from repo root (`/`) and can't find `services/market-prices`
- **After:** Railway builds from `services/market-prices/` directory
  - Finds `package.json` ✅
  - Finds `Dockerfile` ✅
  - Finds `railway.json` ✅
  - Builds successfully ✅

---

## 🔍 Alternative: If Root Directory Field Doesn't Exist

Some Railway projects might need to be configured differently:

### Option 1: Use Railway CLI

```bash
cd /workspaces/coinet-platform/services/market-prices

# Set root directory via CLI
railway variables set RAILWAY_ROOT_DIRECTORY=services/market-prices
```

### Option 2: Update railway.json

If Railway reads from `railway.json`, we can add root directory config:

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "rootDirectory": "services/market-prices",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "npm ci && npm run build"
  }
}
```

However, **Railway Dashboard UI is the recommended way** ✅

---

## ✅ Verification

After setting the root directory, check:

1. **Build Logs** should show:
   ```
   Building from: services/market-prices
   Found package.json ✅
   Running: npm ci
   Running: npm run build
   ```

2. **Deploy Logs** should show:
   ```
   Starting: npm start
   Service listening on port 3000
   ```

3. **Health Check** should pass:
   ```bash
   curl https://market-prices-production.up.railway.app/api/health
   ```

---

## 🚀 Quick Fix Summary

**Just set Root Directory to `services/market-prices` in Railway Dashboard Settings!**

That's it! 🎉

