# 🔧 Fix Railway Root Directory

## Problem
Railway is building from the root directory (`root directory set as ''`), but it needs to build from `services/market-prices`.

## Solution: Set Root Directory in Railway

### Step 1: Go to Railway Dashboard
1. Go to: https://railway.app/dashboard
2. Select your **"Coinet"** project
3. Click on **"ai-data-feeder"** service (or create new "market-prices" service)

### Step 2: Set Root Directory
1. Click **"Settings"** tab
2. Scroll to **"Root Directory"** section
3. Set it to: `services/market-prices`
4. Click **"Save"**

### Step 3: Redeploy
1. Go to **"Deployments"** tab
2. Click **"Redeploy"** or Railway will auto-redeploy

---

## Alternative: Create New Service for Market-Prices

If you want a separate service:

1. **New Service** → **GitHub Repo**
2. **Name**: `market-prices`
3. **Root Directory**: `services/market-prices` ⚠️ **CRITICAL**
4. **Branch**: `feature/ai-data-feeder`
5. **Deploy**

---

## Why This Failed

The error shows:
```
root directory set as ''
failed to calculate checksum: "/turbo.json": not found
```

Railway is looking for root-level files (`turbo.json`, `pnpm-lock.yaml`) that don't exist because this is a monorepo. Setting Root Directory to `services/market-prices` tells Railway to build only that service.

---

## After Fix

Railway will:
- ✅ Find `package.json` in `services/market-prices/`
- ✅ Run `npm install`
- ✅ Run `npm run build`
- ✅ Start with `npm start`

**Status**: Set Root Directory and redeploy! 🚀

