# 🚀 Create Separate Market-Prices Service in Railway

## Yes! Create a Separate Service ✅

The `ai-data-feeder` service is configured for the monorepo root. Create a **new dedicated service** for `market-prices`.

## Step-by-Step Instructions

### Step 1: Create New Service

1. Go to **Railway Dashboard**: https://railway.app/dashboard
2. Select your **"Coinet"** project
3. Click **"+ New"** or **"New Service"**
4. Select **"GitHub Repo"**
5. Choose your repository

### Step 2: Configure Service (CRITICAL!)

**Name**: `market-prices`

**Root Directory**: `services/market-prices` ⚠️ **MUST SET THIS**

**Branch**: `feature/ai-data-feeder`

**Build Command**: (auto-detected or leave empty)

**Start Command**: (auto-detected or leave empty)

### Step 3: Railway Will Auto-Detect

Railway should detect:
- ✅ `package.json` in `services/market-prices/`
- ✅ `npm install` (from package.json scripts)
- ✅ `npm run build` (from package.json scripts)
- ✅ `npm start` (from package.json scripts)

### Step 4: Set Environment Variables

Go to **Variables** tab and add:

```bash
NODE_ENV=production
PORT=3000
COINGECKO_API_KEY=your_key_here
COINMARKETCAP_API_KEY=your_key_here (optional)
DATABASE_URL=${{Postgres.DATABASE_URL}}
REDIS_URL=${{Redis.REDIS_URL}}
CACHE_TTL=30
ENABLE_WEBSOCKET=false
ENABLE_CMC_FALLBACK=true
```

### Step 5: Deploy

Railway will automatically deploy!

---

## Why Separate Service?

- ✅ Clean separation of services
- ✅ Independent scaling
- ✅ Easier to manage
- ✅ Correct root directory from start
- ✅ No monorepo conflicts

---

## What Railway Will Do

1. Detect `services/market-prices/package.json`
2. Run `npm install`
3. Run `npm run build` (creates `dist/`)
4. Run `npm start` (runs `node dist/index.js`)

---

## Expected Success

After deployment, you should see:
```
✅ Installing dependencies...
✅ Building...
✅ Starting service...
🚀 Server listening on port 3000
```

**Status**: Create new service with Root Directory = `services/market-prices` 🚀
