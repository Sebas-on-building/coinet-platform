# Railway Quick Fix Guide

## ✅ Issue Fixed

The build was failing because Railway couldn't detect the Node.js project. This has been fixed by:
1. ✅ Added `package.json` with all dependencies
2. ✅ Added `tsconfig.json` for TypeScript compilation
3. ✅ Updated `railway.json` configuration

## 🚀 Next Steps in Railway Dashboard

### Step 1: Set Root Directory

**CRITICAL:** You must set the root directory in Railway:

1. Go to Railway Dashboard → Your Service → **Settings**
2. Scroll to **"Source"** section
3. Click **"Add Root Directory"**
4. Enter: `services/market-prices`
5. Click **"Update"**

This tells Railway to build from the `services/market-prices` directory instead of the repo root.

### Step 2: Verify Build Settings

Railway should now auto-detect:
- **Builder:** Nixpacks (Node.js)
- **Build Command:** `npm install && npm run build` (auto-detected)
- **Start Command:** `npm start` (from railway.json)

### Step 3: Set Environment Variables

Add all required environment variables (see `RAILWAY_DEPLOYMENT.md` for full list):

**Minimum Required:**
```bash
NODE_ENV=production
COINGECKO_API_KEY_PROD=your_key
TIMESCALE_HOST=your_host
TIMESCALE_PASSWORD=your_password
REDIS_HOST=your_redis_host
REDIS_PASSWORD=your_redis_password
```

### Step 4: Redeploy

1. Railway will automatically redeploy when you push to `main` (already pushed ✅)
2. OR manually trigger: **Settings** → **"Redeploy"**

### Step 5: Verify

After deployment, check:
- Build logs show successful build
- Deploy logs show service starting
- Health endpoint: `https://your-service.railway.app/health`

## 🔍 Troubleshooting

### If Build Still Fails:

1. **Check Root Directory:**
   - Settings → Source → Root Directory = `services/market-prices`

2. **Check Build Logs:**
   - Look for "package.json found" message
   - Should see "npm install" running
   - Should see "npm run build" running

3. **Check Node Version:**
   - Railway should auto-detect Node 20+
   - If not, add `NODE_VERSION=20` environment variable

### If Service Won't Start:

1. **Check Start Command:**
   - Should be: `npm start` or `node dist/index.js`

2. **Check Environment Variables:**
   - All required vars must be set
   - Check for typos in variable names

3. **Check Logs:**
   - Look for error messages
   - Common: Missing env vars, connection errors

## 📋 Quick Checklist

- [ ] Root directory set to `services/market-prices`
- [ ] Environment variables configured
- [ ] Build succeeds (check logs)
- [ ] Service starts (check logs)
- [ ] Health endpoint responds: `/health`
- [ ] Metrics endpoint works: `/metrics/summary`

## 🎯 Expected Build Output

You should see in Railway build logs:
```
✓ package.json found
✓ Installing dependencies...
✓ Running build: npm run build
✓ TypeScript compilation successful
✓ Build complete
```

## 🎯 Expected Start Output

You should see in Railway deploy logs:
```
Starting Market Prices Service...
Market data aggregator initialized
Storage initialized
Market Prices Service started successfully
```

---

**After setting the root directory, Railway should build and deploy successfully!** 🚀

